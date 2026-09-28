// Catalogo oficial de GRUPO TRUPER (Truper, Pretul, Truper Expert, Volteck, Foset, Fiero, Hermex, Klintek...) con navegador real.
// truper.com esta detras de Cloudflare: se usa Chrome (puppeteer-core) y todas las solicitudes se hacen DESDE la pagina,
// con la sesion del navegador, a 1 solicitud por segundo. Autorizado por el usuario (27/09/2026).
// Protocolo: piloto 10 % de los codigos (semilla fija) -> auditoria 5 % con metodo independiente (buscador /xearch/catalog)
//            -> catalogo completo solo si la precision es >= 95 %. Retoma desde data.json si se interrumpe.
// Precio: el catalogo publica precio publico en pesos MEXICANOS dentro de las imagenes; no aplica a Colombia (se deja vacio).
// Salidas: pages/PROVEEDORES/Grupo A/01 - Truper/Inventario_truper.xlsx (todas las marcas del grupo menos Pretul)
//          pages/PROVEEDORES/Grupo A/07 - Pretul/Inventario_pretul.xlsx; verificacion en Ferreterias_piloto_auditoria.xlsx (hojas Truper).
//   node tools/scraper/marcas/truper_navegador.js
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer-core');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const PROV = path.join(RAIZ, 'pages', 'PROVEEDORES');
const DIR_TRUPER = path.join(PROV, 'Grupo A', '01 - Truper');
const DIR_PRETUL = path.join(PROV, 'Grupo A', '07 - Pretul');
const DATOS = path.join(DIR_TRUPER, 'data.json');
const VERIFICACION = path.join(PROV, 'verificacion', 'Ferreterias_piloto_auditoria.xlsx');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SEMILLA = 20260927; const PAUSA = Number(process.env.PAUSA_MS) || 2500; const UMBRAL = 0.95;
const MARCAS = ['TRUPER EXPERT', 'TRUPER', 'PRETUL', 'VOLTECK', 'FOSET', 'FIERO', 'HERMEX', 'KLINTEK', 'LOCK'];

const hora = () => new Date().toLocaleTimeString('es-CO');
const log = (...m) => console.log(`[${hora()}] Truper:`, ...m);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
function aleatorio(s) { let a = s >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function muestra(lista, n, s) { const r = aleatorio(s); const c = lista.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c.slice(0, Math.min(n, c.length)); }
const normal = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const titulo = (s) => String(s).toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
function marcaDe(nombre) { const u = String(nombre).toUpperCase(); const m = MARCAS.find((x) => new RegExp(',\\s*' + x + '\\s*$').test(u)) || MARCAS.find((x) => u.includes(x)); return m ? titulo(m) : 'Truper'; }

let pagina; let ultimo = 0;
// El sitio limita el ritmo ("Rate limit" / 429): la funcion devuelve {limite:true} y se espera 60 s, 120 s... antes de reintentar.
async function enPagina(fn, ...args) {
  for (let intento = 0; intento < 8; intento++) {
    const falta = ultimo + PAUSA - Date.now(); if (falta > 0) await esperar(falta); ultimo = Date.now();
    let r; try { r = await pagina.evaluate(fn, ...args); } catch (e) { r = { limite: true, error: e.message }; }
    if (!(r && r.limite)) return r;
    const s = 60 * (intento + 1); log(`el sitio pide pausa: espera ${s} s`); await esperar(s * 1000);
    if (intento >= 2) { try { await pagina.goto('https://www.truper.com/CatVigente/', { waitUntil: 'networkidle2', timeout: 90000 }); } catch (e) { /* reintento */ } }
  }
  throw new Error('limite de ritmo persistente');
}

async function abrir() {
  const nav = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: null, args: ['--disable-blink-features=AutomationControlled', '--window-position=-2400,0', '--window-size=1200,800'] });
  pagina = await nav.newPage();
  await pagina.goto('https://www.truper.com/CatVigente/', { waitUntil: 'networkidle2', timeout: 90000 });
  return nav;
}

