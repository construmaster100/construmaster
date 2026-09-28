// Piloto N2 + catalogo completo de varias marcas (Gricol, Corona, Pintuco, Dewalt, Stanley).
// Protocolo (docs/PLAN_PROVEEDORES_MARCAS.md): por cada marca, piloto con el 10 % de las fichas (semilla fija),
// auditoria del 5 % del catalogo por un metodo independiente y, SOLO si la precision es >= 95 %, el 100 %.
// Si una marca no pasa el piloto se detiene esa marca (las demas siguen).
// Salidas en la carpeta de cada marca: data.json, Inventario_<marca>.xlsx, img/.
// Verificacion: hojas por marca en pages/PROVEEDORES/verificacion/Piloto_scraping_10.xlsx y Auditoria_scraping_5.xlsx.
//   node tools/scraper/marcas/catalogos.js gricol corona pintuco dewalt stanley
//   node tools/scraper/marcas/catalogos.js corona --solo-piloto
// Se puede interrumpir y volver a correr: retoma desde data.json (no repite fichas ya capturadas).
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ExcelJS = require('exceljs');
const { obtener, permitido, esperar, AGENTE } = require('../lib/http');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const PROV = path.join(RAIZ, 'pages', 'PROVEEDORES');
const VERIFICACION = path.join(PROV, 'verificacion');
// Piloto repetido tras corregir reglas: se usa otra semilla (plan, seccion 4), p. ej. SEMILLA=20260927.
const SEMILLA = Number(process.env.SEMILLA) || 20260926;
const UMBRAL = 0.95;

// ---------- utilidades
function aleatorio(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function muestra(lista, n, semilla) {
  const r = aleatorio(semilla); const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [copia[i], copia[j]] = [copia[j], copia[i]]; }
  return copia.slice(0, n);
}
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const txt = (s) => String(s == null ? '' : s).replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&#039;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// Comparacion de nombres: sin mayusculas ni espacios junto a ® / ™ (el <h1> los separa con <sup>: "DEWALT ®").
const normal = (s) => txt(s).toLowerCase().replace(/\s*([®™])\s*/g, '$1');
const igual = (a, b) => normal(a) === normal(b);
// Nombre del archivo de una foto (sin carpeta ni parametros) para comparar la misma foto servida desde otro dominio.
const archivoFoto = (u) => decodeURIComponent(String(u || '').split('?')[0].split('/').pop()).toLowerCase();
const locs = (xml) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?\s*<\/loc>/g)].map((m) => m[1].trim().replace(/&amp;/g, '&'));
const hora = () => new Date().toLocaleTimeString('es-CO');
const log = (marca, ...m) => console.log(`[${hora()}] ${marca}:`, ...m);
// Barra de progreso en texto: [██████░░░░░░░░░░░░░░]  30,0 %  300/1.000
function barra(hechos, total, ancho = 30) {
  const f = total ? Math.min(1, hechos / total) : 0; const llenos = Math.round(f * ancho);
  return `[${'█'.repeat(llenos)}${'░'.repeat(ancho - llenos)}] ${(f * 100).toFixed(1).replace('.', ',').padStart(5)} %  ${hechos.toLocaleString('es-CO')}/${total.toLocaleString('es-CO')}`;
}

