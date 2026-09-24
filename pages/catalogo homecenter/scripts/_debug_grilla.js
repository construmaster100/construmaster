const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errores = [];
  page.on('pageerror', e => errores.push('PAGEERROR: ' + String(e)));
  const url = 'file:///F:/Modelo%20de%20Presupuesto/Presupuesto%20de%20obra/pages/catalogo%20comfer/index.html';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const cats = await page.evaluate(() => Array.from(document.querySelectorAll('[data-vista^="cat-"]'))
    .map(e => e.getAttribute('data-vista'))
    .filter(v => v.split('-').length && !v.includes('--'))
  );
  // vistas que son SOLO 'cat-X' (ver todas en grilla), sin sub
  const soloDept = Array.from(new Set(cats)).filter(v => {
    // heuristica: probamos click y vemos si main-contenido queda vacio o con error
    return true;
  });

  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('.item-capitulo')).filter(b => b.textContent.includes('Ver todas en grilla')).map(b => b.getAttribute('data-vista')));
  console.log('botones Ver todas en grilla:', btns);

  for (const v of btns) {
    errores.length = 0;
    await page.evaluate((vv) => { document.querySelector('[data-vista="' + vv + '"]').click(); }, v);
    await page.waitForTimeout(300);
    const h2 = await page.evaluate(() => document.querySelector('#main-contenido h2') ? document.querySelector('#main-contenido h2').textContent : 'SIN H2');
    const bloques = await page.locator('.bloque-subcat').count();
    console.log(v, '-> h2:', h2, '| bloques:', bloques, '| errores:', errores.length ? errores : 'ninguno');
  }
  await browser.close();
})();
