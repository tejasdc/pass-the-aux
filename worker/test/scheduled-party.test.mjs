import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import worker from "../src/index.js";
import { handlePartyAutomation, AUTOMATION_PATH, PLAN } from "../src/party-automation.js";
import { invokeAutomation, durableJournal } from "../../scripts/scheduled-party.mjs";

const secret = "test-automation-secret-12345678901234567890";
function fixture() {
  const records = new Map([
    ["host:spotify-user-id", "host"],
    ["host:tokens", JSON.stringify({ hostUserId: "host", refreshToken: "private", accessToken: "private-access", expiresAt: Date.now() + 86400000 })],
  ]);
  const writes = [], reads = [];
  const kv = {
    async get(key, type) { reads.push(key); const value = records.get(key) ?? null; return value && type === "json" ? JSON.parse(value) : value; },
    async put(key, value, options) { writes.push({ key, options }); records.set(key, value); },
    async delete(key) { writes.push({ key, delete: true }); records.delete(key); },
  };
  return { records, writes, reads, kv, env: { PARTY_QUEUE_KV: kv, AUX_AUTOMATION_TOKEN: secret } };
}
function request(command, token = secret, additions = {}) {
  return new Request(`https://aux.test${AUTOMATION_PATH}`, { method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ command, ...additions }),
  });
}
async function journal() { return durableJournal(await mkdtemp(join(tmpdir(), "aux-party-test-"))); }

