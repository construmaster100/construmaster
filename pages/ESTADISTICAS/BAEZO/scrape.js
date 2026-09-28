// Scraper de catalogo BAEZO (Astro SSR, tarjetas .offer-card con precio e
// imagen en el HTML estatico). Recorre todas las paginas de categoria del
// menu (con paginacion ?page=N) y extrae nombre, precio, imagen. La
// categoria se toma del ultimo segmento de la URL de categoria.

const fs = require("fs");
const path = require("path");

const BASE = "https://baezo.com.co";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CATEGORY_PATHS = JSON.parse(fs.readFileSync(path.join(__dirname, "category-paths.json"), "utf-8"));

function categoriaFromPath(p) {
  const segs = p.split("/").filter(Boolean);
  return segs[segs.length - 1]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function extractCards(html) {
  const items = [];
  const cardRe = /<a class="offer-card"[^>]*href="([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="offer-card-name"[^>]*>([^<]+)<\/h3>[\s\S]*?<p class="price-new"[^>]*>([^<]+)<\/p>/g;
  let m;
  while ((m = cardRe.exec(html))) {
    items.push({
      href: m[1],
      imagen: m[2],
      nombre: m[3].trim(),
      precio: m[4].trim().replace(/&nbsp;/g, "").trim() || "Consultar",
    });
  }
  return items;
}

async function scrapeCategory(catPath) {
  const all = [];
  let page = 1;
  const categoria = categoriaFromPath(catPath);
  while (true) {
    const url = page === 1 ? `${BASE}${catPath}` : `${BASE}${catPath}?page=${page}`;
    let html;
    try {
      html = await fetchHtml(url);
    } catch (e) {
      break;
    }
    const cards = extractCards(html);
    if (cards.length === 0) break;
    for (const c of cards) {
      all.push({
        nombre: c.nombre,
        precio: c.precio || "Consultar",
        categoria,
        imagen: c.imagen,
        url: BASE + c.href,
      });
    }
    page++;
    if (page > 30) break;
  }
  return all;
}

async function main() {
  const seen = new Set();
  const result = [];
  for (const catPath of CATEGORY_PATHS) {
    const items = await scrapeCategory(catPath);
    let added = 0;
    for (const it of items) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      result.push(it);
      added++;
    }
    console.log(`${catPath} -> ${items.length} tarjetas (${added} nuevas)`);
  }
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nListo. Total productos unicos: ${result.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
