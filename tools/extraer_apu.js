// Extrae el analisis de precios unitarios (APU) del documento Word de pages/Servicios y lo deja
// como JSON estructurado: capitulos > subcapitulos > actividades > insumos (equipo, mano de obra,
// materiales, transporte). Lo usan tools/generar_excel_apu.js y la pagina (pestaña Proyectos).
//   node tools/extraer_apu.js
//
// El Word esta maquetado con cuadros de texto, asi que el orden del XML no es el visual:
// - el encabezado (Capitulo / SubCap. / Actividad / U.M.) va en un cuadro de texto antes de las tablas,
//   repetido dos veces, y a veces la palabra "Actividad" cae en medio del nombre;
// - el titulo de cada grupo (Equipo, Mano de obra, Material, Transporte) va justo antes de su tabla;
// - el valor del "Costo Total Actividad" aparece ANTES de su etiqueta.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const RAIZ = path.resolve(__dirname, '..');
const CARPETA = path.join(RAIZ, 'pages', 'Servicios');
const DESTINO = path.join(CARPETA, 'apu.json');

const decodificar = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
// Formato del documento: coma de miles, punto decimal ("7,229.86").
const numero = (s) => { const t = String(s).replace(/,/g, '').trim(); if (!/^-?\d+(\.\d+)?$/.test(t)) return null; return Number(t); };
const limpiar = (s) => s.replace(/\s+/g, ' ').trim();

const GRUPOS = [
  [/^equipos?$/i, 'Equipo'], [/^mano de obra$/i, 'Mano de obra'], [/^materiale?s?$/i, 'Materiales'],
  [/^transportes?$/i, 'Transporte'], [/^otros$/i, 'Otros'],
];
const grupoDe = (t) => { const g = GRUPOS.find(([re]) => re.test(t)); return g ? g[1] : null; };

// Recorre el XML en orden y produce eventos: parrafos (con el cuadro de texto al que pertenecen) y tablas.
function eventos(xml) {
  const salida = [];
  const re = /<w:tbl>|<w:tbl\b[^>]*>|<\/w:tbl>|<w:tr\b[^>]*>|<\/w:tr>|<w:tc\b[^>]*>|<\/w:tc>|<w:txbxContent>|<\/w:txbxContent>|<\/w:p>|<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g;
  let nivelTabla = 0; let tabla = null; let fila = null; let celda = null; let parrafo = '';
  let cuadro = 0; let enCuadro = 0; let m;
  while ((m = re.exec(xml))) {
    const tag = m[0];
    if (tag === '<w:txbxContent>') { enCuadro++; cuadro++; continue; }
    if (tag === '</w:txbxContent>') { enCuadro--; continue; }
    if (tag.startsWith('<w:tbl') && tag !== '<w:tblPr>') { nivelTabla++; if (nivelTabla === 1) tabla = []; continue; }
    if (tag === '</w:tbl>') { nivelTabla--; if (nivelTabla === 0 && tabla) { salida.push({ tabla }); tabla = null; } continue; }
    if (nivelTabla > 0) {
      if (tag.startsWith('<w:tr')) { fila = []; continue; }
      if (tag === '</w:tr>') { if (fila && tabla) tabla.push(fila); fila = null; continue; }
      if (tag.startsWith('<w:tc')) { celda = ''; continue; }
      if (tag === '</w:tc>') { if (fila) fila.push(limpiar(celda || '')); celda = null; continue; }
      if (tag === '</w:p>') { if (celda !== null) celda += ' '; continue; }
      if (m[1] !== undefined && celda !== null) celda += decodificar(m[1]);
      continue;
    }
    if (tag === '</w:p>') { const t = limpiar(parrafo); if (t) salida.push({ p: t, cuadro: enCuadro ? cuadro : 0 }); parrafo = ''; continue; }
    if (tag === '<w:tab/>') { parrafo += ' '; continue; }
    if (m[1] !== undefined) parrafo += decodificar(m[1]);
  }
  return salida;
}

