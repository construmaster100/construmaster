// Prepara datos.js (urls faltantes + retaxonomía real de Pinturas/Pisos y Paredes)
// y genera la cola maestra para scrapear TODO lo que falta: 2 subcats de Plomería,
// Electricidad completa, las 5 categorías planas de Construcción y Ferretería,
// Baños, Pinturas, Pisos y Paredes y Tejas y Drywall.
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

const datos = loadDatos();
const cola = [];

function dep(nombre) {
  const d = datos.departamentos.find((x) => x.nombre === nombre);
  if (!d) throw new Error('No existe departamento: ' + nombre);
  return d;
}

// 1) Plomería: completar las 2 urls que faltaban
{
  const d = dep('Plomería');
  const fix = {
    'Tubos Polietileno y Galvanizado': 'https://www.homecenter.com.co/homecenter-co/category/cat5490069/tubos-polietileno-y-galvanizado/',
    'Herramientas de Plomería y Soldadura': 'https://www.homecenter.com.co/homecenter-co/category/cat80102/herramientas-de-plomeria-y-soldadura/',
  };
  Object.entries(fix).forEach(([nombre, url]) => {
    const s = d.subcategorias.find((x) => x.nombre === nombre);
    if (s && !s.url) { s.url = url; cola.push({ departamento: d.nombre, subcategoria: s.nombre, url }); }
  });
}

// 2) Electricidad: completar todas las urls y encolar
{
  const d = dep('Electricidad');
  const urls = JSON.parse(fs.readFileSync(path.join(__dirname, 'cola_electricidad_urls.json'), 'utf-8'));
  d.subcategorias.forEach((s) => {
    if (urls[s.nombre]) s.url = urls[s.nombre];
    if (s.url) cola.push({ departamento: d.nombre, subcategoria: s.nombre, url: s.url });
  });
}

// 3) Construcción y Ferretería: solo las 5 categorías "planas" propias (no duplicadas de otros deptos)
{
  const d = dep('Construcción y Ferretería');
  const propias = ['Tornillos y Adhesivos', 'Elementos de Protección Personal (EPP) y Señalización', 'Escaleras y Mudanzas', 'Maderas, Tableros y Herrajes', 'Drywall y Techos en PVC'];
  d.subcategorias.forEach((s) => {
    if (propias.includes(s.nombre) && s.url) cola.push({ departamento: d.nombre, subcategoria: s.nombre, url: s.url });
  });
}

// 4) Baños: ya tiene urls completas
{
  const d = dep('Baños');
  d.subcategorias.forEach((s) => { if (s.url) cola.push({ departamento: d.nombre, subcategoria: s.nombre, url: s.url }); });
}

// 5) Pinturas: reemplazar subcategorias por la taxonomía real del sitio
{
  const d = dep('Pinturas');
  const reales = JSON.parse(fs.readFileSync(path.join(__dirname, 'pinturas_subcats.json'), 'utf-8'));
  d.subcategorias = reales.map((r) => ({ nombre: r.text, cantidad: null, url: r.url }));
  d.subcategorias.forEach((s) => cola.push({ departamento: d.nombre, subcategoria: s.nombre, url: s.url }));
}

// 6) Pisos y Paredes: reemplazar subcategorias por la taxonomía real del sitio
{
  const d = dep('Pisos y Paredes');
  const reales = JSON.parse(fs.readFileSync(path.join(__dirname, 'pisos_subcats.json'), 'utf-8'));
  d.subcategorias = reales.map((r) => ({ nombre: r.text, cantidad: null, url: r.url }));
  d.subcategorias.forEach((s) => cola.push({ departamento: d.nombre, subcategoria: s.nombre, url: s.url }));
}

// 7) Tejas y Drywall: ya tiene urls completas
{
  const d = dep('Tejas y Drywall');
  d.subcategorias.forEach((s) => { if (s.url) cola.push({ departamento: d.nombre, subcategoria: s.nombre, url: s.url }); });
}

saveDatos(datos);
fs.writeFileSync(path.join(__dirname, 'cola_resto.json'), JSON.stringify(cola, null, 2));
console.log('cola maestra generada:', cola.length, 'subcategorias');
