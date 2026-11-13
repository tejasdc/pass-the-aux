import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import worker from "../src/index.js";
import { runParty, PLAN, durableJournal, cloudflareKV, testKey } from "../../scripts/scheduled-party.mjs";

function fixture() {
  const records = new Map([
    ["host:spotify-user-id", "host"],
    ["host:tokens", JSON.stringify({ hostUserId: "host", refreshToken: "private", accessToken: "private-access" })],
  ]);
  const writes = [];
  const kv = {
    async get(key, type) { const value = records.get(key) ?? null; return value && type === "json" ? JSON.parse(value) : value; },
    async put(key, value, options) { writes.push({ key, options }); records.set(key, value); },
    async delete(key) { writes.push({ key, delete: true }); records.delete(key); },
  };
  return { records, writes, kv };
}
async function journal() { return durableJournal(await mkdtemp(join(tmpdir(), "aux-party-test-"))); }

{
  const { kv, records, writes } = fixture();
  const state = await journal();
  const args = { kv, ...state, command: "start", now: PLAN.start };
  await assert.rejects(runParty({ ...args, now: PLAN.start - 1 }), /Outside/);
  await assert.rejects(runParty({ ...args, now: PLAN.end }), /Outside/);
  assert.equal(writes.length, 0);
  const result = await runParty(args);
  assert.equal(result.expiresAt, "2026-11-15T19:00:00.000Z");
  assert.equal(writes[0].options.expirationTtl, 86400);
  assert.equal(JSON.parse(records.get("party:session")).durationSeconds, 86400);
  records.delete("party:session"); // Simulate host ending it. Replay must not reopen.
  await assert.rejects(runParty(args), error => error.code === "EEXIST");
  assert.equal(records.has("party:session"), false);
}
{
  const { kv, records, writes } = fixture();
  const state = await journal();
  const args = { kv, ...state, command: "start", now: PLAN.start, testId: "isolated-party-test-123456" };
  const tokensBefore = records.get("host:tokens");
  await runParty(args);
  assert.equal((await runParty({ ...args, command: "status" })).live, true);
  await runParty({ ...args, command: "close" });
  assert.equal((await runParty({ ...args, command: "status" })).live, false);
  assert.equal(records.has("party:session"), false);
  assert.equal(records.get("host:tokens"), tokensBefore);
  assert.ok(writes.every(write => write.key === testKey(args.testId)));
  await assert.rejects(runParty(args), error => error.code === "EEXIST");
  await assert.rejects(runParty({ ...args, testId: "../party:session" }), /unique/);
  await assert.rejects(runParty({ ...args, command: "close", testId: undefined }), /restricted/);
  const response = await worker.fetch(new Request("https://aux.test/api/search?q=x"), { PARTY_QUEUE_KV: kv });
  assert.equal(response.status, 403, "isolated test must not open guest routes");
}
for (const tokens of [null, { hostUserId: "other", refreshToken: "x" }, { hostUserId: "host" }, { hostUserId: "host", refreshToken: "x" }]) {
  const { kv, records, writes } = fixture();
  records.set("host:tokens", JSON.stringify(tokens));
  await assert.rejects(runParty({ kv, ...await journal(), command: "start", now: PLAN.start }), /Saved host/);
  assert.equal(writes.length, 0);
}
{
  const { kv, records, writes } = fixture();
  const originalStart = new Date(PLAN.start - 3600000).toISOString();
  records.set("party:session", JSON.stringify({ hostUserId: "host", startedAt: originalStart,
    expiresAt: new Date(PLAN.start + 7 * 3600000).toISOString() }));
  const preflight = await runParty({ kv, command: "preflight", now: PLAN.start - 1000 });
  assert.equal(preflight.ready, true);
  assert.equal(writes.length, 0);
  const result = await runParty({ kv, ...await journal(), command: "start", now: PLAN.start });
  assert.equal(result.startedAt, originalStart);
  assert.equal(result.expiresAt, new Date(PLAN.end).toISOString());
}
{
  const { kv, records, writes } = fixture();
  const original = JSON.stringify({ hostUserId: "host", startedAt: new Date(PLAN.start - 3600000).toISOString(),
    expiresAt: new Date(PLAN.end + 3600000).toISOString() });
  records.set("party:session", original);
  const result = await runParty({ kv, ...await journal(), command: "start", now: PLAN.start });
  assert.equal(result.preserved, true);
  assert.equal(writes.length, 0);
  assert.equal(records.get("party:session"), original);
}
{
  const { kv, records } = fixture();
  records.set("party:session", JSON.stringify({ hostUserId: "other", expiresAt: new Date(PLAN.end).toISOString() }));
  await assert.rejects(runParty({ kv, ...await journal(), command: "start", now: PLAN.start }), /host mismatch/);
}
{
  const { kv } = fixture();
  const directory = await mkdtemp(join(tmpdir(), "aux-ambiguous-test-"));
  const state = await durableJournal(directory);
  kv.put = async () => { throw new Error("network interrupted after possible write"); };
  const args = { kv, ...state, command: "start", now: PLAN.start };
  await assert.rejects(runParty(args), /network interrupted/);
  assert.equal(JSON.parse(await readFile(join(directory, `${PLAN.id}.json`), "utf8")).status, "claimed");
  await assert.rejects(runParty(args), error => error.code === "EEXIST");
}
{
  const calls = [];
  const kv = await cloudflareKV({ token: "private", accountId: "configured", workerName: "existing-worker", fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/settings")) return Response.json({ success: true, result: { bindings: [
      { name: "PARTY_QUEUE_KV", type: "kv_namespace", namespace_id: "discovered" },
    ] } });
    if (options.method === "PUT" || options.method === "DELETE") return Response.json({ success: true, result: null });
    return new Response("not found", { status: 404 });
  } });
  assert.equal(await kv.get("missing", "json"), null);
  await kv.put("party:test:id", "{}", { expirationTtl: 86400 });
  await kv.delete("party:test:id");
  assert.ok(calls.every(call => call.url.includes("/accounts/configured/")));
  assert.ok(calls[2].url.endsWith("/discovered/values/party%3Atest%3Aid?expiration_ttl=86400"));
}
{
  const kv = await cloudflareKV({ token: "private", accountId: "configured", workerName: "existing-worker", fetchImpl: async url => {
    if (url.endsWith("/settings")) return Response.json({ success: true, result: { bindings: [
      { name: "PARTY_QUEUE_KV", type: "kv_namespace", namespace_id: "discovered" },
    ] } });
    return new Response("private-token-fragment-invalid-json");
  } });
  await assert.rejects(kv.get("host:tokens", "json"), error =>
    error.message === "Stored Cloudflare value is not valid JSON");
}
console.log("scheduled party focused checks passed");