// 1) Codigos de todas las paginas del catalogo: POST /CatVigente/ficha/fichas con los modulos pagina*100+n
async function listarCodigos() {
  // ultima pagina: las paginas fuera de rango redirigen a la portada de Truper (-17.html)
  const ultima = await enPagina(async () => { let lo = 17, hi = 1500; const ok = async (n) => !/-17\.html$/.test((await fetch('/CatVigente/searchPage?page=' + n)).url) || n === 17; while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (await ok(m)) lo = m; else hi = m - 1; } return lo; });
  log('paginas del catalogo:', ultima);
  const codigos = new Map();
  for (let desde = 1; desde <= ultima; desde += 8) {
    const mods = []; for (let pg = desde; pg < desde + 8 && pg <= ultima; pg++) for (let k = 1; k <= 40; k++) mods.push(pg * 100 + k);
    const res = await enPagina(async (mods) => {
      const cuerpo = mods.map((m) => 'modulos%5B%5D=' + m).join('&');
      const r = await fetch('/CatVigente/ficha/fichas', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: cuerpo });
      const txt = await r.text(); if (r.status === 429 || /^Rate limit/i.test(txt)) return { limite: true }; let d; try { d = JSON.parse(txt); } catch (e) { return { limite: true }; } const out = [];
      for (const [mod, html] of Object.entries(d || {})) for (const m of String(html).matchAll(/codigo=(\d+)[^"]*"[^>]*>\s*<span class="code">\d+<\/span>\s*<span class="sku">([^<]*)<\/span>/g)) out.push([m[1], m[2].trim(), Math.floor(Number(mod) / 100)]);
      return out;
    }, mods);
    (Array.isArray(res) ? res : []).forEach(([codigo, clave, pag]) => { if (!codigos.has(codigo)) codigos.set(codigo, { codigo, clave, pagina: pag }); });
    if ((desde - 1) % 80 === 0) log(`paginas ${desde}-${Math.min(desde + 7, ultima)}: ${codigos.size} codigos`);
  }
  // Categoria: nombre de cada pagina (URL amigable a la que redirige searchPage)
  const paginas = [...new Set([...codigos.values()].map((c) => c.pagina))];
  const nombres = {};
  for (const pg of paginas) {
    const u = await enPagina(async (pg) => (await fetch('/CatVigente/searchPage?page=' + pg)).url, pg);
    nombres[pg] = titulo(decodeURIComponent(u.split('/').pop()).replace(/-\d+\.html.*$/, '').replace(/-(truper-expert|truper|pretul|volteck|foset|fiero|hermex|klintek)$/, '').replace(/-/g, ' '));
  }
  codigos.forEach((c) => { c.categoria = nombres[c.pagina] || ''; });
  return [...codigos.values()];
}

// 2) Ficha tecnica de un codigo
async function leerFicha(c) {
  const f = await enPagina(async (codigo) => {
    const r = await fetch('/ficha_tecnica/controllers/index.php?codigo=' + codigo + '&origen=nal');
    if (r.status === 429) return { limite: true };
    if (!r.ok) return { error: r.status };
    const h = await r.text(); if (/^Rate limit/i.test(h)) return { limite: true }; const d = new DOMParser().parseFromString(h, 'text/html');
    const t = d.body.innerText.replace(/\s+/g, ' ');
    const m = t.match(/C[oó]digo:\s*(\d+)\s*Clave:\s*(\S+)\s*(.*?)\s*Ir a p[aá]gina del cat[aá]logo\s*(.*?)(?:Archivos descargables|Fabricado|ESPECIFICACIONES)/);
    return { url: r.url, codigo: m && m[1], clave: m && m[2], nombre: m && m[3], descripcion: m && m[4].slice(0, 400) };
  }, c.codigo);
  if (f.error || !f.nombre) return { ...c, error: f.error || 'ficha sin datos' };
  return { ...c, nombre: f.nombre, marca: marcaDe(f.nombre), descripcion: f.descripcion, url: f.url, imagen: `https://www.truper.com/media/import/imagenes/${encodeURIComponent(c.clave)}.jpg` };
}

// 3) Auditoria independiente: buscador del sitio por clave (/xearch/catalog, POST)
async function auditar(capturados, n) {
  const filas = [];
  for (const p of muestra(capturados, n, SEMILLA + 1)) {
    const r = await enPagina(async (clave) => { const x = await fetch('/xearch/catalog/?q=' + encodeURIComponent(clave), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: clave }) }); const s = await x.text(); if (x.status === 429 || /^Rate limit/i.test(s)) return { limite: true }; try { return JSON.parse(s).response.data || []; } catch (e) { return []; } }, p.clave);
    const hit = (Array.isArray(r) ? r : []).find((x) => String(x.codigo) === String(p.codigo));
    const ok = !!hit && normal(hit.pn) === normal(p.nombre);
    filas.push({ p, ref: hit ? hit.pn : '(no encontrado en el buscador)', ok });
  }
  const buenos = filas.filter((x) => x.ok).length;
  return { filas, buenos, precision: filas.length ? buenos / filas.length : 0 };
}

