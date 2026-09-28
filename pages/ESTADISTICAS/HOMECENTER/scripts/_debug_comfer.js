const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errores = [];
  page.on('pageerror', e => errores.push('PAGEERROR: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text()); });
  const url = 'file:///F:/Modelo%20de%20Presupuesto/Presupuesto%20de%20obra/pages/catalogo%20comfer/index.html';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const vistas = await page.evaluate(() => Array.from(document.querySelectorAll('[data-vista]')).map(e => e.getAttribute('data-vista')));
  const unicas = Array.from(new Set(vistas));
  console.log('total vistas distintas en sidebar:', unicas.length);

  for (const v of unicas) {
    errores.length = 0;
    await page.evaluate((vv) => { document.querySelector('[data-vista="' + vv + '"]').click(); }, v);
    await page.waitForTimeout(150);
    if (errores.length) {
      console.log('VISTA CON ERROR:', v);
      console.log(errores.slice(0, 3));
    }
  }
  console.log('listo');
  await browser.close();
})();
