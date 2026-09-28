// Piloto N2 — catalogo oficial de Stretto (strettocolombia.com, Wix).
// Protocolo (docs/PLAN_PROVEEDORES_MARCAS.md): piloto con el 10 % de las fichas del mapa del sitio
// (muestra aleatoria con semilla fija) y auditoria del 5 % del catalogo por un metodo independiente.
// Salidas en la carpeta de la marca: data.json, Inventario_stretto.xlsx, img/.
// Verificacion: pages/PROVEEDORES/verificacion/Auditoria_scraping_5.xlsx y hoja Stretto de Piloto_scraping_10.xlsx.
//   node tools/scraper/marcas/stretto.js            (piloto 10 %)
//   node tools/scraper/marcas/stretto.js --todo     (catalogo completo: solo tras aprobar el piloto)
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { obtener } = require('../lib/http');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const CARPETA = path.join(RAIZ, 'pages', 'PROVEEDORES', 'Grupo C', '22 - Stretto');
const VERIFICACION = path.join(RAIZ, 'pages', 'PROVEEDORES', 'verificacion');
const MAPA = 'https://www.strettocolombia.com/store-products-sitemap.xml';
const SEMILLA = 20260926;
const FRACCION_PILOTO = 0.10;
const FRACCION_AUDITORIA = 0.05;

// Aleatorio reproducible (mulberry32) y muestra sin reemplazo.
function aleatorio(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function muestra(lista, n, semilla) {
  const r = aleatorio(semilla); const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [copia[i], copia[j]] = [copia[j], copia[i]]; }
  return copia.slice(0, n);
}

const CATEGORIAS = [
  ['Grifería de lavamanos', /lavamanos/i], ['Grifería de lavaplatos', /lavaplatos|cocina/i], ['Duchas y regaderas', /ducha|regadera|brazo|mezclador/i],
  ['Accesorios de baño', /percha|porta ?papel|toallero|jabonera|repisa|gancho|accesorio|barra/i], ['Repuestos', /repuesto|cartucho|aireador|manguera|v[aá]lvula|kit/i],
];
const categoria = (n) => (CATEGORIAS.find(([, re]) => re.test(n)) || ['Otros'])[0];
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

function leerFicha(url, html) {
  const bloque = (html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/) || [])[1];
  if (!bloque) return null;
  const ld = JSON.parse(bloque);
  const oferta = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers || {};
  const imagen = (Array.isArray(ld.image) ? ld.image[0] : ld.image) || {};
  // El sitio escribe entidades HTML dentro del JSON-LD (8&quot; = 8"): se decodifican (hallazgo de la auditoria).
  const txt = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  ld.name = txt(ld.name); ld.description = txt(ld.description);
  return {
    nombre: (ld.name || '').trim(), sku: ld.sku || '', precio: oferta.price ? Number(oferta.price) : null, moneda: oferta.priceCurrency || '',
    disponibilidad: (oferta.availability || '').replace('https://schema.org/', ''), imagenUrl: imagen.contentUrl || imagen.url || '',
    categoria: categoria(ld.name || ''), url, descripcion: (ld.description || '').replace(/\s+/g, ' ').trim().slice(0, 400),
  };
}

