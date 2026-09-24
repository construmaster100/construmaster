// Scraper de inventario Corona (corona.co)
// Recorre las URLs de producto (SKU numerico) obtenidas del sitemap, extrae el
// bloque JSON-LD "Product" (nombre, precio, imagen, categoria via breadcrumb)
// y guarda todo en data.json.

const fs = require("fs");
const path = require("path");
const { Agent, setGlobalDispatcher } = require("undici");

// corona.co responde con muchas cabeceras (cookies) que exceden el limite
// por defecto de undici/fetch (UND_ERR_HEADERS_OVERFLOW); lo ampliamos.
setGlobalDispatcher(new Agent({ maxHeaderSize: 131072 }));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";
const CONCURRENCY = 15;
const URLS_FILE = path.join(__dirname, "product-urls-sku.txt");
const OUT_FILE = path.join(__dirname, "data.json");
const PROGRESS_EVERY = 50;

function extractJsonLd(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch (e) {
      // ignorar bloques mal formados
    }
  }
  return blocks;
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString("es-CO")}`;
}

async function scrapeOne(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const blocks = extractJsonLd(html);

  const productBlock = blocks.find((b) => b["@type"] === "Product");
  const pageBlock = blocks.find((b) => b["@type"] === "WebPage");
  if (!productBlock) throw new Error("Sin bloque Product");

  const offer = Array.isArray(productBlock.offers) ? productBlock.offers[0] : productBlock.offers;
  const price = offer ? formatPrice(offer.price) : "";
  const image = Array.isArray(productBlock.image) ? productBlock.image[0] : productBlock.image;

  let categoria = "";
  if (pageBlock && pageBlock.breadcrumb && Array.isArray(pageBlock.breadcrumb.itemListElement)) {
    const items = pageBlock.breadcrumb.itemListElement;
    // posicion 2 = categoria principal (posicion 1 es "Productos"). Si el
    // breadcrumb es degenerado (URLs cortas tipo /c/<slug>/p/<sku>), la
    // posicion 2 termina siendo el propio titulo de pagina - lo descartamos.
    const top = items.find((it) => it.position === 2);
    if (top && top.item && !/\|\s*Corona Colombia$/.test(top.item.name)) {
      categoria = top.item.name;
    }
  }
  if (!categoria) {
    // Fallback: primer segmento tras /productos/ en la URL.
    const m = url.match(/\/productos\/([a-z0-9-]+)\//);
    if (m) {
      categoria = m[1]
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  if (!productBlock.name || !image) throw new Error("Faltan datos (nombre/imagen)");

  return {
    sku: productBlock.sku || "",
    nombre: productBlock.name,
    precio: price,
    categoria: categoria || "SIN CATEGORIA",
    imagen: image,
    url,
  };
}

async function runPool(urls, worker, concurrency) {
  const results = [];
  let idx = 0;
  let done = 0;
  let ok = 0;
  let fail = 0;

  async function next() {
    while (idx < urls.length) {
      const myIdx = idx++;
      const url = urls[myIdx];
      try {
        const r = await worker(url);
        results[myIdx] = r;
        ok++;
      } catch (err) {
        fail++;
        console.error(`FAIL ${url}: ${err.message}`);
      }
      done++;
      if (done % PROGRESS_EVERY === 0 || done === urls.length) {
        console.log(`Progreso: ${done}/${urls.length} (ok=${ok} fail=${fail})`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => next());
  await Promise.all(workers);
  return results.filter(Boolean);
}

async function main() {
  const urls = fs
    .readFileSync(URLS_FILE, "utf-8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Total URLs a scrapear: ${urls.length}`);
  const results = await runPool(urls, scrapeOne, CONCURRENCY);

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nListo. Productos guardados: ${results.length} / ${urls.length}`);

  const cats = new Set(results.map((r) => r.categoria));
  console.log(`Categorias distintas: ${cats.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
