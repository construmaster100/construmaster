const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const RAIZ = 'D:\\Modelo de Presupuesto\\Presupuesto de obra';

function cargar(rel, nombreVar) {
  const codigo = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(new RegExp('^window\\.' + nombreVar + '\\s*=\\s*'), 'var datos = ');
  const sandbox = {};
  new Function('window', codigo + '\nwindow.' + nombreVar + ' = datos;')(sandbox);
  return sandbox[nombreVar];
}

const ME = cargar('docs\\Matriz\\Modelo Construmaster\\js\\datos.js', 'DATOS_CONSTRUMASTER');
const COMFER = cargar('pages\\catalogo comfer\\js\\datos.js', 'DATOS_COMFER');
const HOMECENTER = cargar('pages\\catalogo homecenter\\js\\datos.js', 'DATOS_HOMECENTER');

const todos = [];
(ME.materiales || []).forEach(m => todos.push({ categoria: (m.etiquetas || [])[0] || 'General', subcategoria: '', precio: m.precio }));
(COMFER.productos || []).forEach(p => todos.push({ categoria: p.categoria || 'General', subcategoria: p.subcategoria || '', precio: p.precio }));
(HOMECENTER.productos || []).forEach(p => todos.push({ categoria: p.categoria || 'General', subcategoria: p.subcategoria || '', precio: p.precio }));

// "Servicios" = suministro e instalacion por categoria de materiales; no incluye Herramientas (tiene su propia pestana/catalogo)
const grupos = {};
todos.forEach(m => {
  if (!m.precio) return;
  if (/herramient/i.test(m.categoria) || /herramient/i.test(m.subcategoria)) return;
  if (!grupos[m.categoria]) grupos[m.categoria] = { n: 0, suma: 0, min: Infinity, max: -Infinity };
  const g = grupos[m.categoria];
  g.n++; g.suma += m.precio;
  if (m.precio < g.min) g.min = m.precio;
  if (m.precio > g.max) g.max = m.precio;
});

const filas = Object.keys(grupos)
  .map(categoria => {
    const g = grupos[categoria];
    return {
      'SERVICIO (SUMINISTRO E INSTALACIÓN)': categoria,
      'MATERIALES DISPONIBLES': g.n,
      'PRECIO MÍNIMO MATERIAL': g.min,
      'PRECIO PROMEDIO MATERIAL': Math.round(g.suma / g.n),
      'PRECIO MÁXIMO MATERIAL': g.max,
      'MANO DE OBRA': 'No incluida — cotizar aparte',
    };
  })
  .sort((a, b) => b['MATERIALES DISPONIBLES'] - a['MATERIALES DISPONIBLES']);

const ws = XLSX.utils.json_to_sheet(filas);
ws['!cols'] = [{ wch: 34 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 26 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
const destino = path.join(RAIZ, 'docs\\Servicios\\servicios.xlsx');
XLSX.writeFile(wb, destino);
console.log('OK ->', destino, '(' + filas.length + ' servicios)');
