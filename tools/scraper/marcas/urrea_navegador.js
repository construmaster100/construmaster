// Catalogo oficial de GRUPO URREA en Colombia (co.urrea.com: Urrea, Surtek, Foy, Lock...) con navegador real.
// El sitio esta detras de Incapsula: se usa Chrome (puppeteer-core) y las consultas a su GraphQL publico se hacen DESDE la pagina,
// con la vista de tienda "urrea_co" (precios en COP). Autorizado por el usuario (27/09/2026).
// Protocolo: piloto 10 % de las paginas de resultados (semilla fija) -> auditoria 5 % contra la ficha publicada
//            (titulo og:title y precio data-price-amount) -> catalogo completo solo si la precision es >= 95 %.
// Salidas: Inventario_urrea.xlsx (Urrea y demas marcas del grupo), Inventario_surtek.xlsx, Inventario_foy.xlsx en sus carpetas.
//   node tools/scraper/marcas/urrea_navegador.js
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer-core');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const PROV = path.join(RAIZ, 'pages', 'PROVEEDORES');
const CARPETAS = { Urrea: 'Grupo A/03 - Urrea', Surtek: 'Grupo A/04 - Surtek', Foy: 'Grupo C/30 - Foy' };
const VERIFICACION = path.join(PROV, 'verificacion', 'Ferreterias_piloto_auditoria.xlsx');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Por defecto Colombia (precios COP). Con TIENDA=urrea_mx BASE=https://urrea.com SOLO_MARCA=Foy se toma una marca del catalogo de Mexico
// (precio en MXN anotado en la descripcion; el campo PRECIO queda vacio para no mezclar monedas).
const BASE = process.env.BASE || 'https://co.urrea.com'; const TIENDA = process.env.TIENDA || 'urrea_co'; const SOLO = process.env.SOLO_MARCA || '';
const MXN = TIENDA === 'urrea_mx';
const SEMILLA = 20260927; const PAUSA = Number(process.env.PAUSA_MS) || 2000; const UMBRAL = 0.95; const TAM = 100;
const MARCAS = ['Urrea', 'Surtek', 'Foy', 'Lock', 'Hermex', 'Mikels', 'Sata'];

const hora = () => new Date().toLocaleTimeString('es-CO');
const log = (...m) => console.log(`[${hora()}] Urrea:`, ...m);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
function aleatorio(s) { let a = s >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function muestra(lista, n, s) { const r = aleatorio(s); const c = lista.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c.slice(0, Math.min(n, c.length)); }
const txt = (s) => String(s == null ? '' : s).replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const normal = (s) => txt(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

let pagina; let ultimo = 0;
async function enPagina(fn, ...args) {
  for (let intento = 0; intento < 8; intento++) {
    const falta = ultimo + PAUSA - Date.now(); if (falta > 0) await esperar(falta); ultimo = Date.now();
    let r; try { r = await pagina.evaluate(fn, ...args); } catch (e) { r = { limite: true, error: e.message }; }
    if (!(r && r.limite)) return r;
    const s = 60 * (intento + 1); log(`el sitio pide pausa (${r.error || 'bloqueo'}): espera ${s} s`); await esperar(s * 1000);
    try { await pagina.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 90000 }); } catch (e) { /* reintento */ }
  }
  throw new Error('bloqueo persistente del sitio');
}

