// Genera assets/datos/inventario.js a partir de TODOS los Excel de inventario (.xlsx/.xlsm)
// que existan dentro de pages/ESTADISTICAS, mas los catalogos oficiales Inventario_*.xlsx de pages/PROVEEDORES. Para agregar un inventario nuevo basta con copiar
// su Excel en una carpeta de pages/ESTADISTICAS y volver a correr:  node tools/generar_inventario.js
//
// - Cada archivo Excel queda como una entrada navegable (pestaña Materiales > Archivos Excel).
// - Los archivos identicos (mismo contenido) se leen una sola vez.
// - Las imagenes remotas se reemplazan por la copia local descargada cuando existe (data.json de la marca).
// - Tambien escribe docs/Excel/verificacion_inventario.md con el conteo por archivo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const RAIZ = path.resolve(__dirname, '..');
const CARPETA_CATALOGOS = path.join(RAIZ, 'pages', 'ESTADISTICAS');
// Catalogos oficiales capturados de los sitios de las marcas (pages/PROVEEDORES/<Grupo>/<NN - Marca>/Inventario_<marca>.xlsx).
// Entran como proveedor "<Marca> (oficial)" con la marca de la carpeta y NO cuentan en el ranking de marcas.
const CARPETA_PROVEEDORES = path.join(RAIZ, 'pages', 'PROVEEDORES');
// Grupos de ferreterias (Ferreterias Boyaca, Ferreterias Bogota): carpeta del grupo en pages/ESTADISTICAS con una subcarpeta por tienda.
const { GRUPOS, grupoDeProveedor, TIPOS, tipoDeProveedor } = require('./grupos_ferreterias');
// Datos de los proveedores de los inventarios originales (no estan en los grupos de tools/grupos_ferreterias.js)
const OTROS_PROVEEDORES = {
  Homecenter: { ciudad: 'Nacional (Sodimac Colombia)', web: 'https://www.homecenter.com.co/' },
  COMFER: { ciudad: 'Tunja', web: 'https://www.comfer.co/' },
  // Sitios tomados de los propios archivos de captura de cada inventario (pages/ESTADISTICAS/<proveedor>)
  ALFA: { web: 'https://www.alfa.com.co/' },
  BAEZO: { web: 'https://baezo.com.co/' },
  IPECOL: { web: 'https://www.ipecol.com/' },
  'Santafé': { web: 'https://santafe.com.co/' },
  Solimpro: { web: 'https://tienda.gruposolinpro.com/' },
  'Pinturas y Yesos': { web: 'https://pinturasyyesos.com/' },
  Soelco: { ciudad: 'Tunja', web: 'https://soelco.co/' },
  'G&J': { ciudad: 'Tunja', web: 'https://gyj.com.co/tunja/' },
  Corona: { ciudad: 'Nacional', web: 'https://corona.co/' },
  PAVCO: { ciudad: 'Nacional', web: 'https://pavcowavin.com.co/' },
};
const CARPETAS_GRUPO = new Set(Object.values(GRUPOS).map((g) => normalizar(g.carpeta)));
const DESTINO = path.join(RAIZ, 'assets', 'datos', 'inventario.js');
const REPORTE = path.join(RAIZ, 'pages', 'Cliente', 'Plantilla Modelo', 'Excel', 'verificacion_inventario.md');

// Nombre visible del proveedor segun la carpeta del Excel (si no esta aqui se usa el nombre de la carpeta).
const NOMBRES_PROVEEDOR = {
  comfer: 'COMFER', homecenter: 'Homecenter', corona: 'Corona', 'g&j': 'G&J',
  pinturasyyesos: 'Pinturas y Yesos', santafe: 'Santafé', soelco: 'Soelco', solimpro: 'Solimpro',
  alfa: 'ALFA', baezo: 'BAEZO', ipecol: 'IPECOL', pavco: 'PAVCO',
};

