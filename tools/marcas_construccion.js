// Marcas de la construccion: asigna marca a cada producto del inventario y arma el ranking de proveedores.
// 1. Diccionario: las marcas que Homecenter publica en su columna MARCA (miles de productos).
// 2. Productos sin marca: se busca la marca en el nombre (palabras completas, la coincidencia mas larga).
//    Una marca que tambien es palabra comun ("Superior", "Universal"...) se descarta si, en Homecenter,
//    aparece en nombres de productos de otras marcas mas veces que en los suyos (precision < 50 %).
// 3. Si no aparece ninguna y la fuente es el propio fabricante (Corona, Alfa, Pavco...), se usa esa marca.
// 4. Ranking: marcas por numero de productos (empates: mas tiendas, luego orden alfabetico);
//    las 30 primeras forman los grupos A (1-10), B (11-20) y C (21-30), como en la investigacion KRAKEN.
// Repositorio de logos: pages/PROVEEDORES/Grupo X/NN - Marca/ con logo.* y "pagina web.txt".
const fs = require('fs');
const path = require('path');

const PSEUDO_MARCAS = /^(multimarcas?|generic[oa]?|sin marca|otros?|varios|importad[oa]s?|n\/?a|no aplica|na)$/i;
// Fuentes que son el fabricante: sus productos sin otra marca llevan la marca del fabricante.
const FABRICANTES = { ALFA: 'Alfa', Corona: 'Corona', PAVCO: 'Pavco', 'Santafé': 'Santafé', IPECOL: 'Ipecol', Solimpro: 'Solimpro' };
const LOGOS = /^logo\.(png|jpe?g|svg|webp|gif)$/i;
// Palabras que existen como marca en Homecenter pero que dentro de un nombre casi siempre describen el
// producto ("Entrada Superior", "Mueble Superior", "Porcelanato Orbit"). Solo aplica a la deteccion por
// nombre; la marca que viene en la columna del Excel se respeta. Verificado con muestras el 26/09/2026.
const NO_MARCA_EN_NOMBRE = new Set(['SUPERIOR', 'INFERIOR', 'ORBIT', 'UNIVERSAL', 'STANDARD', 'ESTANDAR', 'PREMIUM', 'CLASSIC', 'CLASICO', 'COLONIAL', 'MODERNO', 'ELITE', 'MASTER', 'PRO', 'PLUS', 'MAX', 'ECO', 'EXPRESS', 'FLEX', 'TOTAL', 'GENERAL', 'BLACK', 'WHITE', 'SILVER', 'GOLD']);

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9&]+/g, ' ').trim();
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tituloMarca = (s) => (s === s.toUpperCase() && s.length > 4 ? s.charAt(0) + s.slice(1).toLowerCase() : s);

