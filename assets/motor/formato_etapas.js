// Formato unico de etapas de obra (ConstruMaster).
// Une en un solo libro de Excel la secuencia de etapas y subetapas (con OBRA NEGRA / GRIS / BLANCA),
// los capitulos del presupuesto (modelo proyectado MP), las actividades del analisis de precios
// unitarios y el seguimiento de obra (estado, avance, fechas, responsable y notas).
// Se usa igual en Node (tools/generar_formato_etapas.js) y en el navegador (boton de descarga en
// la pestaña Presupuesto), asi el archivo siempre sale con el mismo formato.
(function () {
  'use strict';

  var COLUMNAS = ['SECUENCIA', 'TIPO DE OBRA', 'ETAPA', 'SUBETAPA', 'CARPETA', 'CAPITULO DEL PRESUPUESTO (MP)',
    'ACTIVIDADES APU', 'ESTADO', 'AVANCE %', 'FECHA INICIO', 'FECHA FIN', 'RESPONSABLE', 'NOTAS / OBSERVACIONES'];
  var ESTADOS = ['Pendiente', 'En curso', 'Terminada'];
  var COLOR_TIPO = { negra: ['FF2B2D34', 'FFFFFFFF'], gris: ['FF6B7280', 'FFFFFFFF'], blanca: ['FFC9A24B', 'FF20211E'] };

  function normalizar(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function moneda(v) { return '$ ' + Math.round(v || 0).toLocaleString('es-CO'); }

  // Capitulos del MP que corresponden a una etapa (y, si el mapeo lo precisa, a una subetapa).
  function capitulosDe(etapas, mp, etapa, subetapa) {
    return (etapas.mapeoCapitulos || []).filter(function (m) {
      if (m.etapa.indexOf(etapa.carpeta) === -1) return false;
      var partes = m.etapa.split('/');
      if (partes.length < 2 || subetapa === undefined) return true;
      return normalizar(partes[1]).indexOf(normalizar(subetapa).split(' ')[0]) !== -1;
    }).map(function (m) {
      var n = parseInt(m.cap, 10);
      var cap = (mp && mp.capitulos || []).filter(function (c) { return c.n === n; })[0];
      var compartido = m.etapa.split('+').length;
      return { n: n, nombre: cap ? cap.nombre : m.cap.replace(/^\d+\.?\)?\s*/, ''), subtotal: cap ? cap.subtotal : null, compartido: compartido };
    });
  }

  // Filas del formato: una por subetapa, en la secuencia de etapas (1 a 10).
  // opciones: { plantilla: [{carpeta, subetapas:[carpetas]}], apu: window.APU, notas: {clave: texto}, claveNota: fn }
  function filas(etapas, mp, opciones) {
    opciones = opciones || {};
    var plantilla = opciones.plantilla || [];
    var actividades = opciones.apu ? opciones.apu.actividades : null;
    var salida = [];
    etapas.etapas.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (e) {
      var tipo = etapas.etapasColor[e.etapa] || { nombre: '' };
      var carpetas = (plantilla.filter(function (p) { return p.carpeta === e.carpeta; })[0] || {}).subetapas || [];
      e.subetapas.forEach(function (s, i) {
        var carpetaSub = carpetas[i] || '';
        var caps = capitulosDe(etapas, mp, e, s);
        var nApu = actividades ? actividades.filter(function (a) { return a[5] === e.carpeta && carpetaSub && a[6].indexOf(carpetaSub) !== -1; }).length : '';
        var nota = opciones.notas && opciones.claveNota ? (opciones.notas[opciones.claveNota(e.n, s)] || '') : '';
        salida.push({
          tipo: e.etapa,
          valores: [dos(e.n) + '.' + dos(i + 1), tipo.nombre.toUpperCase(), e.n + '. ' + e.nombre, s, e.carpeta + (carpetaSub ? '/' + carpetaSub : ''),
            caps.map(function (c) { return c.n + '. ' + c.nombre + (c.subtotal ? ' (' + moneda(c.subtotal) + (c.compartido > 1 ? ', compartido con ' + c.compartido + ' etapas' : '') + ')' : ''); }).join('; '),
            nApu, '', null, null, null, '', nota],
        });
      });
    });
    return salida;
  }

  // Presupuesto MP en su propia secuencia de capitulos, con el tipo de obra.
  function filasPresupuesto(etapas, mp) {
    var total = (mp.capitulos || []).reduce(function (s, c) { return s + (c.subtotal || 0); }, 0);
    return (mp.capitulos || []).map(function (c) {
      var mapeo = (etapas.mapeoCapitulos || []).filter(function (m) { return parseInt(m.cap, 10) === c.n; })[0];
      return { tipo: c.etapa, valores: [c.n, c.nombre, ((mp.etapas[c.etapa] || {}).nombre || '').toUpperCase(), mapeo ? mapeo.etapa : '', c.subtotal || 0, total ? (c.subtotal || 0) / total : 0] };
    });
  }

  function resumen(etapas, mp) {
    var total = (mp.capitulos || []).reduce(function (s, c) { return s + (c.subtotal || 0); }, 0);
    return ['negra', 'gris', 'blanca'].map(function (t) {
      var es = etapas.etapas.filter(function (e) { return e.etapa === t; });
      var caps = (mp.capitulos || []).filter(function (c) { return c.etapa === t; });
      var valor = caps.reduce(function (s, c) { return s + (c.subtotal || 0); }, 0);
      return { tipo: t, valores: [(etapas.etapasColor[t] || {}).nombre.toUpperCase(), es.map(function (e) { return e.n + '. ' + e.nombre; }).join(', '),
        es.reduce(function (s, e) { return s + e.subetapas.length; }, 0), caps.length, valor, total ? valor / total : 0] };
    });
  }

  function pintarTipo(celda, tipo) {
    var c = COLOR_TIPO[tipo];
    if (!c) return;
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c[0] } };
    celda.font = { bold: true, color: { argb: c[1] } };
  }

  function titulo(hoja, texto, nota) {
    hoja.getCell('A1').value = texto;
    hoja.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF354B3E' } };
    hoja.getCell('A2').value = nota;
    hoja.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF65675F' } };
  }

  // Construye el libro con ExcelJS (en Node: require('exceljs'); en el navegador: window.ExcelJS).
  function libro(ExcelJS, etapas, mp, opciones) {
    var wb = new ExcelJS.Workbook();
    wb.creator = 'ConstruMaster';
    wb.created = new Date();
    var monedaFmt = '"$" #,##0';

    // 1. Formato unico
    var h = wb.addWorksheet('Formato unico', { views: [{ state: 'frozen', ySplit: 3, xSplit: 4 }] });
    titulo(h, 'Formato único de etapas de obra — ConstruMaster',
      'Secuencia de etapas y subetapas (Obra negra / gris / blanca) con su capítulo del presupuesto, actividades del análisis de precios unitarios y seguimiento. ESTADO: Pendiente, En curso o Terminada; AVANCE en %.');
    var datos = filas(etapas, mp, opciones);
    h.addTable({
      name: 'T_Formato_Etapas', ref: 'A3', headerRow: true, style: { theme: 'TableStyleLight15', showRowStripes: false },
      columns: COLUMNAS.map(function (n) { return { name: n }; }),
      rows: datos.map(function (f) { return f.valores; }),
    });
    datos.forEach(function (f, i) {
      var r = 4 + i;
      pintarTipo(h.getCell(r, 2), f.tipo);
      h.getCell(r, 6).alignment = { wrapText: true, vertical: 'top' };
      h.getCell(r, 13).alignment = { wrapText: true, vertical: 'top' };
      h.getCell(r, 10).numFmt = 'dd/mm/yyyy';
      h.getCell(r, 11).numFmt = 'dd/mm/yyyy';
      h.getCell(r, 8).dataValidation = { type: 'list', allowBlank: true, formulae: ['"' + ESTADOS.join(',') + '"'] };
      h.getCell(r, 9).dataValidation = { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 100], showErrorMessage: true, errorTitle: 'Avance', error: 'Escribe un porcentaje entre 0 y 100.' };
      h.getCell(r, 10).dataValidation = { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(2000, 0, 1)] };
      h.getCell(r, 11).dataValidation = { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(2000, 0, 1)] };
    });
    h.columns = [{ width: 11 }, { width: 14 }, { width: 20 }, { width: 30 }, { width: 40 }, { width: 46 }, { width: 11 }, { width: 12 }, { width: 10 }, { width: 13 }, { width: 13 }, { width: 18 }, { width: 50 }];

    // 2. Presupuesto MP con tipo de obra
    var p = wb.addWorksheet('Presupuesto MP');
    titulo(p, 'Presupuesto — modelo proyectado (MP) por tipo de obra', (mp.titulo || '') + (mp.archivoFuente ? ' · archivo ' + mp.archivoFuente : ''));
    var fp = filasPresupuesto(etapas, mp);
    p.addTable({
      name: 'T_Presupuesto_MP', ref: 'A3', headerRow: true, totalsRow: true, style: { theme: 'TableStyleLight15', showRowStripes: true },
      columns: [{ name: 'N°', totalsRowLabel: 'Total' }, { name: 'CAPITULO' }, { name: 'TIPO DE OBRA' }, { name: 'ETAPAS DE OBRA' }, { name: 'VALOR', totalsRowFunction: 'sum' }, { name: '% DEL TOTAL', totalsRowFunction: 'sum' }],
      rows: fp.map(function (f) { return f.valores; }),
    });
    fp.forEach(function (f, i) { pintarTipo(p.getCell(4 + i, 3), f.tipo); });
    p.getColumn(5).numFmt = monedaFmt; p.getColumn(6).numFmt = '0.0%';
    p.columns = [{ width: 6 }, { width: 32 }, { width: 14 }, { width: 50 }, { width: 18 }, { width: 12 }];
    p.getColumn(5).numFmt = monedaFmt; p.getColumn(6).numFmt = '0.0%';

    // 3. Resumen por tipo de obra
    var r = wb.addWorksheet('Resumen');
    titulo(r, 'Resumen por tipo de obra', 'Etapas, subetapas y valor del presupuesto MP agrupados en obra negra, gris y blanca.');
    var fr = resumen(etapas, mp);
    r.addTable({
      name: 'T_Resumen_Tipo_Obra', ref: 'A3', headerRow: true, totalsRow: true, style: { theme: 'TableStyleLight15', showRowStripes: false },
      columns: [{ name: 'TIPO DE OBRA', totalsRowLabel: 'Total' }, { name: 'ETAPAS' }, { name: 'SUBETAPAS', totalsRowFunction: 'sum' }, { name: 'CAPITULOS MP', totalsRowFunction: 'sum' }, { name: 'VALOR MP', totalsRowFunction: 'sum' }, { name: '% DEL TOTAL', totalsRowFunction: 'sum' }],
      rows: fr.map(function (f) { return f.valores; }),
    });
    fr.forEach(function (f, i) { pintarTipo(r.getCell(4 + i, 1), f.tipo); r.getCell(4 + i, 2).alignment = { wrapText: true, vertical: 'top' }; });
    r.columns = [{ width: 16 }, { width: 60 }, { width: 11 }, { width: 13 }, { width: 18 }, { width: 12 }];
    r.getColumn(5).numFmt = monedaFmt; r.getColumn(6).numFmt = '0.0%';
    return wb;
  }

  var api = { COLUMNAS: COLUMNAS, ESTADOS: ESTADOS, filas: filas, filasPresupuesto: filasPresupuesto, resumen: resumen, capitulosDe: capitulosDe, libro: libro };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.FormatoEtapas = api;
}());
