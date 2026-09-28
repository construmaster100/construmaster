// Barra de progreso en texto del scraping de marcas (se puede correr en cualquier momento, no hace solicitudes).
// Lee el data.json de cada carpeta de marca en pages/PROVEEDORES (se guarda cada 25 fichas).
//   node tools/scraper/progreso.js
//   node tools/scraper/progreso.js --registro <archivo.log>   (Stretto: cuenta los puntos del registro de stretto.js)
const fs = require('fs');
const path = require('path');

const PROV = path.join(path.resolve(__dirname, '..', '..'), 'pages', 'PROVEEDORES');
const ANCHO = 30;
function barra(hechos, total) {
  const f = total ? Math.min(1, hechos / total) : 0; const llenos = Math.round(f * ANCHO);
  return `[${'█'.repeat(llenos)}${'░'.repeat(ANCHO - llenos)}] ${(f * 100).toFixed(1).replace('.', ',').padStart(5)} %  ${String(hechos.toLocaleString('es-CO')).padStart(5)}/${total.toLocaleString('es-CO')}`;
}

const filas = [];
for (const grupo of fs.readdirSync(PROV)) {
  const dg = path.join(PROV, grupo); if (!fs.statSync(dg).isDirectory()) continue;
  for (const marca of fs.readdirSync(dg)) {
    const archivo = path.join(dg, marca, 'data.json'); if (!fs.existsSync(archivo)) continue;
    let d; try { d = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch (e) { continue; } // se esta escribiendo en este instante
    const m = d.meta || {}; const total = m.totalMapa || 0; const hechas = (m.capturados || 0) + (m.fallas || []).length;
    const etapa = m.etapa || m.tipo || '';
    const meta = /piloto/.test(etapa) && !/NO aprobado/.test(etapa) ? Math.ceil(total * 0.10) : total; // en el piloto la meta es el 10 %
    const minutos = Math.round((Date.now() - fs.statSync(archivo).mtimeMs) / 60000);
    filas.push({ nombre: m.marca || marca, hechas: Math.min(hechas, meta), meta, total, etapa, fallas: (m.fallas || []).length, minutos });
  }
}

// Stretto (stretto.js escribe data.json solo al final): puntos del registro = fichas capturadas.
const i = process.argv.indexOf('--registro');
if (i > 0 && fs.existsSync(process.argv[i + 1])) {
  const texto = fs.readFileSync(process.argv[i + 1], 'utf8'); const total = Number((texto.match(/(\d+) fichas en el mapa/) || [])[1]) || 0;
  if (total && !/Capturados \d+/.test(texto)) {
    const f = filas.find((x) => x.nombre === 'Stretto'); const hechas = (texto.split(/\n/)[1] || '').replace(/[^.]/g, '').length;
    const fila = { nombre: 'Stretto', hechas, meta: total, total, etapa: 'completo (en curso)', fallas: 0, minutos: 0 };
    if (f) Object.assign(f, fila); else filas.push(fila);
  }
}

console.log(`Progreso del scraping de marcas — ${new Date().toLocaleString('es-CO')}\n`);
filas.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((x) => {
  const quieto = x.hechas < x.meta && x.minutos >= 5 ? `  (sin cambios hace ${x.minutos} min)` : '';
  console.log(`${x.nombre.padEnd(9)} ${barra(x.hechas, x.meta)}  · ${x.etapa} · fallas ${x.fallas}${quieto}`);
});
const h = filas.reduce((s, x) => s + x.hechas, 0); const t = filas.reduce((s, x) => s + x.meta, 0);
console.log(`\n${'TOTAL'.padEnd(9)} ${barra(h, t)}`);