const COLUMNAS = {
  nombre: ['nombre producto', 'nombre del producto', 'producto', 'nombre'],
  precio: ['precio', 'precio de venta', 'precio producto'],
  categoria: ['categoria', 'familia'],
  subcategoria: ['subcategoria', 'sub categoria'],
  marca: ['marca'],
  imagen: ['imagen', 'imagen local', 'foto'],
  imagenRemota: ['url original', 'url imagen original', 'url imagen'],
  url: ['url', 'url producto', 'pagina', 'enlace'],
};

// Familias generales para navegar las ~430 categorias originales. Se evalua en orden sobre
// "categoria + subcategoria"; si nada coincide se prueba con el nombre del producto.
const FAMILIAS = [
  // Primero: los modelos de casas prefabricadas (categoria "Casas prefabricadas"); si no, "prefabricad" caeria en obra gris.
  ['Casas prefabricadas', /^casas prefabricadas\b/],
  ['Herramientas y maquinaria', /herramient|maquinaria|juego de copas|^llaves$|brocas?\b|destornill|alicate|cincel|formon|discos?( de)? corte|pinzas?\b|sierras?\b|martill|taladr|pulidor|compresor|soldad|medicion|atornillad|esmeril|hidrolav|carretill|escalera|andamio|gatas?\b|prensas?\b|limas?\b|llanas?\b|palustre/],
  ['Estructura y obra gris', /cement|concret|mortero|arena|agregad|gravilla|ladrill|bloque|acero|hierro|varilla|malla|fleje|alambre|materiales? de construc|mamposter|estructural|prefabricad|perfil|viga|formaleta|obra gris|placa/],
  ['Cubiertas, drywall y techos', /teja|cubierta|drywall|superboard|yeso|cielo|panel|impermeab|canal|techo|poli?carbonat|fibrocement/],
  ['Pisos y revestimientos', /piso|pared|porcelanat|ceramic|revestim|enchap|baldosa|guardaescob|boquilla|pegante|adhesiv|mosaico|laminad|madera|decorativ|fachad|tablet/],
  ['Baños y cocinas', /bano|sanitari|lavaman|griferi|ducha|cocina|lavaplat|lavadero|orinal|calentador|mueble|espejo|tina|jacuzzi|incrustacion/],
  ['Plomería y tubería', /plomer|tuber|tubo|pvc|cpvc|hidraul|valvul|registro|tanque|bomba|agua|riego|desague|alcantarill|sifon|acople|codo|union|abrazadera|gas\b/],
  ['Electricidad e iluminación', /electric|cable|ilumin|lampar|bombill|interrupt|tomacorr|breaker|conduit|luminari|led\b|camara|seguridad|alarma|energia|solar|extension|clavija|cinta aislant|timbre/],
  ['Pinturas y acabados', /pintur|estuco|vinilo|esmalte|laca|brocha|rodillo|masilla|sellador|anticorros|textur|acabado|barniz|thinner|aerosol|cinta de enmascarar/],
  ['Cerrajería y ferretería', /cerradur|chapa|candado|bisagr|tornill|clavo|ferreter|herraje|puerta|ventana|manija|pomo|chazo|perno|tuerca|arandela|fijacion|anclaje|cadena|ruedas?\b|organizador|caja/],
  ['Aseo y químicos', /limpi|aseo|quimic|desinfect|solvente|detergente|jabon|ambientador|trapeador|escoba/],
  ['Hogar, jardín y otros', /jardin|hogar|exterior|decoraci|mascota|piscina|camping|organiz|cortina|persiana|electrodom/],
];
const FAMILIA_OTROS = 'Otros';

