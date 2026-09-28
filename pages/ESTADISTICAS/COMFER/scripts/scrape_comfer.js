// Scrapea productos reales (nombre, precio, imagen real) de comfer.co
// (Odoo, sin protección Cloudflare: sirve con fetch() plano, sin necesidad
// de navegador) y los agrega/actualiza en js/datos.js, descargando la foto
// real a imagenes/ en reemplazo del .svg placeholder.
//
// Uso: node scripts/scrape_comfer.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'js', 'datos.js');
const IMG_DIR = path.join(ROOT, 'imagenes');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

const CATS = [
  { slug: 'accesorios-de-bano-140', categoria: 'Accesorios de Baño', subcategoria: 'Accesorios de Baño' },
  { slug: 'combos-de-bano-116', categoria: 'Combos de Baño', subcategoria: 'Combos de Baño' },
  { slug: 'construccion-cemento-estructural-63', categoria: 'Cemento', subcategoria: 'Cemento Estructural' },
  { slug: 'construccion-cemento-mampostero-64', categoria: 'Cemento', subcategoria: 'Cemento Mampostero' },
  { slug: 'construccion-cemento-uso-general-62', categoria: 'Cemento', subcategoria: 'Cemento Uso General' },
  { slug: 'construccion-geotextil-geotextil-no-tejido-79', categoria: 'Materiales', subcategoria: 'Geotextil No Tejido' },
  { slug: 'construccion-geotextil-geotextil-tejido-80', categoria: 'Materiales', subcategoria: 'Geotextil Tejido' },
  { slug: 'construccion-hierro-alambre-52', categoria: 'Hierro', subcategoria: 'Alambre' },
  { slug: 'construccion-hierro-mallas-electrosoldadas-53', categoria: 'Hierro', subcategoria: 'Mallas Electrosoldadas' },
  { slug: 'construccion-hierro-perfileria-estructural-54', categoria: 'Hierro', subcategoria: 'Perfilería Estructural' },
  { slug: 'construccion-hierro-varilla-51', categoria: 'Hierro', subcategoria: 'Varilla' },
  { slug: 'construccion-materiales-aseo-y-mantenimiento-57', categoria: 'Materiales', subcategoria: 'Aseo y Mantenimiento' },
  { slug: 'construccion-materiales-boquilla-para-ceramica-y-porcelanato-104', categoria: 'Materiales', subcategoria: 'Boquilla para Cerámica y Porcelanato' },
  { slug: 'construccion-materiales-estucos-56', categoria: 'Materiales', subcategoria: 'Estucos' },
  { slug: 'construccion-materiales-pegantes-para-ceramica-y-porcelanato-55', categoria: 'Materiales', subcategoria: 'Pegantes para Cerámica y Porcelanato' },
  { slug: 'construccion-pinturas-especiales-101', categoria: 'Pinturas', subcategoria: 'Pinturas Especiales' },
  { slug: 'construccion-pinturas-herramientas-85', categoria: 'Pinturas', subcategoria: 'Herramientas para Pintar' },
  { slug: 'construccion-pinturas-tipo-1-76', categoria: 'Pinturas', subcategoria: 'Pinturas Tipo 1' },
  { slug: 'construccion-pinturas-tipo-2-77', categoria: 'Pinturas', subcategoria: 'Pinturas Tipo 2' },
  { slug: 'construccion-placa-facil-bloquelon-69', categoria: 'Placa Fácil', subcategoria: 'Bloquelón' },
  { slug: 'construccion-placa-facil-mallas-electrosoldadas-81', categoria: 'Placa Fácil', subcategoria: 'Mallas Electrosoldadas' },
  { slug: 'construccion-placa-facil-perfil-70', categoria: 'Placa Fácil', subcategoria: 'Perfil' },
  { slug: 'construccion-pvc-aditivos-y-limpiadores-86', categoria: 'PVC', subcategoria: 'Aditivos y Limpiadores' },
  { slug: 'construccion-pvc-alcantarillado-58', categoria: 'PVC', subcategoria: 'Alcantarillado' },
  { slug: 'construccion-pvc-conduit-87', categoria: 'PVC', subcategoria: 'Conduit' },
  { slug: 'construccion-pvc-presion-60', categoria: 'PVC', subcategoria: 'Presión' },
  { slug: 'construccion-pvc-sanitario-59', categoria: 'PVC', subcategoria: 'Sanitario' },
  { slug: 'construccion-pvc-ventilacion-61', categoria: 'PVC', subcategoria: 'Ventilación' },
  { slug: 'duchas-de-bano-125', categoria: 'Duchas', subcategoria: 'Duchas de Baño' },
  { slug: 'griferias-119', categoria: 'Griferías', subcategoria: 'Griferías' },
  { slug: 'jacuzzis-167', categoria: 'Jacuzzis', subcategoria: 'Jacuzzis' },
  { slug: 'lavamanos-111', categoria: 'Lavamanos', subcategoria: 'Lavamanos' },
  { slug: 'muebles-para-bano-144', categoria: 'Muebles de Baño', subcategoria: 'Muebles de Baño' },
  { slug: 'muebles-para-cocina-integral-132', categoria: 'Cocinas Integrales', subcategoria: 'Muebles para Cocina Integral' },
  { slug: 'paredes-162', categoria: 'Paredes', subcategoria: 'Paredes' },
  { slug: 'pinturas-149', categoria: 'Pinturas', subcategoria: 'Pinturas (listado general)' },
  { slug: 'pisos-153', categoria: 'Pisos', subcategoria: 'Pisos' },
  { slug: 'sanitarios-106', categoria: 'Sanitarios', subcategoria: 'Sanitarios' },
];

