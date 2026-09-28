// Clasificacion constructiva unificada de TODAS las marcas del inventario (docs/CLASIFICACION_MARCAS.md).
//   Etapa de obra -> Categoria constructiva -> marcas
// La categoria de cada marca sale de sus productos: la familia del inventario donde tiene mas productos
// (sin contar "Otros"). Si todos sus productos estan en "Otros", se decide por el nombre de sus categorias
// (tecnologia, automotor...) y si no, queda en "Otros productos". Categorias secundarias: las que pesan >= 15 %.
// Correr despues de node tools/generar_inventario.js:  node tools/clasificar_marcas.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
global.window = {};
require(path.join(RAIZ, 'assets', 'datos', 'inventario.js'));
const I = Object.values(window)[0];

// Etapas en orden constructivo y la categoria unificada de cada familia del inventario
const ETAPAS = [
  ['Obra negra', ['Estructura y obra gris', 'Cubiertas, drywall y techos']],
  ['Instalaciones', ['Plomería y tubería', 'Electricidad e iluminación']],
  ['Obra blanca y acabados', ['Pisos y revestimientos', 'Baños y cocinas', 'Pinturas y acabados', 'Cerrajería y ferretería']],
  ['Herramientas y equipos', ['Herramientas y maquinaria']],
  ['Complementarios', ['Aseo y químicos', 'Hogar, jardín y otros', 'Casas prefabricadas']],
  ['Fuera de obra', ['Tecnología y electrónica', 'Automotor', 'Otros productos']],
];
const ETAPA_DE = {};
ETAPAS.forEach(([etapa, cats]) => cats.forEach((c) => { ETAPA_DE[c] = etapa; }));

// Marcas cuyos productos estan todos en "Otros": reglas por el nombre de sus categorias
const REGLAS_OTROS = [
  ['Tecnología y electrónica', /celular|smartphone|tel[eé]fono|tablet|port[aá]til|computador|monitor|televis|\btv\b|aud[ií]fono|parlante|consola|smartwatch|reloj|c[aá]mara|impresora|tecnolog|electr[oó]nic|gamer|accesorios? para celular/i],
  ['Automotor', /llanta|neum[aá]tic|\brin(es)?\b|moto|autom[oó]|veh[ií]cul|carro|lubricante|aceite de motor|bater[ií]as? para (carro|moto)/i],
  ['Hogar, jardín y otros', /hogar|cocina|mueble|decoraci|jard[ií]n|mascota|colch|textil|cama|menaje|juguete|piscina/i],
  ['Aseo y químicos', /aseo|limpieza|detergente|desinfect|qu[ií]mic/i],
];

// Categoria unificada de cada PRODUCTO: primero por el nombre de su categoria en la tienda (mas precisa que la familia
// asignada por palabras clave: p. ej. "Mascotas" o "Automotor" no son obra gris); si la categoria es generica
// ("Construcción y Ferretería", "Productos"...), se usa la familia del inventario.
const POR_CATEGORIA = [
  ['Automotor', /automotor|llanta|neum[aá]tic/i],
  ['Tecnología y electrónica', /televisor|audio|celular|smartphone|computador|tecnolog|consola|videojuego|gamer/i],
  ['Hogar, jardín y otros', /mascota|textil|organizador|electrodom[eé]st|jard[ií]n|aire libre|mueble|juguete|piscina|camping|decoraci[oó]n/i],
  ['Aseo y químicos', /aseo|limpieza/i],
  ['Pinturas y acabados', /pintura/i],
  ['Plomería y tubería', /plomer[ií]a|tuber[ií]a/i],
  ['Electricidad e iluminación', /electricidad|el[eé]ctric|iluminaci[oó]n|c[aá]mara de red|c[aá]maras de seguridad/i],
  ['Baños y cocinas', /ba[nñ]os?\b|cocinas?\b|griferia|grifer[ií]a|sanitari/i],
  ['Cubiertas, drywall y techos', /teja|drywall|cubierta|cielo raso/i],
  ['Pisos y revestimientos', /piso|pared|revestim|cer[aá]mic|porcelanato/i],
  ['Herramientas y maquinaria', /herramienta|maquinaria|hidrolavadora|aspiradora|soldad/i],
  ['Estructura y obra gris', /materiales de construcci[oó]n|cemento|ladrillo|bloque|concreto|acero de refuerzo|varilla/i],
  ['Casas prefabricadas', /casas prefabricadas/i],
];
const iMarca = I.campos.indexOf('marca'), iCat = I.campos.indexOf('categoria'), iFam = I.campos.indexOf('familia');
const catsDeMarca = {}, unifDeMarca = {};
for (const p of I.productos) {
  const m = I.marcas[p[iMarca]]; if (!m) continue;
  const c = I.categorias[p[iCat]] || '';
  (catsDeMarca[m] = catsDeMarca[m] || {})[c] = (catsDeMarca[m][c] || 0) + 1;
  const regla = POR_CATEGORIA.find(([, re]) => re.test(c));
  const u = regla ? regla[0] : (I.familias[p[iFam]] || 'Otros');
  (unifDeMarca[m] = unifDeMarca[m] || {})[u] = (unifDeMarca[m][u] || 0) + 1;
}