// Un parrafo del encabezado puede traer varias piezas juntas ("1.02 CIMENTACION SubCap. 1.02.01 ...").
function partirEncabezado(t) {
  return t.replace(/\s*(SubCap\.)/gi, '\n$1').replace(/\s*(Actividad\s*\d+\.\d+\.\d+)/gi, '\n$1').replace(/\s*(U\.M\.)/g, '\n$1')
    .split('\n').map(limpiar).filter(Boolean);
}

// Unidades que no dejan duda del grupo (hora hombre / jornal = mano de obra; % de M.O. = herramienta menor).
function grupoPorUnidad(descripcion, unidad) {
  if (/^(hh|jr|jornal)$/i.test(unidad)) return 'Mano de obra';
  if (unidad === '%' && /herramienta|equipo/i.test(descripcion)) return 'Equipo';
  return null;
}

function clasificar(descripcion, unidad) {
  if (/^hh$/i.test(unidad)) return 'Mano de obra';
  if (/herramienta|equipo/i.test(descripcion) || /^(hr|%|dia|día)$/i.test(unidad)) return 'Equipo';
  if (/transporte|acarreo|volqueta/i.test(descripcion) || /km/i.test(unidad)) return 'Transporte';
  return 'Materiales';
}

(async () => {
  const archivo = fs.readdirSync(CARPETA).find((n) => /\.docx$/i.test(n) && /ANALISIS-UNITARIO/i.test(n));
  if (!archivo) throw new Error('No se encontro el documento ANEXO-2 ... ANALISIS-UNITARIO .docx en pages/Servicios');
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(CARPETA, archivo)));
  const xml = await zip.file('word/document.xml').async('string');
  const lista = eventos(xml);

  const capitulos = new Map();
  const actividades = new Map();
  let capitulo = null; let subcap = null; let actual = null; let grupo = null;
  let unidadSuelta = '';       // unidad en su propio cuadro justo antes de un "U.M." solo (primer formato)
  let anterior = '';
  let nombreAbierto = null;    // actividad cuyo nombre sigue en el siguiente parrafo del mismo cuadro
  let ultimoNumero = null;     // el costo total aparece antes de la etiqueta

  for (const ev of lista) {
    if (ev.tabla) {
      nombreAbierto = null;
      const [enc, ...filas] = ev.tabla;
      if (!actual || !enc || !/descripci/i.test(enc[0] || '') || !enc.some((c) => /parcial/i.test(c))) continue;
      for (const f of filas) {
        if (f.length < 5 || !f[0]) continue;
        const unidad = f[1].replace(/\s+/g, '');
        const insumo = {
          grupo: grupoPorUnidad(f[0], unidad) || grupo || clasificar(f[0], unidad), descripcion: f[0], unidad,
          valorUnitario: numero(f[2]), cantidad: numero(f[3]), valorParcial: numero(f[4]),
        };
        // Cuando una actividad cruza de pagina el Word repite la misma tabla: se descarta la fila repetida.
        const clave = [insumo.descripcion, unidad, insumo.valorUnitario, insumo.cantidad, insumo.valorParcial].join('|');
        if (actual.claves.has(clave)) continue;
        actual.claves.add(clave);
        actual.insumos.push(insumo);
      }
      continue;
    }
    for (const t of partirEncabezado(ev.p)) {
      let m;
      if ((m = /^Cap[ií]tulo\s*([\d.]+)\s+(.+)$/i.exec(t))) {
        capitulo = m[1]; nombreAbierto = null;
        if (!capitulos.has(m[1])) capitulos.set(m[1], { codigo: m[1], nombre: m[2], subcapitulos: new Map() });
        continue;
      }
      if ((m = /^SubCap\.?\s*([\d.]+)\s+(.+)$/i.exec(t))) {
        subcap = m[1]; nombreAbierto = null;
        const c = capitulos.get(capitulo);
        if (c && !c.subcapitulos.has(m[1])) c.subcapitulos.set(m[1], { codigo: m[1], nombre: m[2] });
        continue;
      }
      // "Actividad 1.01.04 NOMBRE" o "1.01.03 NOMBRE No. Actividad 12 ..." (la etiqueta cae dentro del nombre)
      if ((m = /^(?:Actividad\s*)?(\d+\.\d+\.\d+)\s+(.+)$/i.exec(t)) && ev.cuadro) {
        const nombre = limpiar(m[2].replace(/\bActividad\b/gi, ''));
        if (!actividades.has(m[1])) {
          actividades.set(m[1], { codigo: m[1], nombre, unidad: unidadSuelta, capitulo: capitulo || '', subcapitulo: subcap || '', insumos: [], claves: new Set(), costoTotal: null });
          nombreAbierto = { act: actividades.get(m[1]), cuadro: ev.cuadro };
        } else {
          nombreAbierto = null;
        }
        actual = actividades.get(m[1]); grupo = null; unidadSuelta = '';
        continue;
      }
      if ((m = /^U\.M\.\s*(.*)$/.exec(t))) {
        nombreAbierto = null;
        if (m[1]) { if (actual) actual.unidad = m[1]; }
        else if (/^[A-Za-z0-9²³\/.-]{1,6}$/.test(anterior)) unidadSuelta = anterior;
        anterior = t;
        continue;
      }
      if (/^Costo Total Actividad$/i.test(t)) {
        if (actual && actual.costoTotal === null && ultimoNumero !== null) actual.costoTotal = ultimoNumero;
        continue;
      }
      const g = grupoDe(t);
      if (g) { grupo = g; nombreAbierto = null; continue; }
      if (numero(t) !== null) { ultimoNumero = numero(t); continue; }
      if (/^Departamento de/i.test(t) || /^Total\b/i.test(t) || t === '_') { nombreAbierto = null; continue; }
      if (nombreAbierto && ev.cuadro === nombreAbierto.cuadro) { nombreAbierto.act.nombre = limpiar(nombreAbierto.act.nombre + ' ' + t.replace(/\bActividad\b/gi, '')); anterior = t; continue; }
      anterior = t;
    }
  }

  // Cuando el primer formato pone la unidad en un cuadro previo al encabezado, se asigna a la actividad siguiente.
  const salida = {
    fuente: 'pages/Servicios/' + archivo,
    generado: new Date().toISOString().slice(0, 10),
    capitulos: [...capitulos.values()].map((c) => ({ codigo: c.codigo, nombre: c.nombre, subcapitulos: [...c.subcapitulos.values()] })),
    actividades: [...actividades.values()].map((a) => {
      const suma = Math.round(a.insumos.reduce((s, i) => s + (i.valorParcial || 0), 0) * 100) / 100;
      delete a.claves;
      return Object.assign(a, { costoTotal: a.costoTotal !== null ? a.costoTotal : suma, sumaInsumos: suma });
    }),
  };
  fs.writeFileSync(DESTINO, JSON.stringify(salida), 'utf8');
  const descuadre = salida.actividades.filter((a) => Math.abs(a.costoTotal - a.sumaInsumos) > Math.max(2, a.costoTotal * 0.01));
  console.log(`${salida.capitulos.length} capitulos, ${salida.actividades.length} actividades, ${salida.actividades.reduce((s, a) => s + a.insumos.length, 0)} insumos -> ${path.relative(RAIZ, DESTINO)}`);
  console.log(`Sin unidad: ${salida.actividades.filter((a) => !a.unidad).length}; sin insumos: ${salida.actividades.filter((a) => !a.insumos.length).length}; costo total distinto a la suma de insumos (>1%): ${descuadre.length}`);
  descuadre.slice(0, 6).forEach((a) => console.log(`  ${a.codigo} ${a.nombre}: total ${a.costoTotal} vs suma ${a.sumaInsumos}`));
})().catch((e) => { console.error(e); process.exit(1); });
