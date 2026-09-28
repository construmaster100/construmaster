// Scraper de catalogo IPECOL (ipecol.com). Catalogo pequeno (11 lineas de
// producto) en una sola pagina estatica, sin precio publico (fabricante B2B).
// PRECIO queda como "Consultar". Cada titulo se asocia a la imagen de
// producto mas cercana que lo precede en el HTML.

const fs = require("fs");
const path = require("path");

const BASE = "https://www.ipecol.com/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function categoriaFor(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes("pintura")) return "Pinturas";
  if (n.includes("gypsumastic") || n.includes("masilla")) return "Masillas";
  if (n.includes("panel")) return "Paneles";
  if (n.includes("tuccol")) return "Estucos y Pañetes";
  if (n.includes("pegagyp") || n.includes("pega")) return "Pegantes";
  return "Otros";
}

async function main() {
  const res = await fetch(BASE + "productos.php", { headers: { "User-Agent": UA } });
  const html = await res.text();

  const imgRe = /<img src="(img\/imagenes_[^"]+)"/g;
  const titleRe = /class="titulo">([^<]+)<\/p>/g;
  const imgs = [];
  let m;
  while ((m = imgRe.exec(html))) imgs.push({ idx: m.index, src: m[1] });
  const titles = [];
  while ((m = titleRe.exec(html))) titles.push({ idx: m.index, text: m[1].trim() });

  const items = titles.map((t) => {
    let best = null;
    for (const im of imgs) {
      if (im.idx < t.idx) best = im;
      else break;
    }
    return {
      nombre: t.text,
      precio: "Consultar",
      categoria: categoriaFor(t.text),
      imagen: best ? BASE + best.src : "",
      url: BASE + "productos.php",
    };
  });

  fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(items, null, 2), "utf-8");
  console.log(`Listo. ${items.length} productos extraidos.`);
  items.forEach((i) => console.log(` - [${i.categoria}] ${i.nombre} -> ${i.imagen}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
