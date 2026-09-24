// Descarga la imagen real de cada producto y genera un recorte (trim del
// fondo blanco/uniforme) guardado localmente en img/, actualizando data.json
// con la ruta local para usarla en el sitio.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DATA_PATH = path.join(__dirname, "data.json");
const IMG_DIR = path.join(__dirname, "img");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function downloadAndCrop(item) {
  const res = await fetch(item.imagen, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} descargando ${item.imagen}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const filename = `${slugify(item.categoria)}--${slugify(item.nombre)}.jpg`;
  const outPath = path.join(IMG_DIR, filename);

  await sharp(buffer)
    .trim({ background: "#ffffff", threshold: 12 }) // recorta el margen blanco alrededor del producto
    .resize({ width: 700, withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toFile(outPath);

  return `img/${filename}`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  fs.mkdirSync(IMG_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;
  for (const item of data) {
    try {
      const localPath = await downloadAndCrop(item);
      item.imagenOriginal = item.imagen;
      item.imagen = localPath;
      ok++;
      console.log(`OK  ${item.categoria} / ${item.nombre} -> ${localPath}`);
    } catch (err) {
      fail++;
      console.error(`FAIL ${item.categoria} / ${item.nombre}: ${err.message}`);
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\nListo. OK=${ok} FAIL=${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