// Metodo independiente para la auditoria (no usa el JSON-LD): titulo visible <h1 data-hook="product-title">,
// precio visible (formatted-primary-price, o "Desde" en productos con variantes) y og:image.
// Leccion del piloto: og:title es un titulo para buscadores redactado distinto al nombre del producto.
function leerIndependiente(html) {
  const decodificar = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").trim();
  const og = (p) => decodificar((html.match(new RegExp('<meta[^>]+property="og:' + p + '"[^>]+content="([^"]*)"')) || [])[1] || '');
  const titulo = decodificar((html.match(/data-hook="product-title"[^>]*>([^<]+)</) || [])[1] || '');
  let visible = (html.match(/data-hook="formatted-primary-price"[^>]*>([^<]+)</) || [])[1] || '';
  if (!visible) visible = (html.match(/"formattedPrice":"([^"]+)"/) || [])[1] || ''; // productos con variantes ("Desde $...")
  let precio = visible ? Number(visible.replace(/,\d{2}(?=\D*$)/, '').replace(/[^\d]/g, '')) : null;
  // Productos en descuento: el precio de venta es el rebajado (el visible "formattedPrice" es el de antes del descuento).
  // Hallazgo de la auditoria del catalogo completo (26/09/2026): 3 falsos "REVISAR" por descuento y redondeo.
  const rebajado = (html.match(/"discountedPrice":([\d.]+)/) || [])[1];
  if (rebajado && /"discount":\{"mode":"(PERCENT|AMOUNT)"/.test(html)) precio = Math.round(Number(rebajado));
  return { nombre: titulo || og('title').replace(/\s*\|\s*Stretto Colombia\s*$/i, ''), precio, precioTexto: visible.trim(), imagen: og('image') };
}

async function escribirExcel(archivo, hoja, tabla, columnas, filas, anchos) {
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(archivo)) await wb.xlsx.readFile(archivo);
  if (wb.getWorksheet(hoja)) wb.removeWorksheet(wb.getWorksheet(hoja).id);
  const h = wb.addWorksheet(hoja);
  h.addTable({ name: tabla, ref: 'A1', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true }, columns: columnas.map((name) => ({ name })), rows: filas });
  h.columns = anchos.map((width) => ({ width }));
  await wb.xlsx.writeFile(archivo);
}

