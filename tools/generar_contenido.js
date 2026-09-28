// Genera assets/datos/contenido.js y las copias web optimizadas (WebP) de las imagenes que se
// sueltan en las carpetas de los proyectos. Cada proyecto trabaja por etapas, con la misma
// estructura de carpetas de la plantilla: pages/Cliente/Plantilla Modelo/ETAPAS OBRA.
//   1. Copiar imagenes (.jpg/.png/.webp) en la carpeta que corresponda:
//      - pages/Cliente/<Proyecto>/ETAPAS OBRA/<NN_ETAPA>/[<NN_Subetapa>/] -> slide vertical de esa etapa
//      - pages/Cliente/<Proyecto>/img/slide secuencial/   -> recorrido general del proyecto (orden = nombre de archivo)
//      - pages/Cliente/<Proyecto>/img/<otra carpeta>/     -> galeria del proyecto
//      - pages/Cliente/<Proyecto>/info.txt                -> datos del proyecto, lineas "clave: valor"
//      - pages/Cliente/Plantilla Modelo/ETAPAS OBRA/...   -> imagenes de referencia de la etapa (pestaña Presupuesto)
//      - img/contenido/diseno/                              -> galeria de la pestaña Diseno
//   2. Correr:  node tools/generar_contenido.js
// Para crear en un proyecto nuevo las carpetas de etapas: node tools/crear_estructura_proyecto.js
// Las carpetas cuyo nombre contiene "textur" (texturas de modelos 3D) se ignoran.
// Solo se reprocesan las imagenes nuevas o modificadas.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.resolve(__dirname, '..');
const SALIDA_IMG = path.join(RAIZ, 'assets', 'contenido');
const DESTINO = path.join(RAIZ, 'assets', 'datos', 'contenido.js');
const EXT = /\.(jpe?g|png|webp)$/i;
const ANCHO_GRANDE = 1600;
const ANCHO_MINI = 480;

function slug(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function relativa(ruta) { return path.relative(RAIZ, ruta).split(path.sep).join('/'); }
const ordenNatural = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

function listarImagenes(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  const salida = [];
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true }).sort((a, b) => ordenNatural(a.name, b.name))) {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) { if (!/textur|auto-save/i.test(e.name)) salida.push(...listarImagenes(ruta)); }
    else if (EXT.test(e.name)) salida.push(ruta);
  }
  return salida;
}

