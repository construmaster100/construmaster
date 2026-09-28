// Piloto N1 — identidad de marca: sitio oficial + logo de las 10 marcas con mas presencia en los catalogos.
// Escribe en la carpeta de cada marca (pages/PROVEEDORES/...): "pagina web.txt" (si esta vacio) y logo.<ext>.
// Registra el resultado en pages/PROVEEDORES/verificacion/Piloto_scraping_10.xlsx (hoja Identidad).
//   node tools/scraper/identidad.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ExcelJS = require('exceljs');
const { obtener } = require('./lib/http');

const RAIZ = path.resolve(__dirname, '..', '..');
const VERIFICACION = path.join(RAIZ, 'pages', 'PROVEEDORES', 'verificacion');

// Sitios oficiales confirmados en el reconocimiento del 26/09/2026 (docs/PLAN_PROVEEDORES_MARCAS.md, seccion 8).
const SITIOS = {
  toxement: 'https://www.toxement.com.co/', corona: 'https://corona.co/', pintuco: 'https://www.pintuco.com.co/',
  truper: 'https://www.truper.com/', pretul: 'https://www.truper.com/', dewalt: 'https://www.dewalt.com.co/es-co',
  stanley: 'https://co.stanleytools.global/', grival: 'https://www.grival.com/', gricol: 'https://www.gricol.com/',
  stretto: 'https://www.strettocolombia.com/',
};
const NOTAS = { pretul: 'Sin sitio propio: marca de Grupo Truper, publicada en truper.com' };

function cargarRanking() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'assets', 'datos', 'inventario.js'), 'utf8'), ctx);
  return ctx.window.INVENTARIO.ranking;
}

// Candidatos a logo en el HTML de la portada, en orden de confianza.
function candidatosLogo(html, base) {
  const abs = (u) => { try { return new URL(u.replace(/&amp;/g, '&'), base).href; } catch (e) { return null; } };
  const lista = [];
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  imgs.forEach((tag) => {
    if (!/logo/i.test(tag)) return;
    const src = (tag.match(/\b(?:data-src|src)=["']([^"']+)["']/i) || [])[1];
    if (src && !/^data:/.test(src)) lista.push({ url: abs(src), metodo: 'img con "logo"' });
  });
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1];
  if (og) lista.push({ url: abs(og), metodo: 'og:image' });
  const iconos = html.match(/<link\b[^>]*rel=["'][^"']*(apple-touch-icon|icon)[^"']*["'][^>]*>/gi) || [];
  iconos.forEach((tag) => { const h = (tag.match(/href=["']([^"']+)["']/i) || [])[1]; if (h) lista.push({ url: abs(h), metodo: 'icono del sitio' }); });
  return lista.filter((c) => c.url);
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' };

(async () => {
  const ranking = cargarRanking();
  const presencia = ranking.slice().sort((a, b) => b.tiendas.length - a.tiendas.length || b.n - a.n || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 10);
  const filas = [];
  for (const m of presencia) {
    const sitio = SITIOS[m.slug];
    const fila = { marca: m.nombre, catalogos: m.tiendas.length, productos: m.n, carpeta: m.carpeta, sitio: sitio || '', estado: '', titulo: '', logo: '', metodo: '', bytes: 0, nota: NOTAS[m.slug] || '' };
    filas.push(fila);
    if (!sitio || !m.carpeta) { fila.estado = 'sin sitio o sin carpeta'; continue; }
    const carpeta = path.join(RAIZ, m.carpeta);
    const web = path.join(carpeta, 'pagina web.txt');
    if (!fs.readFileSync(web, 'utf8').trim()) fs.writeFileSync(web, sitio + '\n' + (fila.nota ? fila.nota + '\n' : ''), 'utf8');
    const r = await obtener(sitio);
    fila.estado = r.ok ? 'OK ' + r.estado : String(r.estado);
    if (!r.ok) continue;
    fila.titulo = ((r.cuerpo.match(/<title[^>]*>([^<]*)/i) || [])[1] || '').trim().slice(0, 120);
    if (m.slug === 'pretul') { fila.logo = ''; fila.metodo = 'sin logo propio en el sitio del grupo'; console.log(m.nombre + ': ' + fila.estado + ' · ' + fila.metodo); continue; }
    for (const c of candidatosLogo(r.cuerpo, r.url)) {
      const img = await obtener(c.url, { binario: true, intentos: 1 });
      const tipo = (img.tipo || '').split(';')[0].trim();
      if (!img.ok || !EXT[tipo] || img.cuerpo.length < 300) continue;
      if (fs.readdirSync(carpeta).some((f) => /^logo\./i.test(f))) { fila.logo = 'ya existía'; break; }
      const archivo = 'logo.' + EXT[tipo];
      fs.writeFileSync(path.join(carpeta, archivo), img.cuerpo);
      Object.assign(fila, { logo: archivo, metodo: c.metodo + ' · ' + c.url, bytes: img.cuerpo.length });
      break;
    }
    console.log(`${m.nombre}: ${fila.estado} · logo ${fila.logo || 'no encontrado'} (${fila.metodo.split(' · ')[0] || '-'})`);
  }

  fs.mkdirSync(VERIFICACION, { recursive: true });
  const archivo = path.join(VERIFICACION, 'Piloto_scraping_10.xlsx');
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(archivo)) await wb.xlsx.readFile(archivo);
  if (wb.getWorksheet('Identidad')) wb.removeWorksheet(wb.getWorksheet('Identidad').id);
  const h = wb.addWorksheet('Identidad');
  h.addTable({
    name: 'T_Identidad', ref: 'A1', headerRow: true, style: { theme: 'TableStyleMedium7', showRowStripes: true },
    columns: ['MARCA', 'CATALOGOS', 'PRODUCTOS', 'CARPETA', 'SITIO OFICIAL', 'ESTADO', 'TITULO DE LA PAGINA', 'LOGO', 'METODO', 'BYTES', 'NOTA'].map((name) => ({ name })),
    rows: filas.map((f) => [f.marca, f.catalogos, f.productos, f.carpeta, f.sitio, f.estado, f.titulo, f.logo, f.metodo, f.bytes, f.nota]),
  });
  h.columns = [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 38 }, { width: 34 }, { width: 10 }, { width: 50 }, { width: 12 }, { width: 70 }, { width: 10 }, { width: 50 }];
  await wb.xlsx.writeFile(archivo);
  console.log(`Piloto identidad: ${filas.filter((f) => f.logo).length}/10 logos, ${filas.filter((f) => /^OK/.test(f.estado)).length}/10 sitios -> ${path.relative(RAIZ, archivo)}`);
})().catch((e) => { console.error(e); process.exit(1); });
