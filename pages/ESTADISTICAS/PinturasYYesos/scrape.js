// Scraper de catalogo Pinturas y Yesos (WooCommerce). Usa el sitemap de
// productos (Yoast, 2 partes) y extrae de cada pagina: og:title, precio
// (woocommerce-Price-amount), og:image. Categoria = segmento de URL bajo
// /catalogo/.

const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};
const CONCURRENCY = 8;

function loadUrls() {
  const files = ["product-sitemap1.xml", "product-sitemap2.xml"];
  const urls = [];
  for (const f of files) {
    const xml = fs.readFileSync(path.join(__dirname, f), "utf-8");
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    urls.push(...matches);
  }
  return [...new Set(urls)].filter((u) => u !== "https://pinturasyyesos.com/catalogo/");
}

function categoriaFromUrl(url) {
  const m = url.match(/\/catalogo\/([a-z0-9-]+)\//);
  if (!m) return "SIN CATEGORIA";
  return m[1]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function scrapeOne(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/);
  const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
  const priceMatch = html.match(/woocommerce-Price-amount amount"><bdi>(?:<span[^>]*>[^<]*<\/span>)?\s*([0-9.,]+)/);

  if (!titleMatch || !imageMatch) throw new Error("Sin titulo/imagen");

  const nombre = titleMatch[1].split("|")[0].trim();
  const precio = priceMatch ? `$${priceMatch[1]}` : "Consultar";

  return {
    nombre,
    precio,
    categoria: categoriaFromUrl(url),
    imagen: imageMatch[1],
    url,
  };
}

async function runPool(urls, concurrency) {
  let idx = 0;
  let done = 0;
  let ok = 0;
  let fail = 0;
  const results = [];

  async function next() {
    while (idx < urls.length) {
      const url = urls[idx++];
      try {
        const r = await scrapeOne(url);
        results.push(r);
        ok++;
      } catch (err) {
        fail++;
        console.error(`FAIL ${url}: ${err.message}`);
      }
      done++;
      if (done % 50 === 0) console.log(`Progreso: ${done}/${urls.length} (ok=${ok} fail=${fail})`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  return results;
}

async function main() {
  const urls = loadUrls();
  console.log(`Total URLs: ${urls.length}`);
  const items = await runPool(urls, CONCURRENCY);
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nListo. Total: ${items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