function normalizar(valor) {
  return String(valor == null ? '' : valor).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function precioDesde(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return { precio: valor > 0 ? valor : null, desde: false };
  const texto = String(valor == null ? '' : valor).trim();
  if (!texto || /consultar|cotizar|agotado/i.test(texto)) return { precio: null, desde: false };
  const desde = /desde/i.test(texto);
  const digitos = texto.replace(/[^\d.,]/g, '');
  if (!digitos) return { precio: null, desde: false };
  // Formato colombiano: punto de miles, coma decimal.
  const numero = digitos.includes(',') ? Number(digitos.replace(/\./g, '').replace(',', '.')) : Number(digitos.replace(/\./g, ''));
  return { precio: Number.isFinite(numero) && numero > 0 ? Math.round(numero) : null, desde };
}

function familiaDe(categoria, subcategoria, nombre) {
  const base = normalizar(categoria + ' | ' + subcategoria);
  for (const [familia, patron] of FAMILIAS) if (patron.test(base)) return familia;
  const n = normalizar(nombre);
  for (const [familia, patron] of FAMILIAS) if (patron.test(n)) return familia;
  return FAMILIA_OTROS;
}

function listarExcel(carpeta) {
  const salida = [];
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !/^alquiler de herramientas$/i.test(e.name)) salida.push(...listarExcel(ruta)); }
    else if (/\.(xlsx|xlsm|xls)$/i.test(e.name) && !e.name.startsWith('~$')) salida.push(ruta);
  }
  return salida;
}

function relativa(ruta) { return path.relative(RAIZ, ruta).split(path.sep).join('/'); }

function marcaOficialDe(archivo) {
  if (!archivo.startsWith(CARPETA_PROVEEDORES)) return '';
  return path.basename(path.dirname(archivo)).replace(/^P?\d+\s*-\s*/, '').trim();
}

function proveedorDe(archivo) {
  const oficial = marcaOficialDe(archivo);
  if (oficial) return oficial + ' (oficial)';
  const partes = path.relative(CARPETA_CATALOGOS, archivo).split(path.sep);
  const carpeta = CARPETAS_GRUPO.has(normalizar(partes[0])) && partes.length > 2 ? partes[1] : partes[0];
  return NOMBRES_PROVEEDOR[normalizar(carpeta)] || carpeta;
}

// Mapa imagen remota -> copia local, a partir de los data.json que dejaron los scrapers de cada marca.
function mapaImagenesLocales(carpetaExcel) {
  const mapa = new Map();
  const datos = path.join(carpetaExcel, 'data.json');
  if (!fs.existsSync(datos)) return mapa;
  let lista = JSON.parse(fs.readFileSync(datos, 'utf8'));
  if (!Array.isArray(lista)) lista = Object.values(lista).find(Array.isArray) || [];
  for (const p of lista) {
    if (!p.imagen || !p.imagenOriginal) continue;
    const local = path.join(carpetaExcel, p.imagen);
    if (fs.existsSync(local)) mapa.set(p.imagenOriginal, relativa(local));
  }
  return mapa;
}

function resolverImagen(valor, remota, carpetaExcel, mapaLocal, estado) {
  const ref = String(valor || '').trim();
  if (ref && !/^https?:\/\//i.test(ref)) {
    // Ruta local: se busca desde la carpeta del Excel hacia arriba (Homecenter guarda el Excel en docs/).
    let carpeta = carpetaExcel;
    const base = carpetaExcel.startsWith(CARPETA_PROVEEDORES) ? CARPETA_PROVEEDORES : CARPETA_CATALOGOS;
    while (carpeta.startsWith(base)) {
      const archivo = path.join(carpeta, ref);
      if (fs.existsSync(archivo)) { estado.locales++; return relativa(archivo); }
      carpeta = path.dirname(carpeta);
    }
  }
  const url = /^https?:\/\//i.test(ref) ? ref : String(remota || '').trim();
  if (url && mapaLocal.has(url)) { estado.locales++; return mapaLocal.get(url); }
  if (/^https?:\/\/.+\.(jpe?g|png|webp|gif|avif)(\?|$)|\/image_\d+$/i.test(url)) { estado.remotas++; return url; }
  estado.sinImagen++;
  return '';
}

function leerHoja(hoja) {
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: true, blankrows: false });
  for (let i = 0; i < Math.min(filas.length, 12); i++) {
    const enc = filas[i].map(normalizar);
    const col = {};
    for (const campo of Object.keys(COLUMNAS)) col[campo] = enc.findIndex((c) => COLUMNAS[campo].includes(c));
    if (col.nombre >= 0 && col.precio >= 0) return { col, filas: filas.slice(i + 1) };
  }
  return null;
}

