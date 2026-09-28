// Copia el Excel modelo "V1 Construmaster.xlsm" (pages/administrador/Matriz/Modelo Construmaster) TAL CUAL
// (formato, macros, 13 hojas de capitulo, esquemas) y solo cambia los datos de la ficha de la hoja INICIO:
//   L2 nombre del proyecto · L3 id · L4 ubicacion · L5 area lote (vacia: no se conoce) · L6 matricula y L7 cedula (vacias)
//   L8 sistema constructivo · L10 valor metro cuadrado · I15/L15 area construida (el modelo calcula L9 = L15*L10 = valor total)
// Se edita el XML de la hoja dentro del archivo (JSZip), sin reescribir el libro, para no perder nada del modelo.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const RAIZ = path.resolve(__dirname, '..');
const MODELO = path.join(RAIZ, 'pages', 'administrador', 'Matriz', 'Modelo Construmaster', 'V1 Construmaster.xlsm');

const xmlTexto = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Reemplaza el contenido de una celda existente conservando su estilo (atributo s)
function celda(xml, ref, valor) {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(/>|>[\\s\\S]*?</c>)`);
  const m = xml.match(re); if (!m) throw new Error('No existe la celda ' + ref + ' en INICIO');
  const estilo = (m[1].match(/\ss="\d+"/) || [''])[0];
  let nuevo;
  if (valor === null || valor === '') nuevo = `<c r="${ref}"${estilo}/>`;
  else if (typeof valor === 'number') nuevo = `<c r="${ref}"${estilo}><v>${valor}</v></c>`;
  else if (valor && valor.formula) nuevo = `<c r="${ref}"${estilo}><f>${valor.formula}</f><v>${valor.v}</v></c>`;
  else nuevo = `<c r="${ref}"${estilo} t="inlineStr"><is><t>${xmlTexto(valor)}</t></is></c>`;
  return xml.replace(re, nuevo);
}

// modelo (opcional): otra copia del V1 (p. ej. la plantilla de la Biblioteca de proyectos)
async function presupuestoModelo(destino, p, modelo) {
  const zip = await JSZip.loadAsync(fs.readFileSync(modelo || MODELO));
  const hoja = 'xl/worksheets/sheet1.xml';
  let x = await zip.file(hoja).async('string');
  const valorM2 = p.area ? p.precio / p.area : 0; // sin redondear: asi L9 = L15*L10 da exactamente el precio publicado
  x = celda(x, 'L2', p.nombre);
  x = celda(x, 'L3', p.id);
  x = celda(x, 'L4', p.ubicacion);
  x = celda(x, 'L5', '');
  x = celda(x, 'L6', '');
  x = celda(x, 'L7', '');
  x = celda(x, 'L8', p.sistema);
  x = celda(x, 'L10', valorM2);
  x = celda(x, 'I15', 'ÁREA CONSTRUIDA (m²)');
  x = celda(x, 'L15', p.area);
  x = celda(x, 'L9', { formula: 'L15*L10', v: p.precio });
  zip.file(hoja, x);
  // Recalcular al abrir (el valor total depende de L15 y L10)
  let wb = await zip.file('xl/workbook.xml').async('string');
  wb = wb.replace(/<calcPr([^>]*?)\/>/, (m, a) => (/fullCalcOnLoad/.test(a) ? m : `<calcPr${a} fullCalcOnLoad="1"/>`));
  zip.file('xl/workbook.xml', wb);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(destino, buf);
}

module.exports = { presupuestoModelo, MODELO };
