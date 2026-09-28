// Catalogo de planos: una carpeta "PROYECTO N" por cada casa prefabricada del inventario (con precio, area y foto),
// con la estructura de la carpeta modelo (pages/Catalogo de planos/PROYECTO 1):
//   FACHADA.<ext>   imagen de la fachada (la foto publicada por la empresa)
//   PLANO.<ext>     plano de planta, si la empresa lo publica (Concasaya y Modular por nombre de archivo; Woodpecker por su
//                   aspecto: dibujo de lineas sobre fondo blanco)
//   INTERIOR.<ext>  solo si la empresa publica una imagen interior identificable (ninguna la rotula: queda anotado en FICHA.txt)
//   PRESUPUESTO.xlsx formato "V1 Construmaster": hoja INICIO (ficha del proyecto) + 13 hojas de capitulo
//   FICHA.txt       datos y fuentes
// Fuente de las casas: assets/datos/prefabricadas.js (node tools/generar_prefabricadas.js).
//   node tools/generar_catalogo_planos.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ExcelJS = require('exceljs');
const { presupuestoModelo } = require('./presupuesto_modelo_v1');
const { obtener } = require('./scraper/lib/http');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'pages', 'Catalogo de planos');
const w = {}; new Function('window', fs.readFileSync(path.join(RAIZ, 'assets', 'datos', 'prefabricadas.js'), 'utf8'))(w);
const CAPITULOS = [
  ['OBRA NEGRA', '1. Preliminares'], ['OBRA NEGRA', '2. Estructura en concreto'], ['OBRA NEGRA', '3. Hidrosanitario'],
  ['OBRA GRIS', '4. Mampostería'], ['OBRA GRIS', '5. Pisos, pañetes, bordes y filos'],
  ['OBRA BLANCA', '6. Carpintería metálica'], ['OBRA BLANCA', '7. Vidrios y ventanas'], ['OBRA BLANCA', '8. Estucado y pintura de muros'],
  ['OBRA BLANCA', '9. Techo en drywall'], ['OBRA BLANCA', '10. Pisos y enchapes'], ['OBRA BLANCA', '11. Aparatos hidrosanitarios'],
  ['OBRA BLANCA', '12. Muebles de armario y cocina'], ['OBRA BLANCA', '13. Aseo y entrega'],
];
const CIUDAD = { Concasaya: 'Bogotá / Cundinamarca / Boyacá', Woodpecker: 'Bogotá', 'Modular Colombia': 'Bogotá / Medellín / Cali' };
const SISTEMA = { Concasaya: 'Prefabricado (paneles EPS / plaqueta)', Woodpecker: 'Casa kit (materiales compuestos WPC)', 'Modular Colombia': 'Estructura metálica modular' };
const log = (...m) => console.log(`[${new Date().toLocaleTimeString('es-CO')}]`, ...m);
const base = (m) => m.replace(/\s*-\s*(cimentacion en placa|sobre palafitos|obra gris|obra blanca|acabados full)\s*$/i, '').trim();