function titulo(archivo) {
  return path.basename(archivo, path.extname(archivo)).replace(/^\d+[._ -]*/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || path.basename(archivo, path.extname(archivo));
}

async function optimizar(origen, carpetaDestino) {
  fs.mkdirSync(carpetaDestino, { recursive: true });
  const base = slug(path.basename(origen, path.extname(origen))) || 'imagen';
  const grande = path.join(carpetaDestino, base + '.webp');
  const mini = path.join(carpetaDestino, base + '-mini.webp');
  const mtime = fs.statSync(origen).mtimeMs;
  const vigente = (f) => fs.existsSync(f) && fs.statSync(f).mtimeMs >= mtime;
  if (!vigente(grande)) await sharp(origen).rotate().resize({ width: ANCHO_GRANDE, withoutEnlargement: true }).webp({ quality: 80 }).toFile(grande);
  if (!vigente(mini)) await sharp(origen).rotate().resize({ width: ANCHO_MINI, withoutEnlargement: true }).webp({ quality: 72 }).toFile(mini);
  const meta = await sharp(grande).metadata();
  return { src: relativa(grande), mini: relativa(mini), titulo: titulo(origen), ancho: meta.width, alto: meta.height, original: relativa(origen) };
}

function leerInfo(archivo) {
  const info = {};
  if (!fs.existsSync(archivo)) return info;
  fs.readFileSync(archivo, 'utf8').split(/\r?\n/).forEach((linea) => {
    const m = /^\s*([^:#]+?)\s*:\s*(.+?)\s*$/.exec(linea);
    if (m) info[slug(m[1]).replace(/-/g, '')] = m[2];
  });
  return info;
}

async function procesarLista(archivos, destino) {
  const salida = [];
  for (const a of archivos) salida.push(await optimizar(a, destino));
  return salida;
}

const CARPETA_PROYECTOS = path.join(RAIZ, 'pages', 'Cliente');
const ES_PLANTILLA = /plantilla/i;
// pages/Cliente tambien guarda la pagina del cliente (carpeta "index d cliente"): no es una obra
const NO_ES_OBRA = /^index/i;

function subcarpetas(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort(ordenNatural);
}

// Imagenes por etapa y subetapa de una carpeta "ETAPAS OBRA".
async function procesarEtapas(carpetaEtapas, destinoBase) {
  const etapas = {};
  for (const etapa of subcarpetas(carpetaEtapas).filter((n) => /^\d+_/.test(n))) {
    const carpetaEtapa = path.join(carpetaEtapas, etapa);
    const directas = fs.readdirSync(carpetaEtapa).filter((n) => EXT.test(n)).sort(ordenNatural).map((n) => path.join(carpetaEtapa, n));
    const info = { imagenes: await procesarLista(directas, path.join(destinoBase, slug(etapa))), subetapas: {} };
    for (const sub of subcarpetas(carpetaEtapa)) {
      const imgs = await procesarLista(listarImagenes(path.join(carpetaEtapa, sub)), path.join(destinoBase, slug(etapa), slug(sub)));
      if (imgs.length) info.subetapas[sub] = imgs;
    }
    if (info.imagenes.length || Object.keys(info.subetapas).length) etapas[etapa] = info;
  }
  return etapas;
}

(async () => {
  const contenido = { generado: new Date().toISOString().slice(0, 10), plantilla: [], proyectos: [], etapas: {}, diseno: [] };
  const carpetasProyectos = subcarpetas(CARPETA_PROYECTOS).filter((n) => !NO_ES_OBRA.test(n));

  // ---- Plantilla: estructura de etapas y subetapas que usan todos los proyectos
  const plantilla = carpetasProyectos.find((n) => ES_PLANTILLA.test(n));
  const etapasPlantilla = plantilla ? path.join(CARPETA_PROYECTOS, plantilla, 'ETAPAS OBRA') : null;
  if (etapasPlantilla && fs.existsSync(etapasPlantilla)) {
    contenido.plantilla = subcarpetas(etapasPlantilla).filter((n) => /^\d+_/.test(n)).map((carpeta) => ({ carpeta, subetapas: subcarpetas(path.join(etapasPlantilla, carpeta)) }));
    contenido.etapas = await procesarEtapas(etapasPlantilla, path.join(SALIDA_IMG, 'plantilla'));
    console.log(`Plantilla ${plantilla}: ${contenido.plantilla.length} etapas`);
  }

  // ---- Proyectos
  for (const nombre of carpetasProyectos.filter((n) => !ES_PLANTILLA.test(n))) {
    const carpeta = path.join(CARPETA_PROYECTOS, nombre);
    const destino = path.join(SALIDA_IMG, 'proyectos', slug(nombre));
    const carpetaImg = path.join(carpeta, 'img');
    const carpetaSlide = subcarpetas(carpetaImg).find((n) => /slide/i.test(n));
    const slide = carpetaSlide ? await procesarLista(listarImagenes(path.join(carpetaImg, carpetaSlide)), path.join(destino, 'slide')) : [];
    const resto = listarImagenes(carpetaImg).filter((a) => !carpetaSlide || !a.startsWith(path.join(carpetaImg, carpetaSlide) + path.sep));
    const galeria = await procesarLista(resto, path.join(destino, 'galeria'));
    const etapas = await procesarEtapas(path.join(carpeta, 'ETAPAS OBRA'), path.join(destino, 'etapas'));
    const info = leerInfo(path.join(carpeta, 'info.txt'));
    contenido.proyectos.push({ id: slug(nombre), nombre: info.nombre || nombre, carpeta: relativa(carpeta), info, slide, galeria, etapas });
    const nEtapas = Object.values(etapas).reduce((s, e) => s + e.imagenes.length + Object.values(e.subetapas).reduce((a, l) => a + l.length, 0), 0);
    console.log(`Proyecto ${nombre}: ${slide.length} en recorrido, ${galeria.length} en galeria, ${nEtapas} en etapas (${Object.keys(etapas).length} etapas con imagenes)`);
  }

  // ---- Diseno
  const carpetaDiseno = path.join(RAIZ, 'img', 'contenido', 'diseno');
  fs.mkdirSync(carpetaDiseno, { recursive: true });
  contenido.diseno = await procesarLista(listarImagenes(carpetaDiseno), path.join(SALIDA_IMG, 'diseno'));

  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  fs.writeFileSync(DESTINO, '// Generado por tools/generar_contenido.js — no editar a mano.\nwindow.CONTENIDO = ' + JSON.stringify(contenido) + ';\n', 'utf8');
  console.log(`Listo: ${relativa(DESTINO)}`);
})().catch((e) => { console.error(e); process.exit(1); });