// ------------------------------------------------------------------
const archivos = listarExcel(CARPETA_CATALOGOS).sort((a, b) => a.localeCompare(b, 'es'))
  .concat(listarExcel(CARPETA_PROVEEDORES).filter((a) => /^Inventario_.+.xlsx$/i.test(path.basename(a))).sort((a, b) => a.localeCompare(b, 'es')));
const hashes = new Map();
const infoArchivos = [];
const productos = [];
const vistos = new Set();
const estadoImagenes = { locales: 0, remotas: 0, sinImagen: 0 };

for (const archivo of archivos) {
  const hash = crypto.createHash('sha1').update(fs.readFileSync(archivo)).digest('hex');
  const info = { nombre: path.basename(archivo), ruta: relativa(archivo), proveedor: proveedorDe(archivo), grupo: '', hojas: [], filas: 0, incluidos: 0, duplicados: 0, sinPrecio: 0, copiaDe: '' };
  info.grupo = grupoDeProveedor(info.proveedor);
  info.tipo = tipoDeProveedor(info.proveedor);
  infoArchivos.push(info);
  if (hashes.has(hash)) { info.copiaDe = hashes.get(hash); continue; }
  hashes.set(hash, info.ruta);

  const idArchivo = infoArchivos.length - 1;
  const marcaOficial = marcaOficialDe(archivo);
  const carpetaExcel = path.dirname(archivo);
  const mapaLocal = mapaImagenesLocales(carpetaExcel);
  const libro = XLSX.readFile(archivo);
  // Si un libro trae una hoja detallada (con categoria/imagen) se lee primero, para que gane en la deduplicacion.
  const hojas = libro.SheetNames.map((n) => ({ n, datos: leerHoja(libro.Sheets[n]) })).filter((h) => h.datos)
    .sort((a, b) => Object.values(b.datos.col).filter((c) => c >= 0).length - Object.values(a.datos.col).filter((c) => c >= 0).length);

  for (const { n, datos } of hojas) {
    info.hojas.push(n);
    const { col, filas } = datos;
    const celda = (fila, campo) => (col[campo] >= 0 ? fila[col[campo]] : '');
    // Catalogos oficiales: el sitio publica algunos productos dos veces (una ficha con precio y otra sin precio);
    // la copia sin precio se descarta si el mismo nombre ya tiene precio en ese catalogo.
    const conPrecio = new Set(marcaOficial ? filas.filter((f) => precioDesde(celda(f, 'precio')).precio)
      .map((f) => normalizar(String(celda(f, 'nombre') || '').replace(/\s+/g, ' '))) : []);
    for (const fila of filas) {
      const nombre = String(celda(fila, 'nombre') || '').replace(/\s+/g, ' ').trim();
      if (!nombre || normalizar(nombre) === 'nombre') continue;
      info.filas++;
      const { precio, desde } = precioDesde(celda(fila, 'precio'));
      const clave = info.proveedor + '|' + normalizar(nombre) + '|' + (precio || '');
      if (vistos.has(clave) || (!precio && conPrecio.has(normalizar(nombre)))) { info.duplicados++; continue; }
      vistos.add(clave);
      const categoria = String(celda(fila, 'categoria') || '').trim() || 'General';
      const subcategoria = String(celda(fila, 'subcategoria') || '').trim();
      if (!precio) info.sinPrecio++;
      info.incluidos++;
      productos.push({
        nombre, precio, desde, categoria, subcategoria,
        // Catalogo oficial: la columna MARCA del Excel manda (Grupo Truper trae Truper Expert, Volteck, Foset...); si falta, la marca de la carpeta.
        marca: String(celda(fila, 'marca') || '').trim() || marcaOficial,
        oficial: !!marcaOficial,
        familia: familiaDe(categoria, subcategoria, nombre),
        proveedor: info.proveedor, archivo: idArchivo,
        imagen: resolverImagen(celda(fila, 'imagen'), celda(fila, 'imagenRemota'), carpetaExcel, mapaLocal, estadoImagenes),
        // Pagina del producto en el sitio de la tienda o marca (enlace "Ver en la tienda")
        url: /^https?:\/\//i.test(String(celda(fila, 'url') || '').trim()) ? String(celda(fila, 'url')).trim() : '',
      });
    }
  }
}

