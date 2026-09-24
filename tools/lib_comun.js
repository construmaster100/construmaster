const XLSX = require('xlsx');
const JSZip = require('jszip');
const fs = require('fs');

function normalizar(txt) {
  return String(txt == null ? '' : txt)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ETIQUETAS_COLUMNA = {
  cap: ['cap'], ref: ['ref'], item: ['item'], subitem: ['sub-item', 'subitem'], unidad: ['unidad'],
  cant: ['cant.', 'cant', 'und total', 'cant. total'], valorU: ['valor u.', 'valor u', 'valor unitario'], valorTotal: ['valor total'],
};

function encontrarColumnas(filaEncabezado) {
  const mapa = {};
  filaEncabezado.forEach((celda, idx) => {
    const norm = normalizar(celda);
    Object.keys(ETIQUETAS_COLUMNA).forEach(campo => {
      if (ETIQUETAS_COLUMNA[campo].indexOf(norm) !== -1) mapa[campo] = idx;
    });
  });
  return mapa;
}

function esFilaVacia(fila) {
  return !fila || fila.every(c => c === undefined || c === null || String(c).trim() === '');
}

// ---- Parser formato "una sola hoja, varios capitulos por filas" (BOULEVARD) ----
function parsearHojaPresupuestoUnica(sheet) {
  const filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const capitulos = {};
  let columnas = null;
  let capActual = null;

  for (let i = 0; i < filas2d.length; i++) {
    const fila = filas2d[i];
    const candidato = encontrarColumnas(fila);
    if (candidato.ref !== undefined && candidato.item !== undefined && candidato.valorTotal !== undefined && candidato.cap !== undefined) {
      columnas = candidato;
      continue;
    }
    if (!columnas) continue;
    if (esFilaVacia(fila)) continue;

    const normValorU = normalizar(fila[columnas.valorU]);
    if (normValorU === 'sub-total' || normValorU === 'subtotal') continue;

    const normCant = normalizar(fila[columnas.cant]);
    if (normCant === 'sub-total' || normCant === 'subtotal' || normCant === 'total') { capActual = null; continue; }

    const celdaCap = fila[columnas.cap];
    if (celdaCap && String(celdaCap).trim() !== '') {
      const m = /^(\d+)/.exec(String(celdaCap).trim());
      if (m) {
        const n = Number(m[1]);
        const nombre = String(celdaCap).replace(/^\d+\.?\)?\s*/, '').replace(/\s+/g, ' ').trim();
        capActual = n;
        if (!capitulos[n]) capitulos[n] = { n, nombre, filas: [], subtotal: 0 };
      }
    }
    if (!capActual || !capitulos[capActual]) continue;

    const valorTotal = fila[columnas.valorTotal];
    const valorU = columnas.valorU !== undefined ? fila[columnas.valorU] : '';
    const ref = fila[columnas.ref];
    const item = fila[columnas.item];
    const subitem = columnas.subitem !== undefined ? fila[columnas.subitem] : '';
    if (!ref && !item && !subitem && (valorTotal === '' || valorTotal === undefined)) continue;

    capitulos[capActual].filas.push({
      ref, item, subitem,
      unidad: columnas.unidad !== undefined ? fila[columnas.unidad] : '',
      cant: columnas.cant !== undefined ? fila[columnas.cant] : '',
      valorU: valorU !== '' && !isNaN(Number(valorU)) ? Number(valorU) : null,
      valorTotal: valorTotal !== '' && !isNaN(Number(valorTotal)) ? Number(valorTotal) : null,
    });
    if (valorTotal !== '' && !isNaN(Number(valorTotal))) capitulos[capActual].subtotal += Number(valorTotal);
  }
  return Object.values(capitulos).sort((a, b) => a.n - b.n);
}

