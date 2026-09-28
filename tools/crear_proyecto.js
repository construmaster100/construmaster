// Paso "CREAR" de la Biblioteca de proyectos (sin servidor): el formulario "Crear proyecto" de la pestana Diseno
// descarga un archivo "PROYECTO N.json"; este script crea la carpeta del proyecto con la estructura de _PLANTILLA
// y el V1 Construmaster con la ficha INICIO diligenciada.
//   node tools/crear_proyecto.js "C:/Users/<usuario>/Downloads/PROYECTO 34.json"
// Luego: node tools/generar_biblioteca.js (para que aparezca en el index).
const fs = require('fs');
const path = require('path');
const { presupuestoModelo } = require('./presupuesto_modelo_v1');

const RAIZ = path.resolve(__dirname, '..');
const BIBLIOTECA = path.join(RAIZ, 'pages', 'Biblioteca de proyectos');
const PLANTILLA = path.join(BIBLIOTECA, '_PLANTILLA');

function copiarCarpetas(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const d of fs.readdirSync(origen, { withFileTypes: true })) if (d.isDirectory()) copiarCarpetas(path.join(origen, d.name), path.join(destino, d.name));
}

(async () => {
  const archivo = process.argv[2];
  if (!archivo) throw new Error('Uso: node tools/crear_proyecto.js "<ruta del PROYECTO N.json>"');
  const ficha = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const destino = path.join(BIBLIOTECA, 'PROYECTO ' + ficha.numero);
  if (fs.existsSync(destino)) throw new Error('Ya existe ' + destino + ': no se sobrescribe');
  copiarCarpetas(PLANTILLA, destino);
  fs.writeFileSync(path.join(destino, 'ficha.json'), JSON.stringify(ficha, null, 2), 'utf8');
  fs.writeFileSync(path.join(destino, 'PROGRAMACION.txt'), '# Programacion de obra: fecha de inicio y fin de cada etapa (AAAA-MM-DD a AAAA-MM-DD)\n', 'utf8');
  // V1 Construmaster con la ficha INICIO (sin valor m2 hasta tener presupuesto: valor 0)
  await presupuestoModelo(path.join(destino, 'PRESUPUESTO', 'V1 Construmaster.xlsm'), {
    nombre: ficha.nombre, id: 'PROYECTO ' + ficha.numero,
    ubicacion: [ficha.municipio, ficha.departamento, ficha.zona].filter(Boolean).join(', '),
    sistema: ficha.tipo, area: Number(ficha.area) || 0, precio: 0,
  }, path.join(PLANTILLA, 'PRESUPUESTO', 'V1 Construmaster.xlsm'));
  console.log('Creado: ' + path.relative(RAIZ, destino));
})().catch((e) => { console.error(e.message); process.exit(1); });
