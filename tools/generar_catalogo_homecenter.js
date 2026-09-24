const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const productos = require('./homecenter_productos');

const CARPETA = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\pages\\catalogo homecenter';
const CARPETA_IMG = path.join(CARPETA, 'imagenes');
const CARPETA_JS = path.join(CARPETA, 'js');
const EXCEL_DESTINO = path.join(CARPETA, 'docs', 'catalogo HOMECENTER.xlsx');

function slug(txt) {
  return String(txt)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

const usados = {};
function slugUnico(txt) {
  let base = slug(txt);
  if (!base) base = 'producto';
  let s = base, n = 2;
  while (usados[s]) { s = base + '-' + n; n++; }
  usados[s] = true;
  return s;
}

const COLOR_DEFECTO = '#4a5568';

function crearSvgPlaceholder(producto) {
  const color = COLOR_DEFECTO;
  const nombre = producto.nombre.length > 60 ? producto.nombre.slice(0, 57) + '...' : producto.nombre;
  const palabras = nombre.split(' ');
  const lineas = [];
  let actual = '';
  palabras.forEach(p => {
    if ((actual + ' ' + p).trim().length > 22) { lineas.push(actual.trim()); actual = p; }
    else actual = (actual + ' ' + p).trim();
  });
  if (actual) lineas.push(actual);
  const lineasSvg = lineas.slice(0, 5).map((l, i) =>
    `<text x="150" y="${150 + i * 20}" font-family="Arial, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">${escapeXml(l)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="${color}"/>
  <rect x="8" y="8" width="284" height="284" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="6,4" opacity="0.5"/>
  <text x="150" y="70" font-family="Arial, sans-serif" font-size="12" fill="#ffffff" text-anchor="middle" opacity="0.85">IMAGEN PROVISIONAL</text>
  <text x="150" y="95" font-family="Arial, sans-serif" font-size="11" fill="#ffffff" text-anchor="middle" opacity="0.7">${escapeXml(producto.categoria)} · ${escapeXml(producto.subcategoria)}</text>
  <g>
    ${lineasSvg}
  </g>
  <text x="150" y="270" font-family="Arial, sans-serif" font-size="13" fill="#ffffff" text-anchor="middle" font-weight="bold">${producto.precio != null ? '$ ' + Number(producto.precio).toLocaleString('es-CO') : ''}</text>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

fs.mkdirSync(CARPETA_IMG, { recursive: true });
fs.mkdirSync(CARPETA_JS, { recursive: true });

const filasExcel = [];
const productosDatos = [];

productos.forEach(p => {
  const s = slugUnico(p.nombre);
  const archivoImagen = s + '.svg';

  fs.writeFileSync(path.join(CARPETA_IMG, archivoImagen), crearSvgPlaceholder(p), 'utf8');

  filasExcel.push({
    'NOMBRE PRODUCTO': p.nombre,
    'PRECIO': p.precio,
    'CATEGORIA': p.subcategoria,
    'IMAGEN': 'imagenes/' + archivoImagen,
  });

  productosDatos.push({
    nombre: p.nombre,
    precio: p.precio,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    imagen: 'imagenes/' + archivoImagen,
    urlImagenReal: p.urlImagen,
    nota: p.nota,
  });
});

// ---- Excel (4 columnas pedidas: NOMBRE PRODUCTO, PRECIO, CATEGORIA, IMAGEN) ----
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(filasExcel);
ws['!cols'] = [{ wch: 60 }, { wch: 14 }, { wch: 35 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, ws, 'Catalogo Homecenter');
fs.mkdirSync(path.dirname(EXCEL_DESTINO), { recursive: true });
XLSX.writeFile(wb, EXCEL_DESTINO);

// ---- datos.js: se anexan productos a los datos de categorias que ya existian ----
const rutaDatosExistente = path.join(CARPETA_JS, 'datos.js');
let datosCategorias = { departamentos: [] };
if (fs.existsSync(rutaDatosExistente)) {
  const contenido = fs.readFileSync(rutaDatosExistente, 'utf8').replace(/window\.\w+\s*=\s*/, 'datosCategorias = ');
  eval(contenido);
}
datosCategorias.productos = productosDatos;
datosCategorias.productosFechaLectura = '2026-09-21';
fs.writeFileSync(rutaDatosExistente, 'window.DATOS_HOMECENTER = ' + JSON.stringify(datosCategorias, null, 0) + ';\n', 'utf8');

console.log('Productos procesados:', productos.length);
console.log('Imagenes SVG generadas en:', CARPETA_IMG);
console.log('Excel generado en:', EXCEL_DESTINO);
console.log('datos.js actualizado en:', rutaDatosExistente);

const porSub = {};
productos.forEach(p => { porSub[p.subcategoria] = (porSub[p.subcategoria] || 0) + 1; });
console.log('\nPor subcategoria:');
Object.keys(porSub).forEach(c => console.log(' ', c, ':', porSub[c]));