function loadDatos() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw.trim().replace(/^window\.DATOS_COMFER\s*=\s*/, '').replace(/;\s*$/, ''));
}
function saveDatos(datos) {
  fs.writeFileSync(DATA_PATH, 'window.DATOS_COMFER = ' + JSON.stringify(datos) + ';\n', 'utf-8');
}

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function maxPagina(html) {
  const nums = Array.from(html.matchAll(/\/page\/(\d+)"/g)).map((m) => parseInt(m[1], 10));
  return nums.length ? Math.max(...nums) : 1;
}

function parsePrecio(texto) {
  if (!texto) return null;
  const limpio = texto.replace(/\./g, '').split(',')[0].replace(/[^0-9]/g, '');
  return limpio ? Number(limpio) : null;
}

function parsearProductos(html) {
  const bloques = html.split('<form role="article" class="oe_product_cart').slice(1);
  return bloques.map((b) => {
    const nombreM = b.match(/^[^>]*aria-label="([^"]+)"/);
    const idM = b.match(/name="product_id" type="hidden" value="(\d+)"/);
    const imgM = b.match(/<img src="(\/web\/image\/product\.product\/\d+\/image_1024\/[^"]*)"[^>]*class="img img-fluid oe_product_image_img\s/);
    const precioM = b.match(/oe_currency_value">([\d.,]+)</);
    return {
      nombre: nombreM ? nombreM[1].trim() : null,
      codigo: idM ? idM[1] : null,
      imagenUrl: imgM ? 'https://www.comfer.co' + imgM[1].replace(/&#39;/g, "'") : null,
      precio: precioM ? parsePrecio(precioM[1]) : null,
    };
  }).filter((p) => p.nombre && p.codigo);
}

async function descargarImagen(url, destPath) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return false; // respuesta vacía/placeholder roto
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (e) {
    return false;
  }
}

async function pool(items, limit, fn) {
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const datos = loadDatos();
  const existentes = new Set(datos.productos.map((p) => p.codigo).filter(Boolean));

  let granTotal = 0;
  for (const cat of CATS) {
    console.log('=== ' + cat.categoria + ' > ' + cat.subcategoria + ' (' + cat.slug + ') ===');
    const url1 = 'https://www.comfer.co/shop/category/' + cat.slug;
    const res1 = await fetch(url1, { headers: HEADERS });
    const html1 = await res1.text();
    const totalPaginas = Math.min(30, maxPagina(html1));

    let items = parsearProductos(html1);
    for (let p = 2; p <= totalPaginas; p++) {
      const res = await fetch(url1 + '/page/' + p, { headers: HEADERS });
      const html = await res.text();
      items = items.concat(parsearProductos(html));
    }

    const vistos = new Map();
    items.forEach((it) => { if (!vistos.has(it.codigo)) vistos.set(it.codigo, it); });
    const unicos = Array.from(vistos.values());
    const nuevos = unicos.filter((it) => it.nombre && it.precio && !existentes.has(it.codigo));

    let agregados = 0, sinImagen = 0;
    await pool(nuevos, 10, async (it) => {
      const slug = slugify(it.nombre).slice(0, 70);
      const filename = it.codigo + '-' + slug + '.jpg';
      const destPath = path.join(IMG_DIR, filename);
      let imgOk = fs.existsSync(destPath);
      if (!imgOk && it.imagenUrl) imgOk = await descargarImagen(it.imagenUrl, destPath);
      if (!imgOk) { sinImagen++; return; }
      datos.productos.push({
        nombre: it.nombre,
        precio: it.precio,
        categoria: cat.categoria,
        subcategoria: cat.subcategoria,
        imagen: 'imagenes/' + filename,
        urlOriginal: it.imagenUrl,
        codigo: it.codigo,
        nota: null,
      });
      existentes.add(it.codigo);
      agregados++;
    });

    granTotal += agregados;
    console.log('  encontrados: ' + unicos.length + ' | agregados: ' + agregados + (sinImagen ? ' | sin imagen: ' + sinImagen : ''));
    saveDatos(datos); // checkpoint por categoría
  }

  console.log('TOTAL AGREGADOS: ' + granTotal);
}

main();