function asignarMarcas(productos, { homecenter = 'Homecenter' } = {}) {
  // --- Diccionario desde la marca publicada (se unifican mayusculas/minusculas: gana la grafia mas frecuente)
  const grafias = new Map(); // clave normalizada -> Map(grafia -> n)
  productos.forEach((p) => {
    const m = (p.marca || '').trim();
    if (!m || PSEUDO_MARCAS.test(m)) { p.marca = ''; return; }
    const k = normalizar(m);
    if (!k) { p.marca = ''; return; }
    if (!grafias.has(k)) grafias.set(k, new Map());
    grafias.get(k).set(m, (grafias.get(k).get(m) || 0) + 1);
  });
  const canonica = new Map();
  grafias.forEach((g, k) => { canonica.set(k, tituloMarca([...g.entries()].sort((a, b) => b[1] - a[1])[0][0])); });
  productos.forEach((p) => { if (p.marca) { p.marca = canonica.get(normalizar(p.marca)); p.origenMarca = 'excel'; } });

  // --- Precision de cada marca como palabra dentro de los nombres de Homecenter
  const hc = productos.filter((p) => p.proveedor === homecenter && p.marca);
  const candidatas = [...canonica.entries()].filter(([k]) => k.length >= 3 && !/^\d+$/.test(k));
  const regex = new Map(candidatas.map(([k]) => [k, new RegExp('(^| )' + k.replace(/[&]/g, '\\&') + '( |$)')]));
  const nombresHc = hc.map((p) => ({ n: ' ' + normalizar(p.nombre) + ' ', k: normalizar(p.marca) }));
  const descartadas = [];
  const diccionario = new Map(); // clave -> marca canonica
  candidatas.forEach(([k, marca]) => {
    const re = regex.get(k);
    let apariciones = 0; let propias = 0;
    nombresHc.forEach((x) => { if (re.test(x.n)) { apariciones++; if (x.k === k) propias++; } });
    if (apariciones >= 5 && propias / apariciones < 0.5) { descartadas.push(marca); return; }
    diccionario.set(k, marca);
  });

  // --- Asignacion por nombre (n-gramas de hasta 4 palabras, gana la coincidencia mas larga)
  const frecuencia = new Map();
  productos.forEach((p) => { if (p.marca) frecuencia.set(p.marca, (frecuencia.get(p.marca) || 0) + 1); });
  productos.forEach((p) => {
    if (p.marca) return;
    const palabras = normalizar(p.nombre).split(' ');
    let mejor = null;
    for (let largo = 4; largo >= 1 && !mejor; largo--) {
      for (let i = 0; i + largo <= palabras.length; i++) {
        const clave = palabras.slice(i, i + largo).join(' ');
        if (NO_MARCA_EN_NOMBRE.has(clave)) continue;
        const marca = diccionario.get(clave);
        if (marca && (!mejor || (frecuencia.get(marca) || 0) > (frecuencia.get(mejor) || 0))) mejor = marca;
      }
    }
    if (mejor) { p.marca = mejor; p.origenMarca = 'nombre'; return; }
    if (FABRICANTES[p.proveedor]) { p.marca = FABRICANTES[p.proveedor]; p.origenMarca = 'fabricante'; return; }
    p.marca = ''; p.origenMarca = 'sin';
  });
  return { diccionario: diccionario.size, descartadas };
}

