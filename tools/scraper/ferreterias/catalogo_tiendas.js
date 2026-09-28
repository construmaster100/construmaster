// Megacatalogo de ferreterias (grupos de tools/grupos_ferreterias.js: Ferreterias Boyaca y Ferreterias Bogota).
// Protocolo (docs/PLAN_PROVEEDORES_MARCAS.md, seccion 10.9): por cada tienda
//   1) piloto: 10 % del catalogo (semilla fija),
//   2) auditoria: 5 % del catalogo contra la ficha publicada del producto (metodo independiente: <h1>/og:title y precio visible),
//   3) catalogo completo SOLO si la precision es >= 95 %. Si una tienda no pasa, se detiene esa tienda (las demas siguen).
// Adaptadores: woo (API publica de WooCommerce), vtex (API publica de VTEX por categoria), magento (GraphQL publico),
//              prestashop/mapa (fichas del mapa del sitio con datos estructurados JSON-LD).
// Salidas: pages/ESTADISTICAS/<carpeta del grupo>/<Tienda>/inventario_<tienda>.xlsx + data.json (fotos: URL remota).
// Verificacion: pages/PROVEEDORES/verificacion/Ferreterias_piloto_auditoria.xlsx (una hoja por tienda).
//   node tools/scraper/ferreterias/catalogo_tiendas.js                 (todas las tiendas con adaptador)
//   node tools/scraper/ferreterias/catalogo_tiendas.js Easy Rhino      (solo esas)
//   node tools/scraper/ferreterias/catalogo_tiendas.js Easy --solo-piloto
//   node tools/scraper/ferreterias/catalogo_tiendas.js --marcas         (sitios oficiales de las marcas del top 30, grupo "Marcas oficiales")
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { obtener } = require('../lib/http');
const { GRUPOS } = require('../../grupos_ferreterias');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const ESTADISTICAS = path.join(RAIZ, 'pages', 'ESTADISTICAS');
const VERIFICACION = path.join(RAIZ, 'pages', 'PROVEEDORES', 'verificacion', 'Ferreterias_piloto_auditoria.xlsx');
const SEMILLA = Number(process.env.SEMILLA) || 20260927;
// TRM vigente del proyecto (pesos por dolar), para tiendas que publican en USD
const TRM = Number((fs.readFileSync(path.join(RAIZ, 'assets', 'motor', 'salario_minimo.js'), 'utf8').match(/id: 'TRM'[^}]*valor: ([\d.]+)/) || [])[1]) || null;
const UMBRAL = 0.95;

// ---------- utilidades
function aleatorio(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function muestra(lista, n, semilla) {
  const r = aleatorio(semilla); const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [copia[i], copia[j]] = [copia[j], copia[i]]; }
  return copia.slice(0, Math.min(n, copia.length));
}
const sinTildes = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const slug = (s) => sinTildes(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const txt = (s) => String(s == null ? '' : s).replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&#8217;/g, "'").replace(/&#8243;|&#8221;|&#8220;/g, '"').replace(/&#8211;/g, '-')
  .replace(/&#36;/g, '$').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const titulo = (s) => String(s).replace(/-/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
const normal = (s) => sinTildes(txt(s)).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hora = () => new Date().toLocaleTimeString('es-CO');
const log = (t, ...m) => console.log(`[${hora()}] ${t}:`, ...m);
const numero = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v > 0 ? v : null; const s = String(v).replace(/[^\d.,]/g, ''); if (!s) return null;
  // "1.234.567" / "1,234,567" / "28000.00" / "1.900,50"
  let n; if (/^\d{1,3}([.,]\d{3})+$/.test(s)) n = Number(s.replace(/[.,]/g, '')); else if (/,\d{1,2}$/.test(s)) n = Number(s.replace(/\./g, '').replace(',', '.')); else n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };

async function texto(url) { const r = await obtener(url); return r.ok ? r.cuerpo : null; }
async function json(url, cabeceras) { const r = await obtener(url, { cabeceras }); if (!r.ok) return { error: r.estado }; try { return { datos: JSON.parse(r.cuerpo), r }; } catch (e) { return { error: 'json' }; } }

// JSON-LD: bloques aplanados (incluye @graph)
function ldBloques(html) {
  const salida = [];
  const w = (x) => { if (Array.isArray(x)) x.forEach(w); else if (x && typeof x === 'object') { if (x['@graph']) w(x['@graph']); salida.push(x); } };
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { w(JSON.parse(m[1].trim())); } catch (e) { /* bloque invalido */ } }
  return salida;
}
const esProducto = (x) => [].concat(x['@type'] || []).some((t) => /^Product(Group)?$/.test(t));
function precioOferta(offers) {
  const lista = [].concat(offers || []);
  for (const o of lista) {
    const p = numero(o.price) || numero(o.lowPrice);
    if (p) return p;
    const esp = [].concat(o.priceSpecification || []).map((e) => numero(e.price)).filter(Boolean);
    if (esp.length) return Math.min(...esp);
  }
  return null;
}
const imagenLd = (img) => { const i = [].concat(img || [])[0]; return i ? String(i.url || i.contentUrl || i) : ''; };

