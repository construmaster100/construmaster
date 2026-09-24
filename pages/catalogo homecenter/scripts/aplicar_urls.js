// Aplica un mapa {subcategoria: url} a un departamento dentro de datos.js
// (para completar/corregir sub.url antes de scrapear) y genera la cola de scraping.
// Uso: node scripts/aplicar_urls.js "<Departamento>" scripts/cola_x_urls.json scripts/cola_x.json

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'js', 'datos.js');

function loadDatos() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw.trim().replace(/^window\.DATOS_HOMECENTER\s*=\s*/, '').replace(/;\s*$/, ''));
}
function saveDatos(datos) {
  fs.writeFileSync(DATA_PATH, 'window.DATOS_HOMECENTER = ' + JSON.stringify(datos) + ';\n', 'utf-8');
}

const [depNombre, urlsFile, colaOut] = process.argv.slice(2);
const urls = JSON.parse(fs.readFileSync(urlsFile, 'utf-8'));

const datos = loadDatos();
const dep = datos.departamentos.find((d) => d.nombre === depNombre);
if (!dep) { console.error('Departamento no encontrado:', depNombre); process.exit(1); }

let actualizados = 0;
Object.keys(urls).forEach((nombreSub) => {
  const sub = dep.subcategorias.find((s) => s.nombre === nombreSub);
  if (sub) { sub.url = urls[nombreSub]; actualizados++; }
  else console.log('  (aviso) subcategoria no encontrada en datos.js:', nombreSub);
});
saveDatos(datos);
console.log('urls actualizadas:', actualizados, 'de', Object.keys(urls).length);

const cola = dep.subcategorias.filter((s) => s.url).map((s) => ({ departamento: dep.nombre, subcategoria: s.nombre, url: s.url }));
fs.writeFileSync(colaOut, JSON.stringify(cola, null, 2));
console.log('cola generada con', cola.length, 'subcategorias ->', colaOut);