// Ranking y repositorio de carpetas (se crean solo las que falten; nunca se mueven ni borran archivos).
function rankingMarcas(productos, carpetaRepositorio) {
  const info = new Map();
  productos.forEach((p) => {
    if (!p.marca) return;
    if (!info.has(p.marca)) info.set(p.marca, { nombre: p.marca, n: 0, tiendas: new Set(), familias: {}, conPrecio: 0, sumaPrecio: 0 });
    const x = info.get(p.marca);
    x.n++; x.tiendas.add(p.proveedor); x.familias[p.familia] = (x.familias[p.familia] || 0) + 1;
    if (p.precio) { x.conPrecio++; x.sumaPrecio += p.precio; }
  });
  const lista = [...info.values()].sort((a, b) => b.n - a.n || b.tiendas.size - a.tiendas.size || a.nombre.localeCompare(b.nombre, 'es'));

  // Una carpeta "solo esqueleto" (pagina web.txt vacio + img/ vacia, nada mas) se puede reubicar o retirar
  // sin perder nada; si el usuario ya puso algo en ella, no se toca.
  function soloEsqueletoRuta(c) {
    const archivos = fs.readdirSync(c);
    return archivos.every((f) => f === 'img' || f === 'pagina web.txt') &&
      (!archivos.includes('pagina web.txt') || !fs.readFileSync(path.join(c, 'pagina web.txt'), 'utf8').trim()) &&
      (!archivos.includes('img') || !fs.readdirSync(path.join(c, 'img')).length);
  }
  // Carpetas existentes del repositorio (por nombre de marca, sin importar grupo o numero)
  const existentes = new Map();
  if (fs.existsSync(carpetaRepositorio)) {
    fs.readdirSync(carpetaRepositorio, { withFileTypes: true }).filter((g) => g.isDirectory()).forEach((g) => {
      fs.readdirSync(path.join(carpetaRepositorio, g.name), { withFileTypes: true }).filter((d) => d.isDirectory()).forEach((d) => {
        // "NN - Marca" (grupos A/B/C) y "Pnn - Marca" (Presencia): sin el prefijo queda la marca.
        // Si una marca tiene dos carpetas, gana la que tiene contenido del usuario o del scraping (no un esqueleto vacio).
        const clave = slug(d.name.replace(/^P?\d+\s*-\s*/, '')); const ruta = path.join(carpetaRepositorio, g.name, d.name);
        if (!existentes.has(clave) || soloEsqueletoRuta(existentes.get(clave))) existentes.set(clave, ruta);
      });
    });
  }
  const soloEsqueleto = soloEsqueletoRuta;
  const GRUPOS = ['A', 'B', 'C'];
  const limpio = (n) => n.replace(/[\\/:*?"<>|]/g, ' ').trim();
  const esperado = new Map(lista.slice(0, 30).map((x, i) => [slug(x.nombre), path.join(carpetaRepositorio, 'Grupo ' + GRUPOS[Math.floor(i / 10)], String(i + 1).padStart(2, '0') + ' - ' + limpio(x.nombre))]));
  // Las 10 marcas con mas presencia (mas catalogos; empate por productos) que no esten en el top 30 van en Presencia/Pnn - Marca.
  lista.slice().sort((a, b) => b.tiendas.size - a.tiendas.size || b.n - a.n || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 10).forEach((x, i) => {
    if (!esperado.has(slug(x.nombre))) esperado.set(slug(x.nombre), path.join(carpetaRepositorio, 'Presencia', 'P' + String(i + 1).padStart(2, '0') + ' - ' + limpio(x.nombre)));
  });
  existentes.forEach((actual, clave) => {
    if (!soloEsqueleto(actual)) return;
    const destino = esperado.get(clave);
    if (!destino) { fs.rmSync(actual, { recursive: true }); existentes.delete(clave); return; }
    if (path.resolve(destino) !== path.resolve(actual)) {
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      if (fs.existsSync(destino)) fs.rmSync(destino, { recursive: true });
      fs.renameSync(actual, destino);
      existentes.set(clave, destino);
    }
  });
  const relativa = (r) => path.relative(path.resolve(carpetaRepositorio, '..', '..'), r).split(path.sep).join('/');
  return lista.map((x, i) => {
    const puesto = i + 1;
    const grupo = puesto <= 30 ? GRUPOS[Math.floor(i / 10)] : '';
    let carpeta = existentes.get(slug(x.nombre)) || null;
    if (!carpeta && esperado.has(slug(x.nombre))) {
      carpeta = esperado.get(slug(x.nombre));
      fs.mkdirSync(carpeta, { recursive: true });
    }
    // Esqueleto de cada carpeta de marca (destino del scraping): pagina web.txt + img/. Nunca se borra nada.
    if (carpeta && esperado.has(slug(x.nombre))) {
      const web = path.join(carpeta, 'pagina web.txt');
      if (!fs.existsSync(web)) fs.writeFileSync(web, '', 'utf8');
      fs.mkdirSync(path.join(carpeta, 'img'), { recursive: true });
    }
    let logo = ''; let web = ''; const estado = { logo: false, web: false, inventario: false, datos: false, imagenes: 0 };
    if (carpeta && fs.existsSync(carpeta)) {
      const archivos = fs.readdirSync(carpeta);
      const archivo = archivos.find((f) => LOGOS.test(f));
      if (archivo) { logo = relativa(path.join(carpeta, archivo)); estado.logo = true; }
      // logo.json opcional: { "fondo": "oscuro" } para logos blancos que no se ven sobre fondo claro.
      const meta = path.join(carpeta, 'logo.json');
      if (fs.existsSync(meta)) { try { estado.logoFondo = JSON.parse(fs.readFileSync(meta, 'utf8')).fondo || ''; } catch (e) { estado.logoFondo = ''; } }
      const txt = path.join(carpeta, 'pagina web.txt');
      if (fs.existsSync(txt)) web = (fs.readFileSync(txt, 'utf8').split(/\r?\n/).find((l) => /^https?:\/\//i.test(l.trim())) || '').trim();
      estado.web = !!web;
      estado.inventario = archivos.some((f) => /^inventario.*\.xlsx$/i.test(f));
      estado.datos = archivos.includes('data.json');
      const img = path.join(carpeta, 'img');
      if (fs.existsSync(img)) estado.imagenes = fs.readdirSync(img).filter((f) => /\.(jpe?g|png|webp|gif|svg)$/i.test(f)).length;
    }
    return { nombre: x.nombre, slug: slug(x.nombre), puesto, grupo, n: x.n, conPrecio: x.conPrecio, precioPromedio: x.conPrecio ? Math.round(x.sumaPrecio / x.conPrecio) : null, tiendas: [...x.tiendas].sort(), familias: x.familias, logo, web, carpeta: carpeta ? relativa(carpeta) : '', estado };
  });
}

module.exports = { asignarMarcas, rankingMarcas, slug };
