const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const RAIZ = path.resolve(__dirname, '..');
const ARCHIVO_MAESTRO = path.join(RAIZ, 'docs', 'Excel', 'Maestro_ConstruMaster.xlsx');
const DESTINO = path.join(RAIZ, 'pages', 'materiales', 'js', 'datos_maestro.js');
const EXCLUIR = new Set([
  'Indice', 'etapas_de_obra', 'servicios',
  'Modelo Boulevard - Presupuesto', 'Modelo Boulevard - programacion',
  'Modelo Boulevard - Programa (2)', 'Modelo Boulevard - A.P.U',
].map(normalizar));

function normalizar(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es').trim();
}

function obtenerPrecio(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (valor == null || valor === '') return null;
  const texto = String(valor).trim();
  if (/consultar|cotizar|desde/i.test(texto)) return null;
  const digitos = texto.replace(/[^\d.,-]/g, '');
  const numero = digitos.includes(',')
    ? Number(digitos.replace(/\./g, '').replace(',', '.'))
    : Number(digitos.replace(/\./g, ''));
  return Number.isFinite(numero) ? numero : null;
}

function rutaImagen(valor, rutaFuente, estado) {
  if (valor == null || valor === '') return '';
  const referencia = String(valor).trim();
  if (/^https?:\/\//i.test(referencia)) {
    estado.remotas += 1;
    return referencia;
  }
  let carpeta = path.resolve(RAIZ, path.dirname(rutaFuente));
  while (carpeta.startsWith(RAIZ + path.sep)) {
    const archivo = path.resolve(carpeta, referencia);
    if (archivo.startsWith(RAIZ + path.sep) && fs.existsSync(archivo)) {
      estado.localesVerificadas += 1;
      return path.relative(RAIZ, archivo).split(path.sep).join('/');
    }
    carpeta = path.dirname(carpeta);
  }
  estado.localesAusentes += 1;
  return '';
}

if (!fs.existsSync(ARCHIVO_MAESTRO)) throw new Error(`No existe el Excel maestro: ${ARCHIVO_MAESTRO}`);
const libro = XLSX.readFile(ARCHIVO_MAESTRO, { cellDates: true });
const indice = XLSX.utils.sheet_to_json(libro.Sheets.Indice, { defval: '' });
const rutasPorHoja = new Map(indice.map((fila) => [fila['Hoja maestra'], fila['Ruta relativa']]));
const productos = [];
const estadoImagenes = { localesVerificadas: 0, localesAusentes: 0, remotas: 0 };

for (const nombreHoja of libro.SheetNames) {
  if (EXCLUIR.has(normalizar(nombreHoja))) continue;
  const rutaFuente = rutasPorHoja.get(nombreHoja);
  if (!rutaFuente) continue;

  const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
    range: 2,
  });
  const encabezados = (filas.shift() || []).map(normalizar);
  const columna = (variantes) => encabezados.findIndex((valor) => variantes.includes(valor));
  const iNombre = columna(['nombre producto', 'nombre del producto', 'producto', 'nombre']);
  if (iNombre < 0) continue;
  const iPrecio = columna(['precio', 'precio producto', 'precio de venta']);
  const iCategoria = columna(['categoria', 'categoría', 'familia']);
  const iSubcategoria = columna(['subcategoria', 'subcategoría', 'sub categoria']);
  const iImagen = columna(['imagen', 'url imagen', 'foto']);

  for (const fila of filas) {
    const nombre = String(fila[iNombre] == null ? '' : fila[iNombre]).trim();
    if (!nombre) continue;
    const precio = iPrecio < 0 ? null : obtenerPrecio(fila[iPrecio]);
    productos.push([
      nombre,
      precio,
      iCategoria < 0 || !fila[iCategoria] ? 'General' : String(fila[iCategoria]).trim(),
      iSubcategoria < 0 ? '' : String(fila[iSubcategoria] || '').trim(),
      iImagen < 0 ? '' : rutaImagen(fila[iImagen], rutaFuente, estadoImagenes),
      ({
        'catalogo_comfer': 'COMFER',
        'catalogo HOMECENTER': 'Homecenter',
        'PAVCO - gyj': 'PAVCO / G&J',
        'pinturasyyesos': 'Pinturas y Yesos',
        'santafe': 'Santafé',
      })[nombreHoja] || nombreHoja.toLocaleUpperCase('es'),
    ]);
  }
}

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(
  DESTINO,
  `window.DATOS_MAESTRO_MATERIALES = {campos:["nombre","precio","categoria","subcategoria","imagen","fuente"],productos:${JSON.stringify(productos)}};\n`,
  'utf8',
);
console.log(`Catálogo suplementario: ${productos.length} materiales de ${rutasPorHoja.size} hojas del maestro.`);
console.log(`Imágenes locales verificadas: ${estadoImagenes.localesVerificadas}; locales ausentes: ${estadoImagenes.localesAusentes}; remotas conservadas: ${estadoImagenes.remotas}.`);
