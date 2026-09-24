const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errores = [];
  page.on('pageerror', e => errores.push('PAGEERROR: ' + String(e)));
  page.on('crash', () => errores.push('PAGE CRASHED'));
  const url = 'file:///F:/Modelo%20de%20Presupuesto/Presupuesto%20de%20obra/pages/catalogo%20comfer/index.html';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  console.time('click-paredes');
  await page.evaluate(() => { document.querySelector('[data-vista="cat-paredes"]').click(); });
  await page.waitForTimeout(300);
  console.timeEnd('click-paredes');

  console.time('expandir-paredes-426');
  await page.locator('details.detalle-productos').first().locator('summary').click();
  await page.waitForTimeout(1000);
  console.timeEnd('expandir-paredes-426');

  const cards = await page.locator('.tarjeta-producto').count();
  console.log('cards renderizadas:', cards);

  console.time('cambiar-a-griferias');
  await page.evaluate(() => { document.querySelector('[data-vista="cat-griferias"]').click(); });
  await page.waitForTimeout(300);
  console.timeEnd('cambiar-a-griferias');

  console.time('expandir-griferias-354');
  await page.locator('details.detalle-productos').first().locator('summary').click();
  await page.waitForTimeout(1000);
  console.timeEnd('expandir-griferias-354');
  const cards2 = await page.locator('.tarjeta-producto').count();
  console.log('cards griferias:', cards2);

  console.time('volver-resumen');
  await page.evaluate(() => { document.querySelector('[data-vista="resumen"]').click(); });
  await page.waitForTimeout(300);
  console.timeEnd('volver-resumen');
  const h2 = await page.evaluate(() => document.querySelector('#main-contenido h2') ? document.querySelector('#main-contenido h2').textContent : 'SIN H2');
  console.log('h2 tras volver a resumen:', h2);

  console.log('errores:', errores);
  await browser.close();
})();
