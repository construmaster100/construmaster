// Genera el Excel "Formato unico de etapas" en la plantilla de proyectos:
//   pages/Cliente/Plantilla Modelo/ETAPAS OBRA/Formato_Unico_Etapas.xlsx
// Reemplaza al antiguo etapas_de_obra.xlsx. Usa el mismo modulo que el boton de descarga de la
// pagina (assets/motor/formato_etapas.js), asi ambos archivos tienen el mismo formato.
//   node tools/generar_formato_etapas.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ExcelJS = require('exceljs');
const FormatoEtapas = require('../assets/motor/formato_etapas.js');

const RAIZ = path.resolve(__dirname, '..');
const CARPETA_ETAPAS = path.join(RAIZ, 'pages', 'Cliente', 'Plantilla Modelo', 'ETAPAS OBRA');
const DESTINO = path.join(CARPETA_ETAPAS, 'Formato_Unico_Etapas.xlsx');
const ANTERIOR = path.join(CARPETA_ETAPAS, 'etapas_de_obra.xlsx');

// Carga un archivo de datos del navegador (window.X = ...) y devuelve su window.
function cargarDatos(...archivos) {
  const contexto = { window: {} };
  vm.createContext(contexto);
  archivos.forEach((a) => vm.runInContext(fs.readFileSync(path.join(RAIZ, a), 'utf8'), contexto));
  return contexto.window;
}

const w = cargarDatos('pages/Cliente/Plantilla Modelo/ETAPAS OBRA/datos.js', 'pages/administrador/Matriz/Modelo Boulevard/js/datos.js', 'assets/datos/apu.js');
const dirs = (c) => fs.readdirSync(c, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const plantilla = dirs(CARPETA_ETAPAS).filter((n) => /^\d+_/.test(n)).map((carpeta) => ({ carpeta, subetapas: dirs(path.join(CARPETA_ETAPAS, carpeta)) }));

(async () => {
  const libro = FormatoEtapas.libro(ExcelJS, w.DATOS_ETAPAS, w.DATOS_BOULEVARD, { plantilla, apu: w.APU });
  await libro.xlsx.writeFile(DESTINO);
  if (fs.existsSync(ANTERIOR)) fs.unlinkSync(ANTERIOR);
  const filas = FormatoEtapas.filas(w.DATOS_ETAPAS, w.DATOS_BOULEVARD, { plantilla, apu: w.APU });
  console.log(`Formato unico: ${path.relative(RAIZ, DESTINO)} — ${filas.length} subetapas en ${w.DATOS_ETAPAS.etapas.length} etapas, ${w.DATOS_BOULEVARD.capitulos.length} capitulos MP`);
  FormatoEtapas.resumen(w.DATOS_ETAPAS, w.DATOS_BOULEVARD).forEach((r) => console.log('  ' + r.valores[0] + ': ' + r.valores[2] + ' subetapas, ' + r.valores[3] + ' capitulos, $ ' + Math.round(r.valores[4]).toLocaleString('es-CO')));
})().catch((e) => { console.error(e); process.exit(1); });
