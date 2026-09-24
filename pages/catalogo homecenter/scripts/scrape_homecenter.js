// Scrapea productos reales (nombre, precio, imagen, marca) de subcategorías de
// homecenter.com.co usando Playwright (el sitio bloquea peticiones directas con
// Cloudflare, pero renderiza bien con un navegador real) y los agrega a js/datos.js.
//
// Uso: node scripts/scrape_homecenter.js <cola.json>
// cola.json: [{ "departamento": "Plomería", "subcategoria": "Tubos PVC", "url": "https://..." }, ...]

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'js', 'datos.js');
const IMG_DIR = path.join(ROOT, 'img');
const PER_PAGE = 40;
const CONCURRENCIA_IMG = 12;

function loadDatos() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const jsonStr = raw.trim().replace(/^window\.DATOS_HOMECENTER\s*=\s*/, '').replace(/;\s*$/, '');
  return JSON.parse(jsonStr);
}

function saveDatos(datos) {
  fs.writeFileSync(DATA_PATH, 'window.DATOS_HOMECENTER = ' + JSON.stringify(datos) + ';\n', 'utf-8');
}

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parsePrecio(texto) {
  if (!texto) return null;
  const digitos = texto.replace(/[^0-9]/g, '');
  return digitos ? Number(digitos) : null;
}

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    const attempt = (u, redirects) => {
      const file = fs.createWriteStream(destPath);
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 3) {
          file.close(); fs.unlink(destPath, () => {});
          return attempt(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) { file.close(); fs.unlink(destPath, () => {}); return resolve(false); }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(true)));
      }).on('error', () => { fs.unlink(destPath, () => {}); resolve(false); });
    };
    attempt(url, 0);
  });
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

async function cargarImagenesLazy(page) {
  // el sitio carga las imágenes por IntersectionObserver: hay que recorrer
  // toda la página en pasos para que las 40 tarjetas terminen con src real.
  const totalCards = await page.evaluate(() => document.querySelectorAll('.product-wrapper[data-key]').length);
  if (!totalCards) return;
  for (let i = 0; i < 20; i++) {
    const cargadas = await page.evaluate(() => document.querySelectorAll('.product-image img[src^="http"]').length);
    if (cargadas >= totalCards) break;
    await page.evaluate((step) => window.scrollBy(0, step), Math.ceil(1400));
    await page.waitForTimeout(280);
  }
  // un último recorrido completo por si algo quedó pendiente
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

function catId(u) {
  const m = u.match(/\/category\/(cat\d+)\//);
  return m ? m[1] : null;
}

async function scrapeSubcategoria(page, url) {
  const base = url.split('?')[0];
  const idEsperado = catId(base);
  await page.goto(base + '?currentpage=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1700);
  // el sitio a veces redirige categorias dadas de baja al departamento padre
  // (miles de productos ajenos): si cambió el id de categoría, la saltamos.
  const idReal = catId(page.url());
  if (idEsperado && idReal && idReal !== idEsperado) {
    return { items: [], total: 0, redirigida: true, urlFinal: page.url() };
  }
  const totalText = await page.evaluate(() => {
    const el = document.querySelector('.visible-count-products');
    return el ? el.textContent : '';
  });
  const m = totalText.match(/de\D*([\d.,]+)/i);
  const total = m ? parseInt(m[1].replace(/[.,]/g, ''), 10) : null;
  const MAX_PAGINAS = 150; // corta si por algún motivo el total sale desproporcionado
  const totalPages = total ? Math.min(MAX_PAGINAS, Math.max(1, Math.ceil(total / PER_PAGE))) : 1;

  const vistos = new Map();
  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) {
      await page.goto(base + '?currentpage=' + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1200);
    }
    await cargarImagenesLazy(page);
    const items = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product-wrapper[data-key]')).map((c) => {
        const titleEl = c.querySelector('.product-title');
        const brandEl = c.querySelector('.product-brand');
        const priceEl = c.querySelector('.parsedPrice');
        const imgs = Array.from(c.querySelectorAll('.product-image img'));
        const realImg = imgs.find((i) => i.src && i.src.indexOf('http') === 0);
        return {
          key: c.getAttribute('data-key'),
          nombre: titleEl ? titleEl.textContent.trim() : null,
          marca: brandEl ? brandEl.textContent.trim() : null,
          precioTxt: priceEl ? priceEl.textContent.trim() : null,
          imagen: realImg ? realImg.src : null,
        };
      });
    });
    items.forEach((it) => { if (it.key && !vistos.has(it.key)) vistos.set(it.key, it); });
  }
  return { items: Array.from(vistos.values()), total };
}

async function main() {
  const colaPath = process.argv[2];
  if (!colaPath) { console.error('Uso: node scrape_homecenter.js <cola.json>'); process.exit(1); }
  const cola = JSON.parse(fs.readFileSync(colaPath, 'utf-8'));

  const datos = loadDatos();
  const existentes = new Set(datos.productos.map((p) => p.codigo));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let granTotal = 0;
  for (const tarea of cola) {
    const { departamento, subcategoria, url } = tarea;
    console.log('=== ' + departamento + ' > ' + subcategoria + ' ===');
    let resultado;
    try {
      resultado = await scrapeSubcategoria(page, url);
    } catch (e) {
      console.log('  ERROR: ' + e.message);
      continue;
    }
    if (resultado.redirigida) {
      console.log('  OMITIDA: la categoría redirigió a ' + resultado.urlFinal + ' (dada de baja, no se scrapea)');
      continue;
    }
    console.log('  encontrados: ' + resultado.items.length + ' (total reportado: ' + resultado.total + ')');

    const nuevos = resultado.items.filter((it) => it.nombre && it.precioTxt && !existentes.has(it.key));
    let sinImagen = 0;
    let agregados = 0;

    await pool(nuevos, CONCURRENCIA_IMG, async (it) => {
      const precio = parsePrecio(it.precioTxt);
      if (!precio) return;
      const slug = slugify(it.nombre).slice(0, 65);
      const filename = it.key + '-' + slug + '.webp';
      const destPath = path.join(IMG_DIR, filename);
      let imgOk = fs.existsSync(destPath);
      if (!imgOk && it.imagen) {
        const grande = it.imagen.replace(/w=\d+,h=\d+/, 'w=300,h=300');
        imgOk = await downloadImage(grande, destPath);
      }
      if (!imgOk) { sinImagen++; return; }
      datos.productos.push({
        nombre: it.nombre,
        precio: precio,
        categoria: departamento,
        subcategoria: subcategoria,
        imagen: 'img/' + filename,
        marca: it.marca || 'Multimarcas',
        codigo: it.key,
      });
      existentes.add(it.key);
      agregados++;
    });
    if (sinImagen) console.log('  sin imagen (omitidos): ' + sinImagen);

    // actualiza el conteo real de la subcategoría en el mapa de departamentos
    const dep = datos.departamentos.find((d) => d.nombre === departamento);
    if (dep) {
      const sub = dep.subcategorias.find((s) => s.nombre === subcategoria);
      if (sub && resultado.total != null) sub.cantidad = resultado.total;
    }

    granTotal += agregados;
    console.log('  agregados: ' + agregados);
    saveDatos(datos); // checkpoint por subcategoría
  }

  await browser.close();
  console.log('TOTAL AGREGADOS: ' + granTotal);
}

main();
