// Casas prefabricadas: modelos publicados por las principales empresas de Colombia (reconocimiento del 27/09/2026).
// Solo 3 empresas publican precio por modelo (Concasaya, Woodpecker, Modular Colombia); otras publican catalogo sin precio.
// Cada modelo queda como un producto (categoria "Casas prefabricadas") en pages/ESTADISTICAS/CASAS PREFABRICADAS/<Empresa>/.
// Auditoria: el precio capturado debe aparecer como texto en la pagina publicada (metodo independiente del extractor).
//   node tools/scraper/prefabricadas/casas_prefabricadas.js
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { obtener } = require('../lib/http');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const DESTINO = path.join(RAIZ, 'pages', 'ESTADISTICAS', 'CASAS PREFABRICADAS');
const txt = (s) => String(s == null ? '' : s).replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&sup2;/g, '²').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const pesos = (s) => { const n = Number(String(s).replace(/[^\d]/g, '')); return n > 0 ? n : null; };
const titulo = (s) => String(s).toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
const fmt = (n) => '$' + Number(n).toLocaleString('es-CO').replace(/,/g, '.');
const log = (...m) => console.log(`[${new Date().toLocaleTimeString('es-CO')}]`, ...m);
async function html(u) { const r = await obtener(u); if (!r.ok) throw new Error(`${u}: ${r.estado}`); return r.cuerpo; }
// Modular Colombia: galeria = foto + plano + memoria estructural si estan en la pagina (casas); glampings solo la foto
function galeriaModular(foto, todas, web) {
  if (!foto) return [];
  const b = foto.replace(/.webp$/, '');
  return [foto, b + '-plano.webp', b + '-memoria-estructural.webp'].filter((x, i) => i === 0 || todas.includes(x)).map((x) => web + x);
}
const abs = (base, src) => { try { return new URL(src, base).href; } catch (e) { return ''; } };