// Lectura de la ficha publicada (metodo independiente para la auditoria y captura del adaptador "mapa")
function leerFicha(html, url) {
  const ld = ldBloques(html).find(esProducto);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => txt(m[1])).filter((s) => s && s.length < 250);
  const og = (p) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i')); return m ? txt(m[1]) : ''; };
  // Precio VISIBLE (texto que ve el comprador): WooCommerce <p class="price"> (se prefiere <ins> si hay descuento),
  // PrestaShop 1.6 #our_price_display, PrestaShop 1.7 .current-price.
  let visible = null;
  const bloquePrecio = (html.match(/<p class=["']price[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1];
  if (bloquePrecio) { const ins = bloquePrecio.match(/<ins[\s\S]*?<\/ins>/i); visible = numero(txt(((ins ? ins[0] : bloquePrecio).match(/woocommerce-Price-amount[\s\S]*?<\/bdi>|woocommerce-Price-amount[\s\S]*?<\/span>\s*<\/span>/i) || [''])[0].replace(/^[^>]*>/, ''))); }
  if (!visible) visible = numero(txt((html.match(/id=["']our_price_display["'][^>]*>([^<]+)/i) || [])[1] || ''));
  if (!visible) visible = numero(txt((html.match(/class=["'][^"']*current-price[^"']*["'][^>]*>([\s\S]{0,300}?)<\/(span|div)>/i) || [])[1] || ''));
  // Precios ESTRUCTURADOS (canal distinto: JSON-LD, microdatos, meta de producto)
  const estructurados = [];
  if (ld) [].concat(ld.offers || []).forEach((o) => { [o.price, o.lowPrice, o.highPrice].concat([].concat(o.priceSpecification || []).map((e) => e.price)).map(numero).filter(Boolean).forEach((p) => estructurados.push(p)); });
  const micro = numero((html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)/i) || [])[1]); if (micro) estructurados.push(micro);
  const meta = numero(og('product:price:amount')); if (meta) estructurados.push(meta);
  // Sin JSON-LD: ficha con microdatos (h1 itemprop="name" + itemprop="price"), p. ej. PrestaShop 1.6
  const nombreMicro = txt((html.match(/<h1[^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  const datos = ld ? { nombre: txt(ld.name), sku: ld.sku ? String(ld.sku) : '', precio: precioOferta(ld.offers), imagen: imagenLd(ld.image), marca: txt(ld.brand && (ld.brand.name || ld.brand)), categoria: txt([].concat(ld.category || [])[0] || '') }
    : (nombreMicro && (micro || visible) ? { nombre: nombreMicro, sku: '', precio: micro, imagen: '', marca: '', categoria: '' } : null);
  // Marca en la tabla de caracteristicas de la ficha (Magento data-th="Marca", WooCommerce/PrestaShop "Marca" en <th>/<dt>)
  const marcaTabla = txt((html.match(/data-th=["']Marca["'][^>]*>([^<]{1,60})/i) || html.match(/<(?:th|dt|span|strong)[^>]*>\s*Marca\s*:?\s*<\/(?:th|dt|span|strong)>\s*<(?:td|dd|span)[^>]*>([\s\S]{1,120}?)<\/(?:td|dd|span)>/i) || [])[1] || '');
  if (datos && !datos.marca) datos.marca = marcaTabla;
  // Variantes: paginas de familia con un ItemList de Product (accesorios de Bosch: una pagina = varias referencias)
  const variantes = [];
  if (!ld) for (const b of ldBloques(html)) if (/ItemList/.test([].concat(b['@type'] || []).join())) for (const e of [].concat(b.itemListElement || [])) {
    const it = e.item || e; if (!esProducto(it)) continue;
    variantes.push({ nombre: txt(it.name), sku: String(it.sku || it.model || ''), modelo: String(it.model || ''), url: it.url || url, marca: txt(it.brand && (it.brand.name || it.brand)), imagen: imagenLd(it.image) });
  }
  const textoPlano = txt(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' '));
  const tituloPagina = txt((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  return { ld: datos, variantes, textoPlano, tituloPagina, h1: h1s, ogTitulo: og('og:title'), ogImagen: og('og:image'), visible, estructurados, url };
}

// ---------- adaptadores: listar(tienda, pilotoFraccion|null) -> productos [{nombre, precio, categoria, subcategoria, marca, imagen, url, sku, disponibilidad}]
// Marca en Magento: atributo personalizado cuyo codigo contiene "marca"/"brand" (Ferricentro: attr_marca).
function marcaMagento(p) {
  const a = ((p.custom_attributesV2 || {}).items || []).find((x) => /marca|brand|manufacturer/i.test(x.code));
  if (!a) return '';
  return txt(a.value || ((a.selected_options || [])[0] || {}).label || '');
}

const ADAPTADORES = {
  // WooCommerce Store API (publica)
  async woo(t, fraccion, alTerminarPagina) {
    const base = new URL(t.web).origin;
    const convertir = (p) => { const u = Number(p.prices && p.prices.currency_minor_unit) || 0; const cat = (p.categories || []).map((c) => txt(c.name));
      return { nombre: txt(p.name), precio: numero(Number(p.prices && p.prices.price) / Math.pow(10, u)), categoria: cat[0] || '', subcategoria: cat[1] || '', marca: txt(((p.brands || [])[0] || {}).name || ((((p.attributes || []).find((a) => /marca|brand/i.test(a.name)) || {}).terms || [])[0] || {}).name || ''),
        imagen: (p.images && p.images[0] && p.images[0].src) || '', url: p.permalink, sku: p.sku || '', disponibilidad: p.is_in_stock === false ? 'Agotado' : 'Disponible' }; };
    // Se recorre hasta una pagina vacia o incompleta (100 productos por pagina).
    const lista = [];
    for (let n = 1; ; n++) {
      const r = await obtener(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${n}`);
      if (!r.ok) { if (n === 1) throw new Error('API WooCommerce: ' + r.estado); break; }
      let d; try { d = JSON.parse(r.cuerpo); } catch (e) { break; }
      if (!Array.isArray(d) || !d.length) break;
      lista.push(...d.map(convertir)); if (alTerminarPagina) alTerminarPagina(lista.length);
      if (d.length < 100) break;
    }
    return lista;
  },
  // VTEX: arbol de categorias + busqueda por categoria (la API corta en 2.500 resultados por consulta)
  async vtex(t, fraccion, alTerminarPagina) {
    const base = new URL(t.web).origin;
    const { datos: arbol, error } = await json(`${base}/api/catalog_system/pub/category/tree/5`);
    if (error) throw new Error('arbol VTEX: ' + error);
    // Busqueda por RUTA de categoria (/api/.../search/<categoria>/<sub>): el robots.txt de Easy prohibe los parametros ?fq=.
    const hojas = []; const w = (c) => { if (!c.children || !c.children.length) hojas.push({ ruta: new URL(c.url).pathname.replace(/^\/|\/$/g, ''), nombre: c.name }); else c.children.forEach(w); }; arbol.forEach(w);
    const elegidas = fraccion == null ? hojas : muestra(hojas, Math.ceil(hojas.length * fraccion), SEMILLA);
    const vistos = new Map();
    for (const h of elegidas) {
      for (let desde = 0; desde < 2500; desde += 50) {
        const { datos } = await json(`${base}/api/catalog_system/pub/products/search/${h.ruta}?_from=${desde}&_to=${desde + 49}`);
        if (!Array.isArray(datos) || !datos.length) break;
        for (const p of datos) {
          if (vistos.has(p.productId)) continue;
          const it = (p.items || [])[0] || {}; const of = (((it.sellers || [])[0] || {}).commertialOffer) || {};
          const cats = String((p.categories || [])[0] || '').split('/').filter(Boolean);
          vistos.set(p.productId, { nombre: txt(p.productName), precio: numero(of.Price), categoria: cats[0] || '', subcategoria: cats[cats.length - 1] || '', marca: txt(p.brand), imagen: ((it.images || [])[0] || {}).imageUrl || '',
            // La API entrega el enlace con tildes/ñ ("toalla-baño-..."), pero la ficha publica real va sin ellas ("toalla-bano-...").
            url: sinTildes(p.link), sku: p.productReference || it.itemId || '', disponibilidad: of.AvailableQuantity > 0 ? 'Disponible' : 'Agotado' });
        }
        if (alTerminarPagina) alTerminarPagina(vistos.size);
        if (datos.length < 50) break;
      }
    }
    return [...vistos.values()];
  },
    // Diablo Tools: SKUs del mapa del sitio (/products/<SKU>) + API publica /api/v1/products/<SKU> (precio sugerido en USD)
  async diablo(t, fraccion, alTerminarPagina) {
    const base = new URL(t.web).origin;
    const mapa = await texto('https://www.diablotools.com/public/diablo-sitemap.xml');
    let skus = [...new Set([...String(mapa).matchAll(/<loc>\s*([^<\s]+\/products\/([A-Za-z0-9-]+))\s*<\/loc>/g)].map((m) => m[2]))];
    if (fraccion != null) skus = muestra(skus, Math.ceil(skus.length * fraccion), SEMILLA);
    const lista = []; let n = 0;
    for (const sku of skus) {
      const { datos } = await json(`${base}/api/v1/products/${sku}`); n++;
      const p = datos && (Object.values(datos)[0] || {}).product;
      if (p && p.product_title) {
        const usd = Number(p.suggested_retail_price || p.list_price) || 0;
        lista.push({ nombre: txt(p.product_title), precio: usd && TRM ? Math.round(usd * TRM) : null, categoria: txt(p.category || p.web_category), subcategoria: txt(p.sub_category), marca: 'Diablo', imagen: '',
          url: `https://www.diablotools.com/products/${sku}`, sku, disponibilidad: p.status || '', descripcion: `${usd ? 'Precio sugerido US$ ' + usd.toFixed(2) + ' x TRM ' + TRM + '. ' : ''}Origen: ${p.country_of_origin || 'sin dato'}. UPC ${p.upc || ''}` });
      }
      if (alTerminarPagina && n % 50 === 0) alTerminarPagina(lista.length, n, skus.length);
    }
    return lista;
  },
  // Rastreo por enlaces (sitios sin mapa ni API, p. ej. Toxement): recorre las paginas bajo t.prefijo y toma como producto
  // cada pagina cuya URL cumple t.patronProducto; nombre = <h1>, categoria = segmento de la ruta.
  async rastreo(t, fraccion, alTerminarPagina) {
    const origen = new URL(t.web).origin; const vistas = new Set(); const cola = [t.web]; const productos = new Map();
    // Variante con mapa del sitio: fichas = URLs del mapa que cumplen t.filtroUrl (y no t.excluirUrl); nombre = <h1>.
    if (t.mapa) {
      const xml = await texto(t.mapa);
      const urls = [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).filter((u) => new RegExp(t.filtroUrl).test(u) && !(t.excluirUrl && new RegExp(t.excluirUrl).test(u)));
      const elegidas = fraccion == null ? urls : muestra(urls, Math.ceil(urls.length * fraccion), SEMILLA);
      const lista = [];
      for (const u of elegidas) {
        const h = await texto(u); if (!h) continue; const f = leerFicha(h, u); const nombre = f.h1[0];
        if (nombre) lista.push({ nombre, precio: null, categoria: titulo(new URL(u).pathname.split('/').filter(Boolean)[0].split('-')[0]), subcategoria: '', marca: t.nombre, imagen: f.ogImagen || '', url: u, sku: '', disponibilidad: '' });
      }
      return lista;
    }
    while (cola.length && vistas.size < 3000) {
      const u = cola.shift(); if (vistas.has(u)) continue; vistas.add(u);
      const h = await texto(u); if (!h) continue;
      if (new RegExp(t.patronProducto).test(u)) {
        const f = leerFicha(h, u); const nombre = f.h1[0] || f.ogTitulo;
        const partes = new URL(u).pathname.split('/').filter(Boolean);
        if (nombre) productos.set(u, { nombre, precio: null, categoria: titulo(partes[partes.length - 2] || ''), subcategoria: titulo(partes[partes.length - 1] || ''), marca: t.nombre, imagen: f.ogImagen || '', url: u, sku: '', disponibilidad: '' });
        continue;
      }
      for (const m of h.matchAll(/href="([^"#]+)"/g)) {
        const abs = new URL(m[1].replace(/&amp;/g, '&'), u).href;
        if (abs.startsWith(origen + t.prefijo) && !vistas.has(abs)) cola.push(abs);
      }
      if (alTerminarPagina && vistas.size % 25 === 0) alTerminarPagina(productos.size, vistas.size, vistas.size + cola.length);
    }
    const lista = [...productos.values()];
    return fraccion == null ? lista : muestra(lista, Math.ceil(lista.length * fraccion), SEMILLA);
  },
  // Shopify: /products.json publico (250 por pagina)
  async shopify(t, fraccion, alTerminarPagina) {
    const base = new URL(t.web).origin; const lista = [];
    for (let n = 1; n < 400; n++) {
      const { datos, error } = await json(`${base}/products.json?limit=250&page=${n}`);
      if (error) { if (n === 1) throw new Error('Shopify: ' + error); break; }
      const ps = (datos && datos.products) || []; if (!ps.length) break;
      for (const p of ps) {
        const v = (p.variants || [])[0] || {};
        // Tienda en dolares (Keltec): precio en COP = USD x TRM del proyecto (assets/motor/salario_minimo.js); el USD queda anotado.
        const usd = Number(v.price) || 0; const factor = t.moneda === 'USD' ? TRM : 1;
        // Tienda en pesos chilenos (Steelpro): no se convierte; PRECIO queda vacio y el valor en CLP va anotado (como Foy en MXN).
        if (t.moneda === 'CLP') { lista.push({ nombre: txt(p.title), precio: null, precioOrigen: usd || null, descripcion: usd ? `Precio publicado en Chile: CLP $ ${Math.round(usd).toLocaleString('es-CO')} (no se convierte)` : '', categoria: txt(p.product_type), subcategoria: '', marca: txt(p.vendor), imagen: ((p.images || [])[0] || {}).src || '', url: `${base}/products/${p.handle}`, sku: v.sku || '', disponibilidad: v.available === false ? 'Agotado' : 'Disponible' }); continue; }
        lista.push({ nombre: txt(p.title), precio: usd ? Math.round(usd * factor) : null, factor, descripcion: t.moneda === 'USD' && usd ? `Precio publicado US$ ${usd.toFixed(2)} x TRM ${TRM}` : '', categoria: txt(p.product_type), subcategoria: '', marca: txt(p.vendor), imagen: ((p.images || [])[0] || {}).src || '',
          url: `${base}/products/${p.handle}`, sku: v.sku || '', disponibilidad: v.available === false ? 'Agotado' : 'Disponible' });
      }
      if (alTerminarPagina) alTerminarPagina(lista.length);
      if (ps.length < 250) break;
    }
    return lista;
  },
  // Magento 2 GraphQL publico
  async magento(t, fraccion, alTerminarPagina) {
    const base = new URL(t.web).origin; const TAM = 100;
    const consulta = (pag) => `${base}/graphql?query=` + encodeURIComponent(`{products(search:"",pageSize:${TAM},currentPage:${pag}){total_count items{name sku url_key url_suffix stock_status small_image{url} categories{name level} price_range{minimum_price{final_price{value}}} custom_attributesV2(filters:{is_visible_on_front:true}){items{code ... on AttributeValue{value} ... on AttributeSelectedOptions{selected_options{label}}}}}}}`);
    // Magento multitienda: la vista por defecto puede ser otra empresa (Ferricentro -> Sumatec); se pide la vista de la tienda.
    const cab = t.vistaMagento ? { Store: t.vistaMagento } : undefined;
    const { datos, error } = await json(consulta(1), cab); if (error) throw new Error('GraphQL: ' + error);
    const total = datos.data.products.total_count; const paginas = Math.ceil(total / TAM);
    const numeros = Array.from({ length: paginas }, (_, i) => i + 1);
    const elegidas = fraccion == null ? numeros : muestra(numeros, Math.ceil(paginas * fraccion), SEMILLA).sort((a, b) => a - b);
    const lista = [];
    for (const pag of elegidas) {
      const d = pag === 1 ? datos : (await json(consulta(pag), cab)).datos;
      const items = (d && d.data && d.data.products && d.data.products.items) || [];
      for (const p of items) {
        const cats = (p.categories || []).slice().sort((a, b) => (a.level || 0) - (b.level || 0)).map((c) => txt(c.name));
        const foto = p.small_image && p.small_image.url || '';
        lista.push({ nombre: txt(p.name), precio: numero(p.price_range.minimum_price.final_price.value), categoria: cats[0] || '', subcategoria: cats[cats.length - 1] || '', marca: marcaMagento(p),
          imagen: /placeholder/i.test(foto) ? '' : foto, url: `${base}/${p.url_key}${p.url_suffix || ''}`, sku: p.sku, disponibilidad: p.stock_status === 'IN_STOCK' ? 'Disponible' : 'Agotado' });
      }
      if (alTerminarPagina) alTerminarPagina(lista.length);
    }
    return lista;
  },
  // Fichas del mapa del sitio (JSON-LD). PrestaShop con lista fija de ids usa el mismo camino.
  async mapa(t, fraccion, alTerminarPagina) {
    let urls = [];
    if (t.ids) urls = t.ids.map((id) => `${new URL(t.web).origin}/index.php?id_product=${id}&controller=product`);
    else {
      const leer = async (u, prof = 0) => { const x = await texto(u); if (!x) return []; const locs = [...x.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?\s*<\/loc>/g)].map((m) => m[1].trim().replace(/&amp;/g, '&'));
        if (/<sitemapindex/i.test(x) && prof < 2) { const hijos = locs.filter((l) => !t.filtroMapa || l.includes(t.filtroMapa)); const todo = []; for (const h of hijos) todo.push(...await leer(h, prof + 1)); return todo; } return locs; };
      urls = (await leer(t.mapa)).filter((u) => !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) && u.replace(/\/$/, '') !== new URL(t.web).origin && !(t.excluir && u.includes(t.excluir)) && (!t.incluir || u.includes(t.incluir)));
    }
    urls = [...new Set(urls)];
    const elegidas = fraccion == null ? urls : muestra(urls, Math.ceil(urls.length * fraccion), SEMILLA);
    const lista = []; let noProducto = 0; let hechas = 0;
    for (const u of elegidas) {
      const html = await texto(u); hechas++;
      if (html) { const f = leerFicha(html, u); if (f.ld && f.ld.nombre) lista.push({ nombre: f.ld.nombre, precio: f.visible || f.ld.precio, categoria: f.ld.categoria, subcategoria: '', marca: f.ld.marca, imagen: f.ld.imagen || f.ogImagen, url: u, sku: f.ld.sku, disponibilidad: '' });
        else if (f.variantes.length) f.variantes.forEach((v) => lista.push({ nombre: v.nombre, precio: null, categoria: f.h1[0] || '', subcategoria: '', marca: v.marca, imagen: v.imagen || f.ogImagen, url: v.url, sku: v.sku, disponibilidad: '' }));
        else noProducto++; }
      if (alTerminarPagina && hechas % 25 === 0) alTerminarPagina(lista.length, hechas, elegidas.length);
    }
    lista.noProducto = noProducto; lista.urlsMapa = urls.length;
    return lista;
  },
};
ADAPTADORES.prestashop = ADAPTADORES.mapa;

// ---------- auditoria: ficha publicada vs dato capturado
function coincideNombre(capturado, f) {
  const c = normal(capturado); if (!c) return false;
  const candidatos = [...f.h1, f.ogTitulo, f.ld && f.ld.nombre].filter(Boolean).map(normal);
  return candidatos.some((x) => x === c || (x.length > 8 && (x.includes(c) || c.includes(x))));
}
// El precio capturado debe coincidir (±1 %, redondeo) con el precio visible o con alguno de los estructurados de la ficha.
// Adaptador "mapa" (la captura ya es el precio visible): se exige que coincida con un precio estructurado (canal distinto).
function coincidePrecio(capturado, f, esMapa) {
  const refs = esMapa ? (f.estructurados.length ? f.estructurados : [f.visible].filter(Boolean)) : [f.visible].concat(f.estructurados).filter(Boolean);
  if (!capturado && !refs.length) return true; // sin precio en la captura ni en la ficha
  if (!capturado || !refs.length) return false;
  return refs.some((r) => Math.abs(capturado - r) / r <= 0.01);
}
async function auditar(t, productos, n) {
  const filas = []; const lote = muestra(productos.filter((p) => p.url), n, SEMILLA + 1);
  for (const p of lote) {
    // Algunos sitios (Easy/VTEX) entregan a veces la pagina sin el contenido del producto: se reintenta hasta 3 veces.
    let html = null; let f = null;
    for (let intento = 0; intento < 3; intento++) {
      html = await texto(p.url); if (!html) continue;
      f = leerFicha(html, p.url);
      if (f.h1.length || f.ogTitulo || f.ld || f.variantes.length || t.adaptador === 'diablo') break;
    }
    if (!html) { filas.push({ p, ok: false, motivo: 'la ficha no respondio', f: null }); continue; }
    // Adaptador "mapa": la captura viene del JSON-LD, la auditoria usa <h1> y precio visible (no el JSON-LD).
    // Variantes (ItemList): la referencia debe aparecer en el texto visible de la pagina ("9 617 085 411").
    const refVisible = !!p.sku && f.textoPlano.replace(/\s+/g, '').includes(String(p.sku).replace(/\s+/g, ''));
    const nombreOk = t.adaptador === 'mapa' || t.adaptador === 'prestashop' ? refVisible || [...f.h1, f.ogTitulo].some((x) => x && (normal(x) === normal(p.nombre) || (normal(x).length > 8 && (normal(x).includes(normal(p.nombre)) || normal(p.nombre).includes(normal(x)))))) : coincideNombre(p.nombre, f);
    // Shopify: el precio se pinta con JavaScript; se contrasta con la ficha JSON publica del producto (<url>.js, en centavos).
    // Diablo: la ficha se pinta con JavaScript; metodo independiente = buscador del sitio (/api/v2/products/search), por numero de parte.
    // El precio sugerido solo lo publica la API de producto: en la auditoria se verifica el nombre (el precio se documenta como no contrastable).
    if (t.adaptador === 'diablo') {
      // Parametro del buscador: "query" (con "q" lo ignora). Se busca el numero de parte y se exige coincidencia exacta.
      const { datos } = await json(`https://diablotools.com/api/v2/products/search?query=${encodeURIComponent(p.sku)}&limit=10`);
      const hit = ((datos && datos.hits) || []).find((x) => String(x.item_num).toUpperCase() === String(p.sku).toUpperCase());
      let ok = !!hit && normal(hit.product_title) === normal(p.nombre); let ref = hit ? hit.product_title : '';
      // El buscador no indexa todo el catalogo (1.447 de 1.688): segunda via = <title> del HTML de la ficha
      // ("DMD516JP1 | Mild & Stainless Steel Bits | Individual Bits - Diablo Tools"): debe empezar por el SKU y traer la subcategoria o categoria capturada.
      if (!hit) {
        const h = await texto(p.url); const tit = txt(((h || '').match(/<title>([^<]*)<\/title>/) || [])[1] || '');
        const partes = tit.split('|').map((x) => normal(x));
        ok = normal(partes[0]) === normal(p.sku) && [p.subcategoria, p.categoria].some((c) => c && partes.some((x) => x.includes(normal(c))));
        ref = tit || '(sin titulo)';
      }
      filas.push({ p, f: { h1: [ref], ogTitulo: '', visible: null, estructurados: [] }, ok, nombreOk: ok, precioOk: true });
      continue;
    }
    // Rastreo: el nombre capturado (<h1>) y el <title> de la pagina deben coincidir (uno contiene al otro, o todas las
    // palabras del titulo sin el sufijo del sitio estan en el nombre: "Arena Pega-Pañete" ~ "ARENA INDUSTRIALIZADA PARA PEGA-PAÑETE").
    if (t.adaptador === 'rastreo') {
      const base = normal(String(f.tituloPagina).split(/\s[-|:]\s|:\s/)[0]); const nom = normal(p.nombre);
      // Toxement: el <title> es el de la categoria; el enlace trae el nombre en ?productname= (canal distinto al <h1>).
      const param = normal(decodeURIComponent((p.url.match(/[?&](?:amp;)?productname=([^&]+)/i) || [])[1] || '')).replace(/\s+/g, '');
      const ok = (!!param && param === nom.replace(/\s+/g, '')) || (!!base && (base.includes(nom) || nom.includes(base) || base.split(' ').every((w) => nom.split(' ').includes(w)) || normal(f.ogTitulo).includes(nom)));
      filas.push({ p, f, ok, nombreOk: ok, precioOk: true }); continue;
    }
    let precioCLP = null;
    if (t.adaptador === 'shopify') { const j = await texto(p.url + '.js'); try { const d = JSON.parse(j); if (t.moneda === 'CLP') precioCLP = Math.round(d.price / 100); else f.estructurados.push(Math.round((d.price / 100) * (p.factor || 1))); } catch (e) { /* sin ficha JSON */ } }
    // CLP: se contrasta el valor anotado en pesos chilenos con la ficha JSON (el campo PRECIO queda vacio a proposito)
    const precioOk = t.moneda === 'CLP' ? (!p.precioOrigen && !precioCLP) || (!!p.precioOrigen && !!precioCLP && Math.abs(p.precioOrigen - precioCLP) / precioCLP <= 0.01) : coincidePrecio(p.precio, f, t.adaptador === 'mapa' || t.adaptador === 'prestashop');
    filas.push({ p, f, ok: nombreOk && precioOk, nombreOk, precioOk });
  }
  const buenos = filas.filter((x) => x.ok).length; const prec = filas.length ? buenos / filas.length : 0;
  const margen = 1.96 * Math.sqrt(prec * (1 - prec) / Math.max(1, filas.length));
  return { filas, buenos, precision: prec, margen };
}

// ---------- salidas
// Marcas oficiales: salida en la carpeta de la marca en pages/PROVEEDORES (Inventario_<marca>.xlsx, lo integra generar_inventario.js como "<Marca> (oficial)").
function carpetaTienda(t) { if (t.carpetaProveedor) return path.join(RAIZ, 'pages', 'PROVEEDORES', t.carpetaProveedor); if (t.carpetaEstadisticas) return path.join(ESTADISTICAS, t.carpetaEstadisticas); return path.join(ESTADISTICAS, t.grupo.carpeta, sinTildes(t.nombre).replace(/[\\/:*?"<>|&]/g, ' ').replace(/\s+/g, ' ').trim()); }
async function guardarExcel(t, productos) {
  const dir = carpetaTienda(t); fs.mkdirSync(dir, { recursive: true });
  const libro = new ExcelJS.Workbook(); const h = libro.addWorksheet('Inventario');
  h.columns = [['NOMBRE DEL PRODUCTO', 60], ['PRECIO', 14], ['CATEGORIA', 28], ['SUBCATEGORIA', 28], ['MARCA', 18], ['IMAGEN', 50], ['URL', 50], ['SKU', 18], ['DISPONIBILIDAD', 14], ['DESCRIPCION', 50]].map(([header, width]) => ({ header, width }));
  productos.forEach((p) => h.addRow([p.nombre, p.precio, p.categoria, p.subcategoria, p.marca, p.imagen, p.url, p.sku, p.disponibilidad, p.descripcion || '']));
  h.getRow(1).font = { bold: true }; h.views = [{ state: 'frozen', ySplit: 1 }];
  const archivo = path.join(dir, `${t.carpetaProveedor ? 'Inventario' : 'inventario'}_${slug(t.nombre).replace(/-/g, '')}.xlsx`);
  await libro.xlsx.writeFile(archivo); return archivo;
}
function guardarDatos(t, productos, meta) { const dir = carpetaTienda(t); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify({ meta, productos }, null, 1)); }
let colaVerificacion = Promise.resolve();
function guardarVerificacion(t, resumen, auditoria) {
  colaVerificacion = colaVerificacion.then(async () => {
    const libro = new ExcelJS.Workbook();
    if (fs.existsSync(VERIFICACION)) await libro.xlsx.readFile(VERIFICACION);
    const nombre = sinTildes(t.nombre).slice(0, 28);
    const vieja = libro.getWorksheet(nombre); if (vieja) libro.removeWorksheet(vieja.id);
    const h = libro.addWorksheet(nombre);
    h.addRow(['INDICADOR', 'VALOR']).font = { bold: true };
    Object.entries(resumen).forEach(([k, v]) => h.addRow([k, v]));
    h.addRow([]);
    h.addRow(['NOMBRE CAPTURADO', 'PRECIO CAPTURADO', 'TITULO EN LA FICHA (h1 / og:title)', 'PRECIOS EN LA FICHA (visible / estructurados)', 'NOMBRE OK', 'PRECIO OK', 'RESULTADO', 'URL']).font = { bold: true };
    auditoria.filas.forEach((x) => h.addRow([x.p.nombre, x.p.precio, x.f ? (x.f.h1[0] || x.f.ogTitulo) : '', x.f ? [x.f.visible].concat(x.f.estructurados).filter(Boolean).join(' / ') : '', x.nombreOk ? 'si' : 'no', x.precioOk ? 'si' : 'no', x.ok ? 'correcto' : (x.motivo || 'revisar'), x.p.url]));
    [50, 16, 50, 18, 10, 10, 12, 60].forEach((w, i) => { h.getColumn(i + 1).width = w; });
    fs.mkdirSync(path.dirname(VERIFICACION), { recursive: true });
    await libro.xlsx.writeFile(VERIFICACION);
  });
  return colaVerificacion;
}

// ---------- proceso por tienda
async function procesar(t, soloPiloto) {
  const A = ADAPTADORES[t.adaptador]; const inicio = Date.now();
  const avance = (n, hechas, de) => log(t.nombre, hechas ? `${hechas}/${de} fichas, ${n} productos` : `${n} productos`);
  try {
    log(t.nombre, `piloto 10 % (${t.adaptador}, semilla ${SEMILLA})`);
    // woo trae todo en pocas solicitudes: el piloto es una muestra del 10 % de lo descargado
    let piloto = await A(t, t.adaptador === 'woo' ? null : 0.10, avance);
    const catalogoWoo = t.adaptador === 'woo' ? piloto.slice() : null;
    if (t.adaptador === 'woo') piloto = muestra(piloto, Math.ceil(piloto.length * 0.10), SEMILLA);
    const estimado = catalogoWoo ? catalogoWoo.length : (piloto.urlsMapa || t.productosWeb || piloto.length * 10);
    const nAud = Math.max(1, Math.min(piloto.length, Math.ceil(estimado * 0.05)));
    log(t.nombre, `piloto: ${piloto.length} productos; auditoria de ${nAud} fichas`);
    const aud = await auditar(t, piloto, nAud);
    const aprobado = aud.precision >= UMBRAL;
    const resumen = { Tienda: t.nombre, Grupo: t.grupo.nombre, Sitio: t.web, Adaptador: t.adaptador, 'Productos estimados en el sitio': estimado, 'Piloto (10 %)': piloto.length,
      'Piloto con precio': piloto.filter((p) => p.precio).length, 'Piloto con foto': piloto.filter((p) => p.imagen).length, 'Auditados (5 %)': aud.filas.length, Correctos: aud.buenos,
      Precision: `${(aud.precision * 100).toFixed(1)} %`, 'Margen (z=1,96)': `± ${(aud.margen * 100).toFixed(1)} %`, Resultado: aprobado ? 'APROBADO' : 'NO aprobado (se detiene la tienda)', Semilla: SEMILLA, Fecha: new Date().toLocaleString('es-CO') };
    await guardarVerificacion(t, resumen, aud);
    log(t.nombre, `auditoria ${aud.buenos}/${aud.filas.length} = ${(aud.precision * 100).toFixed(1)} % -> ${aprobado ? 'APROBADO' : 'NO aprobado'}`);
    if (!aprobado || soloPiloto) { guardarDatos(t, piloto, { etapa: aprobado ? 'piloto aprobado' : 'piloto NO aprobado', ...resumen }); return { t, aprobado, piloto: piloto.length }; }
    const todo = catalogoWoo || await A(t, null, avance);
    const meta = { etapa: 'completo', ...resumen, 'Productos capturados': todo.length, 'Con precio': todo.filter((p) => p.precio).length, 'Con foto': todo.filter((p) => p.imagen).length, Minutos: Math.round((Date.now() - inicio) / 60000) };
    guardarDatos(t, todo, meta);
    const archivo = await guardarExcel(t, todo);
    resumen['Catalogo completo'] = todo.length; resumen['Con precio'] = meta['Con precio']; resumen['Con foto'] = meta['Con foto']; resumen.Excel = path.relative(RAIZ, archivo);
    await guardarVerificacion(t, resumen, aud);
    log(t.nombre, `COMPLETO: ${todo.length} productos -> ${path.relative(RAIZ, archivo)}`);
    return { t, aprobado, total: todo.length };
  } catch (e) {
    log(t.nombre, 'ERROR ' + e.message);
    return { t, error: e.message };
  }
}

(async () => {
  const args = process.argv.slice(2); const soloPiloto = args.includes('--solo-piloto');
  const nombres = args.filter((a) => !a.startsWith('--')).map(normal);
  const tiendas = Object.entries(GRUPOS).flatMap(([nombre, g]) => g.tiendas.map((t) => ({ ...t, grupo: { nombre, carpeta: g.carpeta } })))
    .filter((t) => (args.includes('--marcas') ? !!t.carpetaProveedor : !t.carpetaProveedor || nombres.length))
    .filter((t) => t.adaptador && (!nombres.length || nombres.includes(normal(t.nombre))));
  log('inicio', tiendas.map((t) => t.nombre).join(', '));
  const res = await Promise.all(tiendas.map((t) => procesar(t, soloPiloto)));
  log('fin', res.map((r) => `${r.t.nombre}: ${r.error ? 'ERROR ' + r.error : r.total != null ? r.total + ' productos' : (r.aprobado ? 'piloto aprobado' : 'piloto NO aprobado')}`).join(' | '));
})();