async function descargar(url, archivoSinExt) {
  if (!url) return '';
  const r = await obtener(url, { binario: true });
  if (!r.ok || !r.cuerpo || r.cuerpo.length < 2000) return '';
  const ext = (url.split('?')[0].match(/\.(webp|jpe?g|png)$/i) || ['', 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
  fs.writeFileSync(archivoSinExt + '.' + ext, r.cuerpo);
  return path.basename(archivoSinExt + '.' + ext);
}
async function existe(url) { const r = await obtener(url, { binario: true }); return r.ok && r.cuerpo && r.cuerpo.length > 2000 ? url : ''; }

// Woodpecker: el plano es la imagen de la ficha con aspecto de dibujo (fondo blanco, poca saturacion)
async function planoWoodpecker(urlFicha) {
  const r = await obtener(urlFicha); if (!r.ok) return '';
  const imgs = [...new Set([...r.cuerpo.matchAll(/https:\/\/woodpecker\.com\.co\/wp-content\/uploads\/[^"'\s)]+\.(?:png|jpe?g|webp)/gi)].map((m) => m[0]))]
    .filter((u) => !/-\d+x\d+\.|LOGO|logo|mapa|pdf-|vtnf|360|icono|phone/i.test(u));
  let mejor = null;
  for (const u of imgs) {
    const d = await obtener(u, { binario: true }); if (!d.ok || !d.cuerpo || d.cuerpo.length < 5000) continue;
    try {
      const st = await sharp(d.cuerpo).resize(200, 200, { fit: 'inside' }).stats();
      const [rr, gg, bb] = st.channels; const brillo = (rr.mean + gg.mean + bb.mean) / 3;
      const saturacion = Math.max(Math.abs(rr.mean - gg.mean), Math.abs(gg.mean - bb.mean), Math.abs(rr.mean - bb.mean));
      if (brillo > 215 && saturacion < 18 && (!mejor || d.cuerpo.length > mejor.n)) mejor = { u, n: d.cuerpo.length };
    } catch (e) { /* no es imagen legible */ }
  }
  return mejor ? mejor.u : '';
}
// Imagenes revisadas a mano que parecen plano pero no lo son (Vivienda 40 m2: 3D de la estructura metalica)
const NO_ES_PLANO = [/woodpecker\.com\.co\/casas-kit\/vivienda-40m2/];

async function presupuesto(archivo, p, variantes) {
  const libro = new ExcelJS.Workbook();
  const h = libro.addWorksheet('INICIO');
  const negrita = { bold: true };
  h.getColumn('B').width = 14; h.getColumn('C').width = 9; h.getColumn('D').width = 5; h.getColumn('E').width = 34;
  h.getColumn('I').width = 26; h.getColumn('L').width = 40;
  h.getCell('E2').value = 'CAPITULO'; h.getCell('E2').font = negrita;
  CAPITULOS.forEach(([obra, cap], i) => {
    const fila = 3 + i;
    if (i === 0 || CAPITULOS[i - 1][0] !== obra) { h.getCell('B' + fila).value = obra; h.getCell('B' + fila).font = negrita; }
    h.getCell('D' + fila).value = i + 1; h.getCell('E' + fila).value = cap.replace(/^\d+\.\s*/, '');
  });
  const ficha = [
    ['NOMBRE DEL PROYECTO', p.nombre], ['ID PROYECTO', p.id], ['EMPRESA', p.empresa], ['UBICACIÓN', CIUDAD[p.empresa] || ''],
    ['ÁREA CONSTRUIDA (m²)', p.area], ['SISTEMA CONSTRUCTIVO', SISTEMA[p.empresa] || ''], ['VALOR METRO CUADRADO', null], ['VALOR TOTAL', null],
    ['MATERIALES', ''], ['MANO DE OBRA', ''], ['FUENTE', p.url],
  ];
  ficha.forEach(([k, v], i) => { const f = 2 + i; h.getCell('I' + f).value = k; h.getCell('I' + f).font = negrita; if (v !== null) h.getCell('L' + f).value = v; });
  // Valor total = precio publicado de la opcion principal; valor m2 = valor total / area (formulas vivas)
  // Filas de la ficha: L6 area, L8 valor m2, L9 valor total (ver el arreglo "ficha")
  h.getCell('L9').value = p.precio; h.getCell('L9').numFmt = '"$" #,##0';
  h.getCell('L8').value = { formula: 'L9/L6' }; h.getCell('L8').numFmt = '"$" #,##0';
  h.getCell('I15').value = 'OPCIONES DE PRECIO PUBLICADAS'; h.getCell('I15').font = negrita;
  h.getCell('I16').value = 'Opción'; h.getCell('L16').value = 'Precio total'; h.getCell('M16').value = 'Precio m²';
  [h.getCell('I16'), h.getCell('L16'), h.getCell('M16')].forEach((c) => { c.font = negrita; });
  variantes.forEach((v, i) => {
    const f = 17 + i;
    h.getCell('I' + f).value = v.acabado || v.modelo; h.getCell('L' + f).value = v.precio; h.getCell('L' + f).numFmt = '"$" #,##0';
    h.getCell('M' + f).value = { formula: `L${f}/$L$6` }; h.getCell('M' + f).numFmt = '"$" #,##0';
  });
  h.getColumn('M').width = 16;
  const nota = 17 + variantes.length + 1;
  h.getCell('I' + nota).value = 'Precios publicados por la empresa (sitio web). Las hojas de capítulo quedan para diligenciar el presupuesto detallado.';
  h.getCell('I' + nota).font = { italic: true, color: { argb: 'FF7A7C73' } };
  // Hojas de capitulo con la estructura del modelo V1 Construmaster (CAP, REF, ITEM, SUB-ITEM, UNIDAD, CANT., X, MEDIDA, VALOR U., VALOR TOTAL)
  CAPITULOS.forEach(([, cap], i) => {
    const s = libro.addWorksheet(cap.slice(0, 31));
    const enc = ['CAP', 'REF', 'ITEM', 'SUB-ITEM', 'UNIDAD', 'CANT.', 'X', 'MEDIDA', 'VALOR U.', 'VALOR TOTAL'];
    enc.forEach((t, j) => { const c = s.getRow(3).getCell(2 + j); c.value = t; c.font = negrita; });
    s.getCell('B4').value = `${i + 1}.) ${cap.replace(/^\d+\.\s*/, '')}`;
    for (let k = 0; k < 10; k++) {
      const f = 4 + k; s.getCell('C' + f).value = `${i + 1}.${k + 1}`;
      s.getCell('K' + f).value = { formula: `IF(G${f}="","",G${f}*J${f})` }; s.getCell('K' + f).numFmt = '"$" #,##0'; s.getCell('J' + f).numFmt = '"$" #,##0';
    }
    s.getCell('J15').value = 'TOTAL'; s.getCell('J15').font = negrita;
    s.getCell('K15').value = { formula: 'SUM(K4:K13)' }; s.getCell('K15').numFmt = '"$" #,##0'; s.getCell('K15').font = negrita;
    [6, 10, 34, 26, 8, 8, 4, 8, 14, 16].forEach((wd, j) => { s.getColumn(2 + j).width = wd; });
  });
  await libro.xlsx.writeFile(archivo);
}

(async () => {
  const modelos = w.PREFABRICADAS.modelos.filter((m) => m.precioM2 && m.imagen);
  const grupos = new Map();
  modelos.forEach((m) => { const k = m.empresa + '|' + base(m.modelo); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(m); });
  const lista = [...grupos.values()].sort((a, b) => a[0].empresa.localeCompare(b[0].empresa) || a[0].area - b[0].area);
  log(`${lista.length} proyectos (de ${modelos.length} casas con precio, area y foto)`);
  // Las carpetas modelo solo traen marcadores vacios (0 bytes) que se reemplazan por los archivos reales
  const resumen = [];
  for (let i = 0; i < lista.length; i++) {
    const vs = lista[i].sort((a, b) => a.precio - b.precio); const p0 = vs[0];
    const dir = path.join(DESTINO, `PROYECTO ${i + 1}`); fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) { const r = path.join(dir, f); if (/\.docx$/i.test(f) && fs.statSync(r).size === 0) fs.unlinkSync(r); }
    const p = { id: i + 1, nombre: base(p0.modelo), empresa: p0.empresa, area: p0.area, precio: p0.precio, url: p0.url };
    const fachada = await descargar(p0.imagen, path.join(dir, 'FACHADA'));
    let urlPlano = vs.map((v) => v.plano).find(Boolean) || '';
    if (!urlPlano && p0.empresa === 'Modular Colombia' && /\.webp$/.test(p0.imagen)) urlPlano = await existe(p0.imagen.replace(/\.webp$/, '-plano.webp'));
    if (!urlPlano && p0.empresa === 'Woodpecker' && !NO_ES_PLANO.some((re) => re.test(p0.url))) urlPlano = await planoWoodpecker(p0.url);
    const plano = await descargar(urlPlano, path.join(dir, 'PLANO'));
    // Excel tal cual el modelo V1 Construmaster.xlsm, con la ficha INICIO de esta casa (tools/presupuesto_modelo_v1.js)
    const viejo = path.join(dir, 'PRESUPUESTO.xlsx'); if (fs.existsSync(viejo)) fs.unlinkSync(viejo);
    await presupuestoModelo(path.join(dir, 'PRESUPUESTO.xlsm'), { ...p, ubicacion: CIUDAD[p.empresa] || '', sistema: SISTEMA[p.empresa] || '' });
    fs.writeFileSync(path.join(dir, 'FICHA.txt'), [
      `PROYECTO ${i + 1}: ${p.nombre}`, `Empresa: ${p.empresa}`, `Área: ${p.area} m²`,
      ...vs.map((v) => `Precio ${v.acabado || ''}: $${v.precio.toLocaleString('es-CO')} (m²: $${v.precioM2.toLocaleString('es-CO')})`),
      `Ficha en el sitio: ${p.url}`, '',
      `FACHADA: ${fachada ? fachada + '  <- ' + p0.imagen : 'no disponible'}`,
      `PLANO: ${plano ? plano + '  <- ' + urlPlano : 'la empresa no publica plano de este modelo'}`,
      'INTERIOR: la empresa no publica una imagen interior identificable de este modelo',
      'PRESUPUESTO.xlsm: copia del modelo V1 Construmaster.xlsm (mismo formato, macros y 13 capítulos) con la ficha INICIO de esta casa: nombre, ID, ubicación, sistema constructivo, área construida, valor m² y valor total (= área x valor m²). Los capítulos conservan el contenido del modelo como referencia.',
    ].join('\r\n'), 'utf8');
    resumen.push([i + 1, p.empresa, p.nombre, p.area, p.precio, fachada ? 'si' : 'no', plano ? 'si' : 'no']);
    log(`PROYECTO ${i + 1}: ${p.empresa} · ${p.nombre} · fachada ${fachada ? 'si' : 'no'} · plano ${plano ? 'si' : 'no'}`);
  }
  // Indice del catalogo
  const libro = new ExcelJS.Workbook(); const h = libro.addWorksheet('Catalogo');
  h.columns = [['PROYECTO', 10], ['EMPRESA', 18], ['MODELO', 40], ['ÁREA m²', 9], ['PRECIO DESDE', 16], ['FACHADA', 9], ['PLANO', 8]].map(([header, width]) => ({ header, width }));
  resumen.forEach((r) => h.addRow(r)); h.getRow(1).font = { bold: true }; h.getColumn(5).numFmt = '"$" #,##0';
  await libro.xlsx.writeFile(path.join(DESTINO, 'INDICE_CATALOGO.xlsx'));
  log(`fin: ${resumen.length} proyectos, ${resumen.filter((r) => r[5] === 'si').length} con fachada, ${resumen.filter((r) => r[6] === 'si').length} con plano`);
})();
