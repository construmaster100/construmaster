// Scraper de catalogo PAVCO (pavcowavin.com.co).
// Este sitio NO es una tienda: son ~34 lineas de producto tecnicas sin
// precio publico (el precio esta detras de un login "My Wavin"). Se extrae
// nombre + categoria (del menu de navegacion) + imagen principal (og:image)
// de cada pagina de linea de producto. PRECIO queda como "Consultar".

const fs = require("fs");
const path = require("path");

const BASE = "https://pavcowavin.com.co/";
const NAV_ITEMS = JSON.parse(fs.readFileSync(path.join(__dirname, "nav-products.json"), "utf-8"));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function absoluteUrl(href) {
  if (href.startsWith("http")) return href;
  return BASE + href;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function scrapeOne(navItem) {
  const url = absoluteUrl(navItem.href);
  const html = await fetchHtml(url);
  const imgMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
  const image = imgMatch ? imgMatch[1] : "";
  if (!image) throw new Error("Sin og:image");

  return {
    nombre: navItem.nombre,
    precio: "Consultar",
    categoria: navItem.categoria,
    imagen: image,
    url,
  };
}

async function main() {
  const results = [];
  let ok = 0;
  let fail = 0;
  for (const navItem of NAV_ITEMS) {
    try {
      const r = await scrapeOne(navItem);
      results.push(r);
      ok++;
      console.log(`OK  ${navItem.categoria} / ${navItem.nombre}`);
    } catch (err) {
      fail++;
      console.error(`FAIL ${navItem.categoria} / ${navItem.nombre}: ${err.message}`);
    }
  }
  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nListo. ok=${ok} fail=${fail} total=${results.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
