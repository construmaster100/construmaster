// A partir de pages/Servicios/apu.json (tools/extraer_apu.js) genera:
//  1. pages/Servicios/Analisis_Precios_Unitarios.xlsx — un solo libro:
//     - "Actividades": tabla resumen (NOMBRE DE LA TAREA, UNIDAD, PRECIO, DESCRIPCION, etapa de obra).
//     - una hoja por capitulo con una tabla de Excel por actividad (insumos: cantidad y precio de cada uno).
//     - "Insumos": todos los insumos en una sola tabla, para filtrar o hacer tablas dinamicas.
//  2. assets/datos/apu.js — los mismos datos para la pagina (visor de cada etapa en Proyectos).
//   node tools/extraer_apu.js && node tools/generar_apu.js
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { etapaDe, subetapasDe, TRANSVERSAL } = require('./etapas_apu');
const { iconoDe, escribirIconos } = require('./iconos_servicios');
const { EJES, clasificar, ejesParaPagina } = require('./clasificacion_servicios');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'pages', 'Servicios', 'apu.json');
const EXCEL = path.join(RAIZ, 'pages', 'Servicios', 'Analisis_Precios_Unitarios.xlsx');
const DATOS = path.join(RAIZ, 'assets', 'datos', 'apu.js');
const CARPETA_ICONOS = path.join(RAIZ, 'pages', 'Servicios', 'iconos');

// Nombre completo de cada unidad de medida del documento.
const UNIDADES = {
  M2: 'Metro cuadrado', ML: 'Metro lineal', M3: 'Metro cúbico', M: 'Metro', UND: 'Unidad', UN: 'Unidad', GL: 'Global',
  hr: 'Hora', hh: 'Hora hombre', dd: 'Día', dia: 'Día', mes: 'Mes', kg: 'Kilogramo', km: 'Kilómetro', HA: 'Hectárea',
  jg: 'Juego', jgo: 'Juego', lt: 'Litro', Carga: 'Carga', 'M3-km': 'Metro cúbico por kilómetro', 'ton-m': 'Tonelada por metro',
};
const nombreUnidad = (u) => UNIDADES[u] || UNIDADES[String(u).toUpperCase()] || UNIDADES[String(u).toLowerCase()] || u;

const NOMBRES_ETAPA = {
  '01_PRELIMINARES': '1. Preliminares', '02_EXCAVACIONES': '2. Excavaciones', '03_CIMENTACION': '3. Cimentación',
  '04_ESTRUCTURA': '4. Estructura', '05_MAMPOSTERIA': '5. Mampostería', '06_INSTALACIONES': '6. Instalaciones',
  '07_CUBIERTA': '7. Cubierta', '08_ACABADOS': '8. Acabados', '09_EXTERIORES': '9. Exteriores', '10_ENTREGA': '10. Entrega',
  [TRANSVERSAL]: 'Transversal (administración y análisis básicos)',
};
const ORDEN_GRUPOS = ['Materiales', 'Mano de obra', 'Equipo', 'Transporte', 'Otros'];
const VERDE = 'FF354B3E'; const HUESO = 'FFF5F3ED'; const ARENA = 'FFD7C6A5';

