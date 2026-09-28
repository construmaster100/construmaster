// Prueba automatica de la pagina unica (index.html) en Chrome real.
// Recorre todas las pestañas y rutas principales y verifica:
//   - que no haya errores de JavaScript ni archivos locales faltantes,
//   - que el navbar no se mueva entre pestañas (regla del usuario),
//   - que cada vista muestre contenido.
// Requisitos (solo para probar, no para usar la pagina):
//   cd tools && npm install puppeteer-core@23 --no-save
//   Chrome instalado. Ruta por defecto: C:/Program Files/Google/Chrome/Application/chrome.exe
//   (otra ruta: variable de entorno CHROME="ruta\\a\\chrome.exe")
// Uso: node tools/probar_pagina.js
const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) {
  console.error('Falta puppeteer-core. Instalar con: cd tools && npm install puppeteer-core@23 --no-save');
  process.exit(1);
}

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGINA = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/').replace(/ /g, '%20');
const RUTAS = [
  'inicio', 'proyectos', 'proyectos/san-esteban', 'proyectos/san-esteban/04_ESTRUCTURA',
  'servicios', 'servicios/salario', 'servicios/catalogo', 'servicios/c/ES04',
  'materiales', 'herramientas', 'presupuesto', 'presupuesto/v1-2', 'presupuesto/v1-4', 'presupuesto/programacion', 'presupuesto/etapas', 'presupuesto/mp', 'presupuesto/etapa-4',
  'construccion', 'construccion/remodelacion', 'obra-nueva', 'diseno', 'estadisticas', 'proveedores', 'proveedores/truper', 'proveedores/empresa-0', 'proveedores/empresas', 'proveedores/ferreterias', 'proveedores/casas-prefabricadas', 'proveedores/alquiler', 'proveedores/alquiler/c-0', 'proveedores/alquiler/e-0', 'servicios/edificacion',
];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const navegador = await puppeteer.launch({ executablePath: CHROME });
  const p = await navegador.newPage();
  await p.setViewport({ width: 1500, height: 950 });
  const errores = [];
  p.on('pageerror', (e) => errores.push('JS: ' + e.message));
  p.on('requestfailed', (r) => { if (!/^https?:/.test(r.url())) errores.push('Archivo faltante: ' + decodeURI(r.url())); });
  await p.goto(PAGINA + '#inicio');
  await esperar(800);
  const posicionNavbar = () => p.$$eval('#navbar a', (x) => x.map((a) => Math.round(a.getBoundingClientRect().left) + ':' + Math.round(a.getBoundingClientRect().width)).join());
  const referencia = await posicionNavbar();
  let fallas = 0;
  for (const ruta of RUTAS) {
    await p.evaluate((h) => { location.hash = h; }, '#' + ruta);
    // Las vistas del inventario cargan ~10 MB la primera vez.
    await esperar(/materiales|herramientas|estadisticas|proveedores/.test(ruta) ? 7000 : 1200);
    const estable = (await posicionNavbar()) === referencia;
    const texto = await p.$eval('main .vista.activa', (v) => v.innerText.replace(/\s+/g, ' ').trim().length);
    const ok = estable && texto > 50;
    if (!ok) fallas++;
    console.log(`${ok ? 'OK   ' : 'FALLA'} #${ruta.padEnd(36)} navbar ${estable ? 'estable' : 'SE MOVIO'} · ${texto} caracteres`);
  }
  const hora = await p.$eval('#reloj-hora', (e) => e.textContent);
  console.log('Reloj:', hora);
  console.log(errores.length ? errores.join('\n') : 'Sin errores de JavaScript ni archivos faltantes');
  console.log(fallas || errores.length ? `RESULTADO: ${fallas} ruta(s) con falla, ${errores.length} error(es)` : 'RESULTADO: todo correcto');
  await navegador.close();
  process.exit(fallas || errores.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
