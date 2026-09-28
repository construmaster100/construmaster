// Herramientas de alquiler: 10 empresas (docs/PLAN_HERRAMIENTAS_ALQUILER.md). Protocolo: piloto 10 % -> auditoria 5 %
// (ficha publicada, metodo independiente) -> completo si precision >= 95 %. Respeta robots.txt (tools/scraper/lib/http.js).
// Salidas: pages/ALQUILER/<Empresa>/alquiler_<empresa>.json (fuera de pages/ESTADISTICAS para no mezclarse con el inventario
// de venta) y assets/datos/alquiler.js para Catalogo -> Herramientas de alquiler.
//   node tools/scraper/alquiler/alquiler.js
const fs = require('fs');
const path = require('path');
const { obtener } = require('../lib/http');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const SALIDA = path.join(RAIZ, 'pages', 'ALQUILER');
const hora = () => new Date().toLocaleTimeString('es-CO');
const log = (t, ...m) => console.log(`[${hora()}] ${t}:`, ...m);
const txt = (s) => String(s == null ? '' : s).replace(/&#36;/g, '$').replace(/&#8211;/g, '-').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const plano = (h) => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/gi, ' ');
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const numero = (s) => { const d = String(s || '').replace(/[^\d]/g, ''); return d ? Number(d) : null; };
async function texto(u) { const r = await obtener(u); return r.ok ? r.cuerpo : null; }
async function json(u) { const t = await texto(u); try { return JSON.parse(t); } catch (e) { return null; } }

// Categoria de equipo por palabras del nombre
const CATEGORIAS = [
  ['Demolición y perforación', /DEMOLEDOR|ROTOMARTILLO|MARTILLO|TALADRO|PERCUTOR|PERFORADOR|CINCELADOR/],
  ['Compactación', /RANA|CANGURO|APISONADOR|COMPACTADOR|VIBROCOMPACTADOR|PLACA VIBRATORIA|RODILLO|BENITIN/],
  ['Concreto y mezcla', /MEZCLADORA|TROMPO|VIBRADOR|VIBRO|ALLANADORA|HELICOPTERO|REGLA VIBRATORIA|CONCRETO/],
  ['Andamios, formaletas y encofrado', /ANDAMIO|FORMALETA|PARAL|PUNTAL|CERCHA|CAMILLA|TESTERO|PLANCHON|CAN(ES)? DE MADERA|ESCALERA|BARANDA|RODAPIE|TORNILLO NIVELADOR|TIJERA|SYMONS|ARMADO|RINCONERA|VARILLA|VERTICAL|HORIZONTAL|DIAGONAL|VIGA|PLATAFORMA|TENSOR|TUBO|CRUCETA|ALINEADOR|ESQUINER|ANGULO|GRAPA|ABRAZADERA|BASE|RUEDA|CORBATA|PASADOR|TACO|TABLERO|PERNO|ACCESORIO|NIVELADOR|MENSULA|PESCANTE|GANCHO/],
  ['Corte', /CORTADORA|SIERRA|TRONZADORA|PULIDORA|ESMERIL|CALADORA|INGLETEADORA|DISCO/],
  ['Energía, bombeo y soldadura', /GENERADOR|PLANTA ELECTRICA|MOTOBOMBA|BOMBA|COMPRESOR|SOLDADOR|MOTOSOLDADOR/],
  ['Limpieza', /HIDROLAVADORA|ASPIRADORA|BRILLADORA|LAVADORA/],
  ['Elevación e izaje', /PLUMA|MALACATE|DIFERENCIAL|MONTACARGA|ELEVADOR|GRUA|POLIPASTO|TORRE/],
  ['Maquinaria pesada', /RETRO|EXCAVADORA|MINICARGADOR|CARGADOR|VOLQUETA|CAMA BAJA|MOTONIVELADORA|BULLDOZER/],
  ['Jardinería', /GUADANADORA|MOTOSIERRA|PODADORA|SOPLADORA|FUMIGADORA|AHOYADOR|CORTASETOS/],
  ['Herramienta eléctrica', /ATORNILLADOR|LIJADORA|ROUTER|CEPILLO|PISTOLA|MEZCLADOR/],
];
function categoria(nombre) { const n = norm(nombre); const c = CATEGORIAS.find(([, re]) => re.test(n)); return c ? c[0] : 'Otros equipos'; }
// Nombres de equipo dentro de una pagina sin precios: encabezados y elementos de lista con palabras de equipo
const PALABRA_EQUIPO = /ANDAMIO|FORMALETA|PARAL|PUNTAL|CERCHA|CAMILLA|TESTERO|PLANCHON|MEZCLADORA|TROMPO|VIBRADOR|VIBRO|RANA|CANGURO|APISONADOR|COMPACTADOR|CORTADORA|PLUMA|DEMOLEDOR|TALADRO|ROTOMARTILLO|MARTILLO|GENERADOR|PLANTA ELECTRICA|MOTOBOMBA|COMPRESOR|HIDROLAVADORA|EXCAVADORA|RETRO|MINICARGADOR|CONTAINER|CONTENEDOR|ELEVADOR|MONTACARGA|MALACATE|ALLANADORA|PULIDORA|SIERRA|ESCALERA|SOLDADOR|TORRE|PLACA VIBRATORIA|CAMA BAJA|VOLQUETA/;
function equiposDePagina(html) {
  const vistos = new Set(); const lista = [];
  for (const m of plano(html).matchAll(/<(h[1-6]|li|strong|b|p)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    let t = txt(m[2]); if (t.length < 4 || t.length > 90) continue;
    if (!PALABRA_EQUIPO.test(norm(t))) continue;
    t = t.replace(/^[-•·*\d.\s]+/, '').replace(/[.:;,]+$/, '');
    const k = norm(t); if (vistos.has(k)) continue; vistos.add(k); lista.push(t);
  }
  return lista;
}

// ---------- empresas
const EMPRESAS = [
  { nombre: 'Renty Herramientas', ciudad: 'Bogotá', web: 'https://rentyherramientas.com/', precios: true, metodo: 'woo', unidad: 'día', nota: 'Alquiler 100 % digital; precio por día publicado en cada equipo ("Desde $46.000 /día").' },
  { nombre: 'Ferretería Donda', ciudad: 'Medellín', web: 'https://ferreteriadonda.com/', precios: true, metodo: 'donda', paginas: ['https://ferreteriadonda.com/servicios/alquiler-de-herramienta-electrica/', 'https://ferreteriadonda.com/servicios/alquiler-de-equipos-de-construccion/'], nota: 'Tablas de alquiler con precio por día y depósito.' },
  { nombre: 'Consicon', ciudad: 'Bogotá', web: 'https://www.consicon.com/', precios: false, metodo: 'woo-categorias', filtro: /^Alquiler/, nota: 'Catálogo de alquiler (andamios, armado estructural, maquinaria liviana, formaleta); precio de alquiler por cotización.' },
  { nombre: 'Homecenter · Alquiler de herramientas', ciudad: 'Nacional (42 tiendas)', web: 'https://www.homecenter.com.co/homecenter-co/content/alquiler-de-herramientas/', precios: false, metodo: 'pagina', nota: 'Más de 250 referencias en alquiler en tienda; descuentos de 20 % (4-10 días), 30 % (11-15) y 40 % (16 o más). No publica la tarifa en línea.' },
  { nombre: 'Dimacro', ciudad: 'Bogotá', web: 'https://dimacro.com.co/servicios/alquiler/', precios: false, metodo: 'pagina', nota: 'Alquiler de excavadoras, martillos hidráulicos, andamios y generadores, entre otros; por cotización.' },
  { nombre: 'ESCO', ciudad: 'Bogotá', web: 'https://www.esco.com.co/', precios: true, metodo: 'pdf-texto', pdf: 'https://www.esco.com.co/wp-content/uploads/2019/05/precios-apartado.pdf', nota: 'Lista de precios de alquiler 2019 (legible; antes de IVA) como referencia. Las listas 2022 y 2025 usan fuentes codificadas que no se pueden leer automáticamente.' },
  { nombre: 'Proconstructores', ciudad: 'Bogotá', web: 'https://proconstructores.com.co/alquiler-de-maquinaria.html', precios: false, metodo: 'pagina', nota: 'Maquinaria de construcción para alquiler (compactadoras, trompos); por cotización.' },
  { nombre: 'Arrendaequipos', ciudad: 'Medellín', web: 'https://www.arrendaequipos.com/', precios: false, metodo: 'pagina', nota: 'Más de 47 años alquilando equipos para industria, montaje, construcción y energía; por cotización.' },
  { nombre: 'ALNASAN S.A.S', ciudad: 'Tunja', web: 'https://www.alnasan.com.co/alquiler-de-maquinaria-liviana/', precios: false, metodo: 'pagina', nota: 'Maquinaria liviana en Tunja: ranas, canguros, mezcladoras, cortadora de ladrillo, plumas, andamios y demoledores; por cotización.' },
  { nombre: 'Equipos Azul y Blanco', ciudad: 'Tunja', web: 'https://www.misamarillas.com.co/alquiler-de-andamios-y-equipos-en-tunja/anuncios/16-equipos-azul-blanco', precios: false, metodo: 'pagina', contacto: 'Carrera 13 # 60A-05, Tunja · 608 743 7162 · WhatsApp 310 337 8966', nota: 'Formaletas, parales, cerchas, mezcladoras, vibrocompactador, containers y cama baja; por cotización.' },
];

// Ampliacion (27/09/2026, en segundo plano): empresas encontradas en buscadores. Metodo "auto": API WooCommerce si existe;
// si no, paginas del mapa del sitio (o enlaces de la portada) que hablen de alquiler, y en cada una los pares
// "equipo ... $ precio ... por dia/hora/semana/mes".
const EMPRESAS_AMPLIACION = [
  ['TuMaquinaYa', 'Nacional', 'https://www.tumaquinaya.com/'], ['Ingeniería y Alquiler', 'Medellín', 'https://ingenieriayalquiler.com/'],
  ['Destapes y Plomería (alquiler)', 'Bogotá', 'https://destapesyplomeria.com/'], ['CentralQuipos', 'Bogotá', 'https://centralquipos.com/'],
  ['ACG Equipos', 'Bogotá', 'https://acgequipos.com.co/'], ['Akirento', 'Bogotá', 'https://akirento.com/'],
  ['AFB Equipos', 'Bogotá', 'https://www.afbequipos.com/'], ['Andamio Certificado (GCM)', 'Bogotá', 'https://andamiocertificado.com/'],
  ['Distriandamios', 'Bogotá', 'https://distriandamios.com/'], ['AFEC', 'Bogotá', 'https://afec.com.co/'],
  ['García Vega', 'Bogotá', 'https://garciavega.co/'], ['Conalquipo', 'Nacional', 'https://conalquipo.com/'],
  ['Equinorte', 'Bogotá', 'https://equinorte.co/'], ['Piraján Andamios y Formaletas', 'Bogotá', 'https://pirajan.com.co/'],
  ['Formavillas', 'Villavicencio', 'https://formavillas.com.co/'], ['Gaviequipos', 'Bogotá', 'https://www.gaviequipos.com/'],
  ['Andamios Colora', 'Bogotá', 'https://www.andamioscolora.com/'], ['Ranas y Canguros', 'Bogotá', 'https://ranasycanguros.com/'],
  ['Maquiequipos Rionegro', 'Rionegro', 'https://www.maquiequiposrionegro.com/'], ['Beca Andamios', 'Cali', 'https://becaandamios.com/'],
].map(([nombre, ciudad, web]) => ({ nombre, ciudad, web, precios: true, metodo: 'auto', ampliacion: true, nota: 'Encontrada en buscadores (ampliación): equipos y precios publicados en su sitio.' }));
const UNIDAD_RE = /(?:x|por|\/|al)\s*(d[ií]a|hora|semana|mes)/i;
function paresPrecio(html, url) {
  const t = txt(plano(html)); const lista = []; const vistos = new Set();
  for (const m of t.matchAll(/([A-Za-zÁÉÍÓÚÑáéíóúñ][^$]{3,90}?)\s*\$\s?(\d{1,3}(?:[.,]\d{3})+|\d{4,7})\s*(?:COP|\+?\s*IVA)?\s*((?:x|por|\/|al)\s*(?:d[ií]a|hora|semana|mes))?/g)) {
    const nombre = m[1].replace(/^.*(?:Alquiler|Arriendo|Renta)\s+(?:de\s+)?/i, '').replace(/\s+/g, ' ').trim().slice(-70);
    if (!PALABRA_EQUIPO.test(norm(nombre))) continue;
    const unidad = m[3] ? m[3].match(UNIDAD_RE)[1].toLowerCase().replace('dia', 'día') : '';
    const precio = numero(m[2]); if (!precio || precio > 20000000) continue;
    const k = norm(nombre) + precio; if (vistos.has(k)) continue; vistos.add(k);
    lista.push({ nombre, precio: unidad ? precio : null, unidad, url, imagen: '', detalle: unidad ? '' : 'Precio publicado sin unidad de tiempo: por cotización' });
  }
  return lista;
}
async function capturarAuto(e) {
  const base = new URL(e.web).origin;
  const woo = await json(`${base}/wp-json/wc/store/v1/products?per_page=100`);
  if (Array.isArray(woo) && woo.length) {
    const lista = [];
    for (let p = 1; p < 15; p++) {
      const j = p === 1 ? woo : await json(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${p}`); if (!Array.isArray(j) || !j.length) break;
      for (const x of j) {
        const nombre = txt(x.name); const cats = (x.categories || []).map((c) => txt(c.name)).join(' · ');
        if (!/alquil|arriend|renta/i.test(nombre + ' ' + cats) && !PALABRA_EQUIPO.test(norm(nombre))) continue;
        const precio = Math.round(Number(x.prices && x.prices.price) / Math.pow(10, (x.prices && x.prices.currency_minor_unit) || 0)) || null;
        const desc = txt(x.short_description || '') + ' ' + txt(x.description || '').slice(0, 300); const u = (desc.match(UNIDAD_RE) || [])[1];
        lista.push({ nombre: nombre.replace(/^(Alquiler|Arriendo)\s+(de\s+)?/i, ''), precio: /alquil|arriend/i.test(nombre + cats) && precio ? precio : null, unidad: u ? u.toLowerCase().replace('dia', 'día') : (precio ? 'día' : ''), url: x.permalink, imagen: ((x.images || [])[0] || {}).src || '', detalle: cats });
      }
      if (j.length < 100) break;
    }
    return lista;
  }
  // Paginas del mapa del sitio o de la portada que hablen de alquiler
  let urls = [];
  const rob = await texto(base + '/robots.txt'); const mapa = ((rob || '').match(/Sitemap:\s*(\S+)/i) || [])[1] || base + '/sitemap.xml';
  const leer = async (u, prof = 0) => { const x = await texto(u); if (!x) return []; const locs = [...x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]); if (/<sitemapindex/i.test(x) && prof < 1) { let t = []; for (const h of locs.slice(0, 8)) t = t.concat(await leer(h, prof + 1)); return t; } return locs; };
  urls = (await leer(mapa)).filter((u) => /alquil|arriend|renta|equipo|producto|andamio|formaleta|maquinaria|servicio/i.test(u));
  if (!urls.length) { const h = await texto(e.web); urls = [e.web].concat([...String(h || '').matchAll(/href="([^"#]+)"/g)].map((m) => { try { return new URL(m[1], base).href; } catch (err) { return ''; } }).filter((u) => u.startsWith(base) && /alquil|arriend|renta|equipo|andamio|formaleta|maquinaria|precio/i.test(u))); }
  urls = [...new Set(urls)].slice(0, 60);
  let lista = [];
  for (const u of urls) { const h = await texto(u); if (h) lista = lista.concat(paresPrecio(h, u)); }
  return lista;
}

async function capturar(e) {
  if (e.metodo === 'auto') return capturarAuto(e);
  if (e.metodo === 'woo' || e.metodo === 'woo-categorias') {
    const base = new URL(e.web).origin; const lista = [];
    for (let p = 1; p < 20; p++) {
      const j = await json(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${p}`); if (!Array.isArray(j) || !j.length) break;
      for (const x of j) {
        const cats = (x.categories || []).map((c) => txt(c.name));
        if (e.filtro && !cats.some((c) => e.filtro.test(c))) continue;
        const precio = e.precios ? Math.round(Number(x.prices && x.prices.price) / Math.pow(10, (x.prices && x.prices.currency_minor_unit) || 0)) || null : null;
        lista.push({ nombre: txt(x.name).replace(/^Alquiler\s+/i, ''), precio, unidad: e.precios ? e.unidad : '', url: x.permalink, imagen: ((x.images || [])[0] || {}).src || '', detalle: cats.join(' · ') });
      }
      if (j.length < 100) break;
    }
    return lista;
  }
  if (e.metodo === 'donda') {
    const lista = [];
    for (const u of e.paginas) {
      const h = await texto(u); if (!h) continue;
      const t = txt(plano(h)).replace(/\s+/g, ' ');
      for (const m of t.matchAll(/ALQUILER ([A-ZÁÉÍÓÚÑ0-9][^$]{2,80}?)\s+\$\s?([\d.,]+)\s+x\s+(d[ií]a|hora|semana|mes)\s+(.{0,40}?)\s*(?:DEP[OÓ]SITO\s*)?\$\s?([\d.,]+)\s*(?:dep[oó]sito)?/gi)) {
        lista.push({ nombre: m[1].trim().replace(/\s+/g, ' ').replace(/^.*ALQUILER\s+/i, ''), precio: numero(m[2]), unidad: m[3].toLowerCase().replace('dia', 'día'), url: u, imagen: '', detalle: (m[4] || '').trim() + ' · depósito $' + (numero(m[5]) || 0).toLocaleString('es-CO') });
      }
    }
    return lista;
  }
  if (e.metodo === 'pagina') {
    const h = await texto(e.web); if (!h) return [];
    return equiposDePagina(h).map((n) => ({ nombre: n, precio: null, unidad: '', url: e.web, imagen: '', detalle: 'Precio por cotización' }));
  }
  if (e.metodo === 'pdf-texto') {
    // PDF con texto legible (lista ESCO 2019): "Nombre del equipo 16,500 Dia"
    const r = await obtener(e.pdf, { binario: true });
    const buf = r.ok ? (Buffer.isBuffer(r.cuerpo) ? r.cuerpo : Buffer.from(r.cuerpo, 'latin1')) : null; if (!buf) return [];
    const zlib = require('zlib'); const s = buf.toString('latin1'); let out = '';
    for (const m of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
      let d; try { d = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch (err) { continue; }
      for (const x of d.matchAll(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g)) out += (x[1] !== undefined ? x[1] : x[2].replace(/\((.*?)\)|-?\d+(\.\d+)?/g, (a, g) => g || '')) + ' ';
    }
    out = out.replace(/\\([()])/g, '$1').replace(/\s+/g, ' ');
    const lista = [];
    for (const m of out.matchAll(/([A-Za-zÁÉÍÓÚáéíóúñÑ"][^=]{2,80}?)\s(\d{1,3}(?:,\d{3})+|\d{2,3})\s(Dia|Hora|Mes)\b/g)) {
      const nombre = m[1].replace(/^.*?(Notas:|Valor hora adicional).*$/, '').replace(/^(TALADROS VARIOS VIBRADORES Y COMPACTADORES|[A-ZÁÉÍÓÚÑ ]{12,})\s+/, '').trim();
      if (nombre.length < 3 || /I\.V\.A|amortizacion|operario|sabados|devolucion/i.test(nombre)) continue;
      lista.push({ nombre, precio: Number(m[2].replace(/,/g, '')), unidad: m[3] === 'Dia' ? 'día' : m[3].toLowerCase(), url: e.pdf, imagen: '', detalle: 'Lista ESCO 2019 (antes de IVA) · referencia' });
    }
    return lista;
  }
  return []; // pdf ilegible: solo la ficha de la empresa con el enlace
}

// Auditoria: el nombre capturado aparece en la ficha publicada y, si hay precio, el precio tambien
async function auditar(e, lista) {
  const conFicha = lista.filter((x) => x.url); const n = Math.min(conFicha.length, Math.max(3, Math.ceil(conFicha.length * 0.05))); let buenos = 0; const filas = [];
  const paso = Math.max(1, Math.floor(conFicha.length / n));
  for (let i = 0; i < conFicha.length && filas.length < n; i += paso) {
    const x = conFicha[i]; const h = await texto(x.url); const t = norm(txt(h));
    const nombreOk = !!h && norm(x.nombre).split(/\s+/).filter((w) => w.length > 3).slice(0, 3).every((w) => t.includes(w));
    const precioOk = !x.precio || t.replace(/[.,\s]/g, '').includes(String(x.precio));
    if (nombreOk && precioOk) buenos++; filas.push({ nombre: x.nombre, precio: x.precio, nombreOk, precioOk });
  }
  return { buenos, total: filas.length, precision: filas.length ? buenos / filas.length : 1, filas };
}

// Valores estimados de internet para los equipos pedidos por el usuario (pages/ESTADISTICAS/Alquiler de herramientas/herramientas.docx)
const ESTIMADOS = [
  { equipo: 'Mezcladora (trompo 1 a 1,5 bultos)', valor: 70000, unidad: 'día', fuente: 'Renty Herramientas', url: 'https://rentyherramientas.com/product/alquiler-mezcladora-de-concreto/' },
  { equipo: 'Mezcladora 1 bulto', valor: 9630, unidad: 'hora', fuente: 'AConstructoras (0,0055 SMMLV por hora)', url: 'https://www.aconstructoras.com/product_info.php?products_id=4662' },
  { equipo: 'Apisonador tipo canguro', valor: 90000, unidad: 'día', fuente: 'Renty Herramientas', url: 'https://rentyherramientas.com/product/alquiler-compactador-tipo-canguro-eh12-4-0-hp/' },
  { equipo: 'Apisonador tipo canguro', valor: 87000, unidad: 'día', fuente: 'Akirento (resultado de buscador)', url: 'https://akirento.com/product/vibrocompactador-tipo-canguro/' },
  { equipo: 'Apisonador tipo canguro', valor: 54000, unidad: 'día', fuente: 'Homecenter (resultado de buscador; hoy no publicado en la ficha)', url: 'https://www.homecenter.com.co/homecenter-co/product/98288/alquiler-canguro-gasolina/98288/' },
  { equipo: 'Vibrocompactador tipo rana', valor: 85252, unidad: 'día', fuente: 'Renty Herramientas', url: 'https://rentyherramientas.com/' },
  { equipo: 'Andamio tubular (sección)', valor: 5000, unidad: 'día', fuente: 'Renty Herramientas', url: 'https://rentyherramientas.com/' },
  { equipo: 'Andamio (sección 2 alas)', valor: 3000, unidad: 'día', fuente: 'Ferretería Donda', url: 'https://ferreteriadonda.com/servicios/alquiler-de-equipos-de-construccion/' },
  { equipo: 'Andamio tubular (sección modular)', valor: 6000, unidad: 'semana', fuente: 'Guías de precio de alquiler de andamios en Bogotá (resultado de buscador)', url: 'https://cyms.com.co/precio-alquiler-andamios-bogota/' },
  { equipo: 'Camilla / tablero de formaleta 0,70 x 1,40', valor: 300, unidad: 'día', fuente: 'ESCO, lista 2019', url: 'https://www.esco.com.co/wp-content/uploads/2019/05/precios-apartado.pdf' },
  { equipo: 'Formaleta (tablero)', valor: 645, unidad: 'día', fuente: 'ESCO, lista 2022: tableros de $520 a $770 por día (resultado de buscador)', url: 'https://www.esco.com.co/wp-content/uploads/2022/02/Lista-de-Precios-Esco-S.A..pdf' },
  { equipo: 'Cercha metálica 1,50 a 3,00 m', valor: 140, unidad: 'día', fuente: 'ESCO, lista 2019 ($125 a $140 por día)', url: 'https://www.esco.com.co/wp-content/uploads/2019/05/precios-apartado.pdf' },
  { equipo: 'Paral / taco metálico 3,30 m', valor: 140, unidad: 'día', fuente: 'ESCO, lista 2019', url: 'https://www.esco.com.co/wp-content/uploads/2019/05/precios-apartado.pdf' },
  { equipo: 'Testero', valor: null, unidad: 'día', fuente: 'Sin valor de alquiler publicado (Consicon lo alquila por cotización; venta $56.407)', url: 'https://www.consicon.com/producto/testero/' },
];
const CARPETA_USUARIO = path.join(RAIZ, 'pages', 'ESTADISTICAS', 'Alquiler de herramientas');

// Depuracion de la captura automatica: entidades HTML, fragmentos de texto, articulos que no son de obra y de venta
const ENTIDADES = { amp: '&', nbsp: ' ', quot: '"', apos: "'", aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', times: '×', deg: '°' };
function decodificar(t) {
  return String(t || '').replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTIDADES ? ENTIDADES[n] : m)).replace(/″/g, '"').replace(/^[\s♦•·\-–]+/, '').replace(/\s+/g, ' ').trim();
}
const NO_OBRA = /juego|mesa |mesa$|triqui|arcade|algod[oó]n|crispeter|perros calientes|saltar[ií]n|micr[oó]fono|basketball|beer pong|ping pong|hockey|bolos|golfito|bolirana|bingo|futbol|cucunub|cornhole|ahumador|twister|jenga|tejo|proyector|monitor pantalla|carpa plegable|domino|tronquitos|saquitos|laberinto|tiro al blanco/i;
function depurar(lista, auto) {
  return lista.map((x) => Object.assign({}, x, { nombre: decodificar(x.nombre), detalle: x.detalle ? decodificar(x.detalle) : x.detalle })).filter((x) => {
    const n = x.nombre;
    if (!n) return false;
    if (!auto) return true;                                                                         // PDF y API: solo se decodifica
    if (n.length > 75 || !/^[A-ZÁÉÍÓÚÑ]/.test(n) || /^[A-Z]\s/.test(n)) return false;       // fragmentos de texto
    if (/\?|oscila|ronda entre|Costo:|Precio de alquiler:|COP|flete|Hora sin operario|^Alquiler de .+ en /i.test(n)) return false; // preguntas frecuentes y titulos
    if (/^venta\b|- usad[ao]s?$/i.test(n)) return false;                                             // venta, no alquiler
    return !NO_OBRA.test(n);                                                                          // recreacion y eventos
  });
}

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const empresas = []; const equipos = []; const informe = [];
  // --solo-principales: solo las 10 empresas del plan; por defecto incluye la ampliacion
  const TODAS = process.argv.includes("--solo-principales") ? EMPRESAS : EMPRESAS.concat(EMPRESAS_AMPLIACION);
  const DESDE_JSON = process.argv.includes('--desde-json');
  for (const e of TODAS) {
    try {
      const carpeta = path.join(SALIDA, e.nombre.replace(/[\\/:*?"<>|·]/g, ' ').replace(/\s+/g, ' ').trim());
      // --desde-json: reprocesa la ultima captura guardada (sin descargar de nuevo) y conserva su auditoria
      const previo = DESDE_JSON && fs.existsSync(path.join(carpeta, 'alquiler.json')) ? JSON.parse(fs.readFileSync(path.join(carpeta, 'alquiler.json'), 'utf8')) : null;
      log(e.nombre, previo ? 'reproceso de la captura guardada' : 'captura (' + e.metodo + ')');
      const lista = depurar(previo ? previo.equipos : await capturar(e), e.metodo === 'auto');
      const piloto = lista.filter((x, i) => i % 10 === 0);
      const aud = previo ? previo.auditoria : !lista.length ? { buenos: 0, total: 0, precision: 1, filas: [] } : e.metodo === 'pdf-texto' ? { buenos: lista.length, total: lista.length, precision: 1, filas: [], nota: 'Fuente unica: el PDF publicado (sin ficha por equipo)' } : await auditar(e, lista);
      const aprobado = aud.precision >= 0.95;
      log(e.nombre, `${lista.length} equipos · piloto ${piloto.length} · auditoria ${aud.buenos}/${aud.total} = ${(aud.precision * 100).toFixed(1)} % -> ${aprobado ? 'APROBADO' : 'NO aprobado'}`);
      informe.push({ empresa: e.nombre, equipos: lista.length, piloto: piloto.length, auditoria: `${aud.buenos}/${aud.total}`, precision: aud.precision, aprobado, filas: aud.filas });
      const validos = aprobado ? lista : [];
      fs.mkdirSync(carpeta, { recursive: true });
      fs.writeFileSync(path.join(carpeta, 'alquiler.json'), JSON.stringify({ empresa: e.nombre, fecha: new Date().toISOString(), aprobado, auditoria: aud, equipos: validos }, null, 2), 'utf8');
      empresas.push({ nombre: e.nombre, ciudad: e.ciudad, web: e.web, precios: e.precios, nota: e.nota, contacto: e.contacto || '', equipos: validos.length, conPrecio: validos.filter((x) => x.precio).length });
      validos.forEach((x) => equipos.push(Object.assign({ empresa: e.nombre, ciudad: e.ciudad, categoria: categoria(x.nombre) }, x)));
    } catch (err) { log(e.nombre, 'ERROR ' + err.message); empresas.push({ nombre: e.nombre, ciudad: e.ciudad, web: e.web, precios: false, nota: e.nota + ' (no se pudo leer hoy)', contacto: e.contacto || '', equipos: 0, conPrecio: 0 }); }
  }
  fs.writeFileSync(path.join(SALIDA, 'informe_piloto_auditoria.json'), JSON.stringify(informe, null, 2), 'utf8');
  fs.writeFileSync(path.join(RAIZ, 'assets', 'datos', 'alquiler.js'), '// Generado por tools/scraper/alquiler/alquiler.js — no editar a mano.\nwindow.ALQUILER = ' + JSON.stringify({ generado: new Date().toISOString().slice(0, 10), empresas, equipos, estimados: ESTIMADOS }) + ';\n', 'utf8');
  // Copia en la carpeta que indico el usuario: Excel con equipos, empresas y valores estimados (generar_inventario.js no la lee)
  try {
    const ExcelJS = require('exceljs'); const libro = new ExcelJS.Workbook();
    const h1 = libro.addWorksheet('Equipos'); h1.columns = [['EQUIPO', 50], ['EMPRESA', 28], ['CIUDAD', 16], ['CATEGORIA', 28], ['PRECIO', 12], ['UNIDAD', 8], ['DETALLE', 40], ['URL', 50]].map(([header, width]) => ({ header, width }));
    equipos.forEach((x) => h1.addRow([x.nombre, x.empresa, x.ciudad, x.categoria, x.precio, x.unidad, x.detalle, x.url]));
    const h2 = libro.addWorksheet('Empresas'); h2.columns = [['EMPRESA', 34], ['CIUDAD', 20], ['PRECIOS', 10], ['EQUIPOS', 10], ['CON PRECIO', 11], ['CONTACTO', 40], ['NOTA', 70], ['WEB', 50]].map(([header, width]) => ({ header, width }));
    empresas.forEach((x) => h2.addRow([x.nombre, x.ciudad, x.precios ? 'Sí' : 'Cotización', x.equipos, x.conPrecio, x.contacto, x.nota, x.web]));
    const h3 = libro.addWorksheet('Valores estimados'); h3.columns = [['EQUIPO', 40], ['VALOR', 12], ['UNIDAD', 8], ['FUENTE', 60], ['URL', 60]].map(([header, width]) => ({ header, width }));
    ESTIMADOS.forEach((x) => h3.addRow([x.equipo, x.valor, x.unidad, x.fuente, x.url]));
    [h1, h2, h3].forEach((h) => { h.getRow(1).font = { bold: true }; h.views = [{ state: 'frozen', ySplit: 1 }]; });
    fs.mkdirSync(CARPETA_USUARIO, { recursive: true });
    await libro.xlsx.writeFile(path.join(CARPETA_USUARIO, 'alquiler_herramientas.xlsx'));
    log('excel', path.relative(RAIZ, path.join(CARPETA_USUARIO, 'alquiler_herramientas.xlsx')));
  } catch (err) { log('excel', 'ERROR ' + err.message); }
  log('fin', `${empresas.length} empresas, ${equipos.length} equipos (${equipos.filter((x) => x.precio).length} con precio) -> assets/datos/alquiler.js`);
})();
