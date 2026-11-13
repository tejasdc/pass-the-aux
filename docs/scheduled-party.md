# One-time saved-host party start

The server command opens the existing bound host's party without Spotify login.
It requires saved token identity to match the bound host and a refresh token to
exist. It never changes saved tokens. The Worker keeps its existing Spotify
refresh path when guests use the app. A revoked Spotify authorization can still
require the host to sign in.

Production is fixed to **14 November 2026, 2pm New York** through **15 November,
2pm New York** (19:00 UTC both days). Execution before start or at/after expiry
is refused. Late execution retains the fixed end. Manual OAuth starts retain
their existing eight-hour duration.

## Server command

From the delivered repository checkout:

```sh
node scripts/scheduled-party.mjs status
node scripts/scheduled-party.mjs preflight
node scripts/scheduled-party.mjs start
```

The delivering session separately queues the one-time Concierge turn for
`2026-11-14T19:00:00Z`; installing this code does not schedule or open anything.
The scheduled agent runs `start`, reports the sanitized result and confirms the
public party-status response. No playback is started and no host browser cookie
is created. End production parties from the authenticated host page.

The command reads `~/.config/cloudflare/deploy.env`, using the existing shared
token and account configuration. It resolves the namespace from the deployed
Worker's KV binding. Without an account setting it requires account-list access.
The token needs Worker settings read and Workers KV storage read/write. Add
missing permission to the existing shared token, never create another token.

## Isolated Cloudflare check

Replace the example with a fresh unique identifier for each check, keeping the
same identifier for start, status and close:

```sh
node scripts/scheduled-party.mjs start --test-id aux-check-20261113-unique
node scripts/scheduled-party.mjs status --test-id aux-check-20261113-unique
node scripts/scheduled-party.mjs close --test-id aux-check-20261113-unique
node scripts/scheduled-party.mjs status --test-id aux-check-20261113-unique
node scripts/scheduled-party.mjs status
```

Test mode reads real host metadata but writes/deletes only `party:test:<id>`.
The Worker ignores these keys, so guests remain gated. Tests have no date guard
and expire after 24h. KV propagation can delay reads; poll status rather than
replay a start. This proves storage and custody, not live guest acceptance.

## Replay and recovery

Before any remote write, the command exclusively creates and syncs a receipt in
`~/.local/state/pass-the-aux/`. Completion replaces it with a synced completed
receipt. Both states refuse replay, including after the host ends the party.
An existing same-host party is extended to the planned end while preserving its
original start; an already-later expiry is preserved. Other hosts are refused.
Production has one stable operation id derived from the originating request;
test operations use the test id. The claim is server-local: do not run production
from another machine or user home.

After an uncertain write, never remove a receipt to retry. Inspect its state and
read the remote party first: the write might already have succeeded. Ambiguous
results stay claimed for evidence-based recovery. Receipts contain no tokens.

Checks: `npm run test:scheduled-party` and `npm run test:worker`.

2026-11-13 preflight: the shared token can read Worker settings but KV reads
return HTTP 401/code 10000. Cloudflare-backed isolated acceptance is blocked
until the existing token has Workers KV Storage Edit permission. No successful
live test or production start is claimed.
