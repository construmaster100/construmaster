// Matematica del salario minimo y del costo de la mano de obra (ConstruMaster).
// Todo se calcula como PROPORCION de dos datos: el salario minimo mensual (SMMLV) y la tasa de cambio (TRM).
// Si el proximo año cambia el salario minimo o el dolar, basta con cambiar esos parametros: cada valor
// (dia, semana, quincena, hora, segundo, dolares y relaciones) se recalcula con la misma formula.
// Este modulo lo usan la pagina (pestaña Servicios) y tools/generar_excel_salario.js, que escribe las
// mismas formulas como formulas de Excel; asi la pagina y el Excel nunca difieren.
(function () {
  'use strict';

  // Parametros (datos de entrada). Fuentes verificadas el 26/09/2026.
  var PARAMETROS = [
    { id: 'SMMLV', nombre: 'Salario mínimo mensual', valor: 1750905, unidad: '$ COP', fuente: 'Decreto 1469 del 29/12/2025 (vigente desde el 01/01/2026)' },
    { id: 'TRM', nombre: 'Tasa de cambio (pesos por dólar)', valor: 3306.86, unidad: '$ COP / US$', fuente: 'Superintendencia Financiera, TRM vigente del 26 al 28/09/2026 (datos.gov.co, serie 32sa-8pi3)' },
    { id: 'SALUD_PCT', nombre: 'Aporte a salud del empleador', valor: 0.085, unidad: '%', fuente: 'Ley 1122 de 2007 (8,5 %). Exonerable según art. 114-1 del Estatuto Tributario' },
    { id: 'ARL_PCT', nombre: 'Aporte a ARL (riesgo laboral)', valor: 0.0696, unidad: '%', fuente: 'Decreto 1772 de 1994: clase V (construcción) 6,96 %' },
    { id: 'TRANSPORTE_DIA', nombre: 'Transporte por día trabajado', valor: 5000, unidad: '$ COP / día', fuente: 'Valor definido por ConstruMaster' },
    { id: 'DIAS_TRABAJADOS', nombre: 'Días trabajados al mes', valor: 26, unidad: 'días', fuente: '6 días por semana (el domingo es descanso remunerado)' },
    { id: 'DIAS_MES', nombre: 'Días del mes laboral', valor: 30, unidad: 'días', fuente: 'Código Sustantivo del Trabajo: el mes laboral se liquida sobre 30 días' },
    { id: 'HORAS_SEMANA', nombre: 'Jornada máxima semanal', valor: 42, unidad: 'horas', fuente: 'Ley 2101 de 2021: 42 horas desde el 15/07/2026' },
  ];

  var ARL_CLASES = [['I', 0.00522, 'Riesgo mínimo (oficina)'], ['II', 0.01044, 'Riesgo bajo'], ['III', 0.02436, 'Riesgo medio'], ['IV', 0.0435, 'Riesgo alto'], ['V', 0.0696, 'Riesgo máximo (construcción)']];

  // Valores derivados: cada uno es una formula sobre los parametros o sobre derivados anteriores.
  // texto: formula legible · excel: formula de Excel con los nombres definidos · calc: la misma formula en JavaScript.
  var DERIVADOS = [
    { id: 'DIVISOR_HORAS', nombre: 'Horas laborales al mes (divisor legal)', texto: 'HORAS_SEMANA × 5', excel: 'HORAS_SEMANA*5', calc: function (v) { return v.HORAS_SEMANA * 5; }, explicacion: 'El divisor legal es la jornada semanal por 5: 48 h → 240, 42 h → 210.' },
    { id: 'SALUD_MES', nombre: 'Salud del empleador al mes', texto: 'SMMLV × SALUD_PCT', excel: 'SMMLV*SALUD_PCT', calc: function (v) { return v.SMMLV * v.SALUD_PCT; }, explicacion: 'Porcentaje del salario.' },
    { id: 'ARL_MES', nombre: 'ARL al mes', texto: 'SMMLV × ARL_PCT', excel: 'SMMLV*ARL_PCT', calc: function (v) { return v.SMMLV * v.ARL_PCT; }, explicacion: 'Porcentaje del salario según la clase de riesgo.' },
    { id: 'TRANSPORTE_MES', nombre: 'Transporte al mes', texto: 'TRANSPORTE_DIA × DIAS_TRABAJADOS', excel: 'TRANSPORTE_DIA*DIAS_TRABAJADOS', calc: function (v) { return v.TRANSPORTE_DIA * v.DIAS_TRABAJADOS; }, explicacion: 'Solo los días trabajados.' },
    { id: 'COSTO_MES', nombre: 'Costo total al mes', texto: 'SMMLV + SALUD_MES + ARL_MES + TRANSPORTE_MES', excel: 'SMMLV+SALUD_MES+ARL_MES+TRANSPORTE_MES', calc: function (v) { return v.SMMLV + v.SALUD_MES + v.ARL_MES + v.TRANSPORTE_MES; }, explicacion: 'Salario más aportes y transporte.' },
  ];

  // Periodos: cada uno es una fraccion del mes. Valor del periodo = valor mensual × factor.
  var PERIODOS = [
    { id: 'MES', nombre: 'Mes', texto: '1', excel: '1', calc: function () { return 1; } },
    { id: 'QUINCENA', nombre: 'Quincena', texto: '15 ÷ DIAS_MES', excel: '15/DIAS_MES', calc: function (v) { return 15 / v.DIAS_MES; } },
    { id: 'SEMANA', nombre: 'Semana', texto: '7 ÷ DIAS_MES', excel: '7/DIAS_MES', calc: function (v) { return 7 / v.DIAS_MES; } },
    { id: 'DIA', nombre: 'Día (calendario)', texto: '1 ÷ DIAS_MES', excel: '1/DIAS_MES', calc: function (v) { return 1 / v.DIAS_MES; } },
    { id: 'DIA_TRABAJADO', nombre: 'Día trabajado', texto: '1 ÷ DIAS_TRABAJADOS', excel: '1/DIAS_TRABAJADOS', calc: function (v) { return 1 / v.DIAS_TRABAJADOS; } },
    { id: 'HORA', nombre: 'Hora', texto: '1 ÷ DIVISOR_HORAS', excel: '1/DIVISOR_HORAS', calc: function (v) { return 1 / v.DIVISOR_HORAS; } },
    { id: 'MINUTO', nombre: 'Minuto', texto: '1 ÷ (DIVISOR_HORAS × 60)', excel: '1/(DIVISOR_HORAS*60)', calc: function (v) { return 1 / (v.DIVISOR_HORAS * 60); } },
    { id: 'SEGUNDO', nombre: 'Segundo', texto: '1 ÷ (DIVISOR_HORAS × 3.600)', excel: '1/(DIVISOR_HORAS*3600)', calc: function (v) { return 1 / (v.DIVISOR_HORAS * 3600); } },
  ];

  // Conceptos mensuales que se reparten en cada periodo.
  var CONCEPTOS = [
    { id: 'SMMLV', nombre: 'Salario mínimo' },
    { id: 'SALUD_MES', nombre: 'Salud (empleador)' },
    { id: 'ARL_MES', nombre: 'ARL' },
    { id: 'TRANSPORTE_MES', nombre: 'Transporte' },
    { id: 'COSTO_MES', nombre: 'Costo total', total: true },
  ];

  // Relaciones numericas entre el salario minimo y el dolar: existen siempre, cambie el valor que cambie.
  var RELACIONES = [
    { id: 'SMMLV_USD', nombre: 'Salario mínimo en dólares', texto: 'SMMLV ÷ TRM', excel: 'SMMLV/TRM', unidad: 'US$', calc: function (v) { return v.SMMLV / v.TRM; }, explicacion: 'Cuántos dólares compra un salario mínimo.' },
    { id: 'USD_EN_SMMLV', nombre: 'Un dólar como fracción del salario mínimo', texto: 'TRM ÷ SMMLV', excel: 'TRM/SMMLV', unidad: '% del SMMLV', porcentaje: true, calc: function (v) { return v.TRM / v.SMMLV; }, explicacion: 'Qué parte del salario mínimo vale un dólar.' },
    { id: 'HORA_USD', nombre: 'Hora de salario mínimo en dólares', texto: '(SMMLV ÷ DIVISOR_HORAS) ÷ TRM', excel: '(SMMLV/DIVISOR_HORAS)/TRM', unidad: 'US$ / hora', calc: function (v) { return v.SMMLV / v.DIVISOR_HORAS / v.TRM; }, explicacion: 'Dólares que se ganan en una hora con el salario mínimo.' },
    { id: 'MINUTOS_POR_USD', nombre: 'Minutos de trabajo para ganar un dólar', texto: 'TRM ÷ (SMMLV ÷ DIVISOR_HORAS) × 60', excel: 'TRM/(SMMLV/DIVISOR_HORAS)*60', unidad: 'minutos', calc: function (v) { return v.TRM / (v.SMMLV / v.DIVISOR_HORAS) * 60; }, explicacion: 'Tiempo de trabajo con salario mínimo equivalente a un dólar.' },
    { id: 'DIA_USD', nombre: 'Día de salario mínimo en dólares', texto: '(SMMLV ÷ DIAS_MES) ÷ TRM', excel: '(SMMLV/DIAS_MES)/TRM', unidad: 'US$ / día', calc: function (v) { return v.SMMLV / v.DIAS_MES / v.TRM; }, explicacion: 'Salario diario legal (mes ÷ 30) en dólares.' },
    { id: 'DIAS_POR_100USD', nombre: 'Días de salario mínimo para 100 dólares', texto: '100 × TRM ÷ (SMMLV ÷ DIAS_MES)', excel: '100*TRM/(SMMLV/DIAS_MES)', unidad: 'días', calc: function (v) { return 100 * v.TRM / (v.SMMLV / v.DIAS_MES); }, explicacion: 'Días de salario necesarios para reunir 100 dólares.' },
    { id: 'COSTO_MES_USD', nombre: 'Costo total del trabajador en dólares', texto: 'COSTO_MES ÷ TRM', excel: 'COSTO_MES/TRM', unidad: 'US$ / mes', calc: function (v) { return v.COSTO_MES / v.TRM; }, explicacion: 'Lo que cuesta al mes un trabajador de salario mínimo, en dólares.' },
    { id: 'FACTOR_COSTO', nombre: 'Factor de costo sobre el salario', texto: 'COSTO_MES ÷ SMMLV', excel: 'COSTO_MES/SMMLV', unidad: 'veces', calc: function (v) { return v.COSTO_MES / v.SMMLV; }, explicacion: 'Por cada peso de salario, cuánto cuesta el trabajador (salario + aportes + transporte).' },
  ];

  function valoresIniciales() {
    var v = {};
    PARAMETROS.forEach(function (p) { v[p.id] = p.valor; });
    return v;
  }

  // Calcula todo a partir de los parametros dados (los que falten toman el valor por defecto).
  function calcular(entrada) {
    var v = valoresIniciales();
    Object.keys(entrada || {}).forEach(function (k) { if (entrada[k] !== undefined && entrada[k] !== null && entrada[k] !== '') v[k] = Number(entrada[k]); });
    DERIVADOS.forEach(function (d) { v[d.id] = d.calc(v); });
    var tabla = CONCEPTOS.map(function (c) {
      return { concepto: c, valores: PERIODOS.map(function (p) { var cop = v[c.id] * p.calc(v); return { periodo: p, cop: cop, usd: cop / v.TRM }; }) };
    });
    var relaciones = RELACIONES.map(function (r) { return { relacion: r, valor: r.calc(v) }; });
    return { v: v, tabla: tabla, relaciones: relaciones };
  }

  var api = { PARAMETROS: PARAMETROS, ARL_CLASES: ARL_CLASES, DERIVADOS: DERIVADOS, PERIODOS: PERIODOS, CONCEPTOS: CONCEPTOS, RELACIONES: RELACIONES, calcular: calcular, valoresIniciales: valoresIniciales };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.SalarioMinimo = api;
}());
