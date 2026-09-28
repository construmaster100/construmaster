// Lista los planos en PDF de cada obra de pages/Cliente para la pagina del cliente (pages/Cliente/index.html).
// Estructura por obra (se crean las carpetas que falten):
//   pages/Cliente/<OBRA>/PLANOS/ESTRUCTURALES · ARQUITECTONICOS · ELECTRICOS · HIDROSANITARIOS / *.pdf
// Volver a correr despues de agregar o quitar PDF:  node tools/generar_planos_cliente.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const CLIENTE = path.join(RAIZ, 'pages', 'Cliente');
const CATEGORIAS = [
  ['ARQUITECTONICOS', 'Planos arquitectónicos'],
  ['ESTRUCTURALES', 'Planos estructurales'],
  ['ELECTRICOS', 'Planos eléctricos'],
  ['HIDROSANITARIOS', 'Planos hidrosanitarios'],
];
const NO_ES_OBRA = /plantilla|^index/i;
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');

const obras = {};
for (const obra of fs.readdirSync(CLIENTE, { withFileTypes: true }).filter((d) => d.isDirectory() && !NO_ES_OBRA.test(d.name)).map((d) => d.name)) {
  obras[obra] = CATEGORIAS.map(([carpeta, titulo]) => {
    const dir = path.join(CLIENTE, obra, 'PLANOS', carpeta);
    fs.mkdirSync(dir, { recursive: true });
    const archivos = fs.readdirSync(dir).filter((n) => /\.pdf$/i.test(n)).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
      .map((n) => ({ nombre: n.replace(/\.pdf$/i, ''), ruta: rel(path.join(dir, n)), kb: Math.round(fs.statSync(path.join(dir, n)).size / 1024) }));
    return { carpeta, titulo, archivos };
  });
  console.log(obra + ': ' + obras[obra].map((c) => c.carpeta + ' ' + c.archivos.length).join(' · '));
}
// Programacion de obra: pages/Cliente/<OBRA>/PROGRAMACION.txt, una linea por etapa de la plantilla:
//   03_CIMENTACION: 2026-08-17 a 2026-09-04
// Si no existe se crea con las etapas y sin fechas (se llenan a mano y se vuelve a correr este script).
const ETAPAS = fs.readdirSync(path.join(CLIENTE, 'Plantilla Modelo', 'ETAPAS OBRA'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+_/.test(d.name)).map((d) => d.name).sort();
const programacion = {};
for (const obra of Object.keys(obras)) {
  const archivo = path.join(CLIENTE, obra, 'PROGRAMACION.txt');
  if (!fs.existsSync(archivo)) fs.writeFileSync(archivo, '# Programacion de obra: fecha de inicio y fin de cada etapa (AAAA-MM-DD a AAAA-MM-DD)\n' + ETAPAS.map((e) => e + ': ').join('\n') + '\n', 'utf8');
  const fechas = {};
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^(\d+_[^:]+):\s*(\d{4}-\d{2}-\d{2})\s*a\s*(\d{4}-\d{2}-\d{2})/);
    if (m) fechas[m[1].trim()] = { inicio: m[2], fin: m[3] };
  }
  programacion[obra] = ETAPAS.map((e) => Object.assign({ etapa: e }, fechas[e] || {}));
  console.log(obra + ': programacion con fechas en ' + Object.keys(fechas).length + ' de ' + ETAPAS.length + ' etapas');
}
// Listado de archivos de una subcarpeta de cada obra (se crea si falta)
function listarArchivos(subcarpeta, filtro) {
  const salida = {};
  for (const obra of Object.keys(obras)) {
    const dir = path.join(CLIENTE, obra, subcarpeta);
    fs.mkdirSync(dir, { recursive: true });
    salida[obra] = fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isFile() && filtro.test(n)).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
      .map((n) => ({ nombre: n.replace(/\.[^.]+$/, ''), tipo: n.split('.').pop().toLowerCase(), ruta: rel(path.join(dir, n)), kb: Math.round(fs.statSync(path.join(dir, n)).size / 1024) }));
    console.log(obra + ': ' + subcarpeta + ' ' + salida[obra].length + ' archivos');
  }
  return salida;
}
// Presupuesto de obra: pages/Cliente/<OBRA>/PRESUPUESTO/*.pdf|xlsx|xlsm|xls
const presupuesto = listarArchivos('PRESUPUESTO', /\.(pdf|xlsx|xlsm|xls)$/i);
// Control de obra: pages/Cliente/<OBRA>/CONTROL DE OBRA/ (actas, informes, bitacoras: cualquier tipo de archivo)
const control = listarArchivos('CONTROL DE OBRA', /^[^.~][^]*\.[a-z0-9]+$/i);
fs.writeFileSync(path.join(CLIENTE, 'planos.js'), '// Generado por tools/generar_planos_cliente.js — no editar a mano.\nwindow.PLANOS_CLIENTE = ' + JSON.stringify(obras, null, 1) + ';\nwindow.PROGRAMACION_CLIENTE = ' + JSON.stringify(programacion, null, 1) + ';\nwindow.PRESUPUESTO_CLIENTE = ' + JSON.stringify(presupuesto, null, 1) + ';\nwindow.CONTROL_CLIENTE = ' + JSON.stringify(control, null, 1) + ';\n', 'utf8');
console.log('Listo: pages/Cliente/planos.js');
