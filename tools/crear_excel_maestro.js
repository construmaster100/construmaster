const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'docs', 'Excel', 'Maestro_ConstruMaster.xlsx');
const OMITIR = new Set([path.resolve(DESTINO)]);

function listarExcel(carpeta) {
  const archivos = [];
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) archivos.push(...listarExcel(ruta));
    else if (/\.xlsx$/i.test(entrada.name) && !OMITIR.has(path.resolve(ruta))) archivos.push(ruta);
  }
  return archivos;
}

function nombrePestana(archivo, nombreOriginal, usadas, variasHojas) {
  let base = path.basename(archivo, path.extname(archivo));
  const carpetaPadre = path.basename(path.dirname(archivo));
  const carpetaAbuela = path.basename(path.dirname(path.dirname(archivo)));
  base = base.replace(/^inventario[_ -]*/i, '');
  if (variasHojas) base = `${carpetaPadre} - ${nombreOriginal}`;
  base = base.replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Origen';

  if (usadas.has(base.toLocaleLowerCase('es'))) {
    const carpetaReferencia = /^inventario/i.test(carpetaPadre) ? carpetaAbuela : carpetaPadre;
    base = `${carpetaReferencia} - ${base}`;
  }

  let nombre = base.slice(0, 31).trim();
  let sufijo = 2;
  while (usadas.has(nombre.toLocaleLowerCase('es'))) {
    const marca = ` (${sufijo})`;
    nombre = `${base.slice(0, 31 - marca.length).trim()}${marca}`;
    sufijo += 1;
  }
  usadas.add(nombre.toLocaleLowerCase('es'));
  return nombre;
}

const fuentes = listarExcel(RAIZ).sort((a, b) => a.localeCompare(b, 'es'));
if (!fuentes.length) throw new Error('No se encontraron archivos XLSX para consolidar.');

const maestro = XLSX.utils.book_new();
const indice = [[
  'Hoja maestra', 'Archivo fuente', 'Hoja original', 'Filas de datos', 'Columnas', 'Ruta relativa'
]];
const pestanasUsadas = new Set();

for (const archivo of fuentes) {
  const libro = XLSX.readFile(archivo, { cellDates: true });
  for (const nombreOriginal of libro.SheetNames) {
    const hojaOriginal = libro.Sheets[nombreOriginal];
    const filas = XLSX.utils.sheet_to_json(hojaOriginal, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: true,
    });
    if (!filas.length) continue;

    const hojaMaestra = nombrePestana(
      archivo,
      nombreOriginal,
      pestanasUsadas,
      libro.SheetNames.length > 1,
    );
    const rutaRelativa = path.relative(RAIZ, archivo);
    const notaOrigen = `PÁGINA DE ORIGEN: ${rutaRelativa} | Archivo: ${path.basename(archivo)} | Hoja: ${nombreOriginal}`;
    const hojaDatos = XLSX.utils.aoa_to_sheet([[notaOrigen], [], ...filas]);
    const columnas = Math.max(1, ...filas.map((fila) => fila.length));
    if (columnas > 1) {
      hojaDatos['!merges'] = [{
        s: { r: 0, c: 0 },
        e: { r: 0, c: columnas - 1 },
      }];
    }
    XLSX.utils.book_append_sheet(maestro, hojaDatos, hojaMaestra);
    const rango = XLSX.utils.decode_range(hojaOriginal['!ref'] || 'A1');
    indice.push([
      hojaMaestra,
      path.basename(archivo),
      nombreOriginal,
      filas.length,
      rango.e.c - rango.s.c + 1,
      rutaRelativa,
    ]);
  }
}

if (pestanasUsadas.size === 0) throw new Error('Los libros encontrados no contienen hojas con datos.');

const hojaIndice = XLSX.utils.aoa_to_sheet(indice);
for (let fila = 1; fila < indice.length; fila += 1) {
  const celda = hojaIndice[XLSX.utils.encode_cell({ r: fila, c: 0 })];
  celda.l = { Target: `#'${celda.v}'!A1`, Tooltip: `Abrir ${celda.v}` };
}
hojaIndice['!cols'] = [
  { wch: 18 }, { wch: 48 }, { wch: 32 }, { wch: 16 }, { wch: 12 }, { wch: 100 },
];
hojaIndice['!autofilter'] = { ref: `A1:F${indice.length}` };
XLSX.utils.book_append_sheet(maestro, hojaIndice, 'Indice');
maestro.Workbook = { Views: [{ RTL: false, activeTab: 0 }] };

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
XLSX.writeFile(maestro, DESTINO, { compression: true });
console.log(`Maestro creado: ${path.relative(RAIZ, DESTINO)}`);
console.log(`Archivos fuente: ${fuentes.length}; hojas consolidadas: ${pestanasUsadas.size}`);
