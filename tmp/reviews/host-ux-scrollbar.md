# Host UX and closed-party scrollbar review

## Scrollbar audit

Scrollbar-related CSS after the fix:

- `.content`: `overflow-y: auto`, `overflow-x: hidden`, `scrollbar-width: thin`, `scrollbar-color: rgba(255, 255, 255, 0.22) transparent`.
- `.content::-webkit-scrollbar`: `width: 8px`.
- `.content::-webkit-scrollbar-track`: transparent.
- `.content::-webkit-scrollbar-thumb`: dim white overlay with transparent border/background clip.
- `.content::-webkit-scrollbar-thumb:hover`: slightly brighter dim white overlay.
- `.search-results`: `overflow-y: auto`, `scrollbar-width: thin`, `scrollbar-color: rgba(255, 255, 255, 0.22) transparent`.

Overflow rules that can affect the closed-party page:

- `body`: `overflow-x: hidden`.
- `.bg-container`: fixed full-viewport background with `overflow: hidden`.
- `.particles`: background particle layer with `overflow: hidden`.
- `.app`: fixed-height flex column constrained to `max-width: 480px`.
- `.content`: the only closed-page scroll container.
- `.no-party`: no overflow rule; now `min-height: 100%` inside `.content`.

Conclusion: the ugly purple bar was both a styled scrollbar and forced overflow. `.content` always had a bright-purple WebKit thumb, and the closed state exceeded the available content pane because `.content` had `padding-bottom: 100px` while `.no-party` used `min-height: calc(100vh - 80px)`. The fix limits the 100px bottom padding to live party content and sizes the closed state to the content pane, so no scrollbar is visible when the closed page fits. Real scrollbars now use a muted dark-theme treatment.

## Host auth change

- Removed all passphrase UI and active `HOST_KEY` plumbing.
- `/host` starts Spotify OAuth directly.
- The first Spotify `/me` profile id to complete host OAuth is stored at KV key `host:spotify-user-id`.
- Later OAuth callbacks from a different Spotify id redirect to `/host?error=host_mismatch` before saving tokens or starting a party.
- Successful host OAuth creates an HttpOnly host session cookie. `/api/party/end` and `/api/auth/logout` now require that host session, so guests cannot end or log out a party.
- README documents deleting `host:spotify-user-id` from KV to reset the bound host.

## Verification

- Passed: `npm run test:worker`.
- Passed: `npm --prefix client run build`.
- Passed: `npx wrangler deploy --dry-run` with exit 0. Wrangler printed a sandbox log-write warning for `~/Library/Preferences/.wrangler/logs`, then completed the dry run and listed `PARTY_QUEUE_KV`, `ASSETS`, and `ENVIRONMENT` bindings.
- Browser screenshot verification was blocked by the sandbox: Vite cannot bind to `127.0.0.1`, and `agent-browser` cannot start its daemon even when its home is redirected to `/private/tmp`.
- Static layout inspection of the actual CSS shows the closed content pane has no forced overflow at 1390x900 desktop (`contentHeight: 834`, `.no-party min-height: 834`) or 390x844 mobile (`contentHeight: 778`, `.no-party min-height: 778`).
