// Scraper de catalogo ALFA (VTEX) via la API publica de catalogo, acotado
// a la categoria "ferreteria-y-construccion" (211 productos).

const fs = require("fs");
const path = require("path");

const BASE = "https://www.alfa.com.co";
const CATEGORY = "ferreteria-y-construccion";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const PAGE_SIZE = 49;

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Consultar";
  return `$${n.toLocaleString("es-CO")}`;
}

async function fetchPage(from, to) {
  const res = await fetch(`${BASE}/api/catalog_system/pub/products/search/${CATEGORY}?_from=${from}&_to=${to}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function categoriaFor(p) {
  const cats = p.categories || [];
  if (!cats.length) return "SIN CATEGORIA";
  // la categoria mas especifica es la primera (mas segmentos)
  const longest = cats.reduce((a, b) => (b.split("/").length > a.split("/").length ? b : a), cats[0]);
  const segs = longest.split("/").filter(Boolean);
  return segs[segs.length - 1] || segs[segs.length - 2] || "SIN CATEGORIA";
}

async function main() {
  const items = [];
  const seen = new Set();
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE;
    let products;
    try {
      products = await fetchPage(from, to);
    } catch (e) {
      console.error("Error pagina", from, e.message);
      break;
    }
    if (!products || products.length === 0) break;

    for (const p of products) {
      const item = p.items && p.items[0];
      const image = item && item.images && item.images[0] ? item.images[0].imageUrl : "";
      const price = item && item.sellers && item.sellers[0] ? item.sellers[0].commertialOffer.Price : null;
      if (!image || seen.has(p.productId)) continue;
      seen.add(p.productId);
      items.push({
        nombre: p.productName,
        precio: price ? formatPrice(price) : "Consultar",
        categoria: categoriaFor(p),
        imagen: image,
        url: p.link,
      });
    }
    console.log(`Pagina ${from}-${to}: ${products.length} productos (acumulado ${items.length})`);
    if (products.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (from > 5000) break;
  }

  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nListo. Total: ${items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
