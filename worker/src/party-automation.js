import { createPartySession, PARTY_SESSION_KEY } from "./party-session.js";

export const AUTOMATION_PATH = "/api/private/scheduled-party";
export const PLAN = Object.freeze({
  id: "request-e344679b-fe79-4008-bd02-dce43bb2bd37",
  start: Date.parse("2026-11-14T19:00:00Z"),
  end: Date.parse("2026-11-15T19:00:00Z"),
});
const OPERATION_KEY = `party:operation:${PLAN.id}`;
const COMPLETION_KEY = `${OPERATION_KEY}:completed`;
const BODY_LIMIT = 128;
const response = (value, status = 200) => Response.json(value, {
  status, headers: { "Cache-Control": "no-store" },
});

async function authorized(request, secret) {
  if (typeof secret !== "string" || secret.length < 32) return false;
  const authorization = request.headers.get("Authorization") || "";
  if (authorization.length > 512) return false;
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(authorization)),
    crypto.subtle.digest("SHA-256", encoder.encode(`Bearer ${secret}`)),
  ]);
  const left = new Uint8Array(actual), right = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function commandBody(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new Error("schema");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("schema");
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) { await reader.cancel(); throw new Error("schema"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || Array.isArray(body) || Object.keys(body).length !== 1 ||
      !["rehearse", "status", "start"].includes(body.command)) throw new Error("schema");
  return body.command;
}

export async function handlePartyAutomation(request, env, verifyHost, now = Date.now()) {
  // Authentication precedes body parsing, Spotify calls and all storage reads.
  if (!await authorized(request, env.AUX_AUTOMATION_TOKEN)) return response({ error: "Unauthorized" }, 401);
  if (request.method !== "POST") return response({ error: "POST required" }, 405);
  let command;
  try { command = await commandBody(request); }
  catch { return response({ error: "Invalid automation command" }, 400); }
  const kv = env.PARTY_QUEUE_KV;
  try {
    if (command === "start" && (now < PLAN.start || now >= PLAN.end)) {
      return response({ error: "Outside scheduled party window" }, 409);
    }
    if (command === "rehearse" && now >= PLAN.end) return response({ error: "Rehearsal window ended" }, 409);
    const snapshot = await kv.get(PARTY_SESSION_KEY);
    const existing = snapshot ? JSON.parse(snapshot) : null;
    const active = !!existing && Date.parse(existing.expiresAt) > now;
    if (command === "status") {
      const operation = await kv.get(COMPLETION_KEY, "json") || await kv.get(OPERATION_KEY, "json");
      return response({
      live: active, startedAt: existing?.startedAt ?? null, expiresAt: existing?.expiresAt ?? null,
      operation: ["claimed", "completed"].includes(operation?.state) ? { state: operation.state, operationId: PLAN.id } : null,
      plannedStart: new Date(PLAN.start).toISOString(), plannedEnd: new Date(PLAN.end).toISOString(),
      });
    }
    // Existing Spotify refresh/read-profile path proves the current account,
    // rather than trusting only persisted metadata. It never controls playback.
    const host = await verifyHost();
    if (!host) return response({ error: "Saved Spotify host verification failed" }, 409);
    if (active && existing.hostUserId !== host) return response({ error: "Active party host mismatch" }, 409);
    if (command === "rehearse") {
      const testKey = `party:test:${crypto.randomUUID()}`;
      let started = false, closed = false;
      try {
        await createPartySession(env, host, { key: testKey, now, durationSeconds: 86400 });
        const test = await kv.get(testKey, "json");
        started = test?.hostUserId === host && test.durationSeconds === 86400;
        if (!started) throw new Error("test read failed");
      } finally {
        // Even a lost put response may have written the key.
        await kv.delete(testKey);
        closed = await kv.get(testKey) === null;
      }
      const unchanged = await kv.get(PARTY_SESSION_KEY) === snapshot;
      if (!closed || !unchanged) throw new Error("rehearsal verification failed");
      return response({ rehearsed: started && closed, productionUnchanged: unchanged,
        live: active, durationSeconds: 86400, testClosed: true });
    }
    // KV is not a compare-and-swap store. The server's fsynced exclusive claim
    // is the single-caller authority; this remote receipt also blocks replay.
    if (await kv.get(OPERATION_KEY)) return response({ error: "Operation already claimed; refusing replay" }, 409);
    await kv.put(OPERATION_KEY, JSON.stringify({ state: "claimed", operationId: PLAN.id }));
    const preserve = active && Date.parse(existing.expiresAt) >= PLAN.end;
    const party = preserve ? existing : await createPartySession(env, host, {
      now, startedAt: active ? Date.parse(existing.startedAt) : now,
      durationSeconds: 86400, expiresAt: PLAN.end, operationId: PLAN.id,
    });
    await kv.put(COMPLETION_KEY, JSON.stringify({ state: "completed", operationId: PLAN.id }));
    return response({ live: true, preserved: preserve, startedAt: party.startedAt,
      expiresAt: party.expiresAt, operationId: PLAN.id });
  } catch {
    // Do not expose Spotify errors, identifiers, tokens or remote response bodies.
    return response({ error: "Automation failed; inspect status before any recovery" }, 502);
  }
}
