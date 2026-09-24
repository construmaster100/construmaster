// Scraper de inventario G&J (gyj.com.co) - construye data.json con
// NOMBRE DEL PRODUCTO, PRECIO, CATEGORIA, IMAGEN (jpg) para cada categoria del sidebar.

const fs = require("fs");
const path = require("path");

const BASE = "https://gyj.com.co/bogota_65";

const CATEGORIES = [
  { name: "ACERO CONSTRUCCION", url: `${BASE}/productos/acero-construccion.html` },
  { name: "ACERO INDUSTRIAL", url: `${BASE}/productos/acero-industrial.html` },
  { name: "PERFILERIA", url: `${BASE}/productos/perfileria.html` },
  { name: "TREFILADOS", url: `${BASE}/productos/trefilados.html` },
  { name: "TUBERIA", url: `${BASE}/productos/tuberia.html` },
  { name: "TUBERIA PETROLERA", url: `${BASE}/productos/tuberia-petrolera.html` },
  { name: "CUBIERTAS Y FACHADAS", url: `${BASE}/productos/cubiertas-y-fachadas.html` },
  { name: "SOLUCIONES CONSTRUCTIVAS", url: `${BASE}/productos/soluciones-constructivas.html` },
  { name: "PISOS", url: `${BASE}/productos/pisos.html` },
  { name: "CEMENTO PATRIOTA", url: `${BASE}/productos/cemento-patriota.html` },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function decodeEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#x20;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Ntilde;/g, "Ñ")
    .trim();
}

function extractProducts(html, categoryName) {
  const products = [];
  // Cada tarjeta de producto empieza en class="product-item-info" y termina en el siguiente "product-item-info" o cierre de <li>
  const blocks = html.split('class="product-item-info"').slice(1);
  for (const raw of blocks) {
    const block = raw.slice(0, 4000); // suficiente para cubrir imagen+nombre+precio de una tarjeta

    const imgMatch = block.match(/data-lazysrc="([^"]+\.jpg)"/i);
    const nameMatch = block.match(/product-item-name">\s*<a[^>]*>[\s\S]*?item_name&quot;:&quot;([^&]+)&quot;/);
    const altMatch = block.match(/alt="([^"]+)"/);
    const priceLabelMatch = block.match(/price-label">([^<]+)</);
    const priceMatch = block.match(/class="price">\$?([\d.,]+)</);

    if (!imgMatch) continue;

    const name = decodeEntities(nameMatch ? nameMatch[1] : altMatch ? altMatch[1] : "");
    if (!name) continue;

    const priceLabel = priceLabelMatch ? decodeEntities(priceLabelMatch[1]) : "";
    const priceValue = priceMatch ? `$${priceMatch[1]}` : "";
    const precio = priceLabel ? `${priceLabel} ${priceValue}` : priceValue;

    products.push({
      nombre: name,
      precio,
      categoria: categoryName,
      imagen: imgMatch[1],
    });
  }
  return products;
}

function getTotalCount(html) {
  // El texto es "X-Y de Z" con tres <span class="toolbar-number">; el total es el ultimo (tras " de ").
  const m = html.match(/de\s*<span class="toolbar-number">\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  const single = html.match(/toolbar-number">\s*(\d+)/);
  return single ? parseInt(single[1], 10) : null;
}

async function scrapeCategory(cat) {
  const all = [];
  let page = 1;
  let seenOnPage = -1;
  while (true) {
    const url = page === 1 ? cat.url : `${cat.url}?p=${page}`;
    const html = await fetchHtml(url);
    if (!html) break;
    const products = extractProducts(html, cat.name);
    if (products.length === 0) break;
    all.push(...products);
    const total = getTotalCount(html);
    console.log(`  [${cat.name}] pagina ${page}: ${products.length} productos (total categoria: ${total})`);
    if (total !== null && all.length >= total) break;
    if (products.length === seenOnPage) break; // evita loop infinito si la paginacion no cambia
    seenOnPage = products.length;
    page++;
    if (page > 15) break; // limite de seguridad
  }
  return all;
}

async function main() {
  const result = [];
  const seen = new Set();
  for (const cat of CATEGORIES) {
    console.log(`Descargando categoria: ${cat.name} (${cat.url})`);
    const products = await scrapeCategory(cat);
    for (const p of products) {
      const key = `${p.nombre}|${p.categoria}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
    }
  }
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nTotal productos unicos: ${result.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
