// Limpia los productos "viejos" (sin campo `codigo`, imagen .svg placeholder)
// que quedaron en datos.js antes del scraping: si ya existe un duplicado nuevo
// (mismo id de producto vía urlOriginal) los borra; si no, descarga la foto
// real desde su urlOriginal y los convierte en una entrada normal con codigo.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'js', 'datos.js');
const IMG_DIR = path.join(ROOT, 'imagenes');
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

function loadDatos() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw.trim().replace(/^window\.DATOS_COMFER\s*=\s*/, '').replace(/;\s*$/, ''));
}
function saveDatos(datos) {
  fs.writeFileSync(DATA_PATH, 'window.DATOS_COMFER = ' + JSON.stringify(datos) + ';\n', 'utf-8');
}
function slugify(nombre) {
  return nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function idDeUrl(u) { const m = (u || '').match(/product\.product\/(\d+)\//); return m ? m[1] : null; }

async function descargarImagen(url, destPath) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (e) { return false; }
}

async function main() {
  const datos = loadDatos();
  const codigosNuevos = new Set(datos.productos.filter((p) => p.codigo).map((p) => p.codigo));

  const conservar = [];
  let borrados = 0, descargados = 0, fallidos = 0;
  for (const p of datos.productos) {
    if (p.codigo) { conservar.push(p); continue; } // ya es una entrada nueva, se queda
    const id = idDeUrl(p.urlOriginal);
    if (id && codigosNuevos.has(id)) { borrados++; continue; } // duplicado del scrape nuevo: se borra
    if (id) {
      const slug = slugify(p.nombre).slice(0, 70);
      const filename = id + '-' + slug + '.jpg';
      const destPath = path.join(IMG_DIR, filename);
      const ok = await descargarImagen(p.urlOriginal, destPath);
      if (ok) {
        conservar.push({ nombre: p.nombre, precio: p.precio, categoria: p.categoria, subcategoria: p.subcategoria, imagen: 'imagenes/' + filename, urlOriginal: p.urlOriginal, codigo: id, nota: null });
        codigosNuevos.add(id);
        descargados++;
      } else {
        conservar.push(p); // no se pudo, se deja como estaba
        fallidos++;
      }
      continue;
    }
    // sin urlOriginal: se deja tal cual (placeholder), no hay de donde sacar la foto
    conservar.push(p);
  }
  datos.productos = conservar;
  saveDatos(datos);
  console.log('borrados (duplicados):', borrados, '| descargados (recuperados):', descargados, '| fallidos:', fallidos, '| total final:', conservar.length);
}
main();
