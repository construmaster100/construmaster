const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('requestfailed', r => errores.push('FAILED: ' + r.url() + ' - ' + (r.failure() && r.failure().errorText)));

  await page.goto('file:///F:/Modelo%20de%20Presupuesto/Presupuesto%20de%20obra/pages/catalogo%20homecenter/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.querySelector('[data-vista="dep-materiales-de-construccion"]').click(); });
  await page.waitForTimeout(300);
  await page.locator('details.detalle-productos').first().locator('summary').click();
  await page.waitForTimeout(500);
  const imgs = await page.locator('.tarjeta-subcat img').all();
  let naturalOk = 0, naturalBad = 0;
  for (const im of imgs.slice(0, 10)) {
    const nw = await im.evaluate(el => el.naturalWidth);
    if (nw > 0) naturalOk++; else naturalBad++;
  }
  console.log('Homecenter file:// -> naturalOk:', naturalOk, 'naturalBad:', naturalBad, 'total imgs:', imgs.length);
  console.log('errores:', errores.slice(0, 10));
  await browser.close();
})();