const CONSULTA = (pag) => `{products(search:"",pageSize:${TAM},currentPage:${pag}){total_count items{name sku url_key url_suffix stock_status small_image{url} categories{name level} price_range{minimum_price{final_price{value}}} custom_attributesV2{items{code ... on AttributeValue{value} ... on AttributeSelectedOptions{selected_options{label}}}}}}}`;
async function paginaResultados(pag) {
  return enPagina(async (q, tienda) => {
    const x = await fetch('/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Store: tienda }, body: JSON.stringify({ query: q }) });
    const s = await x.text(); if (!/^\s*\{/.test(s)) return { limite: true, error: 'respuesta no JSON (' + x.status + ')' };
    return JSON.parse(s);
  }, CONSULTA(pag), TIENDA);
}
function convertir(p) {
  const cats = (p.categories || []).map((c) => txt(c.name));
  // Marca: atributo "marca" del producto (Mexico etiqueta Foy asi); si no viene, la categoria de marca (Urrea, Surtek, Lock...).
  const attr = ((p.custom_attributesV2 || {}).items || []).find((a) => a.code === 'marca' || a.code === 'brand');
  const marcaAttr = attr ? txt(attr.value || ((attr.selected_options || [])[0] || {}).label || '') : '';
  const marca = (marcaAttr && marcaAttr.trim()) || cats.find((c) => MARCAS.includes(c)) || 'Urrea';
  const utiles = cats.filter((c) => !MARCAS.includes(c) && c !== 'Productos');
  const foto = (p.small_image && p.small_image.url || '').split('?')[0];
  const valor = Math.round(p.price_range.minimum_price.final_price.value) || null;
  return { nombre: txt(p.name), precio: MXN ? null : valor, descripcion: MXN && valor ? `Precio en Mexico: MXN ${valor.toLocaleString('es-CO')} (urrea.com)` : '', categoria: utiles[0] || '', subcategoria: utiles[utiles.length - 1] || '', marca,
    imagen: /placeholder/i.test(foto) ? '' : foto, url: `${BASE}/${p.url_key}${p.url_suffix || ''}`, sku: p.sku, disponibilidad: p.stock_status === 'IN_STOCK' ? 'Disponible' : 'Agotado' };
}

async function auditar(productos, n) {
  const filas = [];
  for (const p of muestra(productos, n, SEMILLA + 1)) {
    const f = await enPagina(async (u) => { const r = await fetch(u); const h = await r.text(); if (/_Incapsula_Resource/.test(h) && h.length < 5000) return { limite: true, error: 'desafio Incapsula' };
      const og = (h.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || ''; const tit = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const precios = [...h.matchAll(/data-price-amount="([\d.]+)"/g)].map((m) => Math.round(Number(m[1]))); return { estado: r.status, og, tit, precios }; }, p.url);
    const nombreOk = [f.og, f.tit].some((x) => normal(x) && (normal(x) === normal(p.nombre) || normal(x).includes(normal(p.nombre)) || normal(p.nombre).includes(normal(x))));
    const precioOk = MXN || (!p.precio && !f.precios.length) || f.precios.some((x) => p.precio && Math.abs(x - p.precio) / p.precio <= 0.01);
    filas.push({ p, f, ok: f.estado === 200 && nombreOk && precioOk, nombreOk, precioOk });
  }
  const buenos = filas.filter((x) => x.ok).length;
  return { filas, buenos, precision: filas.length ? buenos / filas.length : 0 };
}

async function guardarVerificacion(resumen, aud) {
  const libro = new ExcelJS.Workbook(); if (fs.existsSync(VERIFICACION)) await libro.xlsx.readFile(VERIFICACION);
  const hoja = SOLO ? SOLO + ' (' + TIENDA + ')' : 'Urrea'; const v = libro.getWorksheet(hoja); if (v) libro.removeWorksheet(v.id);
  const h = libro.addWorksheet(hoja);
  h.addRow(['INDICADOR', 'VALOR']).font = { bold: true }; Object.entries(resumen).forEach(([k, x]) => h.addRow([k, x])); h.addRow([]);
  h.addRow(['NOMBRE CAPTURADO', 'PRECIO CAPTURADO (COP)', 'TITULO EN LA FICHA', 'PRECIOS EN LA FICHA', 'NOMBRE OK', 'PRECIO OK', 'RESULTADO', 'URL']).font = { bold: true };
  aud.filas.forEach((x) => h.addRow([x.p.nombre, x.p.precio, x.f.og || x.f.tit, (x.f.precios || []).join(' / '), x.nombreOk ? 'si' : 'no', x.precioOk ? 'si' : 'no', x.ok ? 'correcto' : 'revisar', x.p.url]));
  [50, 16, 50, 20, 10, 10, 12, 60].forEach((w, i) => { h.getColumn(i + 1).width = w; });
  await libro.xlsx.writeFile(VERIFICACION);
}
async function excel(dir, archivo, filas) {
  fs.mkdirSync(dir, { recursive: true });
  const libro = new ExcelJS.Workbook(); const h = libro.addWorksheet('Inventario');
  h.columns = [['NOMBRE DEL PRODUCTO', 60], ['PRECIO', 14], ['CATEGORIA', 30], ['SUBCATEGORIA', 30], ['MARCA', 14], ['IMAGEN', 50], ['URL', 60], ['SKU', 14], ['DISPONIBILIDAD', 14], ['DESCRIPCION', 40]].map(([header, width]) => ({ header, width }));
  filas.forEach((p) => h.addRow([p.nombre, p.precio, p.categoria, p.subcategoria, p.marca, p.imagen, p.url, p.sku, p.disponibilidad, p.descripcion || '']));
  h.getRow(1).font = { bold: true };
  await libro.xlsx.writeFile(path.join(dir, archivo));
}

(async () => {
  const nav = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: null, args: ['--disable-blink-features=AutomationControlled', '--window-position=-2400,0', '--window-size=1200,800'] });
  try {
    pagina = await nav.newPage();
    await pagina.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 90000 });
    const primera = await paginaResultados(1);
    const total = primera.data.products.total_count; const paginas = Math.ceil(total / TAM);
    log(`productos en la vista ${TIENDA}: ${total} (${paginas} paginas de ${TAM})`);
    const nums = Array.from({ length: paginas }, (_, i) => i + 1);
    const piloto = [];
    for (const n of muestra(nums, Math.ceil(paginas * 0.10), SEMILLA)) { const d = n === 1 ? primera : await paginaResultados(n); piloto.push(...d.data.products.items.map(convertir).filter((p) => !SOLO || p.marca === SOLO)); }
    log(`piloto 10 %: ${piloto.length} productos; auditoria de ${Math.ceil(total * 0.05)} fichas`);
    const nAud = Math.max(1, Math.ceil((SOLO ? piloto.length * 10 : total) * 0.05)); const aud = await auditar(piloto, nAud);
    const resumen = { Marca: 'Grupo Urrea (Colombia)', Sitio: BASE, 'Vista de tienda': TIENDA, 'Productos en el sitio': total, 'Piloto (10 %)': piloto.length, 'Auditados (5 %)': aud.filas.length, Correctos: aud.buenos, Precision: (aud.precision * 100).toFixed(1) + ' %', Resultado: aud.precision >= UMBRAL ? 'APROBADO' : 'NO aprobado', Fecha: new Date().toLocaleString('es-CO') };
    await guardarVerificacion(resumen, aud);
    log(`auditoria ${aud.buenos}/${aud.filas.length} = ${(aud.precision * 100).toFixed(1)} %`);
    if (aud.precision < UMBRAL) { log('NO aprobado: se detiene (revisar hoja Urrea de la verificacion)'); return; }
    const todos = [];
    for (const n of nums) { const d = n === 1 ? primera : await paginaResultados(n); todos.push(...d.data.products.items.map(convertir).filter((p) => !SOLO || p.marca === SOLO)); if (n % 10 === 0) log(`completo: pagina ${n}/${paginas}, ${todos.length} productos`); }
    const grupos = {}; todos.forEach((p) => { const k = CARPETAS[p.marca] ? p.marca : 'Urrea'; (grupos[k] = grupos[k] || []).push(p); });
    for (const [marca, filas] of Object.entries(grupos)) {
      const dir = path.join(PROV, CARPETAS[marca]);
      await excel(dir, `Inventario_${marca.toLowerCase()}.xlsx`, filas);
      fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify({ meta: { etapa: 'completo', fuente: BASE, tienda: TIENDA, ...resumen, capturados: filas.length }, productos: filas }, null, 1));
    }
    resumen['Catalogo completo'] = todos.length; Object.entries(grupos).forEach(([m, f]) => { resumen['Productos ' + m] = f.length; }); await guardarVerificacion(resumen, aud);
    log(`COMPLETO: ${todos.length} productos -> ${Object.entries(grupos).map(([m, f]) => m + ' ' + f.length).join(', ')}`);
  } catch (e) { log('ERROR', e.message); } finally { await nav.close(); log('fin'); }
})();
