const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const lib = require('./lib_comun');

const ARCHIVO = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\docs\\Matriz\\Modelo Construmaster\\V1 Construmaster.xlsm';
const CARPETA_SALIDA = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\docs\\Matriz\\Modelo Construmaster\\js';

const NOMBRE_POR_CAP = {
  1: 'Preliminares', 2: 'Estructura en concreto', 3: 'Hidrosanitario', 4: 'Mampostería',
  5: 'Pañetes, bordes y filos', 6: 'Carpintería Metálica', 7: 'Vidrios y ventanas',
  8: 'Estucado y pintura de muros', 9: 'Techo en drywall', 10: 'Pisos y enchapes',
  11: 'Aparatos hidrosanitarios', 12: 'Muebles de armario y cocina', 13: 'Aseo y entrega',
};
const ETAPA_POR_CAP = {
  1: 'negra', 2: 'negra', 3: 'negra',
  4: 'gris', 5: 'gris',
  6: 'blanca', 7: 'blanca', 8: 'blanca', 9: 'blanca', 10: 'blanca', 11: 'blanca', 12: 'blanca', 13: 'blanca',
};
const ETAPAS = {
  negra: { nombre: 'Obra Negra', color: '#2b2d34' },
  gris: { nombre: 'Obra Gris', color: '#6b7280' },
  blanca: { nombre: 'Obra Blanca', color: '#c9a24b' },
};

async function main() {
  const wb = XLSX.readFile(ARCHIVO);

  const capitulos = [];
  wb.SheetNames.forEach(nombreHoja => {
    const m = /^(\d+)/.exec(nombreHoja.trim());
    if (!m) return;
    const n = Number(m[1]);
    if (!NOMBRE_POR_CAP[n]) return;
    const resultado = lib.parsearHojaCapitulo(wb.Sheets[nombreHoja]);
    capitulos.push({ n, nombre: NOMBRE_POR_CAP[n], etapa: ETAPA_POR_CAP[n], hoja: nombreHoja, filas: resultado.filas, subtotal: resultado.subtotal });
  });
  capitulos.sort((a, b) => a.n - b.n);

  const proyecto = lib.extraerCamposProyecto(wb.Sheets['INICIO'], 0, 16, 7, 11);
  const materiales = lib.extraerMateriales(wb.Sheets['COMFER']);
  const imagenes = await lib.extraerImagenes(ARCHIVO);

  const datos = {
    modelo: 'MO',
    titulo: 'V1 Construmaster',
    archivoFuente: path.basename(ARCHIVO),
    etapas: ETAPAS,
    proyecto,
    capitulos,
    imagenes,
    materiales,
  };

  fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
  const salida = path.join(CARPETA_SALIDA, 'datos.js');
  fs.writeFileSync(salida, 'window.DATOS_CONSTRUMASTER = ' + JSON.stringify(datos, null, 0) + ';\n', 'utf8');

  console.log('OK ->', salida);
  console.log('Capitulos:', capitulos.length, '| Proyecto campos:', proyecto.length, '| Imagenes:', imagenes.length, '| Materiales:', materiales.length);
  capitulos.forEach(c => console.log(`  ${c.n}. ${c.nombre} [${c.etapa}] (hoja "${c.hoja}") -> ${c.filas.length} filas, subtotal=${c.subtotal}`));
}

main().catch(err => { console.error(err); process.exit(1); });