const capitalizar = (s) => s.toLowerCase().replace(/(^|[\s(/-])([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());

// Descripcion corta a partir de los insumos: que materiales, que mano de obra y que equipo lleva.
function descripcion(a) {
  const partes = ORDEN_GRUPOS.map((g) => {
    const lista = a.insumos.filter((i) => i.grupo === g);
    if (!lista.length) return '';
    const nombres = lista.slice(0, 4).map((i) => capitalizar(i.descripcion.replace(/\(.*?\)/g, '').trim()) + (i.cantidad != null ? ` (${i.cantidad} ${i.unidad})` : ''));
    return `${g}: ${nombres.join(', ')}${lista.length > 4 ? ` y ${lista.length - 4} más` : ''}`;
  }).filter(Boolean);
  return `Precio por ${a.unidad}. ` + partes.join('. ') + '.';
}

const nombreHoja = (c) => `${c.codigo} ${c.nombre}`.replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').slice(0, 31).trim();
const nombreTabla = (prefijo, codigo) => prefijo + codigo.replace(/\./g, '_');

(async () => {
  const apu = JSON.parse(fs.readFileSync(ORIGEN, 'utf8'));
  const actividades = apu.actividades.map((a) => {
    const etapa = etapaDe(a);
    return Object.assign({}, a, {
      etapa, subetapas: subetapasDe(etapa, a), icono: iconoDe(a), unidadNombre: nombreUnidad(a.unidad),
      revisar: Math.abs(a.costoTotal - a.sumaInsumos) > Math.max(2, a.costoTotal * 0.01),
      insumos: a.insumos.slice().sort((x, y) => ORDEN_GRUPOS.indexOf(x.grupo) - ORDEN_GRUPOS.indexOf(y.grupo)),
    });
  });
  actividades.forEach((a) => { a.clas = clasificar(a); a.codigoClas = [a.clas.am, a.clas.sec, a.clas.es, a.clas.np].join(' · '); });
  const capitulo = new Map(apu.capitulos.map((c) => [c.codigo, c]));
  const tiposServicio = escribirIconos(CARPETA_ICONOS);
  const nombreCategoria = {};
  EJES.forEach((e) => e.categorias.forEach((c) => { nombreCategoria[c.codigo] = c.nombre; }));

  // ------------------------------------------------------------ Excel
  const libro = new ExcelJS.Workbook();
  libro.creator = 'ConstruMaster';
  libro.created = new Date();
  const moneda = '"$" #,##0.00';

  // Hoja resumen
  const hoja = libro.addWorksheet('Actividades', { views: [{ state: 'frozen', ySplit: 3 }] });
  hoja.getCell('A1').value = 'Análisis de precios unitarios — actividades de obra';
  hoja.getCell('A1').font = { bold: true, size: 14, color: { argb: VERDE } };
  hoja.getCell('A2').value = `Fuente: ${apu.fuente}. ${actividades.length} actividades en ${apu.capitulos.length} capítulos. El detalle de insumos de cada actividad está en la hoja de su capítulo.`;
  hoja.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF65675F' } };
  hoja.addTable({
    name: 'T_Actividades', ref: 'A3', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true },
    columns: [{ name: 'CODIGO' }, { name: 'CAPITULO' }, { name: 'NOMBRE DE LA TAREA' }, { name: 'UNIDAD' }, { name: 'NOMBRE UNIDAD' }, { name: 'PRECIO' },
      { name: 'DESCRIPCION' }, { name: 'ETAPA DE OBRA' }, { name: 'TIPO DE SERVICIO' }, { name: 'INSUMOS' }, { name: 'REVISAR' },
      { name: 'CLASIFICACION' }, { name: 'AMBITO' }, { name: 'SECUENCIA' }, { name: 'ESPECIALIDAD' }, { name: 'NATURALEZA DEL PRECIO' }],
    rows: actividades.map((a) => [a.codigo, (capitulo.get(a.capitulo) || {}).nombre || a.capitulo, a.nombre, a.unidad, a.unidadNombre, a.costoTotal,
      descripcion(a), NOMBRES_ETAPA[a.etapa] || a.etapa, (tiposServicio.find((t) => t.clave === a.icono) || {}).nombre || a.icono, a.insumos.length,
      a.revisar ? `Costo total del documento (${a.costoTotal}) distinto a la suma de insumos (${a.sumaInsumos})` : '',
      a.codigoClas, ...['am', 'sec', 'es', 'np'].map((k) => `${a.clas[k]} ${nombreCategoria[a.clas[k]]}`)]),
  });
  hoja.columns = [{ width: 11 }, { width: 26 }, { width: 58 }, { width: 9 }, { width: 18 }, { width: 16 }, { width: 90 }, { width: 22 }, { width: 24 }, { width: 9 }, { width: 30 }, { width: 26 }, { width: 30 }, { width: 22 }, { width: 30 }, { width: 34 }];
  hoja.getColumn(6).numFmt = moneda;
  hoja.getColumn(7).alignment = { wrapText: true, vertical: 'top' };
  hoja.getColumn(3).alignment = { wrapText: true, vertical: 'top' };

  // Una hoja por capitulo, una tabla por actividad
  for (const c of apu.capitulos) {
    const lista = actividades.filter((a) => a.capitulo === c.codigo);
    if (!lista.length) continue;
    const h = libro.addWorksheet(nombreHoja(c));
    h.columns = [{ width: 16 }, { width: 58 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 18 }];
    h.getCell('A1').value = `Capítulo ${c.codigo} · ${c.nombre}`;
    h.getCell('A1').font = { bold: true, size: 14, color: { argb: VERDE } };
    h.getCell('A2').value = `${lista.length} actividades. Cada tabla lista los insumos de una actividad por unidad de obra.`;
    h.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF65675F' } };
    let fila = 4;
    for (const a of lista) {
      h.mergeCells(fila, 1, fila, 6);
      const t = h.getCell(fila, 1);
      t.value = `${a.codigo} · ${a.nombre}   |   Unidad: ${a.unidadNombre} (${a.unidad})   |   Precio: $ ${a.costoTotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      t.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
      t.alignment = { wrapText: true, vertical: 'middle' };
      h.getRow(fila).height = 30;
      h.mergeCells(fila + 1, 1, fila + 1, 6);
      const d = h.getCell(fila + 1, 1);
      d.value = `${descripcion(a)}  Etapa de obra: ${NOMBRES_ETAPA[a.etapa] || a.etapa}.`;
      d.font = { size: 9, color: { argb: 'FF4C4E47' } };
      d.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HUESO } };
      d.alignment = { wrapText: true, vertical: 'top' };
      h.getRow(fila + 1).height = 42;
      h.addTable({
        name: nombreTabla('A_', a.codigo), ref: `A${fila + 2}`, headerRow: true, totalsRow: true,
        style: { theme: 'TableStyleLight21', showRowStripes: true },
        columns: [
          { name: 'GRUPO', totalsRowLabel: 'Total actividad' }, { name: 'INSUMO' }, { name: 'UNIDAD' }, { name: 'CANTIDAD' },
          { name: 'VALOR UNITARIO' }, { name: 'VALOR PARCIAL', totalsRowFunction: 'sum' },
        ],
        rows: a.insumos.map((i) => [i.grupo, i.descripcion, i.unidad, i.cantidad, i.valorUnitario, i.valorParcial]),
      });
      for (let r = fila + 3; r <= fila + 3 + a.insumos.length; r++) {
        h.getCell(r, 5).numFmt = moneda; h.getCell(r, 6).numFmt = moneda; h.getCell(r, 4).numFmt = '0.0000';
      }
      fila += a.insumos.length + 5;
    }
  }

  // Indice de la clasificacion (cuatro ejes, codigo de dos letras y dos numeros)
  const hc = libro.addWorksheet('Clasificacion', { views: [{ state: 'frozen', ySplit: 3 }] });
  hc.getCell('A1').value = 'Clasificación de servicios — cuatro ejes';
  hc.getCell('A1').font = { bold: true, size: 14, color: { argb: VERDE } };
  hc.getCell('A2').value = 'Cada actividad lleva un código compuesto: ámbito · secuencia · especialidad · naturaleza del precio (ej. AM01 · ON04 · ES04 · NP01).';
  hc.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF65675F' } };
  const filasClas = [];
  EJES.forEach((e, i) => e.categorias.forEach((c) => filasClas.push([c.codigo, (i + 1) + '. ' + e.titulo, e.pregunta, c.nombre, c.descripcion || '', actividades.filter((a) => a.clas[e.clave] === c.codigo).length])));
  hc.addTable({
    name: 'T_Clasificacion', ref: 'A3', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true },
    columns: ['CODIGO', 'EJE', 'PREGUNTA', 'CATEGORIA', 'DESCRIPCION', 'ACTIVIDADES'].map((name) => ({ name })),
    rows: filasClas,
  });
  hc.columns = [{ width: 9 }, { width: 26 }, { width: 26 }, { width: 38 }, { width: 70 }, { width: 12 }];
  EJES[0].categorias.forEach((c, i) => {
    const celda = hc.getCell(4 + i, 1);
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c.color.slice(1).toUpperCase() } };
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  // Todos los insumos
  const hi = libro.addWorksheet('Insumos', { views: [{ state: 'frozen', ySplit: 1 }] });
  const filasInsumos = [];
  actividades.forEach((a) => a.insumos.forEach((i) => filasInsumos.push([a.codigo, a.nombre, a.unidad, i.grupo, i.descripcion, i.unidad, i.cantidad, i.valorUnitario, i.valorParcial])));
  hi.addTable({
    name: 'T_Insumos', ref: 'A1', headerRow: true, style: { theme: 'TableStyleLight15', showRowStripes: true },
    columns: ['CODIGO ACTIVIDAD', 'NOMBRE DE LA TAREA', 'UNIDAD TAREA', 'GRUPO', 'INSUMO', 'UNIDAD', 'CANTIDAD', 'VALOR UNITARIO', 'VALOR PARCIAL'].map((name) => ({ name })),
    rows: filasInsumos,
  });
  hi.columns = [{ width: 12 }, { width: 50 }, { width: 10 }, { width: 14 }, { width: 50 }, { width: 9 }, { width: 11 }, { width: 16 }, { width: 16 }];
  hi.getColumn(8).numFmt = moneda; hi.getColumn(9).numFmt = moneda;

  await libro.xlsx.writeFile(EXCEL);

  // ------------------------------------------------------------ Datos para la pagina (compactos)
  const datos = {
    fuente: apu.fuente, excel: path.relative(RAIZ, EXCEL).split(path.sep).join('/'), generado: apu.generado,
    etapas: NOMBRES_ETAPA,
    capitulos: apu.capitulos.map((c) => [c.codigo, c.nombre]),
    campos: ['codigo', 'nombre', 'unidad', 'precio', 'capitulo', 'etapa', 'subetapas', 'revisar', 'insumos[grupo, descripcion, unidad, cantidad, valorUnitario, valorParcial]', 'icono', 'unidadNombre', 'clasificacion[am, sec, es, np]'],
    actividades: actividades.map((a) => [a.codigo, a.nombre, a.unidad, a.costoTotal, a.capitulo, a.etapa, a.subetapas, a.revisar ? 1 : 0,
      a.insumos.map((i) => [ORDEN_GRUPOS.indexOf(i.grupo), i.descripcion, i.unidad, i.cantidad, i.valorUnitario, i.valorParcial]), a.icono, a.unidadNombre, [a.clas.am, a.clas.sec, a.clas.es, a.clas.np]]),
    clasificacion: ejesParaPagina(),
    tipos: tiposServicio, carpetaIconos: 'pages/Servicios/iconos/',
    grupos: ORDEN_GRUPOS,
  };
  // Clasificacion interna de Edificacion (AM01, 631 actividades): tools/clasificacion_edificacion.js
  const { GRUPOS: GRUPOS_ED, clasificarEdificacion } = require('./clasificacion_edificacion');
  const internas = clasificarEdificacion(apu.actividades);
  datos.edificacion = {
    campos: ['codigoInterno', 'capitulo', 'grupo', 'tipo', 'material'],
    capitulos: Object.entries(GRUPOS_ED).map(([cap, d]) => [cap, d.nombre, d.grupos.map(([g, nom]) => [g, nom]).sort((a, b) => a[0].localeCompare(b[0]))]),
    actividades: Object.fromEntries(internas.map((x) => [x.codigoApu, [x.codigo, x.capitulo, x.grupo, x.tipo, x.material]])),
  };
  const libroEd = new ExcelJS.Workbook();
  const hEd = libroEd.addWorksheet('Edificacion');
  hEd.columns = [['CODIGO INTERNO', 16], ['CODIGO APU', 11], ['ACTIVIDAD', 70], ['UNIDAD', 8], ['PRECIO', 14], ['CAPITULO', 9], ['NOMBRE CAPITULO', 32], ['GRUPO', 7], ['NOMBRE GRUPO', 48], ['TIPO DE TRABAJO', 28], ['MATERIAL PRINCIPAL', 30]].map(([header, width]) => ({ header, width }));
  internas.forEach((x) => hEd.addRow([x.codigo, x.codigoApu, x.nombre, x.unidad, x.costo, x.capitulo, x.nombreCapitulo, x.grupo, x.nombreGrupo, x.tipo, x.material]));
  hEd.getRow(1).font = { bold: true }; hEd.views = [{ state: 'frozen', ySplit: 1 }]; hEd.autoFilter = { from: 'A1', to: 'K1' };
  const hRes = libroEd.addWorksheet('Resumen');
  hRes.columns = [['CAPITULO', 10], ['NOMBRE CAPITULO', 34], ['GRUPO', 8], ['NOMBRE GRUPO', 50], ['ACTIVIDADES', 12]].map(([header, width]) => ({ header, width }));
  const cuenta = {}; internas.forEach((x) => { const k = x.capitulo + '|' + x.grupo; cuenta[k] = cuenta[k] || { x, n: 0 }; cuenta[k].n++; });
  Object.values(cuenta).sort((a, b) => (a.x.capitulo + a.x.grupo).localeCompare(b.x.capitulo + b.x.grupo)).forEach(({ x, n }) => hRes.addRow([x.capitulo, x.nombreCapitulo, x.grupo, x.nombreGrupo, n]));
  hRes.getRow(1).font = { bold: true };
  await libroEd.xlsx.writeFile(path.join(RAIZ, 'pages', 'Servicios', 'Clasificacion_Edificacion.xlsx'));
  console.log(`Edificacion: ${internas.length} actividades clasificadas en ${Object.keys(cuenta).length} grupos -> pages/Servicios/Clasificacion_Edificacion.xlsx`);

  fs.writeFileSync(DATOS, '// Generado por tools/generar_apu.js — no editar a mano.\nwindow.APU = ' + JSON.stringify(datos) + ';\n', 'utf8');

  const porEtapa = {};
  actividades.forEach((a) => { porEtapa[a.etapa] = (porEtapa[a.etapa] || 0) + 1; });
  console.log(`Excel: ${path.relative(RAIZ, EXCEL)} (${(fs.statSync(EXCEL).size / 1048576).toFixed(1)} MB) — ${actividades.length} actividades, ${filasInsumos.length} insumos, ${apu.capitulos.length} hojas de capítulo`);
  console.log(`Datos página: ${path.relative(RAIZ, DATOS)} (${Math.round(fs.statSync(DATOS).size / 1024)} KB)`);
  console.log('Actividades por etapa:', porEtapa);
  console.log('Sin subetapa asignada:', actividades.filter((a) => a.etapa !== TRANSVERSAL && !a.subetapas.length).length, '· a revisar:', actividades.filter((a) => a.revisar).length);
})().catch((e) => { console.error(e); process.exit(1); });