// ---- Marcas: asignacion (Excel, nombre o fabricante) y ranking de proveedores con su repositorio de logos
const { asignarMarcas, rankingMarcas } = require('./marcas_construccion');
const resultadoMarcas = asignarMarcas(productos);
const ranking = rankingMarcas(productos.filter((p) => !p.oficial), CARPETA_PROVEEDORES);

// ---- Salida compacta: textos repetidos (categorias, prefijos de imagen...) van a tablas y cada producto guarda indices.
function tabla() { const lista = []; const idx = new Map(); return { lista, id(v) { if (!idx.has(v)) { idx.set(v, lista.length); lista.push(v); } return idx.get(v); } }; }
const tCat = tabla(), tSub = tabla(), tFam = tabla(), tProv = tabla(), tPre = tabla(), tMarca = tabla(), tUrl = tabla();
FAMILIAS.forEach(([f]) => tFam.id(f)); tFam.id(FAMILIA_OTROS);
const filasSalida = productos.map((p) => {
  const corte = p.imagen.lastIndexOf('/') + 1;
  // URL del producto: el sitio (origen) va a la tabla "sitiosUrl" y el producto guarda el resto de la ruta.
  let sitio = -1; let ruta = '';
  if (p.url) { try { const u = new URL(p.url); sitio = tUrl.id(u.origin); ruta = p.url.slice(u.origin.length); } catch (e) { /* URL invalida */ } }
  return [p.nombre, p.precio, tCat.id(p.categoria), tSub.id(p.subcategoria), tFam.id(p.familia), tProv.id(p.proveedor), p.archivo,
    p.imagen ? tPre.id(p.imagen.slice(0, corte)) : -1, p.imagen ? p.imagen.slice(corte) : '', tMarca.id(p.marca), p.desde ? 1 : 0, sitio, ruta];
});
const salida = {
  generado: new Date().toISOString().slice(0, 10),
  campos: ['nombre', 'precio', 'categoria', 'subcategoria', 'familia', 'proveedor', 'archivo', 'prefijoImagen', 'imagen', 'marca', 'desde', 'sitioUrl', 'rutaUrl'],
  sitiosUrl: tUrl.lista,
  archivos: infoArchivos, categorias: tCat.lista, subcategorias: tSub.lista, familias: tFam.lista,
  proveedores: tProv.lista,
  // Tipo de cada proveedor (indice en "tipos"): Empresas de ferreteria / Proveedores de productos.
  tipos: TIPOS, tipoProveedor: tProv.lista.map((p) => TIPOS.indexOf(tipoDeProveedor(p))),
  prefijos: tPre.lista, marcas: tMarca.lista, productos: filasSalida,
  // Ranking de marcas (pestaña Proveedores): una entrada por marca, en orden de puesto.
  // Listado de empresas (pestaña Proveedores): una fila por proveedor del inventario, en el mismo orden de "proveedores".
  empresas: tProv.lista.map((nombre) => {
    const base = nombre.replace(/ \(oficial\)$/, '');
    const tienda = Object.values(GRUPOS).flatMap((g) => g.tiendas).find((t) => t.nombre === base) || {};
    const marca = ranking.find((m) => m.nombre === base) || {};
    const ps = productos.filter((p) => p.proveedor === nombre);
    return { nombre, tipo: TIPOS.indexOf(tipoDeProveedor(nombre)), grupo: grupoDeProveedor(nombre) || (/ \(oficial\)$/.test(nombre) ? 'Marcas oficiales' : ''),
      // Solo la direccion (pagina web.txt puede traer una nota despues de la URL)
      ciudad: tienda.ciudad || (OTROS_PROVEEDORES[base] || {}).ciudad || '', web: ((String(tienda.web || (OTROS_PROVEEDORES[base] || {}).web || marca.web || '').match(/https?:\/\/\S+/) || [''])[0]), n: ps.length, conPrecio: ps.filter((p) => p.precio).length,
      marcas: new Set(ps.map((p) => p.marca).filter(Boolean)).size };
  }),
  ranking: ranking.map((m) => ({ nombre: m.nombre, slug: m.slug, puesto: m.puesto, grupo: m.grupo, n: m.n, conPrecio: m.conPrecio, precioPromedio: m.precioPromedio, tiendas: m.tiendas, familias: m.familias, logo: m.logo, web: m.web, carpeta: m.carpeta, estado: m.estado })),
};
fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, '// Generado por tools/generar_inventario.js — no editar a mano.\nwindow.INVENTARIO = ' + JSON.stringify(salida) + ';\n', 'utf8');

