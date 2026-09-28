// Genera pages/Servicios/Calculo_Salario_Minimo.xlsx con la matematica del salario minimo como FORMULAS
// de Excel: los parametros (SMMLV, TRM, aportes, transporte, dias, jornada) estan en celdas con nombre y
// todo lo demas se calcula con formulas que los referencian. Si cambia el salario minimo o el dolar,
// basta con escribir el nuevo valor en la hoja Parametros y Excel recalcula el resto.
// Usa las mismas definiciones que la pagina: assets/motor/salario_minimo.js
//   node tools/generar_excel_salario.js
const path = require('path');
const ExcelJS = require('exceljs');
const SM = require('../assets/motor/salario_minimo.js');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'pages', 'Servicios', 'Calculo_Salario_Minimo.xlsx');
const VERDE = 'FF354B3E'; const HUESO = 'FFF5F3ED'; const DORADO = 'FFD9C496';
const PESOS = '"$" #,##0.00'; const DOLARES = '"US$" #,##0.000000';

(async () => {
  const r = SM.calcular();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ConstruMaster';
  wb.calcProperties.fullCalcOnLoad = true;

  const encabezado = (h, titulo, nota) => {
    h.getCell('A1').value = titulo;
    h.getCell('A1').font = { bold: true, size: 14, color: { argb: VERDE } };
    h.getCell('A2').value = nota;
    h.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF65675F' } };
  };
  const cabeceraTabla = (fila) => fila.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } }; c.alignment = { vertical: 'middle', wrapText: true }; });

  // 1. Parametros: celdas con nombre (lo unico que se edita)
  const hp = wb.addWorksheet('Parametros');
  encabezado(hp, 'Parámetros — lo único que se cambia', 'Escribe aquí el nuevo salario mínimo, la TRM o los aportes: las demás hojas se recalculan con fórmulas. Las celdas amarillas son editables.');
  hp.addRow([]);
  cabeceraTabla(hp.addRow(['NOMBRE', 'VALOR', 'UNIDAD', 'DESCRIPCIÓN', 'FUENTE']));
  SM.PARAMETROS.forEach((p) => {
    const fila = hp.addRow([p.id, p.valor, p.unidad, p.nombre, p.fuente]);
    const celda = fila.getCell(2);
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4C2' } };
    celda.numFmt = p.unidad === '%' ? '0.000%' : /\$/.test(p.unidad) ? PESOS : '0';
    wb.definedNames.add(`Parametros!$B$${fila.number}`, p.id);
  });
  hp.addRow([]);
  cabeceraTabla(hp.addRow(['DERIVADO', 'VALOR', 'FÓRMULA', 'DESCRIPCIÓN', 'EXPLICACIÓN']));
  SM.DERIVADOS.forEach((d) => {
    const fila = hp.addRow([d.id, { formula: d.excel, result: r.v[d.id] }, '=' + d.excel, d.nombre, d.explicacion]);
    fila.getCell(2).numFmt = d.id === 'DIVISOR_HORAS' ? '0' : PESOS;
    wb.definedNames.add(`Parametros!$B$${fila.number}`, d.id);
  });
  hp.addRow([]);
  hp.addRow(['Tarifas ARL por clase de riesgo (Decreto 1772 de 1994): copie la que aplique en ARL_PCT.']).getCell(1).font = { bold: true };
  SM.ARL_CLASES.forEach((a) => { const f = hp.addRow(['Clase ' + a[0], a[1], '%', a[2]]); f.getCell(2).numFmt = '0.000%'; });
  hp.columns = [{ width: 18 }, { width: 18 }, { width: 34 }, { width: 38 }, { width: 70 }];

  // 2. Calculo por periodo: concepto mensual × factor del periodo (pesos y dolares)
  const hc = wb.addWorksheet('Calculo por periodo');
  encabezado(hc, 'Salario mínimo y costo laboral por periodo', 'Cada celda = valor mensual × factor del periodo. Los dólares = pesos ÷ TRM. Todo con fórmulas.');
  hc.addRow([]);
  cabeceraTabla(hc.addRow(['FACTOR DEL PERIODO', ...SM.PERIODOS.map((p) => p.nombre)]));
  const filaFactor = hc.addRow(['Fracción del mes', ...SM.PERIODOS.map((p) => ({ formula: p.excel, result: p.calc(r.v) }))]);
  filaFactor.eachCell((c, i) => { if (i > 1) c.numFmt = '0.000000'; });
  hc.addRow(['Fórmula del factor', ...SM.PERIODOS.map((p) => '=' + p.excel)]).font = { italic: true, size: 9, color: { argb: 'FF65675F' } };
  hc.addRow([]);
  const letra = (i) => String.fromCharCode(66 + i); // columna B en adelante
  const bloque = (titulo, enDolares) => {
    cabeceraTabla(hc.addRow([titulo, ...SM.PERIODOS.map((p) => p.nombre)]));
    SM.CONCEPTOS.forEach((c) => {
      const fila = hc.addRow([c.nombre, ...SM.PERIODOS.map((p, i) => {
        const cop = r.v[c.id] * p.calc(r.v);
        const formula = `${c.id}*${letra(i)}$${filaFactor.number}` + (enDolares ? '/TRM' : '');
        return { formula, result: enDolares ? cop / r.v.TRM : cop };
      })]);
      fila.eachCell((cel, i) => { if (i > 1) cel.numFmt = enDolares ? DOLARES : PESOS; });
      if (c.total) fila.eachCell((cel) => { cel.font = { bold: true }; cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HUESO } }; });
    });
  };
  bloque('PESOS COLOMBIANOS', false);
  hc.addRow([]);
  bloque('DÓLARES (÷ TRM)', true);
  hc.columns = [{ width: 24 }, ...SM.PERIODOS.map(() => ({ width: 17 }))];

  // 3. Relaciones numericas salario minimo ↔ dolar
  const hr = wb.addWorksheet('Relaciones');
  encabezado(hr, 'Relaciones numéricas entre el salario mínimo y el dólar', 'Son proporciones: existen siempre y se recalculan si cambia el salario mínimo o la TRM.');
  hr.addRow([]);
  cabeceraTabla(hr.addRow(['RELACIÓN', 'VALOR', 'UNIDAD', 'FÓRMULA', 'QUÉ SIGNIFICA']));
  SM.RELACIONES.forEach((x) => {
    const fila = hr.addRow([x.nombre, { formula: x.excel, result: x.calc(r.v) }, x.unidad, '=' + x.excel, x.explicacion]);
    fila.getCell(2).numFmt = x.porcentaje ? '0.0000%' : '#,##0.0000';
  });
  hr.columns = [{ width: 42 }, { width: 16 }, { width: 14 }, { width: 38 }, { width: 70 }];

  // 4. Documentacion de la matematica
  const hd = wb.addWorksheet('Matematica');
  encabezado(hd, 'La matemática de cada función', 'Todo valor es una proporción del salario mínimo (SMMLV) y de la tasa de cambio (TRM).');
  hd.addRow([]);
  const lineas = [
    ['Principio', 'Cada valor es SMMLV (o el costo mensual) multiplicado por una fracción del mes; los dólares dividen entre la TRM. Por eso, al cambiar SMMLV o TRM, todo se recalcula sin tocar las fórmulas.'],
    ['Mes laboral', 'El salario se liquida sobre 30 días (DIAS_MES). Día calendario = mes ÷ 30; semana = mes × 7 ÷ 30; quincena = mes × 15 ÷ 30.'],
    ['Día trabajado', 'Costo del mes ÷ días trabajados (26 con semana de 6 días): reparte también el domingo remunerado.'],
    ['Hora', 'Mes ÷ DIVISOR_HORAS, con DIVISOR_HORAS = horas semanales × 5 (42 h → 210). Minuto = hora ÷ 60; segundo = hora ÷ 3.600.'],
    ['Aportes', 'Salud = SMMLV × 8,5 %; ARL = SMMLV × tarifa de la clase de riesgo (clase V = 6,96 %). Transporte = valor diario × días trabajados.'],
    ['Dólares', 'Valor en dólares = valor en pesos ÷ TRM. Un dólar como fracción del salario = TRM ÷ SMMLV.'],
    ['No incluye', 'Pensión, caja de compensación ni prestaciones sociales (cesantías, intereses, prima, vacaciones).'],
  ];
  cabeceraTabla(hd.addRow(['TEMA', 'EXPLICACIÓN']));
  lineas.forEach((l) => { const f = hd.addRow(l); f.getCell(2).alignment = { wrapText: true, vertical: 'top' }; f.getCell(1).font = { bold: true }; });
  hd.addRow([]);
  cabeceraTabla(hd.addRow(['NOMBRE', 'FÓRMULA']));
  [...SM.DERIVADOS, ...SM.PERIODOS.map((p) => ({ id: 'Factor ' + p.nombre, texto: p.texto })), ...SM.RELACIONES].forEach((x) => hd.addRow([x.nombre || x.id, x.texto]));
  hd.columns = [{ width: 40 }, { width: 110 }];
  [hp, hc, hr, hd].forEach((h) => { h.getRow(4).height = 22; });

  await wb.xlsx.writeFile(DESTINO);
  console.log(`Excel: ${path.relative(RAIZ, DESTINO)}`);
  console.log(`SMMLV ${r.v.SMMLV} · TRM ${r.v.TRM} · divisor ${r.v.DIVISOR_HORAS} h · costo mes ${Math.round(r.v.COSTO_MES)} · SMMLV en US$ ${r.relaciones[0].valor.toFixed(2)} · minutos por US$ ${r.relaciones[3].valor.toFixed(2)}`);
})().catch((e) => { console.error(e); process.exit(1); });
