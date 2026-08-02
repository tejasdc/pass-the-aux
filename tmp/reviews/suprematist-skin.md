# Suprematist Skin Summary

## Scope

- Renamed the client experience to Pass the Aux across the app shell, closed-party state, host page, document title, meta tags, and social tags.
- Replaced the neon-rave visual system with a warm gallery-cream suprematist skin inspired by `design/moma-mockups/1-suprematist.html` and `design/inspiration/IMG_6527.jpeg`.
- Rebuilt the ambient background as a calm physics toy: flat shapes drift, collide, ripple on taps, drag, and fling. Animation pauses when the tab is hidden and becomes static for `prefers-reduced-motion`.
- Restyled real app states: guest live view, now-playing album art/progress, queue rows, search overlay/results/errors, closed-party state, toast, and `/host`.
- Added quiet provenance footers on guest and host pages linking to MoMA's page for Kazimir Malevich's "Suprematist Painting" (1916-17).
- Updated `README.md` with the new name, selling point, design provenance, friend-host workflow, deploy-your-own instructions, and Cloudflare Deploy button.
- Updated `CLAUDE.md` status so future agents know the rename, redesign, and README additions are complete.

## Verification

- `npm --prefix client run build`: passed.
- Local browser inspection: blocked because Vite could not bind to local ports in this sandbox (`listen EPERM` on `127.0.0.1:5173` and `0.0.0.0:5174`).
- `npm run test:worker`: passed.
- `npx wrangler deploy --dry-run`: passed with exit code 0; Wrangler printed a sandbox-only EPERM while trying to write its log file under `~/Library/Preferences/.wrangler/logs`, then completed the custom build, asset scan, binding report, and `--dry-run: exiting now`.
