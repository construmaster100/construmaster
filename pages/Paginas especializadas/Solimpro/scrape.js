// Scraper de catalogo Solimpro (Shopify) via la API publica /products.json
const fs = require("fs");
const path = require("path");

const BASE = "https://tienda.gruposolinpro.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Consultar";
  return `$${n.toLocaleString("es-CO")}`;
}

function categoriaFor(p) {
  if (p.product_type) return p.product_type;
  if (p.tags && p.tags.length) return p.tags[0];
  return "SIN CATEGORIA";
}

async function fetchPage(pageNum) {
  const res = await fetch(`${BASE}/products.json?limit=250&page=${pageNum}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.products || [];
}

async function main() {
  const items = [];
  let page = 1;
  while (true) {
    const products = await fetchPage(page);
    if (products.length === 0) break;
    for (const p of products) {
      const variant = p.variants && p.variants[0];
      const image = p.images && p.images[0] ? p.images[0].src : (p.image ? p.image.src : "");
      if (!image) continue;
      items.push({
        nombre: p.title,
        precio: variant ? formatPrice(variant.price) : "Consultar",
        categoria: categoriaFor(p),
        imagen: image,
        url: `${BASE}/products/${p.handle}`,
      });
    }
    console.log(`Pagina ${page}: ${products.length} productos (acumulado ${items.length})`);
    page++;
    if (page > 100) break; // limite de seguridad
  }

  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nListo. Total productos: ${items.length}`);
  const cats = new Set(items.map((i) => i.categoria));
  console.log(`Categorias distintas: ${cats.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