// ---- Parser formato "una hoja por capitulo" (V1 Construmaster) ----
function parsearHojaCapitulo(sheet) {
  const filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  let indiceEncabezado = -1, columnas = null;
  for (let i = 0; i < filas2d.length; i++) {
    const candidato = encontrarColumnas(filas2d[i]);
    if (candidato.ref !== undefined && candidato.item !== undefined && candidato.valorTotal !== undefined) {
      indiceEncabezado = i; columnas = candidato; break;
    }
  }
  if (indiceEncabezado === -1) return { filas: [], subtotal: 0 };

  const filas = [];
  let subtotal = 0;
  for (let r = indiceEncabezado + 1; r < filas2d.length; r++) {
    const fila = filas2d[r];
    if (esFilaVacia(fila)) continue;
    const normValorU = normalizar(fila[columnas.valorU]);
    const normCant = normalizar(fila[columnas.cant]);
    const primerCelda = normalizar(fila[0]);
    if (normValorU === 'sub-total' || normValorU === 'subtotal' || normCant === 'sub-total' ||
        normCant === 'subtotal' || primerCelda === 'sub-total') {
      const vt = fila[columnas.valorTotal];
      if (vt !== '' && !isNaN(Number(vt)) && subtotal === 0) subtotal = Number(vt);
      break;
    }
    const valorTotal = fila[columnas.valorTotal];
    const valorU = columnas.valorU !== undefined ? fila[columnas.valorU] : '';
    const ref = fila[columnas.ref];
    const item = fila[columnas.item];
    const subitem = columnas.subitem !== undefined ? fila[columnas.subitem] : '';
    if (!ref && !item && !subitem && (valorTotal === '' || valorTotal === undefined)) continue;
    filas.push({
      ref, item, subitem,
      unidad: columnas.unidad !== undefined ? fila[columnas.unidad] : '',
      cant: columnas.cant !== undefined ? fila[columnas.cant] : '',
      valorU: valorU !== '' && !isNaN(Number(valorU)) ? Number(valorU) : null,
      valorTotal: valorTotal !== '' && !isNaN(Number(valorTotal)) ? Number(valorTotal) : null,
    });
    if (valorTotal !== '' && !isNaN(Number(valorTotal))) subtotal += Number(valorTotal);
  }
  return { filas, subtotal };
}

// ---- Info de proyecto generica (label: value / label value) ----
function extraerCamposProyecto(sheet, filaInicio, filaFin, columnaMinima, columnaMaxima) {
  const filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const campos = [];
  const fin = Math.min(filaFin, filas2d.length);
  const colMin = columnaMinima || 0;
  const colMax = columnaMaxima || Infinity;
  for (let r = filaInicio; r < fin; r++) {
    const fila = filas2d[r];
    if (!fila) continue;
    for (let c = colMin; c < fila.length && c <= colMax; c++) {
      let texto = fila[c];
      if (texto === '' || texto === undefined || texto === null) continue;
      if (typeof texto === 'number') continue;
      texto = String(texto).trim();
      if (!texto) continue;
      const esEtiqueta = texto.endsWith(':') || /^[A-ZÁÉÍÓÚÑ0-9 .%()]+$/.test(texto);
      if (!esEtiqueta) continue;
      let valor, idxValor = -1;
      for (let v = c + 1; v < fila.length && v <= colMax; v++) {
        if (fila[v] !== '' && fila[v] !== undefined && fila[v] !== null) { valor = fila[v]; idxValor = v; break; }
      }
      if (valor === undefined) continue;
      const etiqueta = texto.replace(/:$/, '').trim();
      if (normalizar(etiqueta) === 'fecha' && typeof valor === 'number') {
        try { valor = XLSX.SSF.format('dd/mm/yyyy', valor); } catch (e) {}
      }
      campos.push({ etiqueta, valor });
      c = idxValor; // evitar reprocesar la celda de valor como si fuera otra etiqueta
    }
  }
  return campos;
}

