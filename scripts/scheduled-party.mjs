#!/usr/bin/env node
import { readFile, mkdir, open, rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLAN, AUTOMATION_PATH } from "../worker/src/party-automation.js";
export { PLAN };
const STATE_DIR = resolve(homedir(), ".local/state/pass-the-aux");
const TOKEN_PATH = "/root/.config/pass-the-aux/automation-token";

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

export async function invokeAutomation({ command, secret, fetchImpl = fetch,
  now = Date.now(), claim, complete }) {
  if (!["start", "status", "rehearse"].includes(command)) throw new Error("Use start, status or rehearse");
  if (command === "start") {
    if (now < PLAN.start || now >= PLAN.end) throw new Error("Outside scheduled party window");
    // No automatic retry, including when the server response was lost.
    await claim(PLAN.id);
  }
  const result = await fetchImpl(`https://aux.tejas.nyc${AUTOMATION_PATH}`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!result.ok) throw new Error(`Private party action failed (${result.status}); read status before recovery`);
  let value;
  try { value = await result.json(); }
  catch { throw new Error("Invalid private action response; read status before recovery"); }
  // Print only fields owned by this protocol, never arbitrary remote content.
  const safe = {};
  for (const field of ["live", "preserved", "rehearsed", "productionUnchanged", "testClosed"]) {
    if (typeof value[field] === "boolean") safe[field] = value[field];
  }
  for (const field of ["startedAt", "expiresAt", "plannedStart", "plannedEnd"]) {
    if (value[field] === null || (typeof value[field] === "string" && Number.isFinite(Date.parse(value[field])))) safe[field] = value[field];
  }
  if (value.operationId === PLAN.id) safe.operationId = PLAN.id;
  if (value.durationSeconds === 86400) safe.durationSeconds = 86400;
  if (["claimed", "completed"].includes(value.operation?.state)) safe.operation = { state: value.operation.state, operationId: PLAN.id };
  if (command === "start" && (value.live !== true || value.operationId !== PLAN.id)) throw new Error("Unconfirmed start response; read status before recovery");
  if (command === "rehearse" && (value.rehearsed !== true || value.testClosed !== true || value.productionUnchanged !== true)) throw new Error("Unconfirmed rehearsal; inspect status");
  if (command === "start") await complete(PLAN.id);
  return safe;
}

async function main() {
  const [command, ...extra] = process.argv.slice(2);
  if (extra.length || !["start", "status", "rehearse"].includes(command)) throw new Error("Usage: scheduled-party.mjs start|status|rehearse");
  const metadata = await stat(TOKEN_PATH);
  if (metadata.uid !== 0 || (metadata.mode & 0o077) || !metadata.isFile()) throw new Error("Automation credential must be a root-only file");
  const secret = (await readFile(TOKEN_PATH, "utf8")).trim();
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error("Invalid automation credential file");
  const journal = command === "start" ? await durableJournal() : {};
  console.log(JSON.stringify(await invokeAutomation({ command, secret, ...journal })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.code === "EEXIST" ? "Operation already claimed; refusing replay (inspect durable receipt)" :
      error.message.startsWith("Private party") || error.message.startsWith("Outside scheduled") || error.message.startsWith("Usage:") ? error.message :
      "Party automation failed; inspect status and local receipt before recovery");
    process.exitCode = 1;
  });
}
