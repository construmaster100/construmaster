const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('pageerror', e => errores.push('PAGEERROR: ' + String(e)));
  page.on('requestfailed', r => errores.push('FAILED: ' + r.url() + ' - ' + (r.failure() && r.failure().errorText)));
  page.on('console', m => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text()); });

  const url = 'file:///F:/Modelo%20de%20Presupuesto/Presupuesto%20de%20obra/pages/catalogo%20comfer/index.html';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  console.log('vista inicial:', await page.evaluate(() => document.querySelector('h2') ? document.querySelector('h2').textContent : 'NO H2'));
  const imgs1 = await page.locator('.tarjeta-producto img').count();
  console.log('imgs en vista inicial (productos):', imgs1);
  if (imgs1) {
    const nw = await page.locator('.tarjeta-producto img').first().evaluate(el => el.naturalWidth);
    const src = await page.locator('.tarjeta-producto img').first().getAttribute('src');
    console.log('primera img src:', src, 'naturalWidth:', nw);
  }
  await page.screenshot({ path: 'F:/Modelo de Presupuesto/Presupuesto de obra/pages/catalogo homecenter/scripts/_comfer_file_check.png', fullPage: false });
  console.log('errores:', errores.slice(0, 15));
  await browser.close();
})();
