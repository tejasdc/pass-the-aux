// NODE_PATH=/tmp/signbuild/node_modules node design/party-flyers/render.cjs
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'client/public/flyer');

(async () => {
  const browser = await chromium.launch();
  const evidence = [];
  try {
    for (const slug of ['suprematist', 'flow', 'winamp']) {
      const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 3.125 });
      await page.goto('file://' + path.join(__dirname, slug, 'index.html'));
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: 'print' });
      const layout = await page.evaluate(() => {
        const outside = [...document.querySelectorAll('.sheet > *')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.left < 0 || r.top < 0 || r.right > 816 || r.bottom > 1056;
        }).map(el => el.className.baseVal ?? el.className);
        return { outside, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, fonts: [...document.fonts].map(f => ({family:f.family,status:f.status})) };
      });
      if (layout.outside.length || layout.width !== 816 || layout.height !== 1056) throw new Error(JSON.stringify({ slug, layout }));
      const filename = slug === 'suprematist' ? 'pass-the-aux-flyer' : slug;
      const pngPath = path.join(output, filename + '.png');
      await page.screenshot({ path: pngPath });
      await page.pdf({ path: path.join(output, filename + '.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
      const info = execFileSync('pdfinfo', [path.join(output, filename + '.pdf')], { encoding: 'utf8' });
      if (!/Pages:\s+1\b/.test(info) || !/Page size:\s+612 x 792 pts/.test(info)) throw new Error(info);
      const png = PNG.sync.read(fs.readFileSync(pngPath));
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      if (decoded?.data !== 'https://aux.tejas.nyc/') throw new Error('QR failed: ' + slug);
      if (slug === 'suprematist') {
        for (const extension of ['png', 'pdf']) {
          fs.copyFileSync(path.join(output, filename + '.' + extension), path.join(root, 'design/party-sign/pass-the-aux-sign.' + extension));
        }
      }
      evidence.push({ slug, width: png.width, height: png.height, qr: decoded.data, pdf: '1 page, 612 × 792 pt', layout });
      await page.close();
    }
    // Small gallery thumbnails avoid downloading three full-resolution print assets.
    for (const slug of ['pass-the-aux-flyer', 'flow', 'winamp']) {
      const page = await browser.newPage({ viewport: { width: 612, height: 792 }, deviceScaleFactor: 1 });
      await page.goto('file://' + path.join(output, slug + '.png'));
      await page.addStyleTag({ content: 'html,body{margin:0!important;padding:0!important;background:white!important}img{display:block!important;width:612px!important;height:792px!important;max-width:none!important;margin:0!important}' });
      await page.screenshot({ path: path.join(output, slug + '-preview.jpg'), type: 'jpeg', quality: 86 });
      await page.close();
    }
    console.log(JSON.stringify(evidence, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