const marcas = {};
const porCategoria = {};
for (const m of I.ranking) {
  const cuenta = unifDeMarca[m.nombre] || m.familias || {};
  const fam = Object.entries(cuenta).filter(([k]) => k !== 'Otros').sort((a, b) => b[1] - a[1]);
  const total = Object.values(cuenta).reduce((s, n) => s + n, 0) || 1;
  let categoria, base;
  if (fam.length) { categoria = fam[0][0]; base = 'productos'; }
  else {
    const texto = Object.keys(catsDeMarca[m.nombre] || {}).join(' | ');
    const regla = REGLAS_OTROS.find(([, re]) => re.test(texto));
    categoria = regla ? regla[0] : 'Otros productos'; base = regla ? 'categorias' : 'sin datos';
  }
  const secundarias = fam.slice(1).filter(([, n]) => n / total >= 0.15).map(([k]) => k);
  marcas[m.slug] = { nombre: m.nombre, categoria, etapa: ETAPA_DE[categoria], secundarias, productos: m.n, base, participacion: fam.length ? Math.round(fam[0][1] / total * 100) : 0 };
  (porCategoria[categoria] = porCategoria[categoria] || []).push(m.slug);
}
for (const c of Object.keys(porCategoria)) porCategoria[c].sort((a, b) => marcas[b].productos - marcas[a].productos);

const arbol = ETAPAS.map(([etapa, cats]) => ({ etapa, categorias: cats.map((c) => ({ nombre: c, marcas: porCategoria[c] || [] })).filter((c) => c.marcas.length) })).filter((e) => e.categorias.length);
fs.writeFileSync(path.join(RAIZ, 'assets', 'datos', 'clasificacion_marcas.js'),
  '// Generado por tools/clasificar_marcas.js — no editar a mano.\nwindow.CLASIFICACION_MARCAS = ' + JSON.stringify({ generado: new Date().toISOString().slice(0, 10), arbol, marcas }) + ';\n', 'utf8');

console.log('Marcas clasificadas: ' + Object.keys(marcas).length);
arbol.forEach((e) => console.log(e.etapa + ': ' + e.categorias.map((c) => c.nombre + ' ' + c.marcas.length).join(' · ')));
// Muestra de auditoria (5 %, semilla fija): marca, categoria, participacion y sus 3 categorias de productos mas frecuentes
if (process.argv.includes('--auditoria')) {
  let s = 20260927; const azar = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const slugs = Object.keys(marcas); const n = Math.ceil(slugs.length * 0.05); const muestra = new Set();
  while (muestra.size < n) muestra.add(slugs[Math.floor(azar() * slugs.length)]);
  const filas = [...muestra].map((sl) => { const x = marcas[sl]; const cs = Object.entries(catsDeMarca[x.nombre] || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, k]) => c + ' (' + k + ')').join('; '); return [x.nombre, x.categoria, x.participacion + '%', x.base, cs].join(' | '); });
  fs.writeFileSync(path.join(RAIZ, 'docs', 'auditoria_clasificacion_marcas.txt'), filas.join('\n') + '\n', 'utf8');
  console.log('Auditoria: ' + n + ' marcas -> docs/auditoria_clasificacion_marcas.txt');
}
