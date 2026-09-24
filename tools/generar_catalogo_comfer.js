const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const productos = require('./comfer_productos');

const CARPETA = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\pages\\catalogo comfer';
const CARPETA_IMG = path.join(CARPETA, 'imagenes');
const CARPETA_JS = path.join(CARPETA, 'js');

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

const COLORES_CATEGORIA = {
  'Hierro': '#6b6b6b', 'Materiales': '#8a6d3b', 'PVC': '#2f6f4f', 'Cemento': '#5c5c5c',
  'Placa Fácil': '#4a5568', 'Pinturas': '#c9a24b',
};

function colorTexto(hex) { return '#ffffff'; }

function crearSvgPlaceholder(producto) {
  const color = COLORES_CATEGORIA[producto.categoria] || '#4a5568';
  const nombre = producto.nombre.length > 60 ? producto.nombre.slice(0, 57) + '...' : producto.nombre;
  // parte el nombre en lineas de ~24 caracteres para que quepa
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
  const urlOriginal = p.comferId
    ? 'https://www.comfer.co/web/image/product.product/' + p.comferId + '/image_1024'
    : null;

  fs.writeFileSync(path.join(CARPETA_IMG, archivoImagen), crearSvgPlaceholder(p), 'utf8');

  filasExcel.push({
    'NOMBRE PRODUCTO': p.nombre,
    'PRECIO PRODUCTO': p.precio,
    'IMAGEN PRODUCTO': 'imagenes/' + archivoImagen,
    'CATEGORIA': p.categoria,
    'SUBCATEGORIA': p.subcategoria,
    'URL IMAGEN ORIGINAL (comfer.co)': urlOriginal || '',
    'NOTA': p.nota || '',
  });

  productosDatos.push({
    nombre: p.nombre,
    precio: p.precio,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    imagen: 'imagenes/' + archivoImagen,
    urlOriginal: urlOriginal,
    nota: p.nota,
  });
});

// ---- Excel ----
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(filasExcel);
ws['!cols'] = [{ wch: 55 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 55 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wb, ws, 'Catalogo COMFER');
XLSX.writeFile(wb, path.join(CARPETA, 'catalogo_comfer.xlsx'));

// ---- datos.js para la pagina de navegacion ----
const datos = {
  fuente: 'https://www.comfer.co/',
  fechaLectura: '2026-09-21',
  nota: 'Nombre y precio leidos en vivo de comfer.co. Las imagenes son PROVISIONALES (marcador con el nombre real del producto) -- las fotos reales se agregan progresivamente en la carpeta imagenes/, reemplazando el .svg por la foto real con el mismo nombre de archivo.',
  productos: productosDatos,
};
fs.writeFileSync(path.join(CARPETA_JS, 'datos.js'), 'window.DATOS_COMFER = ' + JSON.stringify(datos, null, 0) + ';\n', 'utf8');

console.log('Productos procesados:', productos.length);
console.log('Imagenes SVG generadas en:', CARPETA_IMG);
console.log('Excel generado en:', path.join(CARPETA, 'catalogo_comfer.xlsx'));
console.log('datos.js generado en:', path.join(CARPETA_JS, 'datos.js'));

const porCategoria = {};
productos.forEach(p => { porCategoria[p.categoria] = (porCategoria[p.categoria] || 0) + 1; });
console.log('\nPor categoria:');
Object.keys(porCategoria).forEach(c => console.log(' ', c, ':', porCategoria[c]));
