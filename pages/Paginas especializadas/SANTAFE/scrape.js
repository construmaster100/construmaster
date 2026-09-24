// Scraper de catalogo Ladrillera Santafe (WooCommerce, sin precio publico).
// Usa el sitemap de productos (Yoast) y extrae JSON-LD Product de cada
// pagina. Categoria = primer segmento de la URL bajo /productos/.

const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0";

const urls = fs
  .readFileSync(path.join(__dirname, "product-sitemap.xml"), "utf-8")
  .match(/<loc>([^<]+)<\/loc>/g)
  .map((s) => s.replace(/<\/?loc>/g, ""))
  .filter((u) => u.includes("/productos/") && u !== "https://santafe.com.co/productos/");

function categoriaFromUrl(url) {
  const m = url.match(/\/productos\/([a-z0-9-]+)\//);
  if (!m) return "SIN CATEGORIA";
  return m[1]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractProduct(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj["@type"] === "Product") return obj;
    } catch (e) {}
  }
  return null;
}

async function main() {
  const items = [];
  let ok = 0;
  let fail = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const p = extractProduct(html);
      if (!p || !p.image) throw new Error("Sin datos de producto");
      items.push({
        nombre: p.name,
        precio: "Consultar",
        categoria: categoriaFromUrl(url),
        imagen: p.image,
        url,
      });
      ok++;
    } catch (err) {
      fail++;
      console.error(`FAIL ${url}: ${err.message}`);
    }
  }
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nListo. ok=${ok} fail=${fail} total=${items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