// ---- Reporte de verificacion
const porFamilia = {};
productos.forEach((p) => { porFamilia[p.familia] = (porFamilia[p.familia] || 0) + 1; });
const lineas = [
  '# Verificacion del inventario', '',
  `Generado: ${salida.generado} con \`node tools/generar_inventario.js\`. Fuente: todos los Excel dentro de \`pages/ESTADISTICAS\`.`, '',
  `Total de productos en la pagina: **${productos.length.toLocaleString('es-CO')}**. Imagenes locales: ${estadoImagenes.locales}, remotas: ${estadoImagenes.remotas}, sin imagen: ${estadoImagenes.sinImagen}.`, '',
  '| Archivo | Proveedor | Hojas | Filas leidas | Incluidos | Duplicados | Sin precio |', '|---|---|---|---|---|---|---|',
  ...infoArchivos.map((a) => a.copiaDe
    ? `| ${a.ruta} | ${a.proveedor} | — | — | 0 | — | — (copia identica de ${a.copiaDe}) |`
    : `| ${a.ruta} | ${a.proveedor} | ${a.hojas.join(', ')} | ${a.filas} | ${a.incluidos} | ${a.duplicados} | ${a.sinPrecio} |`),
  '', '## Productos por familia', '', '| Familia | Productos |', '|---|---|',
  ...tFam.lista.map((f) => `| ${f} | ${porFamilia[f] || 0} |`), '',
];
fs.mkdirSync(path.dirname(REPORTE), { recursive: true });
fs.writeFileSync(REPORTE, lineas.join('\n'), 'utf8');

console.log(`Inventario: ${productos.length} productos de ${infoArchivos.length} archivos Excel -> ${relativa(DESTINO)} (${(fs.statSync(DESTINO).size / 1048576).toFixed(1)} MB)`);
infoArchivos.forEach((a) => console.log(`  ${a.copiaDe ? '(copia) ' : ''}${a.ruta}: ${a.incluidos} incluidos, ${a.duplicados} duplicados, ${a.sinPrecio} sin precio [${a.hojas.join(', ')}]`));
console.log('Imagenes:', estadoImagenes);
console.log('Familias:', porFamilia);
const origen = {};
productos.forEach((p) => { const k = p.proveedor + ' · ' + (p.origenMarca || 'sin'); origen[k] = (origen[k] || 0) + 1; });
console.log(`Marcas: diccionario de ${resultadoMarcas.diccionario}, descartadas por ser palabra comun: ${resultadoMarcas.descartadas.length} (${resultadoMarcas.descartadas.slice(0, 15).join(', ')}…)`);
console.log(`Con marca: ${productos.filter((p) => p.marca).length} de ${productos.length}; marcas en el ranking: ${ranking.length}`);
console.log('Origen de la marca por proveedor:', origen);
console.log('Top 30:', ranking.slice(0, 30).map((m) => `${m.puesto}. ${m.nombre} (${m.n}, ${m.tiendas.length} tiendas)`).join(' | '));
