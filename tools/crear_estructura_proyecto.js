// Crea en cada proyecto de pages/Cliente las carpetas de etapas y subetapas de la plantilla
// (pages/Cliente/Plantilla Modelo/ETAPAS OBRA). Solo crea carpetas que falten: no copia ni
// borra archivos. Para un proyecto nuevo: crear su carpeta en pages/Cliente y correr
//   node tools/crear_estructura_proyecto.js            (todos los proyectos)
//   node tools/crear_estructura_proyecto.js "VILLA KAREN"   (solo uno)
const fs = require('fs');
const path = require('path');

const CARPETA_PROYECTOS = path.resolve(__dirname, '..', 'pages', 'Cliente');
const ES_PLANTILLA = /plantilla/i;
const dirs = (c) => fs.readdirSync(c, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

const plantilla = dirs(CARPETA_PROYECTOS).find((n) => ES_PLANTILLA.test(n));
if (!plantilla) throw new Error('No existe la carpeta de plantilla en pages/Cliente');
const origen = path.join(CARPETA_PROYECTOS, plantilla, 'ETAPAS OBRA');
const estructura = dirs(origen).filter((n) => /^\d+_/.test(n)).map((etapa) => [etapa, dirs(path.join(origen, etapa))]);

const pedidos = process.argv.slice(2);
const proyectos = dirs(CARPETA_PROYECTOS).filter((n) => !ES_PLANTILLA.test(n) && !/^index/i.test(n) && (!pedidos.length || pedidos.includes(n)));
for (const proyecto of proyectos) {
  let creadas = 0;
  for (const [etapa, subetapas] of estructura) {
    for (const ruta of [path.join(etapa), ...subetapas.map((s) => path.join(etapa, s))]) {
      const destino = path.join(CARPETA_PROYECTOS, proyecto, 'ETAPAS OBRA', ruta);
      if (!fs.existsSync(destino)) { fs.mkdirSync(destino, { recursive: true }); creadas++; }
    }
  }
  console.log(`${proyecto}: ${creadas} carpetas creadas`);
}
