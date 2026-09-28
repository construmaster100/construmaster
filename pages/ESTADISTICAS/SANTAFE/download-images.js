// Variante de download-images.js que usa curl en vez de fetch, para sitios
// cuyo WAF bloquea la huella TLS del cliente nativo de Node (ej. Soelco,
// SANTAFE). Misma logica: resumible, guarda cada 200, corta a los 8.5 min.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);

const DATA_PATH = path.join(__dirname, "data.json");
const IMG_DIR = path.join(__dirname, "img");
const CONCURRENCY = 6;
const PROGRESS_EVERY = 100;
const SAVE_EVERY = 200;
const TIME_BUDGET_MS = 8.5 * 60 * 1000;

const UA = "Mozilla/5.0";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function curlDownload(url, outFile) {
  await execFileAsync("curl", ["-s", "-A", UA, "--max-time", "20", "-o", outFile, url], {
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function downloadAndCrop(item, index) {
  const filename = `${slugify(item.categoria)}--${slugify(item.nombre)}--${item.sku || index}.jpg`;
  const tmpFile = path.join(IMG_DIR, `_tmp_${index}.jpg`);
  const outPath = path.join(IMG_DIR, filename);

  await curlDownload(item.imagen, tmpFile);
  const buffer = fs.readFileSync(tmpFile);
  if (buffer.length < 200) throw new Error("archivo demasiado pequeno/vacio");

  await sharp(buffer)
    .flatten({ background: "#ffffff" })
    .trim({ background: "#ffffff", threshold: 12 })
    .resize({ width: 700, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);

  fs.unlinkSync(tmpFile);
  return `img/${filename}`;
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

async function runPool(data, pending, concurrency, deadline) {
  let idx = 0;
  let done = 0;
  let ok = 0;
  let fail = 0;
  let stopped = false;

  async function next() {
    while (idx < pending.length) {
      if (Date.now() > deadline) {
        stopped = true;
        return;
      }
      const { item, index } = pending[idx++];
      try {
        const localPath = await downloadAndCrop(item, index);
        item.imagenOriginal = item.imagen;
        item.imagen = localPath;
        ok++;
      } catch (err) {
        fail++;
        console.error(`FAIL ${item.categoria} / ${item.nombre}: ${err.message}`);
      }
      done++;
      if (done % PROGRESS_EVERY === 0 || done === pending.length) {
        console.log(`Progreso: ${done}/${pending.length} (ok=${ok} fail=${fail})`);
      }
      if (done % SAVE_EVERY === 0) saveData(data);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  return { ok, fail, stopped, processed: done };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  fs.mkdirSync(IMG_DIR, { recursive: true });

  for (const item of data) {
    if (Array.isArray(item.imagen)) item.imagen = item.imagen[0] || "";
  }

  const pending = data
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => typeof item.imagen === "string" && item.imagen && !item.imagen.startsWith("img/"));

  console.log(`Total: ${data.length} | Ya descargadas: ${data.length - pending.length} | Pendientes: ${pending.length}`);
  if (pending.length === 0) {
    console.log("Nada pendiente. Descarga de imagenes completa.");
    return;
  }

  const deadline = Date.now() + TIME_BUDGET_MS;
  const { ok, fail, stopped, processed } = await runPool(data, pending, CONCURRENCY, deadline);

  saveData(data);
  console.log(`\nLote terminado. Procesados=${processed} ok=${ok} fail=${fail} cortado_por_tiempo=${stopped}`);
  console.log(`Quedan pendientes aprox: ${pending.length - processed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
