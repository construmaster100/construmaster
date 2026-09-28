// Estadisticas de casas prefabricadas para la pestana Proyectos: area, precio y costo por metro cuadrado de cada modelo.
// Fuente: los Excel de pages/ESTADISTICAS/CASAS PREFABRICADAS/<Empresa>/ (tools/scraper/prefabricadas/casas_prefabricadas.js).
// El area se toma del nombre o la descripcion del modelo ("36m²", "15M2", "42 m²", "25 Metros Cuadrados", "112 m2").
// Salida: assets/datos/prefabricadas.js (window.PREFABRICADAS).
//   node tools/generar_prefabricadas.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'pages', 'ESTADISTICAS', 'CASAS PREFABRICADAS');
const DESTINO = path.join(RAIZ, 'assets', 'datos', 'prefabricadas.js');

function area(texto) {
  const m = String(texto || '').match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|mts?\b|metros cuadrados)/i);
  return m ? Number(m[1].replace(',', '.')) : null;
}

const modelos = [];
for (const empresa of fs.readdirSync(ORIGEN).sort()) {
  const dir = path.join(ORIGEN, empresa); if (!fs.statSync(dir).isDirectory()) continue;
  const archivo = fs.readdirSync(dir).find((f) => /\.xlsx$/i.test(f)); if (!archivo) continue;
  for (const f of XLSX.utils.sheet_to_json(XLSX.readFile(path.join(dir, archivo)).Sheets.Inventario)) {
    const nombre = String(f['NOMBRE DEL PRODUCTO'] || '').trim(); if (!nombre) continue;
    const a = area(nombre) || area(f.DESCRIPCION);
    const precio = Number(f.PRECIO) || null;
    modelos.push({ empresa, modelo: nombre, area: a, precio, precioM2: a && precio ? Math.round(precio / a) : null,
      acabado: String(f.SUBCATEGORIA || ''), url: String(f.URL || ''), imagen: String(f.IMAGEN || ''), plano: String(f.PLANO || ''), fotos: String(f.FOTOS || '').split(' | ').filter(Boolean) });
  }
}
const conPrecio = modelos.filter((m) => m.precioM2);
const datos = { generado: new Date().toISOString().slice(0, 10), modelos, resumen: {
  modelos: modelos.length, conPrecioYArea: conPrecio.length, empresas: [...new Set(modelos.map((m) => m.empresa))].length,
  empresasConPrecio: [...new Set(conPrecio.map((m) => m.empresa))],
} };
fs.writeFileSync(DESTINO, '// Generado por tools/generar_prefabricadas.js — no editar a mano.\nwindow.PREFABRICADAS = ' + JSON.stringify(datos) + ';\n', 'utf8');
console.log(`Casas prefabricadas: ${modelos.length} modelos, ${conPrecio.length} con precio y area -> ${path.relative(RAIZ, DESTINO)}`);
const sinArea = modelos.filter((m) => m.precio && !m.area);
if (sinArea.length) console.log('Con precio pero sin area (no entran al costo por m2):', sinArea.map((m) => m.empresa + ': ' + m.modelo).join(' | '));
