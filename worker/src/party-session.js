export const PARTY_SESSION_KEY = "party:session";
export const PARTY_SESSION_TTL_SECONDS = 8 * 60 * 60;

// Trusted callers choose the lifetime; public routes never accept these options.
export async function createPartySession(env, hostUserId, {
  key = PARTY_SESSION_KEY,
  now = Date.now(),
  startedAt = now,
  durationSeconds = PARTY_SESSION_TTL_SECONDS,
  expiresAt = now + durationSeconds * 1000,
  operationId,
} = {}) {
  if (!hostUserId || !Number.isSafeInteger(durationSeconds) || durationSeconds <= 0 ||
      !Number.isFinite(now) || !Number.isFinite(startedAt) || !Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error("Invalid party session");
  }
  const session = {
    live: true, hostUserId,
    startedAt: new Date(startedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    durationSeconds,
    ...(operationId ? { operationId } : {}),
  };
  await env.PARTY_QUEUE_KV.put(key, JSON.stringify(session), {
    expirationTtl: Math.ceil((expiresAt - now) / 1000),
  });
  return session;
}

export async function getPartySession(env) {
  const session = await env.PARTY_QUEUE_KV.get(PARTY_SESSION_KEY, "json");
  if (!session?.expiresAt) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    await env.PARTY_QUEUE_KV.delete(PARTY_SESSION_KEY);
    return null;
  }
  return session;
}
