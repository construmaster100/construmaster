// Departamentos y municipios de Colombia (DIVIPOLA, DANE) para los selectores del formulario de presupuesto (usuario.html).
// Fuente: datos.gov.co, conjunto gdxc-w37w (1.122 municipios y areas no municipalizadas, 33 departamentos incluido Bogota D.C.).
// Salida: assets/datos/municipios.js (window.MUNICIPIOS).
//   node tools/generar_municipios.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'assets', 'datos', 'municipios.js');
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el', 'en']);
const titulo = (s) => String(s).toLowerCase().split(/(\s+|-|\()/).map((p, i) => (i > 0 && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('')
  .replace(/\bD\.c\./i, 'D.C.');

(async () => {
  const r = await fetch('https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000');
  if (!r.ok) throw new Error('datos.gov.co respondio ' + r.status);
  const filas = await r.json();
  const dep = new Map();
  for (const f of filas) {
    if (!dep.has(f.cod_dpto)) dep.set(f.cod_dpto, { codigo: f.cod_dpto, nombre: titulo(f.dpto), lista: [] });
    // Coordenadas del municipio (para "Activar ubicacion": municipio mas cercano a la posicion del telefono)
    const num = (v) => Math.round(Number(String(v || '').replace(',', '.')) * 1e4) / 1e4;
    dep.get(f.cod_dpto).lista.push([titulo(f.nom_mpio), num(f.latitud), num(f.longitud)]);
  }
  const departamentos = [...dep.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  departamentos.forEach((d) => {
    d.lista.sort((a, b) => a[0].localeCompare(b[0], 'es'));
    d.municipios = d.lista.map((x) => x[0]); d.coords = d.lista.map((x) => [x[1], x[2]]); delete d.lista;
  });
  const datos = { fuente: 'DANE · DIVIPOLA (datos.gov.co, gdxc-w37w)', generado: new Date().toISOString().slice(0, 10), departamentos };
  fs.writeFileSync(DESTINO, '// Generado por tools/generar_municipios.js — no editar a mano.\nwindow.MUNICIPIOS = ' + JSON.stringify(datos) + ';\n', 'utf8');
  console.log(`Municipios: ${departamentos.length} departamentos, ${filas.length} municipios -> ${path.relative(RAIZ, DESTINO)}`);
})();
