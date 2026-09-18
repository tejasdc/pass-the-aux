// Renders sign.html to a print PDF + phone PNG. Needs the qrcode (for qr.svg) and playwright npm packages; run with node from any dir that has them installed.
const { chromium } = require('playwright');
const path = require('path');
const dir = '/root/workspace/electric-love-party-queue/design/party-sign';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 3 });
  await page.goto('file://' + path.join(dir, 'sign.html'));
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
  console.log('fonts loaded:', fonts);
  const overflow = await page.evaluate(() => {
    const s = document.querySelector('.sheet');
    const last = document.querySelector('.steps').getBoundingClientRect();
    return { sheetH: s.getBoundingClientRect().height, fineBottom: last.bottom, urlW: document.querySelector('.url').getBoundingClientRect().width };
  });
  console.log(overflow);
  await page.screenshot({ path: path.join(dir, 'pass-the-aux-sign.png') });
  await page.pdf({ path: path.join(dir, 'pass-the-aux-sign.pdf'), width: '8.5in', height: '11in', printBackground: true, pageRanges: '1' });
  await browser.close();
})();
