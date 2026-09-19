# Party flyers

Guests are standing in a busy, dim house-party room, looking for a quick way
to contribute music. Large headlines invite them closer; high-contrast QR
codes and a small fallback address provide the action. All essential content is
inset from the sheet edge for ordinary home printing.

The three signs combine theme artwork with casual house-party invitations:
Suprematist uses black planes, a vermilion thrust and cobalt counterstroke;
Flow uses dense ink currents and a vermilion ribbon; Winamp uses a beveled
charcoal skin, custom vector LED lettering and 22 segmented fire-spectrum bars.
Field and Afterglow posters and their original studies remain in git history only.
Copy stays
limited to “join the jam”, “queue up a song”, “scan here” and the small fallback
address. Each QR has a 290px code and 44px white quiet zone at source size.

Edit each theme's `index.html`, then from the repository root:

```sh
NODE_PATH=/tmp/signbuild/node_modules node design/party-flyers/render.cjs
npm --prefix client run build
```

The render environment needs Playwright with Chromium, pngjs, jsqr, and
`pdfinfo` (Poppler). `NODE_PATH` can point to any installation of these node
packages. Fonts are bundled with their licenses so the posters render offline.
No external font or image service is involved.

Outputs are in `client/public/flyer/`: named PDF/PNG downloads and small JPEG
gallery previews. PDFs include backgrounds and must contain exactly one US
Letter page. PNGs are 2550×3300 (300 pixels per printed inch). Each render
checks the full PNG's QR payload, document bounds, PDF size and page count.
The QR uses unmodified black modules on white with at least four modules of
quiet space on all sides. Suprematist lives in `suprematist/index.html` and
replaces the existing `pass-the-aux-flyer.*` downloads. The legacy sign source
redirects to this source and its render command delegates here. Caveat and Permanent
Marker are bundled with their upstream Google Fonts licenses in `assets/`.

The gallery is static HTML, with three columns on desktop, two on intermediate
screens, and one on phones. Thumbnail links open the full PNG; each design
also has separate Print (PDF) and Save image links.
