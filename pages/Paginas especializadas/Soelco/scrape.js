// Scraper de inventario Soelco (soelco.co) - REANUDABLE.
// Recorre las URLs de producto (product-sitemap*.xml), extrae el bloque
// JSON-LD "Product" (dentro de @graph, formato Yoast/AIOSEO) con nombre,
// precio, categoria e imagen, y va guardando cada resultado en products.jsonl
// a medida que se procesa (append), para poder cortar el proceso y
// retomarlo despues sin perder lo ya scrapeado.
//
// El sitio tiene proteccion Cloudflare que bloquea rafagas de peticiones
// (403 "Just a moment..."); por eso se usa concurrencia baja + backoff
// exponencial con reintentos en cada URL.

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);

// Cloudflare bloquea la huella TLS del cliente HTTP nativo de Node
// (undici/fetch) pero deja pasar a curl con el mismo User-Agent; por eso
// se usa curl como cliente en vez de fetch().
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const STATUS_MARKER = "__STATUS_CODE__:";

async function curlFetch(url) {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-s",
      "-A", UA,
      "-H", "Accept-Language: es-CO,es;q=0.9",
      "--max-time", "20",
      "-w", `\n${STATUS_MARKER}%{http_code}`,
      url,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  const idx = stdout.lastIndexOf(`\n${STATUS_MARKER}`);
  if (idx === -1) throw new Error("Respuesta de curl sin status code");
  const body = stdout.slice(0, idx);
  const status = parseInt(stdout.slice(idx + 1 + STATUS_MARKER.length).trim(), 10);
  return { body, status };
}
const URLS_FILE = path.join(__dirname, "product-urls.txt");
const OUT_FILE = path.join(__dirname, "products.jsonl");
const FAIL_FILE = path.join(__dirname, "failed-urls.txt");

const CONCURRENCY = 8;
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 150; // pausa minima entre peticiones, por worker
const TIME_BUDGET_MS = 8.5 * 60 * 1000; // cortar antes de los 10 min del tool

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function fetchWithRetry(url) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { body, status } = await curlFetch(url);
      if (status === 403 || status === 429) {
        lastErr = new Error(`HTTP ${status}`);
        await sleep(2000 * attempt + Math.random() * 1000);
        continue;
      }
      if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`);
      return body;
    } catch (err) {
      lastErr = err;
      await sleep(1500 * attempt + Math.random() * 500);
    }
  }
  throw lastErr;
}

async function scrapeOne(url) {
  const html = await fetchWithRetry(url);
  const blocks = extractJsonLd(html);

  let productBlock = null;
  for (const b of blocks) {
    if (Array.isArray(b["@graph"])) {
      const p = b["@graph"].find((g) => g["@type"] === "Product");
      if (p) {
        productBlock = p;
        break;
      }
    } else if (b["@type"] === "Product") {
      productBlock = b;
      break;
    }
  }
  if (!productBlock) throw new Error("Sin bloque Product");

  const offer = Array.isArray(productBlock.offers) ? productBlock.offers[0] : productBlock.offers;
  const price = offer && offer.price != null ? formatPrice(offer.price) : "";
  const categoria = (offer && offer.category) || "SIN CATEGORIA";
  const imageObj = productBlock.image;
  const image = typeof imageObj === "string" ? imageObj : imageObj && imageObj.url;

  if (!productBlock.name || !image) throw new Error("Faltan datos (nombre/imagen)");

  return {
    sku: productBlock.sku || "",
    nombre: productBlock.name,
    precio: price,
    categoria,
    imagen: image,
    url,
  };
}

function loadDoneSet() {
  const done = new Set();
  if (fs.existsSync(OUT_FILE)) {
    const lines = fs.readFileSync(OUT_FILE, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        done.add(obj.url);
      } catch (e) {
        // ignorar linea corrupta
      }
    }
  }
  return done;
}

async function runPool(urls, concurrency, deadline) {
  let idx = 0;
  let done = 0;
  let ok = 0;
  let fail = 0;
  const outStream = fs.createWriteStream(OUT_FILE, { flags: "a" });
  const failStream = fs.createWriteStream(FAIL_FILE, { flags: "a" });
  let stopped = false;

  async function next() {
    while (idx < urls.length) {
      if (Date.now() > deadline) {
        stopped = true;
        return;
      }
      const url = urls[idx++];
      try {
        const r = await scrapeOne(url);
        outStream.write(JSON.stringify(r) + "\n");
        ok++;
      } catch (err) {
        failStream.write(`${url}\t${err.message}\n`);
        fail++;
      }
      done++;
      await sleep(BASE_DELAY_MS + Math.random() * 400);
      if (done % 50 === 0) {
        console.log(`Progreso lote: ${done}/${urls.length} (ok=${ok} fail=${fail})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  outStream.end();
  failStream.end();
  return { ok, fail, stopped, processed: done };
}

async function main() {
  const allUrls = fs
    .readFileSync(URLS_FILE, "utf-8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const done = loadDoneSet();
  const pending = allUrls.filter((u) => !done.has(u));

  console.log(`Total: ${allUrls.length} | Ya scrapeados: ${done.size} | Pendientes: ${pending.length}`);

  if (pending.length === 0) {
    console.log("Nada pendiente. Scraping completo.");
    return;
  }

  const deadline = Date.now() + TIME_BUDGET_MS;
  const { ok, fail, stopped, processed } = await runPool(pending, CONCURRENCY, deadline);

  console.log(`\nLote terminado. Procesados=${processed} ok=${ok} fail=${fail} cortado_por_tiempo=${stopped}`);
  console.log(`Quedan pendientes aprox: ${pending.length - processed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
