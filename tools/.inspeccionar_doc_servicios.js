const fs = require('fs');
const path = require('path');
const JSZip = require('./node_modules/jszip');

const archivo = fs.readdirSync(path.join(__dirname, '..', 'docs', 'Servicios')).find((n) => n.toLowerCase().endsWith('.docx'));
const bytes = fs.readFileSync(path.join(__dirname, '..', 'docs', 'Servicios', archivo));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

JSZip.loadAsync(bytes).then(async (zip) => {
  const xml = await zip.file('word/document.xml').async('string');
  const tablas = [...xml.matchAll(/<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g)];
  console.log('DOCX:', archivo, 'TABLES:', tablas.length);
  for (let i = 0; i < Math.min(tablas.length, 12); i += 1) {
    const filas = [...tablas[i][1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((m) => [...m[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map((c) => decode([...c[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) => t[1]).join(''))));
    console.log('TABLE', i + 1, 'ROWS', filas.length, JSON.stringify(filas.slice(0, 6)));
  }
  let detalle = 0;
  const ejemplosTotales = [];
  for (const tabla of tablas) {
    const filas = [...tabla[1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((m) => [...m[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map((c) => decode([...c[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) => t[1]).join(''))));
    if (!(filas[0] || []).some((v) => /descripcion/i.test(v)) || !(filas[0] || []).some((v) => /vr\. unitario/i.test(v))) continue;
    for (const fila of filas.slice(1)) {
      if (fila.length >= 3 && fila[0] && fila[1] && fila[2]) detalle += 1;
      if (/total/i.test(fila.join(' ')) && ejemplosTotales.length < 10) ejemplosTotales.push(fila);
    }
  }
  console.log('DETAIL_ROWS', detalle, 'TOTALS', JSON.stringify(ejemplosTotales));
  const textos = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((m) => decode([...m[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) => t[1]).join(''))).filter(Boolean);
  console.log('FIRST PARAGRAPHS:', JSON.stringify(textos.slice(0, 45)));
}).catch((err) => { console.error(err); process.exitCode = 1; });
