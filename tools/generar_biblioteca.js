// Lee pages/Biblioteca de proyectos y escribe assets/datos/biblioteca.js para la pestana Diseno del index
// (Biblioteca de proyectos: listado, repositorio de cada proyecto y "Crear proyecto").
// Cada carpeta "PROYECTO N" aporta: FICHA.txt (primera linea "PROYECTO N: <nombre>" y lineas "clave: valor"),
// o ficha.json (proyectos creados con el formulario), y la lista de sus archivos por seccion.
// Volver a correr despues de agregar proyectos o archivos:  node tools/generar_biblioteca.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const BIBLIOTECA = path.join(RAIZ, 'pages', 'Biblioteca de proyectos');
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');

// Seccion de cada archivo segun su carpeta o nombre (misma estructura de la pagina del cliente)
function seccion(ruta) {
  const r = ruta.toUpperCase();
  if (r.includes('/PLANOS/') || /(^|\/)PLANO\./.test(r)) return 'planos';
  if (r.includes('/PRESUPUESTO') || /\.(XLSM|XLSX|XLS)$/.test(r)) return 'presupuesto';
  if (r.includes('PROGRAMACION')) return 'programacion';
  if (r.includes('/ADJUNTOS/')) return 'adjuntos';
  if (/\.(WEBP|JPE?G|PNG)$/.test(r)) return 'fotos';
  return 'otros';
}
function archivos(dir) {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...archivos(p));
    else if (!/^(FICHA\.txt|ficha\.json)$/i.test(d.name)) out.push(p);
  }
  return out;
}

const proyectos = [];
if (fs.existsSync(BIBLIOTECA)) {
  for (const carpeta of fs.readdirSync(BIBLIOTECA, { withFileTypes: true }).filter((d) => d.isDirectory() && /^PROYECTO \d+/i.test(d.name)).map((d) => d.name)) {
    const dir = path.join(BIBLIOTECA, carpeta);
    const numero = Number(carpeta.match(/\d+/)[0]);
    let ficha = {};
    const json = path.join(dir, 'ficha.json');
    const txt = path.join(dir, 'FICHA.txt');
    if (fs.existsSync(json)) ficha = JSON.parse(fs.readFileSync(json, 'utf8'));
    else if (fs.existsSync(txt)) {
      const lineas = fs.readFileSync(txt, 'utf8').split(/\r?\n/);
      ficha.nombre = (lineas[0].split(':').slice(1).join(':') || carpeta).trim();
      for (const l of lineas.slice(1)) { const m = l.match(/^(Empresa|Área|Area|Precio[^:]*):\s*(.+)$/); if (m) ficha[m[1].replace('Á', 'A').split(' ')[0].toLowerCase()] = m[2].trim(); }
      ficha.tipo = ficha.tipo || 'Catálogo de casas prefabricadas';
    }
    proyectos.push({
      numero, carpeta: rel(dir), ficha,
      archivos: archivos(dir).map((p) => ({ nombre: path.basename(p), ruta: rel(p), seccion: seccion(rel(p)), kb: Math.round(fs.statSync(p).size / 1024) })),
    });
  }
}
proyectos.sort((a, b) => a.numero - b.numero);
fs.writeFileSync(path.join(RAIZ, 'assets', 'datos', 'biblioteca.js'), '// Generado por tools/generar_biblioteca.js — no editar a mano.\nwindow.BIBLIOTECA = ' + JSON.stringify({ generado: new Date().toISOString().slice(0, 10), proyectos }) + ';\n', 'utf8');
console.log('Biblioteca: ' + proyectos.length + ' proyectos -> assets/datos/biblioteca.js');
