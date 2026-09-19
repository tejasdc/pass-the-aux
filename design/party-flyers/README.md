# Party flyers

Guests are standing in a busy, dim house-party room, looking for a quick way
to contribute music. Large headlines invite them closer; high-contrast QR
codes and a prominent address provide the action. All essential content is
inset from the sheet edge for ordinary home printing.

`sketches.svg` preserves the composition studies made before the final HTML.
Field translates the site's eleven bowed incisions into flat teal pigment;
Flow freezes its 44 analytical currents into a print; Afterglow builds a
chromatic aperture around the scan target. Their layouts deliberately differ.

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
quiet space on all sides. The original Suprematist downloads are preserved.

The gallery is static HTML, with four columns on desktop, two on intermediate
screens, and one on phones. Thumbnail links open the full PNG; each design
also has separate Print (PDF) and Save image links.