const EMPRESAS = [
  { nombre: 'Concasaya', ciudad: 'Bogota / Cundinamarca / Boyaca', web: 'https://www.concasaya.com/modelos', async extraer() {
    const h = await html(this.web); const out = [];
    // Cada tarjeta se ubica por su titulo <h3> con el area en m² (no todas llevan los mismos comentarios HTML)
    for (const t3 of h.matchAll(/<h3[^>]*>([^<]*\d+\s*m²[^<]*)<\/h3>/g)) {
      const b = h.slice(Math.max(0, t3.index - 700), t3.index + 3000).split(/<!-- CTAs -->/)[0] + (h.slice(t3.index, t3.index + 4000).match(/<a[^>]+href="[^"]+"/) || [''])[0];
      const antes = h.slice(Math.max(0, t3.index - 700), t3.index);
      const tipo = txt((antes.match(/<p[^>]*uppercase[^>]*>([\s\S]*?)<\/p>\s*(?:<!--[^>]*-->\s*)?$/) || [])[1] || '');
      const nombre = txt(t3[1]);
      const espacios = [...b.split('<!-- Precio')[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => txt(m[1])).join(', ');
      const precio = pesos((b.match(/(?:Por s[oó]lo|Obra negra desde)<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
      const enlace = (b.match(/<a[^>]+href="([^"]+)"/) || [])[1] || '';
      if (nombre) out.push({ nombre, precio, subcategoria: tipo + ' (obra negra)', descripcion: espacios, url: /wa\.me|whatsapp/.test(enlace) ? this.web : abs(this.web, enlace) });
    }
    // Foto de cada tarjeta: <img alt="Foto <modelo> CONCASAYA ...">
    const fotos = [...h.matchAll(/<img[^>]+src="([^"]+)"[^>]*alt="Foto ([^"]*)"/g)];
    // La foto se empareja por nombre y area ("Casa El Moral" + "36 m2"; "Casa" + "80 m2")
    out.forEach((p) => { const clave = p.nombre.replace(/\s*\d+\s*m².*$/, '').trim(); const area = (p.nombre.match(/(\d+)\s*m²/) || [])[1]; const f = fotos.find((m) => m[2].startsWith(clave) && (!area || m[2].includes(area + ' m2'))); p.imagen = f ? abs(this.web, f[1]) : ''; });
    // Plano del modelo: mismo archivo de la foto con "-plano" (casa-el-moral-36m2.webp -> casa-el-moral-36m2-plano.webp), si el sitio lo publica
    out.forEach((p) => { const pl = p.imagen && p.imagen.replace(/\.webp$/, '-plano.webp'); p.plano = pl && h.includes(new URL(pl).pathname) ? pl : ''; });
    // Galeria para el slide: foto y plano
    out.forEach((p) => { p.fotos = [p.imagen, p.plano].filter(Boolean); });
    return { productos: out, fuente: h };
  } },
  { nombre: 'Woodpecker', ciudad: 'Bogota', web: 'https://woodpecker.com.co/productos/casas-kit/', async extraer() {
    const lista = await html(this.web);
    const urls = [...new Set([...lista.matchAll(/href="(https:\/\/woodpecker\.com\.co\/casas-kit\/[^"#]+)"/g)].map((m) => m[1]))];
    const out = []; let fuente = '';
    for (const u of urls) {
      const h = await html(u); fuente += h;
      const slug = u.replace(/\/$/, '').split('/').pop();
      const titulo = txt((h.match(/<title>([^<]*)<\/title>/) || [])[1]).split(/[|–-]/)[0].trim() || slug;
      const m2 = (slug.match(/(\d+)m2/) || [])[1];
      const imagen = (h.match(/og:image" content="([^"]+)/) || [])[1] || '';
      // Galeria para el slide: la foto principal y las demas imagenes de la ficha (sin miniaturas, logos, mapa, iconos ni PDF)
      const galeria = [...new Set([...h.matchAll(/https:\/\/woodpecker\.com\.co\/wp-content\/uploads\/[^"'\s)]+\.(?:png|jpe?g|webp)/gi)].map((x) => x[0]))]
        .filter((x) => !/-\d+x\d+\.|logo|mapa|pdf-|vtnf|360|icono|phone|cropped|fondo/i.test(x));
      const fotosModelo = [...new Set([imagen, ...galeria].filter(Boolean))];
      const texto = txt(h);
      const placa = pesos((texto.match(/Desde \$([\d.]+) \(placa\)/) || [])[1]);
      const palafitos = pesos((texto.match(/Desde \$([\d.]+) \(palafitos\)/) || [])[1]);
      const desc = (texto.match(/Casa kit fabricada[^.]*\./) || [''])[0];
      if (placa) out.push({ nombre: `${titulo} - cimentacion en placa`, precio: placa, subcategoria: 'Casa kit (placa)', descripcion: `${m2 ? m2 + ' m2. ' : ''}${desc} Precio desde, vigencia dic/2026.`, url: u, imagen, fotos: fotosModelo });
      if (palafitos) out.push({ nombre: `${titulo} - sobre palafitos`, precio: palafitos, subcategoria: 'Casa kit (palafitos)', descripcion: `${m2 ? m2 + ' m2. ' : ''}${desc} Precio desde, vigencia dic/2026.`, url: u, imagen, fotos: fotosModelo });
    }
    return { productos: out, fuente };
  } },
  { nombre: 'Modular Colombia', ciudad: 'Bogota / Medellin / Cali', web: 'https://modularcolombia.com.co/', async extraer() {
    const h = await html(this.web); const out = [];
    // Foto de cada oferta: casas "casa-en-metal-prefabricada-<area>-m2.webp" (sin plano ni memoria); glampings "glamping-modular-en-metal-<nombre>.webp"
    // todasImgs: todas las imagenes de la pagina (incluye planos y memorias, para la galeria del slide)
    const todasImgs = [...new Set([...h.matchAll(/src="(imagenes\/[^"]+\.webp)"/g)].map((x) => x[1]))];
    const fotos = [...new Set([...h.matchAll(/<img[^>]+src="(imagenes\/[^"]+\.webp)"/g)].map((x) => x[1]))].filter((s) => !/plano|memoria|logo/.test(s));
    const fotoDe = (nombre) => {
      const t = txt(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const area = (t.match(/(\d+)\s*m/) || [])[1];
      if (/^casa/.test(t) && area) return fotos.find((s) => s.includes(`casa-en-metal-prefabricada-${area}-m2.webp`)) || '';
      const palabra = (t.match(/^glamping\s+([a-z]+)/) || [])[1];
      if (palabra) return fotos.find((s) => s.includes(`glamping-modular-en-metal-${palabra}.webp`)) || '';
      return '';
    };
    for (const m of h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      let d; try { d = JSON.parse(m[1]); } catch (e) { continue; }
      for (const x of [].concat(d['@graph'] || d)) {
        for (const o of ((x.hasOfferCatalog || {}).itemListElement || [])) {
          const p = o.itemOffered || {}; const precio = pesos(o.price); const area = Number((txt(p.name).match(/(\d+)\s*m/) || [])[1]);
          const tarifas = String((o.priceSpecification || {}).description || '');
          out.push({ nombre: txt(p.name) + ' - obra gris', precio, subcategoria: 'Estructura metalica (obra gris)', descripcion: txt(p.description) + ' ' + tarifas, url: this.web + '#casas', imagen: fotoDe(p.name) ? this.web + fotoDe(p.name) : '', fotos: galeriaModular(fotoDe(p.name), todasImgs, this.web) });
          // Obra blanca y acabados full: area x tarifa publicada en la misma oferta ($1.400.000/m2 y $2.300.000/m2)
          const blanca = pesos((tarifas.match(/Obra blanca \$([\d.]+)/) || [])[1]); const full = pesos((tarifas.match(/acabados full \$([\d.]+)/) || [])[1]);
          if (area && blanca) out.push({ nombre: txt(p.name) + ' - obra blanca', precio: area * blanca, subcategoria: 'Estructura metalica (obra blanca)', descripcion: `${txt(p.description)} Calculado: ${area} m2 x ${fmt(blanca)}/m2 (tarifa publicada).`, url: this.web + '#casas', imagen: fotoDe(p.name) ? this.web + fotoDe(p.name) : '', fotos: galeriaModular(fotoDe(p.name), todasImgs, this.web) });
          if (area && full) out.push({ nombre: txt(p.name) + ' - acabados full', precio: area * full, subcategoria: 'Estructura metalica (acabados full)', descripcion: `${txt(p.description)} Calculado: ${area} m2 x ${fmt(full)}/m2 (tarifa publicada).`, url: this.web + '#casas', imagen: fotoDe(p.name) ? this.web + fotoDe(p.name) : '', fotos: galeriaModular(fotoDe(p.name), todasImgs, this.web) });
        }
      }
    }
    return { productos: out, fuente: h };
  } },
  { nombre: 'Casas Prefabricadas Colombia', ciudad: 'Bogota', web: 'https://www.casasprefabricadascolombia.com/modelos-casas-prefabricadas.html', async extraer() {
    const out = []; let fuente = '';
    for (const u of [this.web, this.web.replace('.html', '-2.html')]) {
      let h; try { h = await html(u); } catch (e) { continue; } fuente += h;
      for (const m of h.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<figure>[\s\S]*?<img src="([^"]+)" alt="([^"]*)"/g)) out.push({ nombre: 'Casa ' + txt(m[1]), precio: null, subcategoria: /dos|2 plantas|2 pisos/i.test(m[1]) ? 'Dos plantas' : 'Una planta', descripcion: txt(m[3]) + '. Precio por cotizacion.', url: u, imagen: abs(u, m[2]) });
    }
    return { productos: out, fuente };
  } },
  { nombre: 'Custom Home Colombia', ciudad: 'Colombia', web: 'https://customhomecolombia.com/catalogo/', async extraer() {
    const h = await html(this.web); const vistos = new Set(); const out = [];
    // Titulos del catalogo: "CASA MODELO 54 METROS CUADRADOS TIPO CUBO" (se omite la meta descripcion del <head>)
    const cuerpo = h.split('</head>').pop().replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
    for (const m of cuerpo.matchAll(/>\s*(CASA MODELO\s+\d+[^<]{0,80})</gi)) {
      const n = titulo(txt(m[1])); if (vistos.has(n)) continue; vistos.add(n);
      out.push({ nombre: n, precio: null, subcategoria: /dos niveles|2 niveles/i.test(n) ? 'Dos niveles' : /cubo/i.test(n) ? 'Tipo cubo' : 'Un nivel', descripcion: 'Precio por cotizacion.', url: this.web, imagen: '' });
    }
    return { productos: out, fuente: h };
  } },
  { nombre: 'Prefabricadas DYM', ciudad: 'Medellin (Antioquia)', web: 'https://prefabricadasdym.com/proyectos/', async extraer() {
    const h = await html(this.web); const out = [];
    // Tarjetas: "112mts" y luego "Casa prefabricada en Barbosa"
    const visible = txt(h.split('</head>').pop().replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' '));
    for (const m of visible.matchAll(/(\d{2,3})\s*mts?\s+(Casa .{3,70}?)\s+Ver proyecto/g)) { const n = txt(m[2]); if (!out.some((p) => p.nombre === n)) out.push({ nombre: n, precio: null, subcategoria: 'Proyecto realizado', descripcion: `${m[1]} m2. Rango publicado: casas pequenas $20-50 millones, medianas $50-100 millones. Precio por cotizacion.`, url: this.web, imagen: '' }); }
    return { productos: out, fuente: h };
  } },
];

async function auditar(empresa, productos, fuente) {
  const visible = txt(fuente.replace(/<script[\s\S]*?<\/script>/g, (s) => (/ld\+json/.test(s) ? s : ' ')));
  return productos.filter((p) => p.precio).map((p) => {
    // Modular Colombia: obra blanca/full son calculados (area x tarifa); se verifica que la tarifa aparezca publicada.
    const calculado = /Calculado:/.test(p.descripcion);
    const busca = calculado ? p.descripcion.match(/x (\$[\d.]+)\/m2/)[1] : fmt(p.precio);
    return { p, busca, ok: visible.includes(busca) || visible.includes(busca.replace(/\./g, ',')) || fuente.includes(String(p.precio)) };
  });
}

(async () => {
  const libroV = new ExcelJS.Workbook(); const hv = libroV.addWorksheet('Casas prefabricadas');
  hv.addRow(['EMPRESA', 'MODELO', 'PRECIO CAPTURADO', 'TEXTO BUSCADO EN LA PAGINA', 'RESULTADO', 'URL']).font = { bold: true };
  const resumen = [];
  for (const e of EMPRESAS) {
    try {
      const { productos, fuente } = await e.extraer();
      const aud = await auditar(e, productos, fuente);
      aud.forEach((a) => hv.addRow([e.nombre, a.p.nombre, a.p.precio, a.busca, a.ok ? 'correcto' : 'revisar', a.p.url]));
      const dir = path.join(DESTINO, e.nombre); fs.mkdirSync(dir, { recursive: true });
      const libro = new ExcelJS.Workbook(); const h = libro.addWorksheet('Inventario');
      h.columns = [['NOMBRE DEL PRODUCTO', 50], ['PRECIO', 16], ['CATEGORIA', 22], ['SUBCATEGORIA', 34], ['MARCA', 26], ['IMAGEN', 50], ['URL', 50], ['DESCRIPCION', 80], ['PLANO', 50], ['FOTOS', 80]].map(([header, width]) => ({ header, width }));
      productos.forEach((p) => h.addRow([p.nombre, p.precio, 'Casas prefabricadas', p.subcategoria, e.nombre, p.imagen, p.url, p.descripcion, p.plano || '', (p.fotos || []).join(' | ')]));
      h.getRow(1).font = { bold: true };
      await libro.xlsx.writeFile(path.join(dir, `inventario_${e.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '')}.xlsx`));
      const ok = aud.filter((a) => a.ok).length;
      resumen.push(`${e.nombre}: ${productos.length} modelos, ${productos.filter((p) => p.precio).length} con precio, auditoria ${ok}/${aud.length}`);
      log(resumen[resumen.length - 1]);
    } catch (err) { resumen.push(`${e.nombre}: ERROR ${err.message}`); log(resumen[resumen.length - 1]); }
  }
  fs.mkdirSync(path.join(RAIZ, 'pages', 'PROVEEDORES', 'verificacion'), { recursive: true });
  await libroV.xlsx.writeFile(path.join(RAIZ, 'pages', 'PROVEEDORES', 'verificacion', 'Casas_prefabricadas_auditoria.xlsx'));
  log('fin: ' + resumen.join(' | '));
})();