// ---- Imagenes incrustadas (xl/media) ----
async function extraerImagenes(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const archivos = Object.keys(zip.files).filter(r => /^xl\/media\//i.test(r) && !zip.files[r].dir);
  const resultado = [];
  for (const ruta of archivos) {
    const b64 = await zip.files[ruta].async('base64');
    const ext = (/\.([a-zA-Z0-9]+)$/.exec(ruta) || [, 'png'])[1].toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    resultado.push({ nombre: ruta.split('/').pop(), dataUrl: `data:image/${mime};base64,${b64}` });
  }
  return resultado;
}

// ---- Etiquetas automaticas para materiales (categoria/producto, color, marca) ----
const VOCAB_CATEGORIA = [
  'PORCELANATO', 'MOSAICO', 'PISO', 'PARED', 'BALDOSA', 'BRICK', 'GRES',
  'SANITARIO', 'LAVAMANOS', 'LAVAPLATOS', 'LAVADERO', 'DUCHA', 'GRIFERIA', 'MONOCONTROL', 'LLAVE', 'REGISTRO',
  'SIFON', 'REJILLA', 'DESAGUE', 'ACOPLE', 'TEE', 'CODO', 'TUBO', 'TUBERIA', 'CONDUIT', 'MANGUERA',
  'CPVC', 'PVC', 'GUARDAESCOBA', 'BOQUILLA', 'PEGACOR', 'PEGANTE', 'PEGAMASTER', 'ADHESIVO',
  'LIMPIADOR', 'DESINFECTANTE', 'ESTUCO', 'TEXTUCO', 'MASTIC', 'PINTURA', 'BROCHA', 'RODILLO',
  'FLEJE', 'VARILLA', 'MALLA', 'CEMENTO', 'CONCRETO', 'ARENA', 'LADRILLO', 'BLOQUE', 'TEJA', 'PERFIL',
  'MUEBLE', 'CLOSET', 'ARMARIO', 'BARRA', 'DIVISION', 'ESPEJO', 'ACCESORIOS',
  'CALENTADOR', 'TANQUE', 'BOMBA', 'CABLE', 'INTERRUPTOR', 'TOMACORRIENTE', 'LAMPARA', 'BOMBILLO',
];
const VOCAB_COLOR = [
  'BLANCO', 'NEGRO', 'GRIS', 'BEIGE', 'CAFE', 'AZUL', 'VERDE', 'ROJO', 'AMARILLO', 'MARFIL',
  'CROMO', 'MATE', 'GREY', 'BLACK', 'CELESTE', 'CARAMELO', 'DORADO', 'PLATA',
];
const VOCAB_MARCA = [
  'CORONA', 'ALFA', 'GERFOR', 'STRETTO', 'PEGAMASTER', 'KLIPEN', 'XYLON', 'INTRAPLAS',
  'CONCOLOR', 'DALAMO', 'VESSEL', 'KORAL',
];

function etiquetasMaterial(nombre) {
  const norm = normalizar(nombre).toUpperCase();
  const palabras = new Set(norm.split(/[^A-ZÁÉÍÓÚÑ0-9]+/).filter(Boolean));
  const etiquetas = [];
  VOCAB_CATEGORIA.forEach(p => { if (palabras.has(p) && etiquetas.indexOf(p) === -1) etiquetas.push(p); });
  VOCAB_COLOR.forEach(p => { if (palabras.has(p) && etiquetas.indexOf(p) === -1) etiquetas.push(p); });
  VOCAB_MARCA.forEach(p => { if (palabras.has(p) && etiquetas.indexOf(p) === -1) etiquetas.push(p); });
  if (!etiquetas.length) etiquetas.push('OTROS');
  return etiquetas;
}

function extraerMateriales(sheet) {
  const filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const materiales = [];
  filas2d.forEach(fila => {
    const nombre = fila[0];
    const precio = fila[1];
    if (!nombre || typeof nombre !== 'string') return;
    if (normalizar(nombre) === 'nombre') return; // fila de encabezado
    materiales.push({
      nombre: String(nombre).trim(),
      precio: precio !== '' && !isNaN(Number(precio)) ? Number(precio) : null,
      etiquetas: etiquetasMaterial(nombre),
    });
  });
  return materiales;
}

module.exports = {
  normalizar, encontrarColumnas, esFilaVacia,
  parsearHojaPresupuestoUnica, parsearHojaCapitulo, extraerCamposProyecto, extraerImagenes, extraerMateriales,
};
