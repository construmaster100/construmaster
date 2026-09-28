// Busca en comfer.co (por nombre) la foto real de los productos que solo
// existen en productos_v1.js (importados de un Excel, sin urlOriginal) y de
// los que quedaron en datos.js sin urlOriginal. Si encuentra una coincidencia
// confiable, descarga la imagen y los agrega como entrada normal a datos.js
// (con codigo), para dejar de depender de productos_v1.js en esos casos.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'js', 'datos.js');
const V1_PATH = path.join(ROOT, 'js', 'productos_v1.js');
const IMG_DIR = path.join(ROOT, 'imagenes');
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

function loadDatos() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw.trim().replace(/^window\.DATOS_COMFER\s*=\s*/, '').replace(/;\s*$/, ''));
}
function saveDatos(datos) {
  fs.writeFileSync(DATA_PATH, 'window.DATOS_COMFER = ' + JSON.stringify(datos) + ';\n', 'utf-8');
}
function loadV1() {
  const raw = fs.readFileSync(V1_PATH, 'utf-16le');
  const g = {};
  new Function('window', raw)(g);
  return g.PRODUCTOS_V1;
}
function saveV1(lista) {
  const buf = Buffer.from('window.PRODUCTOS_V1 = ' + JSON.stringify(lista) + ';\n', 'utf16le');
  // agrega BOM utf-16LE como tenia el archivo original
  fs.writeFileSync(V1_PATH, Buffer.concat([Buffer.from([0xff, 0xfe]), buf]));
}

function normalizar(t) { return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
function slugify(nombre) { return normalizar(nombre).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function clasificar(nombre) {
  const n = normalizar(nombre);
  if (/varilla|grafil|alambre|malla|perfil/.test(n)) return { categoria: 'Hierro', subcategoria: 'Estructura' };
  if (/cemento/.test(n)) return { categoria: 'Cemento', subcategoria: 'Cementos' };
  if (/tubo|codo|union|tee|tapon|buje|adapt|curva|semicodo|soldadura|limpiador.*pvc/.test(n)) return { categoria: 'PVC', subcategoria: 'Tuberías y accesorios' };
  if (/pintura|vinilo|barniz|textuco|estuco|brocha|rodillo/.test(n)) return { categoria: 'Pinturas', subcategoria: 'Pinturas y herramientas' };
  if (/pegante|pegacor|megapega|boquilla|mastic|alfaquick|concolor/.test(n)) return { categoria: 'Materiales', subcategoria: 'Pegantes y boquillas' };
  return { categoria: 'Materiales', subcategoria: 'Aseo y complementos' };
}

function tokenOverlap(a, b) {
  const ta = new Set(normalizar(a).split(/\s+/).filter((w) => w.length > 2));
  const tb = new Set(normalizar(b).split(/\s+/).filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((w) => { if (tb.has(w)) inter++; });
  return inter / Math.max(ta.size, tb.size);
}

function parsearProductos(html) {
  const bloques = html.split('<form role="article" class="oe_product_cart').slice(1);
  return bloques.map((b) => {
    const nombreM = b.match(/^[^>]*aria-label="([^"]+)"/);
    const idM = b.match(/name="product_id" type="hidden" value="(\d+)"/);
    const imgM = b.match(/<img src="(\/web\/image\/product\.product\/\d+\/image_1024\/[^"]*)"[^>]*class="img img-fluid oe_product_image_img\s/);
    return {
      nombre: nombreM ? nombreM[1].trim() : null,
      codigo: idM ? idM[1] : null,
      imagenUrl: imgM ? 'https://www.comfer.co' + imgM[1] : null,
    };
  }).filter((p) => p.nombre && p.codigo);
}

async function buscar(nombre) {
  const url = 'https://www.comfer.co/shop?search=' + encodeURIComponent(nombre);
  const res = await fetch(url, { headers: HEADERS });
  const html = await res.text();
  return parsearProductos(html).slice(0, 5);
}

async function descargarImagen(url, destPath) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (e) { return false; }
}

async function pool(items, limit, fn) {
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
  });
  await Promise.all(workers);
}

async function main() {
  const datos = loadDatos();
  const nombresBase = new Set(datos.productos.map((p) => normalizar(p.nombre)));
  const codigosExistentes = new Set(datos.productos.filter((p) => p.codigo).map((p) => p.codigo));

  const v1 = loadV1();
  const faltantes = v1.filter((p) => !nombresBase.has(normalizar(p.nombre)));
  console.log('a buscar en comfer.co:', faltantes.length, 'de', v1.length);

  const recuperados = [];
  const noEncontrados = [];
  let procesados = 0;

  await pool(faltantes, 6, async (p) => {
    let resultados;
    try { resultados = await buscar(p.nombre); } catch (e) { resultados = []; }
    const mejor = resultados
      .map((r) => ({ r, score: tokenOverlap(p.nombre, r.nombre) }))
      .sort((a, b) => b.score - a.score)[0];

    procesados++;
    if (procesados % 100 === 0) console.log('  procesados:', procesados, '/', faltantes.length);

    if (!mejor || mejor.score < 0.6 || codigosExistentes.has(mejor.r.codigo)) {
      noEncontrados.push(p);
      return;
    }
    const slug = slugify(p.nombre).slice(0, 70);
    const filename = mejor.r.codigo + '-' + slug + '.jpg';
    const destPath = path.join(IMG_DIR, filename);
    const ok = mejor.r.imagenUrl && await descargarImagen(mejor.r.imagenUrl, destPath);
    if (!ok) { noEncontrados.push(p); return; }
    const clase = clasificar(p.nombre);
    recuperados.push({
      nombre: p.nombre,
      precio: p.precio,
      categoria: clase.categoria,
      subcategoria: clase.subcategoria,
      imagen: 'imagenes/' + filename,
      urlOriginal: mejor.r.imagenUrl,
      codigo: mejor.r.codigo,
      nota: 'Foto real encontrada por búsqueda en comfer.co (coincidencia ' + Math.round(mejor.score * 100) + '%) a partir del listado importado de V1 Construmaster.',
    });
    codigosExistentes.add(mejor.r.codigo);
  });

  datos.productos = datos.productos.concat(recuperados);
  saveDatos(datos);

  // el V1 original queda solo con lo que NO se pudo recuperar (los recuperados ya viven en datos.js)
  const codigosRecuperadosNombres = new Set(recuperados.map((r) => normalizar(r.nombre)));
  const v1Restante = v1.filter((p) => !nombresBase.has(normalizar(p.nombre)) ? !codigosRecuperadosNombres.has(normalizar(p.nombre)) : false);
  saveV1(v1Restante);

  console.log('recuperados con foto real:', recuperados.length);
  console.log('sin match confiable (quedan como placeholder en V1):', noEncontrados.length);
}
main();