async function guardarVerificacion(resumen, aud) {
  const libro = new ExcelJS.Workbook(); if (fs.existsSync(VERIFICACION)) await libro.xlsx.readFile(VERIFICACION);
  const v = libro.getWorksheet('Truper'); if (v) libro.removeWorksheet(v.id);
  const h = libro.addWorksheet('Truper');
  h.addRow(['INDICADOR', 'VALOR']).font = { bold: true }; Object.entries(resumen).forEach(([k, x]) => h.addRow([k, x])); h.addRow([]);
  h.addRow(['CODIGO', 'CLAVE', 'NOMBRE CAPTURADO (ficha tecnica)', 'NOMBRE EN EL BUSCADOR (xearch)', 'RESULTADO']).font = { bold: true };
  aud.filas.forEach((x) => h.addRow([x.p.codigo, x.p.clave, x.p.nombre, x.ref, x.ok ? 'correcto' : 'revisar']));
  [12, 16, 60, 60, 12].forEach((w, i) => { h.getColumn(i + 1).width = w; });
  await libro.xlsx.writeFile(VERIFICACION);
}

async function excel(dir, archivo, filas) {
  fs.mkdirSync(dir, { recursive: true });
  const libro = new ExcelJS.Workbook(); const h = libro.addWorksheet('Inventario');
  h.columns = [['NOMBRE DEL PRODUCTO', 60], ['PRECIO', 12], ['CATEGORIA', 40], ['SUBCATEGORIA', 20], ['MARCA', 16], ['IMAGEN', 50], ['URL', 60], ['SKU', 14], ['CODIGO', 10], ['DESCRIPCION', 60]].map(([header, width]) => ({ header, width }));
  filas.forEach((p) => h.addRow([p.nombre, null, p.categoria, '', p.marca, p.imagen, p.url, p.clave, p.codigo, p.descripcion]));
  h.getRow(1).font = { bold: true };
  await libro.xlsx.writeFile(path.join(dir, archivo));
}

(async () => {
  const nav = await abrir();
  try {
    let estado = fs.existsSync(DATOS) ? JSON.parse(fs.readFileSync(DATOS, 'utf8')) : {};
    if (!estado.codigos) { estado = { meta: { marca: 'Grupo Truper', fuente: 'https://www.truper.com/CatVigente/', semilla: SEMILLA }, codigos: await listarCodigos(), productos: [] }; fs.writeFileSync(DATOS, JSON.stringify(estado)); }
    const todos = estado.codigos; log('codigos unicos:', todos.length);
    const hechos = new Map(estado.productos.map((p) => [p.codigo, p]));
    const guardar = () => { estado.productos = [...hechos.values()]; fs.writeFileSync(DATOS, JSON.stringify(estado)); };
    const capturar = async (lista, etiqueta) => { let n = 0; for (const c of lista) { if (hechos.has(c.codigo)) continue; const p = await leerFicha(c); hechos.set(c.codigo, p); if (++n % 100 === 0) { guardar(); log(`${etiqueta}: ${hechos.size}/${todos.length} fichas`); } } guardar(); };
    if (!estado.meta.aprobado) {
      const piloto = muestra(todos, Math.ceil(todos.length * 0.10), SEMILLA);
      log('piloto 10 %:', piloto.length, 'fichas'); await capturar(piloto, 'piloto');
      const cap = piloto.map((c) => hechos.get(c.codigo)).filter((p) => p && !p.error);
      const aud = await auditar(cap, Math.ceil(todos.length * 0.05));
      const resumen = { Marca: 'Grupo Truper', Sitio: 'https://www.truper.com/CatVigente/', 'Codigos en el catalogo': todos.length, 'Piloto (10 %)': piloto.length, 'Piloto sin error': cap.length, 'Auditados (5 %)': aud.filas.length, Correctos: aud.buenos, Precision: (aud.precision * 100).toFixed(1) + ' %', Resultado: aud.precision >= UMBRAL ? 'APROBADO' : 'NO aprobado', Fecha: new Date().toLocaleString('es-CO') };
      await guardarVerificacion(resumen, aud);
      log(`auditoria ${aud.buenos}/${aud.filas.length} = ${(aud.precision * 100).toFixed(1)} %`);
      if (aud.precision < UMBRAL) { log('NO aprobado: se detiene (revisar hoja Truper de la verificacion)'); return; }
      estado.meta.aprobado = true; guardar();
    }
    await capturar(todos, 'completo');
    const ok = [...hechos.values()].filter((p) => !p.error);
    await excel(DIR_TRUPER, 'Inventario_truper.xlsx', ok.filter((p) => p.marca !== 'Pretul'));
    await excel(DIR_PRETUL, 'Inventario_pretul.xlsx', ok.filter((p) => p.marca === 'Pretul'));
    estado.meta.etapa = 'completo'; estado.meta.capturados = ok.length; estado.meta.fallas = [...hechos.values()].filter((p) => p.error).length; guardar();
    log(`COMPLETO: ${ok.length} productos (Pretul ${ok.filter((p) => p.marca === 'Pretul').length}), fallas ${estado.meta.fallas}`);
  } catch (e) { log('ERROR', e.message); } finally { await nav.close(); log('fin'); }
})();