{
  const { env, reads, writes } = fixture();
  const verify = () => { throw new Error("must not verify"); };
  assert.equal((await handlePartyAutomation(request("start", "wrong"), env, verify, PLAN.start)).status, 401);
  for (const body of ["[]", "null", JSON.stringify({ command: "close" }), JSON.stringify({ command: "start", host: "x" }), JSON.stringify({ command: "rehearse", padding: "x".repeat(200) })]) {
    assert.equal((await handlePartyAutomation(new Request(`https://aux.test${AUTOMATION_PATH}`, {
      method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body,
    }), env, verify, PLAN.start)).status, 400);
  }
  for (const now of [PLAN.start - 1, PLAN.end]) assert.equal((await handlePartyAutomation(request("start"), env, verify, now)).status, 409);
  assert.equal(reads.length, 0);
  assert.equal(writes.length, 0);
}
{
  const { env, records, writes } = fixture();
  const before = records.get("party:session");
  const result = await handlePartyAutomation(request("rehearse"), env, async () => "host", PLAN.start - 1000);
  assert.deepEqual(await result.json(), { rehearsed: true, productionUnchanged: true, live: false, durationSeconds: 86400, testClosed: true });
  assert.equal(records.get("party:session"), before);
  assert.ok(writes.every(write => write.key.startsWith("party:test:")));
  assert.equal([...records.keys()].some(key => key.startsWith("party:test:")), false);
  assert.equal((await worker.fetch(new Request("https://aux.test/api/search?q=x"), env)).status, 403);
}
{
  const { env, kv, records } = fixture();
  const originalPut = kv.put;
  kv.put = async (...args) => { await originalPut(...args); throw new Error("response lost after write"); };
  assert.equal((await handlePartyAutomation(request("rehearse"), env, async () => "host", PLAN.start)).status, 502);
  assert.equal([...records.keys()].some(key => key.startsWith("party:test:")), false);
  assert.equal(records.has("party:session"), false);
}
{
  const { env, records, writes } = fixture();
  const originalStart = new Date(PLAN.start - 3600000).toISOString();
  records.set("party:session", JSON.stringify({ hostUserId: "host", startedAt: originalStart,
    expiresAt: new Date(PLAN.start + 7 * 3600000).toISOString() }));
  assert.equal((await handlePartyAutomation(request("start"), env, async () => "host", PLAN.start)).status, 200);
  const party = JSON.parse(records.get("party:session"));
  assert.equal(party.startedAt, originalStart);
  assert.equal(party.expiresAt, new Date(PLAN.end).toISOString());
  assert.equal(party.durationSeconds, 86400);
  assert.equal(writes.find(write => write.key === "party:session").options.expirationTtl, 86400);
  assert.equal(new Set(writes.map(write => write.key)).size, writes.length,
    "a production start must write each KV key at most once, including claim/completion");
  const status = await (await handlePartyAutomation(request("status"), env, async () => { throw new Error("status must not verify"); }, PLAN.start)).json();
  assert.equal(status.operation.state, "completed");
  records.delete("party:session");
  assert.equal((await handlePartyAutomation(request("start"), env, async () => "host", PLAN.start)).status, 409);
  assert.equal(records.has("party:session"), false);
}
{
  const { env, records, writes } = fixture();
  const original = JSON.stringify({ hostUserId: "host", startedAt: new Date(PLAN.start - 3600000).toISOString(), expiresAt: new Date(PLAN.end + 3600000).toISOString() });
  records.set("party:session", original);
  assert.equal((await (await handlePartyAutomation(request("start"), env, async () => "host", PLAN.start)).json()).preserved, true);
  assert.equal(records.get("party:session"), original);
  assert.ok(writes.every(write => write.key.startsWith("party:operation:")));
}
{
  const { env, records, writes } = fixture();
  records.set("party:session", JSON.stringify({ hostUserId: "other", expiresAt: new Date(PLAN.end).toISOString() }));
  assert.equal((await handlePartyAutomation(request("start"), env, async () => "host", PLAN.start)).status, 409);
  assert.equal(writes.length, 0);
}
{
  const originalFetch = globalThis.fetch;
  try {
    const { env, records, writes } = fixture();
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, "https://api.spotify.com/v1/me");
      assert.equal(options.method, undefined);
      return Response.json({ id: "wrong-current-host" });
    };
    assert.equal((await worker.fetch(request("rehearse"), env)).status, 409);
    assert.equal(calls, 1);
    assert.equal(writes.length, 0);
    records.set("host:tokens", JSON.stringify({ hostUserId: "other", accessToken: "private", refreshToken: "private" }));
    assert.equal((await worker.fetch(request("rehearse"), env)).status, 409);
    assert.equal(calls, 1);
    records.set("host:tokens", JSON.stringify({ hostUserId: "host", accessToken: "private" }));
    assert.equal((await worker.fetch(request("rehearse"), env)).status, 409);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
}
{
  const directory = await mkdtemp(join(tmpdir(), "aux-ambiguous-test-"));
  const state = await durableJournal(directory);
  let calls = 0;
  const args = { command: "start", secret, ...state, now: PLAN.start,
    fetchImpl: async () => { calls++; throw new Error("response lost after possible effect"); } };
  await assert.rejects(invokeAutomation({ ...args, now: PLAN.start - 1 }), /Outside/);
  assert.equal(calls, 0);
  await assert.rejects(invokeAutomation(args), /response lost/);
  assert.equal(JSON.parse(await readFile(join(directory, `${PLAN.id}.json`), "utf8")).status, "claimed");
  await assert.rejects(invokeAutomation(args), error => error.code === "EEXIST");
  assert.equal(calls, 1);
}
{
  let claims = 0;
  const output = await invokeAutomation({ command: "rehearse", secret, claim: async () => { claims++; }, fetchImpl: async (url, options) => {
    assert.equal(url, `https://aux.tejas.nyc${AUTOMATION_PATH}`);
    assert.equal(options.redirect, "error");
    assert.equal(options.body, JSON.stringify({ command: "rehearse" }));
    return Response.json({ rehearsed: true, testClosed: true, productionUnchanged: true, token: "MUST NOT RETURN", hostUserId: "private" });
  } });
  assert.equal(claims, 0);
  assert.equal(JSON.stringify(output).includes("private"), false);
  assert.equal(JSON.stringify(output).includes("MUST NOT RETURN"), false);
}
{
  const originalFetch = globalThis.fetch;
  try {
    for (const status of [429, 500]) {
      const { env, records } = fixture();
      env.SPOTIFY_CLIENT_ID = "test";
      env.SPOTIFY_CLIENT_SECRET = "test";
      const tokens = JSON.stringify({ hostUserId: "host", accessToken: "expired", refreshToken: "retain", expiresAt: 1 });
      records.set("host:tokens", tokens);
      globalThis.fetch = async url => {
        assert.equal(url, "https://accounts.spotify.com/api/token");
        return Response.json({ error: "temporarily_unavailable" }, { status });
      };
      assert.equal((await worker.fetch(request("rehearse"), env)).status, 502);
      assert.equal(records.get("host:tokens"), tokens, "transient refresh failures retain saved authorization");
      assert.equal(records.has("party:session"), false);
    }
    const { env, records } = fixture();
    env.SPOTIFY_CLIENT_ID = "test";
    env.SPOTIFY_CLIENT_SECRET = "test";
    records.set("host:tokens", JSON.stringify({ hostUserId: "host", accessToken: "expired", refreshToken: "saved", expiresAt: 1 }));
    globalThis.fetch = async url => url === "https://accounts.spotify.com/api/token" ?
      Response.json({ access_token: "refreshed", expires_in: 3600 }) : Response.json({ id: "host" });
    assert.equal((await worker.fetch(request("rehearse"), env)).status, 200);
    assert.equal(JSON.parse(records.get("host:tokens")).accessToken, "refreshed");
    assert.equal(records.has("party:session"), false);
  } finally { globalThis.fetch = originalFetch; }
}
console.log("scheduled party focused checks passed");
