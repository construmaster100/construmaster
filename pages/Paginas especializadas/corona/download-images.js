// Descarga la imagen real de cada producto de Corona y genera un recorte
// (trim de fondo uniforme) guardado localmente en img/, actualizando
// data.json con la ruta local. Usa un pool de descargas concurrentes.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { Agent, setGlobalDispatcher } = require("undici");

setGlobalDispatcher(new Agent({ maxHeaderSize: 131072 }));

const DATA_PATH = path.join(__dirname, "data.json");
const IMG_DIR = path.join(__dirname, "img");
const CONCURRENCY = 10;
const PROGRESS_EVERY = 50;

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
  if (!res.ok) throw new Error(`HTTP ${res.status} descargando imagen`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const filename = `${slugify(item.categoria)}--${slugify(item.nombre)}--${item.sku}.jpg`;
  const outPath = path.join(IMG_DIR, filename);

  await sharp(buffer)
    .trim({ background: "#ffffff", threshold: 12 })
    .resize({ width: 700, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);

  return `img/${filename}`;
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  let done = 0;
  let ok = 0;
  let fail = 0;

  async function next() {
    while (idx < items.length) {
      const item = items[idx++];
      try {
        const localPath = await worker(item);
        item.imagenOriginal = item.imagen;
        item.imagen = localPath;
        ok++;
      } catch (err) {
        fail++;
        console.error(`FAIL ${item.categoria} / ${item.nombre}: ${err.message}`);
      }
      done++;
      if (done % PROGRESS_EVERY === 0 || done === items.length) {
        console.log(`Progreso: ${done}/${items.length} (ok=${ok} fail=${fail})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  return { ok, fail };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const { ok, fail } = await runPool(data, downloadAndCrop, CONCURRENCY);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\nListo. OK=${ok} FAIL=${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