(async () => {
  const todo = process.argv.includes('--todo');
  const soloAuditoria = process.argv.includes('--solo-auditoria'); // reutiliza data.json sin volver a capturar
  const mapa = await obtener(MAPA);
  if (!mapa.ok) throw new Error('No se pudo leer el mapa del sitio: ' + mapa.estado);
  const urls = [...mapa.cuerpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const objetivo = soloAuditoria ? [] : todo ? urls : muestra(urls, Math.ceil(urls.length * FRACCION_PILOTO), SEMILLA);
  console.log(`Stretto: ${urls.length} fichas en el mapa; ${todo ? 'catálogo completo' : 'piloto 10 %'}: ${objetivo.length}`);

  fs.mkdirSync(path.join(CARPETA, 'img'), { recursive: true });
  const previo = soloAuditoria ? JSON.parse(fs.readFileSync(path.join(CARPETA, 'data.json'), 'utf8')) : null;
  const productos = previo ? previo.productos : []; const fallas = previo ? previo.meta.fallas : [];
  for (const url of objetivo) {
    const r = await obtener(url);
    const ficha = r.ok ? leerFicha(url, r.cuerpo) : null;
    if (!ficha) { fallas.push({ url, estado: r.ok ? 'sin datos estructurados' : String(r.estado) }); continue; }
    if (ficha.imagenUrl) {
      const img = await obtener(ficha.imagenUrl, { binario: true, intentos: 1 });
      if (img.ok) { const archivo = 'img/' + slug(ficha.nombre || ficha.sku) + '.jpg'; fs.writeFileSync(path.join(CARPETA, archivo), img.cuerpo); ficha.imagen = archivo; }
    }
    productos.push(ficha);
    process.stdout.write('.');
  }
  console.log(`\nCapturados ${productos.length}, fallas ${fallas.length}`);

  if (!soloAuditoria) {
  const meta = { marca: 'Stretto', fuente: 'https://www.strettocolombia.com/ (mapa ' + MAPA + ')', fecha: new Date().toISOString(), tipo: todo ? 'completo' : 'piloto 10 %', semilla: SEMILLA, totalMapa: urls.length, capturados: productos.length, fallas };
  fs.writeFileSync(path.join(CARPETA, 'data.json'), JSON.stringify({ meta, productos }, null, 1), 'utf8');
  await escribirExcel(path.join(CARPETA, 'Inventario_stretto.xlsx'), 'Inventario', 'T_Stretto',
    ['NOMBRE DEL PRODUCTO', 'PRECIO', 'CATEGORIA', 'IMAGEN', 'URL', 'SKU', 'DISPONIBILIDAD'],
    productos.map((p) => [p.nombre, p.precio, p.categoria, p.imagen || p.imagenUrl, p.url, p.sku, p.disponibilidad]), [52, 12, 24, 50, 70, 16, 14]);
  }

  // ---- Auditoria del 5 % del catalogo (sobre lo capturado), por el metodo independiente
  const nAud = Math.min(productos.length, Math.ceil(urls.length * FRACCION_AUDITORIA));
  const auditados = muestra(productos, nAud, SEMILLA + 1);
  const filas = []; let correctos = 0;
  for (const p of auditados) {
    const r = await obtener(p.url);
    const ind = r.ok ? leerIndependiente(r.cuerpo) : {};
    const okNombre = ind.nombre === p.nombre;
    const okPrecio = ind.precio === Math.round(p.precio); // el sitio muestra el precio redondeado a pesos
    const okImagen = !!ind.imagen && !!p.imagenUrl && ind.imagen.split('/v1/')[0] === p.imagenUrl.split('/v1/')[0];
    const ok = okNombre && okPrecio && okImagen;
    if (ok) correctos++;
    filas.push([p.nombre, p.precio, ind.nombre || '', ind.precio, ind.precioTexto || '', okNombre ? 'sí' : 'no', okPrecio ? 'sí' : 'no', okImagen ? 'sí' : 'no', ok ? 'CORRECTO' : 'REVISAR', p.url]);
  }
  fs.mkdirSync(VERIFICACION, { recursive: true });
  await escribirExcel(path.join(VERIFICACION, 'Auditoria_scraping_5.xlsx'), 'Stretto', 'T_Auditoria_Stretto',
    ['NOMBRE CAPTURADO', 'PRECIO CAPTURADO', 'NOMBRE VISIBLE (h1)', 'PRECIO VISIBLE', 'PRECIO VISIBLE (TEXTO)', 'NOMBRE OK', 'PRECIO OK', 'IMAGEN OK', 'RESULTADO', 'URL'],
    filas, [44, 14, 44, 14, 16, 10, 10, 10, 12, 70]);
  const p = correctos / (filas.length || 1);
  const e = 1.96 * Math.sqrt(p * (1 - p) / (filas.length || 1));
  await escribirExcel(path.join(VERIFICACION, 'Piloto_scraping_10.xlsx'), 'Stretto', 'T_Piloto_Stretto',
    ['INDICADOR', 'VALOR'],
    [['Fichas en el mapa del sitio', urls.length], ['Muestra del piloto (10 %)', previo ? previo.meta.capturados + previo.meta.fallas.length : objetivo.length], ['Capturadas', productos.length], ['Fallas', fallas.length],
      ['Con precio', productos.filter((x) => x.precio).length], ['Con imagen descargada', productos.filter((x) => x.imagen).length],
      ['Auditadas (5 % del catálogo)', filas.length], ['Correctas', correctos], ['Precisión', Math.round(p * 1000) / 10 + ' %'], ['Margen (95 %)', '± ' + Math.round(e * 1000) / 10 + ' %'], ['Semilla', SEMILLA]],
    [34, 20]);
  console.log(`Auditoría: ${correctos}/${filas.length} correctas (precisión ${(p * 100).toFixed(1)} %, margen ±${(e * 100).toFixed(1)} %)`);
  filas.filter((f) => f[8] !== 'CORRECTO').forEach((f) => console.log('  REVISAR:', f[0], '|', f[1], 'vs', f[3], f[4], '| nombre', f[5], 'precio', f[6], 'imagen', f[7]));
})().catch((e) => { console.error(e); process.exit(1); });
