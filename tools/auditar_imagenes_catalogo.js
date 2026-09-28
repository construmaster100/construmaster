const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const fuentes = [
  { nombre: 'COMFER', archivo: 'pages/ESTADISTICAS/COMFER/js/datos.js', carpeta: 'pages/ESTADISTICAS/COMFER' },
  { nombre: 'Homecenter', archivo: 'pages/ESTADISTICAS/HOMECENTER/js/datos.js', carpeta: 'pages/ESTADISTICAS/HOMECENTER' },
  { nombre: 'Maestro', archivo: 'pages/materiales/js/datos_maestro.js', carpeta: '' },
];

for (const fuente of fuentes) {
  const contexto = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RAIZ, fuente.archivo), 'utf8'), contexto);
  const conjunto = fuente.nombre === 'COMFER'
    ? contexto.window.DATOS_COMFER.productos
    : fuente.nombre === 'Homecenter'
      ? contexto.window.DATOS_HOMECENTER.productos
      : contexto.window.DATOS_MAESTRO_MATERIALES.productos;
  let locales = 0;
  let remotas = 0;
  let ausentes = 0;
  const faltantes = [];

  for (const producto of conjunto) {
    const imagen = Array.isArray(producto) ? producto[4] : producto.imagen;
    const nombre = Array.isArray(producto) ? producto[0] : producto.nombre;
    if (!imagen) continue;
    if (/^https?:\/\//i.test(imagen)) {
      remotas += 1;
      continue;
    }
    const ruta = path.resolve(RAIZ, fuente.carpeta, imagen);
    if (ruta.startsWith(RAIZ + path.sep) && fs.existsSync(ruta)) locales += 1;
    else {
      ausentes += 1;
      if (faltantes.length < 8) faltantes.push({ producto: nombre, imagen });
    }
  }
  console.log(JSON.stringify({ fuente: fuente.nombre, productos: conjunto.length, locales, remotas, ausentes, ejemplosFaltantes: faltantes }));
}