function ldBloques(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); [].concat(j).forEach((x) => [].concat(x['@graph'] || x).forEach((y) => out.push(y))); } catch (e) { /* bloque invalido */ }
  }
  return out;
}
const tipo = (x, t) => [].concat(x['@type'] || []).includes(t);
const migas = (html) => { const b = ldBloques(html).map((x) => (tipo(x, 'BreadcrumbList') ? x : x.breadcrumb)).find((x) => x && x.itemListElement); return b ? b.itemListElement.map((e) => txt(e.name || (e.item && e.item.name) || '')) : []; };
// Corona: producto vendido por area si "areaCovered" es un numero (m² por caja); "areaUnit":"M2" aparece en todas las fichas.
const areaPorCaja = (html) => Number((html.match(/areaCovered\\?":([\d.]+)/) || [])[1]) || null;
const og = (html, p) => txt((html.match(new RegExp('<meta[^>]+property="og:' + p + '"[^>]+content="([^"]*)"')) || [])[1] || '');

// Corona: la conexion desde Node falla con ese sitio (curl si funciona) -> descarga con curl, respetando robots y el ritmo.
const ultimoCurl = new Map();
async function obtenerCurl(url, { binario = false } = {}) {
  if (!(await permitido(url))) return { ok: false, estado: 'robots', url };
  const host = new URL(url).host; const pausa = Number(process.env.PAUSA_MS) || 1000;
  for (let i = 0; i < 3; i++) {
    // Turno reservado antes de esperar: con varias descargas simultaneas las solicitudes siguen saliendo a >= 1 s entre si.
    const turno = Math.max(Date.now(), (ultimoCurl.get(host) || 0) + pausa); ultimoCurl.set(host, turno);
    if (turno > Date.now()) await esperar(turno - Date.now());
    const r = await new Promise((res) => execFile('curl', ['-s', '-L', '--max-time', '60', '-A', AGENTE, '-H', 'Accept-Language: es-CO,es;q=0.9', '-w', '\n%{http_code}', url],
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (e, out) => res(e ? { error: e.message } : { out })));
    if (r.error) { if (i === 2) return { ok: false, estado: 'error: ' + r.error, url }; continue; }
    const fin = r.out.lastIndexOf(10); const codigo = Number(r.out.slice(fin + 1).toString()); const cuerpo = r.out.slice(0, fin);
    if (codigo === 429) { log('curl', `429 en ${host}: espera 30 s`); await esperar(30000); continue; }
    if (codigo >= 500 && i < 2) continue;
    if (codigo !== 200) return { ok: false, estado: codigo, url };
    return { ok: true, estado: codigo, url, cuerpo: binario ? cuerpo : cuerpo.toString('utf8') };
  }
  return { ok: false, estado: 'sin respuesta', url };
}

async function leerMapa(inicio, filtro, pedir) {
  const cola = [].concat(inicio); const vistos = new Set(); const urls = [];
  while (cola.length) {
    const m = cola.shift(); if (vistos.has(m)) continue; vistos.add(m);
    const r = await pedir(m); if (!r.ok) throw new Error('mapa ' + m + ': ' + r.estado);
    const l = locs(r.cuerpo);
    if (/<sitemapindex/i.test(r.cuerpo)) l.filter((x) => filtro.mapa.test(x)).forEach((x) => cola.push(x)); else l.filter((x) => filtro.ficha.test(x)).forEach((x) => urls.push(x));
  }
  return [...new Set(urls)].sort();
}

// ---------- configuracion por marca: leer (captura) e independiente (auditoria, sin usar la misma fuente)
const MARCAS = {
  gricol: {
    nombre: 'Gricol', carpeta: 'Grupo C/21 - Gricol', sitio: 'https://www.gricol.com/',
    // Shopify: API publica /products.json (todas las fichas en pocas solicitudes); la auditoria usa la ficha HTML.
    async listar() {
      const todos = [];
      for (let p = 1; p < 50; p++) {
        const r = await obtener(`https://www.gricol.com/products.json?limit=250&page=${p}`); if (!r.ok) throw new Error('products.json ' + r.estado);
        const lote = JSON.parse(r.cuerpo).products; if (!lote.length) break; todos.push(...lote);
      }
      this.api = new Map(todos.map((x) => ['https://www.gricol.com/products/' + x.handle, x]));
      return [...this.api.keys()].sort();
    },
    async leer(url) {
      const x = this.api.get(url); const v = x.variants[0] || {};
      return { nombre: txt(x.title), sku: v.sku || '', precio: v.price ? Math.round(Number(v.price)) : null, moneda: 'COP', disponibilidad: v.available ? 'InStock' : 'OutOfStock',
        imagenUrl: (x.images[0] || {}).src || '', categoria: txt(x.product_type) || 'Otros', url, descripcion: txt(x.body_html).slice(0, 400) };
    },
    independiente(html) {
      const h1 = txt((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
      const p = ldBloques(html).find((x) => tipo(x, 'Product')); const o = p ? [].concat(p.offers || [])[0] || {} : {};
      // Precio visible en la etiqueta og:price:amount ("51.650"); los productos con variantes se publican como ProductGroup sin offers.
      const ogPrecio = (html.match(/property="og:price:amount"\s+content="([^"]+)"/) || [])[1];
      const precio = ogPrecio ? Number(ogPrecio.replace(/\./g, '').replace(',', '.')) : o.price || o.lowPrice;
      return { nombre: h1, precio: precio ? Math.round(Number(precio)) : null, imagen: og(html, 'image') };
    },
    // Producto sin foto: el sitio muestra el logo de Gricol como og:image y la captura no tiene imagen (coinciden).
    imagenOk: (cap, ind) => !!ind.imagen && (archivoFoto(ind.imagen) === archivoFoto(cap.imagenUrl) || (!cap.imagenUrl && /logo/i.test(archivoFoto(ind.imagen)))),
    conPrecio: true,
  },
  corona: {
    nombre: 'Corona', carpeta: 'Grupo A/02 - Corona', sitio: 'https://corona.co/', curl: true,
    // Fichas de ~1,2 MB (~2 s cada una): 2 descargas simultaneas, cada solicitud a >= 1 s de la anterior (regla del plan).
    hilos: 2,
    listar() { return leerMapa('https://corona.co/sitemap.xml', { mapa: /Product-/, ficha: /\/p\// }, (u) => obtenerCurl(u)); },
    async leer(url, html) {
      const p = ldBloques(html).find((x) => tipo(x, 'Product')); if (!p) return null;
      const o = [].concat(p.offers || [])[0] || {}; const m = migas(html).filter((x) => x && x !== 'Productos' && !x.includes(' | ') && !igual(x, p.name));
      // Precios de la ficha (datos de la pagina, hallazgos de los pilotos 1 y 2):
      //   price / discountedPrice = por unidad de venta (caja, galon, unidad), de lista / con descuento;
      //   pricePerUnitOfMeasurement / discounted... = por m², solo en productos vendidos por area (areaUnit "M2").
      // Ej.: Piso Eucalipto: caja $ 76.440 (con descuento $ 72.618) = $ 42.000 el m² (con descuento $ 39.900).
      // Los valores se leen SOLO en el bloque del producto principal: el que tiene "price" igual al del JSON-LD.
      // (Piloto 3: si el producto no tiene descuento, "discountedPrice" es "$undefined" y una busqueda en toda la pagina
      //  tomaba el descuento de un producto recomendado: Lavamanos Citrino $ 204.210 en vez de $ 612.900.)
      const ld = o.price ? Math.round(Number(o.price)) : null;
      const t = html.replace(/\\"/g, '"');
      const bloques = [...t.matchAll(/"areaCovered":("\$undefined"|[\d.]+),"areaUnit":[^,]*,"wastePercentage":[^,]*,"price":\{[^}]*"value":([\d.]+)[^}]*\}(.{0,900})/g)];
      const b = bloques.find((x) => Math.round(Number(x[2])) === ld) || null;
      const valor = (clave) => { const v = b && (b[3].match(new RegExp('"' + clave + '":\\{[^}]*"value":([\\d.]+)')) || [])[1]; return v ? Math.round(Number(v)) : null; };
      const lista = b ? Math.round(Number(b[2])) : ld;
      // Vendido por area: "conversionPriceIndicator":true (Piso Soria lo tiene con areaCovered vacio); areaCovered = m² por caja.
      const conv = (b && b[3].match(/"conversionPriceIndicator":(true|false)/)) || t.match(/"conversionPriceIndicator":(true|false)/);
      const porArea = !!conv && conv[1] === 'true';
      const m2Caja = b && b[1] !== '"$undefined"' ? Number(b[1]) : null;
      const area = porArea ? m2Caja || true : null;
      return { nombre: txt(p.name), sku: p.sku || url.split('/p/')[1] || '', precio: valor('discountedPrice') || lista, precioLista: lista, moneda: o.priceCurrency || '',
        precioUnidad: area ? valor('discountedPricePerUnitOfMeasurement') || valor('pricePerUnitOfMeasurement') : null, unidadMedida: area ? (m2Caja ? `M2 (${m2Caja} m² por caja)` : 'M2') : '',
        disponibilidad: String(o.availability || '').replace(/https?:\/\/schema.org\//, ''), imagenUrl: og(html, 'image') || [].concat(p.image || [])[0] || '',
        categoria: m.join(' > ') || 'Otros', url, descripcion: txt(p.description).slice(0, 400) };
    },
    independiente(html) {
      const nombre = txt((html.match(/data-testid="lbl-pdp-name"[^>]*>([^<]+)</) || [])[1] || '');
      const vis = (html.match(/lbl-pdp-price\\?",\\?"children\\?":\\?"\$?\$[\s ]?([\d.]+)/) || html.match(/data-testid="lbl-pdp-price"[^>]*>\$?[\s ]?([\d.]+)/) || [])[1] || '';
      return { nombre, precio: vis ? Number(vis.replace(/\./g, '')) : null, precioTexto: vis, imagen: og(html, 'image') };
    },
    // Sin foto en la captura ni en la ficha = coinciden. El codigo se compara sin distinguir mayusculas (pp1403 = PP1403).
    imagenOk: (cap, ind) => (!ind.imagen && !cap.imagenUrl) || (!!ind.imagen && (archivoFoto(ind.imagen) === archivoFoto(cap.imagenUrl) || (!!cap.sku && ind.imagen.toLowerCase().includes(cap.sku.toLowerCase())))),
    precioVisible: (p) => p.precioUnidad || p.precio, // el precio grande de la ficha: por m² (vendidos por area) o por unidad de venta, con descuento
    conPrecio: true,
  },
  pintuco: {
    nombre: 'Pintuco', carpeta: 'Presencia/P03 - Pintuco', sitio: 'https://www.pintuco.com.co/',
    listar() { return leerMapa('https://www.pintuco.com.co/productos-sitemap.xml', { mapa: /./, ficha: /\/productos\/[^/]+\/$/ }, (u) => obtener(u)); },
    // Captura: datos estructurados de Yoast (miga final + imagen principal). Auditoria: <h1> visible y og:image.
    async leer(url, html) {
      const b = ldBloques(html); const m = migas(html); const img = b.find((x) => tipo(x, 'ImageObject') && /primaryimage/.test(x['@id'] || ''));
      const nombre = m[m.length - 1]; if (!nombre) return null;
      const cat = [...new Set([...html.matchAll(/href="https:\/\/www\.pintuco\.com\.co\/cat_productos\/([^/"]+)\/"/g)].map((x) => x[1]))].slice(0, 2).join(', ');
      return { nombre, sku: '', precio: null, moneda: '', disponibilidad: '', imagenUrl: img ? img.url || img.contentUrl : '', categoria: cat.replace(/-/g, ' ') || 'Pinturas', url,
        descripcion: txt((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').slice(0, 400) };
    },
    independiente(html) { return { nombre: txt((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || ''), precio: null, imagen: og(html, 'image') }; },
    imagenOk: (cap, ind) => !!ind.imagen && !!cap.imagenUrl && path.basename(ind.imagen).split('.')[0].startsWith(path.basename(cap.imagenUrl).split('.')[0].slice(0, 20)),
    conPrecio: false,
  },
  dewalt: {
    nombre: 'Dewalt', carpeta: 'Grupo A/08 - Dewalt', sitio: 'https://www.dewalt.com.co/es-co',
    listar() { return leerMapa('https://www.dewalt.com.co/es-co/product/sitemap.xml', { mapa: /./, ficha: /\/producto\// }, (u) => obtener(u)); },
    async leer(url, html) {
      const p = ldBloques(html).find((x) => tipo(x, 'Product')); if (!p) return null; const m = migas(html);
      // La imagen del JSON-LD (.jpg) responde 404; la ficha muestra la misma foto en .webp (variante de 1280 px).
      const visible = (html.match(/https:\/\/assets\.dewalt\.com\.co\/[^"\s]*\/PRODUCT\/IMAGES\/[^"\s]*_1280\.webp/) || [])[0];
      return { nombre: txt(p.name), sku: p.sku || '', precio: null, moneda: '', disponibilidad: '', imagenUrl: visible || [].concat(p.image || [])[0] || '',
        categoria: txt(p.category) || m.slice(1, -1).join(' > ') || 'Herramientas', url, descripcion: txt(p.description).slice(0, 400) };
    },
    independiente(html) { return { nombre: txt((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || ''), precio: null, imagen: og(html, 'image') }; },
    // og:image = DCK248P1_K1.jpg (404) y la foto descargada = DCK248P1_K1_1280.webp: misma foto, se compara el nombre base.
    imagenOk: (cap, ind) => { const base = (u) => archivoFoto(u).replace(/(_(?:320|1280|1680))?\.\w+$/, ''); return !!ind.imagen && (base(ind.imagen) === base(cap.imagenUrl) || (!!cap.sku && ind.imagen.toUpperCase().includes(cap.sku.toUpperCase()))); },
    conPrecio: false,
  },
  stanley: {
    nombre: 'Stanley', carpeta: 'Grupo A/09 - Stanley', sitio: 'https://co.stanleytools.global/',
    listar() { return leerMapa('https://co.stanleytools.global/sitemap.xml', { mapa: /./, ficha: /\/producto\// }, (u) => obtener(u)); },
    // Sin datos estructurados: captura por el marcado de la ficha (h1, codigo, imagen con alt del producto).
    async leer(url, html) {
      const nombre = txt((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || ''); if (!nombre) return null;
      const sku = url.split('/producto/')[1].split('/')[0].toUpperCase();
      const imgs = [...html.matchAll(/<img[^>]+src="(https:\/\/bynder\.sbdinc\.com\/[^"]+)"/g)].map((x) => x[1]).filter((u) => !/fallback/i.test(u));
      const ol = (html.match(/id="system-breadcrumb"[\s\S]*?<ol>([\s\S]*?)<\/ol>/) || [])[1] || '';
      const cat = [...ol.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((x) => txt(x[1])).filter((x) => !/^(home|inicio)$/i.test(x)).join(' > ');
      return { nombre, sku, precio: null, moneda: '', disponibilidad: '', imagenUrl: imgs[0] || '', categoria: cat.slice(0, 120) || 'Herramientas', url,
        descripcion: txt((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').slice(0, 400) };
    },
    // Auditoria independiente: <title> de la pagina y el codigo impreso junto al h1.
    independiente(html) {
      const t = txt((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/\s*\|.*$/, '');
      const cod = txt((html.match(/([\w-]+)<\/span>\s*<h1/) || [])[1] || '');
      return { nombre: t, precio: null, imagen: cod };
    },
    imagenOk: (cap, ind) => !ind.imagen || ind.imagen.toUpperCase() === cap.sku, // aqui "imagen" = codigo visible
    conPrecio: false,
  },
};

// ---------- Excel (escrituras en serie: varias marcas comparten los libros de verificacion)
// Si stretto.js --todo esta corriendo, escribe en los mismos libros al final: se espera a que termine (max. 60 min).
async function esperarStretto() {
  const d = path.join(PROV, 'Grupo C', '22 - Stretto', 'data.json');
  for (let i = 0; i < 120; i++) {
    try { const m = JSON.parse(fs.readFileSync(d, 'utf8')).meta; if (m.tipo === 'completo' && Date.now() - fs.statSync(d).mtimeMs > 180000) return; } catch (e) { return; }
    await esperar(30000);
  }
}
let colaExcel = esperarStretto();
function escribirExcel(archivo, hoja, tabla, columnas, filas, anchos) {
  colaExcel = colaExcel.then(async () => {
    const wb = new ExcelJS.Workbook();
    if (fs.existsSync(archivo)) await wb.xlsx.readFile(archivo);
    if (wb.getWorksheet(hoja)) wb.removeWorksheet(wb.getWorksheet(hoja).id);
    const h = wb.addWorksheet(hoja);
    h.addTable({ name: tabla, ref: 'A1', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true }, columns: columnas.map((name) => ({ name })), rows: filas.length ? filas : [columnas.map(() => '')] });
    h.columns = anchos.map((width) => ({ width }));
    await wb.xlsx.writeFile(archivo);
  }).catch((e) => console.error('Excel', archivo, e.message));
  return colaExcel;
}

// ---------- motor por marca
async function procesar(clave, soloPiloto) {
  const c = MARCAS[clave]; const carpeta = path.join(PROV, c.carpeta); const pedir = c.curl ? obtenerCurl : obtener;
  fs.mkdirSync(path.join(carpeta, 'img'), { recursive: true });
  const archivoData = path.join(carpeta, 'data.json');
  const urls = await c.listar();
  log(c.nombre, `${urls.length} fichas en el mapa del sitio`);

  // Retomar: fichas ya capturadas en una corrida anterior de este mismo script.
  let previo = null;
  try { const d = JSON.parse(fs.readFileSync(archivoData, 'utf8')); if (d.meta && d.meta.script === 'catalogos.js') previo = d; } catch (e) { /* no hay */ }
  const productos = previo ? previo.productos : []; const fallas = previo ? previo.meta.fallas.filter((f) => f.estado === 'robots') : [];
  const hechos = new Set(productos.map((p) => p.url).concat(fallas.map((f) => f.url)));
  const nombresImg = new Set(productos.map((p) => p.imagen).filter(Boolean));
  const meta = () => ({ script: 'catalogos.js', marca: c.nombre, fuente: c.sitio, fecha: new Date().toISOString(), semilla: SEMILLA, totalMapa: urls.length, capturados: productos.length, fallas, etapa });
  let etapa = previo ? previo.meta.etapa : 'piloto 10 %';
  // Piloto no aprobado en una corrida anterior: se repite la auditoria (con las reglas corregidas) antes de decidir.
  if (/NO aprobado/.test(etapa)) etapa = 'piloto 10 %';
  const guardar = () => fs.writeFileSync(archivoData, JSON.stringify({ meta: meta(), productos }, null, 1), 'utf8');

  async function capturar(lista) {
    let n = 0; let i = 0; const total = lista.length; const pendientes = [];
    // c.hilos descargas simultaneas (por defecto 1); el ritmo por sitio lo controla pedir().
    const trabajador = async () => { while (i < lista.length) {
      const url = lista[i++];
      if (hechos.has(url)) continue; hechos.add(url);
      let ficha = null; let estado = '';
      if (c.api) ficha = await c.leer(url);
      else { const r = await pedir(url); estado = r.ok ? 'sin datos del producto' : String(r.estado); if (r.ok) { try { ficha = await c.leer(url, r.cuerpo); } catch (e) { estado = 'error al leer: ' + e.message; } } }
      if (!ficha || !ficha.nombre) { fallas.push({ url, estado: estado || 'sin datos del producto' }); continue; }
      if (ficha.imagenUrl) {
        const u = ficha.imagenUrl.startsWith('//') ? 'https:' + ficha.imagenUrl : ficha.imagenUrl;
        // Nombre unico reservado antes de descargar: con descargas en paralelo dos productos no pueden escribir el mismo archivo.
        const ext = (u.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i) || [, 'jpg'])[1].toLowerCase();
        const base = 'img/' + slug(ficha.sku ? ficha.sku + '-' + ficha.nombre : ficha.nombre); let archivo = base + '.' + ext;
        for (let k = 2; nombresImg.has(archivo); k++) archivo = `${base}-${k}.${ext}`;
        nombresImg.add(archivo);
        const tarea = pedir(u, { binario: true, intentos: 1 }).then((img) => {
          if (img.ok) { fs.writeFileSync(path.join(carpeta, archivo), img.cuerpo); ficha.imagen = archivo; }
        }).catch((e) => log(c.nombre, 'foto no guardada:', archivo, e.code || e.message)); // una foto fallida no detiene la captura
        // Foto en otro servidor (p. ej. legacy.corona.co): se descarga en paralelo con la ficha siguiente;
        // el ritmo de 1 solicitud/s se sigue cumpliendo en cada servidor. Mismo servidor: se espera.
        if (new URL(u).host !== new URL(url).host) pendientes.push(tarea); else await tarea;
      }
      productos.push(ficha);
      if (++n % 25 === 0) { guardar(); log(c.nombre.padEnd(8), barra(lista.filter((u) => hechos.has(u)).length, total), `· ${etapa} · fallas ${fallas.length}`); }
    } };
    await Promise.all(Array.from({ length: c.hilos || 1 }, trabajador));
    await Promise.all(pendientes);
    guardar(); log(c.nombre.padEnd(8), barra(total, total), `· ${etapa} · fallas ${fallas.length}`);
  }

  async function auditar() {
    const n = Math.min(productos.length, Math.max(1, Math.ceil(urls.length * 0.05)));
    const auditados = muestra(productos.slice().sort((a, b) => a.url.localeCompare(b.url)), n, SEMILLA + 1);
    const filas = []; let correctos = 0;
    for (const p of auditados) {
      const r = await pedir(p.url); const ind = r.ok ? c.independiente(r.cuerpo) : {};
      const okNombre = igual(ind.nombre, p.nombre); const okPrecio = c.conPrecio ? ind.precio === (c.precioVisible ? c.precioVisible(p) : p.precio) : true; const okImagen = r.ok && c.imagenOk(p, ind);
      const ok = okNombre && okPrecio && okImagen; if (ok) correctos++;
      filas.push([p.nombre, p.precio, ind.nombre || '', ind.precio == null ? '' : ind.precio, okNombre ? 'sí' : 'no', c.conPrecio ? (okPrecio ? 'sí' : 'no') : 'no publica', okImagen ? 'sí' : 'no', ok ? 'CORRECTO' : 'REVISAR', p.url]);
    }
    const prec = correctos / (filas.length || 1);
    await escribirExcel(path.join(VERIFICACION, 'Auditoria_scraping_5.xlsx'), c.nombre, 'T_Auditoria_' + c.nombre,
      ['NOMBRE CAPTURADO', 'PRECIO CAPTURADO', 'NOMBRE (METODO INDEPENDIENTE)', 'PRECIO VISIBLE', 'NOMBRE OK', 'PRECIO OK', 'IMAGEN/CODIGO OK', 'RESULTADO', 'URL'], filas, [44, 14, 44, 14, 10, 12, 14, 12, 70]);
    filas.filter((f) => f[7] !== 'CORRECTO').slice(0, 10).forEach((f) => log(c.nombre, 'REVISAR:', f[0], '|', f[2], '| precio', f[1], 'vs', f[3], '| nombre', f[4], 'precio', f[5], 'imagen', f[6]));
    return { n: filas.length, correctos, prec };
  }

  async function registrar(aud) {
    const e = 1.96 * Math.sqrt(aud.prec * (1 - aud.prec) / (aud.n || 1));
    const cota = aud.correctos === aud.n ? `≤ ${(300 / aud.n).toFixed(1)} % (regla del 3, 95 %)` : '± ' + (e * 100).toFixed(1) + ' %';
    await escribirExcel(path.join(VERIFICACION, 'Piloto_scraping_10.xlsx'), c.nombre, 'T_Piloto_' + c.nombre, ['INDICADOR', 'VALOR'],
      [['Sitio', c.sitio], ['Fichas en el mapa del sitio', urls.length], ['Etapa', etapa], ['Capturadas', productos.length], ['Fallas', fallas.length],
        ['Con precio', productos.filter((x) => x.precio).length], ['Con imagen descargada', productos.filter((x) => x.imagen).length],
        ['Auditadas (5 % del catálogo)', aud.n], ['Correctas', aud.correctos], ['Precisión', (aud.prec * 100).toFixed(1) + ' %'], ['Margen de error (95 %)', cota], ['Semilla', SEMILLA], ['Fecha', new Date().toISOString()]], [34, 44]);
    await escribirExcel(path.join(carpeta, `Inventario_${slug(c.nombre)}.xlsx`), 'Inventario', 'T_' + c.nombre,
      ['NOMBRE DEL PRODUCTO', 'PRECIO', 'CATEGORIA', 'IMAGEN', 'URL', 'SKU', 'DISPONIBILIDAD', 'DESCRIPCION', 'PRECIO POR UNIDAD DE MEDIDA', 'UNIDAD DE MEDIDA', 'PRECIO DE LISTA'],
      productos.map((p) => [p.nombre, p.precio, p.categoria, p.imagen || p.imagenUrl, p.url, p.sku, p.disponibilidad, p.descripcion, p.precioUnidad || '', p.precioUnidad ? p.unidadMedida : '',
        p.precioLista && p.precioLista !== p.precio ? p.precioLista : '']), [52, 12, 30, 50, 70, 16, 14, 60, 18, 12, 14]);
  }

  // --reparar-fotos: vuelve a leer solo las fichas capturadas sin foto descargada (p. ej. tras corregir la regla de imagen).
  if (process.argv.includes('--reparar-fotos') && etapa === 'completo') {
    const sinFoto = productos.filter((p) => !p.imagen).map((p) => p.url);
    for (let i = productos.length - 1; i >= 0; i--) if (!productos[i].imagen) { hechos.delete(productos[i].url); productos.splice(i, 1); }
    log(c.nombre, `reparar fotos: ${sinFoto.length} fichas sin foto`);
    etapa = 'completo (reparando fotos)'; await capturar(sinFoto); etapa = 'completo'; guardar();
    const aud = await auditar(); await registrar(aud);
    log(c.nombre, `FOTOS: ${productos.filter((p) => p.imagen).length}/${productos.length} con foto; auditoría ${aud.correctos}/${aud.n} (${(aud.prec * 100).toFixed(1)} %)`);
    return;
  }
  // 1) Piloto 10 % + auditoria 5 %
  if (etapa === 'piloto 10 %') {
    await capturar(muestra(urls, Math.ceil(urls.length * 0.10), SEMILLA));
    const aud = await auditar();
    log(c.nombre, `PILOTO: ${productos.length} capturados, ${fallas.length} fallas; auditoría ${aud.correctos}/${aud.n} (${(aud.prec * 100).toFixed(1)} %)`);
    if (aud.prec < UMBRAL || soloPiloto) { etapa = aud.prec < UMBRAL ? 'piloto NO aprobado (precisión < 95 %): se detiene' : 'piloto 10 %'; guardar(); await registrar(aud); log(c.nombre, etapa); return; }
    etapa = 'completo (en curso)'; guardar();
  }
  // 2) Catalogo completo
  await capturar(urls);
  etapa = 'completo'; guardar();
  const aud = await auditar();
  await registrar(aud);
  log(c.nombre, `COMPLETO: ${productos.length}/${urls.length} capturados, ${fallas.length} fallas; auditoría final ${aud.correctos}/${aud.n} (${(aud.prec * 100).toFixed(1)} %)`);
}

if (require.main === module) (async () => {
  const soloPiloto = process.argv.includes('--solo-piloto');
  const claves = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const desconocidas = claves.filter((k) => !MARCAS[k]); if (desconocidas.length) throw new Error('Marca sin configurar: ' + desconocidas.join(', '));
  // Cada marca es un sitio distinto: van en paralelo (el ritmo de 1 solicitud/s es por sitio).
  const r = await Promise.allSettled(claves.map((k) => procesar(k, soloPiloto)));
  r.forEach((x, i) => { if (x.status === 'rejected') console.error(`[${hora()}] ${claves[i]}: ERROR`, x.reason); });
  await colaExcel;
  console.log(`[${hora()}] FIN`);
})().catch((e) => { console.error(e); process.exit(1); });

module.exports = { MARCAS };
