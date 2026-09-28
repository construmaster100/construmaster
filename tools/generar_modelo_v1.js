// Lee el modelo "V1 Construmaster.xlsm" (13 capitulos agrupados en obra negra, gris y blanca) y escribe
// assets/datos/modelo_v1.js para la pestana Presupuesto: capitulo -> actividades (ITEM) -> materiales (SUB-ITEM)
// con unidad, cantidad y valor unitario del modelo. La cantidad efectiva = VALOR TOTAL / VALOR U. (asi incluye
// las columnas de area o medida de cada hoja); si el valor unitario es 0 se toma la columna de cantidad.
//   node tools/generar_modelo_v1.js
const fs = require('fs');
const path = require('path');
const X = require('xlsx');

const RAIZ = path.resolve(__dirname, '..');
const MODELO = path.join(RAIZ, 'pages', 'administrador', 'Matriz', 'Modelo Construmaster', 'V1 Construmaster.xlsm');
const wb = X.readFile(MODELO);
const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const limpio = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

// Etapas del modelo (hoja INICIO): capitulos 1-3 obra negra, 4-5 obra gris, 6-13 obra blanca. El Excel no trae
// instalaciones electricas: se agrega el capitulo 4 y los del Excel desde el 4 pasan a 5-14 (pedido del usuario, 28/09/2026)
// -> obra negra 1-4, gris 5-6, blanca 7-14.
const ETAPA_DE = (n) => (n <= 3 ? 'negra' : n <= 5 ? 'gris' : 'blanca');
const ETAPA_FINAL = (n) => (n <= 4 ? 'negra' : n <= 6 ? 'gris' : 'blanca');

const capitulos = [];
for (const hoja of wb.SheetNames) {
  const m = hoja.match(/^(\d+)\.\s*(.+)$/); if (!m) continue;
  const n = Number(m[1]); const nombre = limpio(m[2]);
  const filas = X.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, blankrows: false });
  const cap = { n, nombre, etapa: ETAPA_DE(n), actividades: [] };
  let col = null; let act = null;
  for (const f of filas) {
    const celdas = f.map(norm);
    // Encabezado (puede repetirse en la hoja): ubica las columnas por nombre
    if (celdas.includes('REF') && (celdas.includes('ITEM') || celdas.includes('SUB-ITEM'))) {
      const i = (re) => celdas.findIndex((c) => re.test(c));
      col = { ref: i(/^REF$/), item: i(/^ITEM$/), sub: i(/^SUB-ITEM$/), und: i(/^(UNIDAD|UN)$/), cant: i(/^(CANT\.|UND TOTAL)$/), cantTotal: i(/^CANT\. TOTAL$/), vu: i(/^VALOR U\.$/), vt: i(/^VALOR TOTAL$/), medida: i(/^MEDIDA$/) };
      continue;
    }
    if (!col) continue;
    const ref = limpio(f[col.ref]); const item = limpio(f[col.item]); const sub = limpio(f[col.sub]);
    if (celdas.includes('SUB-TOTAL')) continue;
    const und = limpio(f[col.und]).toUpperCase();
    const vu = num(f[col.vu]); const vt = num(f[col.vt]);
    const cantBase = num(f[col.cantTotal] >= 0 ? f[col.cantTotal] : undefined) ?? num(f[col.cant]);
    // Hojas con "CANT." por m² y "CANT. TOTAL" (mamposteria): la cantidad total son unidades (bloques, ladrillos), no m²
    const porArea = col.cantTotal >= 0 && num(f[col.cantTotal]) !== null;
    const iArea = celdas.length && col.cantTotal >= 0 ? col.cantTotal - 1 : -1;
    const linea = (nombre) => ({ nombre, unidad: porArea ? 'UN' : (und || 'UN'), cantidad: vu ? Math.round((vt || 0) / vu * 1000) / 1000 : (cantBase || 0), valorU: vu || 0,
      medida: porArea ? `${num(f[col.cant])} por ${und || 'M2'} · área ${num(f[iArea])} ${und || 'M2'}` : (col.medida >= 0 && typeof f[col.medida] === 'string' && f[col.medida] !== 'x' ? limpio(f[col.medida]) : '') });
    if (item || (ref && !sub)) {
      // Nueva actividad; si la misma fila ya trae unidad y valor, la actividad es tambien su propia linea
      act = { ref: ref || '', nombre: item || '(sin nombre)', materiales: [] };
      cap.actividades.push(act);
      if (sub && und) act.materiales.push(linea(sub));
      else if (und && (vu || vt)) act.materiales.push(linea(item));
      continue;
    }
    if (sub && act) act.materiales.push(linea(sub));
  }
  cap.actividades = cap.actividades.filter((a) => a.materiales.length || a.nombre !== '(sin nombre)');
  capitulos.push(cap);
}
capitulos.sort((a, b) => a.n - b.n);
capitulos.forEach((c) => { if (c.n >= 4) c.n += 1; });
capitulos.splice(capitulos.findIndex((c) => c.n > 4), 0, { n: 4, nombre: 'Instalaciones eléctricas', actividades: [], agregado: true });
capitulos.forEach((c) => { c.etapa = ETAPA_FINAL(c.n); });
fs.writeFileSync(path.join(RAIZ, 'assets', 'datos', 'modelo_v1.js'), '// Generado por tools/generar_modelo_v1.js desde V1 Construmaster.xlsm — no editar a mano.\nwindow.MODELO_V1 = ' + JSON.stringify({ generado: new Date().toISOString().slice(0, 10), fuente: path.relative(RAIZ, MODELO).split(path.sep).join('/'), capitulos }) + ';\n', 'utf8');
capitulos.forEach((c) => console.log(`${c.n}. ${c.nombre} (${c.etapa}): ${c.actividades.length} actividades, ${c.actividades.reduce((s, a) => s + a.materiales.length, 0)} materiales`));
