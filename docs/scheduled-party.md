# One-time saved-host party start

The always-on server runs one Concierge scheduled turn, which invokes a small
HTTPS command. The existing Cloudflare Worker authenticates that command and
uses its own KV binding to open the saved host's party. There is no Cloudflare
Cron Trigger and no server access to the Cloudflare KV administration API.

The fixed plan is **November 14, 2026 at 2pm New York** through **November 15 at
2pm New York** (19:00 UTC both days). The shared plan module is the only source
for those times and the originating request identity. Both caller and Worker
refuse production starts before the window or at/after expiry. Late execution
retains the fixed end time.

## Credential and deployment

The private action uses a dedicated random bearer secret. The server copy is
`/root/.config/pass-the-aux/automation-token`, owned by root with mode 0600;
the Worker copy is the secret `AUX_AUTOMATION_TOKEN`. Install the Worker secret
through the existing shared Cloudflare deploy token and the normal Wrangler
secret command, passing the file on stdin. Never print or commit either copy.
No change to the Cloudflare account token's KV permissions is needed.

The private route is `/api/private/scheduled-party`, POST only, and accepts
exactly one of three commands. Authentication precedes even body parsing and
storage reads. The streamed JSON body is capped at 128 bytes, cannot specify
host identities, keys, dates or duration, and has no general hosting capability.
The CLI always calls the fixed HTTPS origin, refuses redirects and never retries.

## Commands on the server

```sh
node scripts/scheduled-party.mjs status
node scripts/scheduled-party.mjs rehearse
node scripts/scheduled-party.mjs start
```

`status` reads sanitized live-party and planned-operation metadata without
Spotify or storage writes. `rehearse` verifies saved Spotify credentials against
the bound host and reads Spotify's current profile, using the existing refresh
path if needed. It starts a unique isolated test party, reads it, deletes it in
a cleanup block, reads closure and compares the production party before/after.
It may refresh saved tokens, but never changes the host binding, production
party or playback. Transient Spotify refresh failures retain saved authorization;
a confirmed invalid grant can clear unusable tokens. Rehearsal returns no host
identity or token values. Test keys never grant guest access.

`start` repeats current-host verification, then opens a 24-hour party ending at
the planned time. An earlier same-host party is extended while preserving its
original start; an already-later expiry is preserved. A different host is refused.
Opening the authenticated host page through Spotify OAuth preserves an active
scheduled party instead of shortening it to the manual eight-hour default.
New manual parties retain eight hours. The command never starts playback or
creates a host browser cookie. Production closure stays on the host page.

The delivering session queues the one-time server turn for
`2026-11-14T19:00:00Z`. Installing/deploying this code does not schedule or open
anything. The scheduled agent runs `start`, reports its sanitized result and
checks public party status. A pre-event rehearsal proves real credentials and
storage custody; public guest acceptance remains a post-start check.

## Replay and recovery

Before sending a production request, the server exclusively creates and fsyncs
an operation receipt under `~/.local/state/pass-the-aux/`. Its identity derives
from the originating request. A lost response leaves it claimed; confirmed
success replaces it with a synced completed receipt. Both refuse replay after
the host ends a party. The Worker also writes a remote operation receipt before
changing the real party, and refuses a claimed/completed operation. Claim and
completion use separate immutable keys so a start writes each KV key only once;
status prefers the completion receipt when present.

KV is eventually consistent and cannot provide compare-and-swap. The fsynced
exclusive server claim is the single-caller authority: run production only from
this server and root home, never simultaneously from another machine or user.
Never delete a receipt or create a new operation to retry an uncertain effect.
Inspect local receipt plus remote `status`, establish whether the party exists,
and recover only from evidence. A rehearsal can safely be repeated because every
run uses a fresh isolated key, with a 24-hour expiry if cleanup cannot complete.
Tokens and host identities are absent from receipts and responses.
Rehearsal is refused after the planned end; status remains available for recovery.

Focused checks: `npm run test:scheduled-party` and `npm run test:worker`.

## Armed run and live evidence (2026-11-13)

The existing Wrangler channel deployed version
`03c769af-74be-472c-806a-9a6d7b4cbb0c` from main after both focused suites,
client build, fresh Claude Sonnet primary review and targeted Sol auth review.
The live server CLI status succeeded, proving the matching secret. One live
`rehearse` returned `rehearsed:true`, `testClosed:true`,
`productionUnchanged:true`, `durationSeconds:86400`, `live:false`. This also
exercised the Worker's real saved Spotify profile/refresh path. The public
party stayed `live:false`, guest search returned 403, and an unauthenticated
private action returned 401. The real party was never opened for this check.

Concierge request `531174b3-0b8c-4ed1-82c4-702722d236d5`, exact queued turn
`29756`, is armed for `2026-11-14T19:00:00.000Z`, expires at the fixed party
end and has no repetition. Verified in `sessions saved list`. Runtime:
GPT-6 Luna / Codex, always-on server, project
`/root/workspace/electric-love-party-queue`, conversation
`session:WzIsOTU4NiwxXQ`, named “Open Pass the Aux for the Diwali party”.
It calls the delivered CLI once, checks public live status/expiry and guest
search with read-only propagation polling, and posts its result in the original
Inbox thread rooted at
`capture:a32130f212a9db9df069c5fdf6e604adf9d3ecd216c3e396b020057624651aec`.

The schedule is armed, not yet fired. A future task result is not claimed here.
Cancel only this queued turn with `sessions saved cancel 29756` if Tejas asks;
keep its conversation and any operation receipts. The earlier account-change
question was explicitly withdrawn; no new Cloudflare account scope was added.
