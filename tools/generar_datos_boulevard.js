const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const lib = require('./lib_comun');

const ARCHIVO = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\docs\\Matriz\\Modelo Boulevard\\Anexo 2-3 BOULEVARD - Presupuesto y programación VF.xlsx';
const CARPETA_SALIDA = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\docs\\Matriz\\Modelo Boulevard\\js';

const ETAPA_POR_CAP = {
  1: 'negra', 2: 'negra', 3: 'negra',
  4: 'gris', 5: 'gris', 6: 'gris', 7: 'gris', 9: 'gris',
  8: 'blanca', 10: 'blanca', 11: 'blanca', 12: 'blanca', 13: 'blanca', 14: 'blanca', 15: 'blanca', 16: 'blanca', 17: 'blanca',
};

const ETAPAS = {
  negra: { nombre: 'Obra Negra', color: '#2b2d34' },
  gris: { nombre: 'Obra Gris', color: '#6b7280' },
  blanca: { nombre: 'Obra Blanca', color: '#c9a24b' },
};

async function main() {
  const wb = XLSX.readFile(ARCHIVO);
  const hoja = wb.Sheets['Presupuesto'];

  const capitulos = lib.parsearHojaPresupuestoUnica(hoja).map(c => ({ ...c, etapa: ETAPA_POR_CAP[c.n] || 'blanca' }));
  const camposCabecera = lib.extraerCamposProyecto(hoja, 1, 7);
  const camposPie = lib.extraerCamposProyecto(hoja, 190, 196);
  const proyecto = [...camposCabecera, ...camposPie];
  const imagenes = await lib.extraerImagenes(ARCHIVO);

  const datos = {
    modelo: 'ME',
    titulo: 'Modelo Estándar · Boulevard de los Sueños',
    archivoFuente: path.basename(ARCHIVO),
    etapas: ETAPAS,
    proyecto,
    capitulos,
    imagenes,
  };

  fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
  const salida = path.join(CARPETA_SALIDA, 'datos.js');
  fs.writeFileSync(salida, 'window.DATOS_BOULEVARD = ' + JSON.stringify(datos, null, 0) + ';\n', 'utf8');

  console.log('OK ->', salida);
  console.log('Capitulos:', capitulos.length, '| Proyecto campos:', proyecto.length, '| Imagenes:', imagenes.length);
  capitulos.forEach(c => console.log(`  ${c.n}. ${c.nombre} [${c.etapa}] -> ${c.filas.length} filas, subtotal=${c.subtotal}`));
}

main().catch(err => { console.error(err); process.exit(1); });
