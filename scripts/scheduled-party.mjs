#!/usr/bin/env node
import { readFile, mkdir, open, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPartySession, PARTY_SESSION_KEY } from "../worker/src/party-session.js";

export const PLAN = Object.freeze({
  id: "request-e344679b-fe79-4008-bd02-dce43bb2bd37",
  start: Date.parse("2026-11-14T19:00:00Z"),
  end: Date.parse("2026-11-15T19:00:00Z"),
});
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_DIR = resolve(homedir(), ".local/state/pass-the-aux");

export function testKey(id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{15,100}$/.test(id || "")) {
    throw new Error("Test id must be unique (16–101 letters, digits or hyphens)");
  }
  return `party:test:${id}`;
}

export async function runParty({ kv, command, testId, now = Date.now(), claim, complete }) {
  const key = testId ? testKey(testId) : PARTY_SESSION_KEY;
  if (!["start", "status", "close", "preflight"].includes(command)) throw new Error("Use start, status, close or preflight");
  if (command === "status") {
    const party = await kv.get(key, "json");
    return { mode: testId ? "test" : "production", live: !!party && Date.parse(party.expiresAt) > now,
      startedAt: party?.startedAt ?? null, expiresAt: party?.expiresAt ?? null,
      operationId: party?.operationId ?? null };
  }
  // Production closing remains the authenticated host page's responsibility.
  if (command === "close") {
    if (!testId) throw new Error("CLI close is restricted to isolated test parties");
    await kv.delete(key);
    return { mode: "test", live: false };
  }
  if (command === "start" && !testId && (now < PLAN.start || now >= PLAN.end)) throw new Error("Outside scheduled party window");
  const [boundHost, tokens] = await Promise.all([
    kv.get("host:spotify-user-id"), kv.get("host:tokens", "json"),
  ]);
  if (!boundHost || tokens?.hostUserId !== boundHost || !tokens?.refreshToken || !tokens?.accessToken) {
    throw new Error("Saved host identity or refresh token unavailable; no party started");
  }
  const existing = await kv.get(key, "json");
  const active = existing && Date.parse(existing.expiresAt) > now;
  if (active && existing.hostUserId !== boundHost) throw new Error("Active party host mismatch");
  if (command === "preflight") return { mode: testId ? "test" : "production", ready: true,
    live: !!active, plannedStart: new Date(PLAN.start).toISOString(), plannedEnd: new Date(PLAN.end).toISOString() };
  const operationId = testId ? `test-${testId}` : PLAN.id;
  // Claim is durable BEFORE the remote write. Any ambiguous result stays claimed.
  await claim(operationId);
  if (active && Date.parse(existing.expiresAt) >= (testId ? now + 86400000 : PLAN.end)) {
    await complete(operationId);
    return { mode: testId ? "test" : "production", live: true, preserved: true,
      startedAt: existing.startedAt, expiresAt: existing.expiresAt, operationId };
  }
  const party = await createPartySession({ PARTY_QUEUE_KV: kv }, boundHost, {
    key, now, startedAt: active ? Date.parse(existing.startedAt) : now, durationSeconds: 86400,
    expiresAt: testId ? now + 86400000 : PLAN.end,
    operationId,
  });
  await complete(operationId);
  return { mode: testId ? "test" : "production", live: true,
    startedAt: party.startedAt, expiresAt: party.expiresAt, operationId };
}

export async function durableJournal(directory = STATE_DIR) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  async function syncDirectory() {
    const directoryHandle = await open(directory, "r");
    try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
  }
  return {
    async claim(id) {
      const handle = await open(resolve(directory, `${id}.json`), "wx", 0o600);
      try { await handle.writeFile(JSON.stringify({ status: "claimed", id })); await handle.sync(); }
      finally { await handle.close(); }
      await syncDirectory();
    },
    async complete(id) {
      const temporary = resolve(directory, `${id}.completed`);
      const handle = await open(temporary, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify({ status: "completed", id })); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temporary, resolve(directory, `${id}.json`));
      await syncDirectory();
    },
  };
}

export async function cloudflareKV({ token, accountId: configuredAccountId, workerName, fetchImpl = fetch }) {
  const base = "https://api.cloudflare.com/client/v4";
  async function request(path, options = {}, raw = false) {
    const response = await fetchImpl(base + path, {
      ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (response.status === 404 && raw) return null;
    if (!response.ok) throw new Error(`Cloudflare request failed (${response.status})`);
    if (raw) return response.text();
    const data = await response.json();
    if (!data.success) throw new Error("Cloudflare request refused");
    return data.result;
  }
  // Binding settings are the deployed Worker's authority, including auto-created KV.
  const accounts = configuredAccountId ? [{ id: configuredAccountId }] : await request("/accounts?per_page=50");
  const matches = [];
  for (const account of accounts) {
    const response = await fetchImpl(`${base}/accounts/${account.id}/workers/scripts/${encodeURIComponent(workerName)}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Worker settings unavailable (${response.status})`);
    const settings = await response.json();
    if (!settings.success) throw new Error("Worker settings refused");
    const binding = settings.result.bindings?.find(item => item.name === "PARTY_QUEUE_KV" && item.type === "kv_namespace");
    if (binding?.namespace_id) matches.push({ accountId: account.id, namespaceId: binding.namespace_id });
  }
  if (matches.length !== 1) throw new Error("Cannot uniquely resolve deployed party KV binding");
  const { accountId, namespaceId } = matches[0];
  const prefix = `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/`;
  return {
    async get(key, type) {
      const text = await request(prefix + encodeURIComponent(key), {}, true);
      if (text === null || type !== "json") return text;
      try { return JSON.parse(text); }
      catch { throw new Error("Stored Cloudflare value is not valid JSON"); }
    },
    async put(key, value, options = {}) {
      const query = options.expirationTtl ? `?expiration_ttl=${options.expirationTtl}` : "";
      await request(prefix + encodeURIComponent(key) + query, { method: "PUT", body: value });
    },
    async delete(key) { await request(prefix + encodeURIComponent(key), { method: "DELETE" }); },
  };
}

async function main() {
  const [command, flag, testId, ...extra] = process.argv.slice(2);
  if (extra.length || (flag && (flag !== "--test-id" || !testId))) throw new Error("Usage: scheduled-party.mjs start|status|close [--test-id UNIQUE-ID]");
  if (testId) testKey(testId);
  const envText = await readFile(resolve(homedir(), ".config/cloudflare/deploy.env"), "utf8");
  const match = envText.match(/^\s*(?:export\s+)?CLOUDFLARE_API_TOKEN\s*=\s*(.*?)\s*$/m);
  const token = match?.[1]?.replace(/^(["'])(.*)\1$/, "$2");
  if (!token) throw new Error("Shared Cloudflare deploy token unavailable");
  const accountMatch = envText.match(/^\s*(?:export\s+)?CLOUDFLARE_ACCOUNT_ID\s*=\s*(.*?)\s*$/m);
  const accountId = accountMatch?.[1]?.replace(/^(["'])(.*)\1$/, "$2");
  const config = JSON.parse(await readFile(resolve(ROOT, "wrangler.jsonc"), "utf8"));
  const kv = await cloudflareKV({ token, accountId, workerName: config.name });
  const journal = command === "start" ? await durableJournal() : {};
  console.log(JSON.stringify(await runParty({ kv, command, testId, ...journal })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Never log remote response bodies or saved host metadata.
    console.error(error.code === "EEXIST" ? "Operation already claimed; refusing replay (inspect durable receipt)" : error.message);
    process.exitCode = 1;
  });
}
