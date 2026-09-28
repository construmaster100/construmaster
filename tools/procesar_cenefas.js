// Quita el fondo (verde croma o blanco) de las cenefas y marcos de img/ y guarda una version
// WebP transparente en img/corporativo/. Los originales no se modifican.
//   node tools/procesar_cenefas.js
// Se rellena el fondo desde los bordes y desde el centro (los marcos tienen el interior hueco),
// asi los brillos blancos o dorados de la propia pieza no se borran.
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.resolve(__dirname, '..');
const PIEZAS = [
  { origen: 'img/CENEFA.png', destino: 'img/corporativo/cenefa_estructura.webp', fondo: 'verde', recortar: true },
  { origen: 'img/Cenefa flejes y aceros.png', destino: 'img/corporativo/marco_estructura_vertical.webp', fondo: 'verde' },
  { origen: 'img/cenefa vertical.png', destino: 'img/corporativo/marco_dorado_vertical.webp', fondo: 'blanco' },
];

const esFondo = {
  verde: (r, g, b) => g > 120 && g - Math.max(r, b) > 60,
  blanco: (r, g, b) => r > 232 && g > 232 && b > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 18,
};

async function procesar({ origen, destino, fondo, recortar }) {
  const { data, info } = await sharp(path.join(RAIZ, origen)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const prueba = esFondo[fondo];
  const marcado = new Uint8Array(w * h);
  const pila = [];
  const sembrar = (x, y) => { const i = y * w + x; if (!marcado[i] && prueba(...px(i))) { marcado[i] = 1; pila.push(i); } };
  for (let x = 0; x < w; x++) { sembrar(x, 0); sembrar(x, h - 1); }
  for (let y = 0; y < h; y++) { sembrar(0, y); sembrar(w - 1, y); }
  sembrar(w >> 1, h >> 1);
  while (pila.length) {
    const i = pila.pop(); const x = i % w; const y = (i / w) | 0;
    if (x > 0) sembrar(x - 1, y); if (x < w - 1) sembrar(x + 1, y);
    if (y > 0) sembrar(x, y - 1); if (y < h - 1) sembrar(x, y + 1);
  }
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (marcado[i]) { data[o + 3] = 0; continue; }
    if (fondo === 'verde') {
      // Borde suave y sin halo verde: el arte es dorado/plateado, no tiene verdes propios.
      const [r, g, b] = px(i); const exceso = g - Math.max(r, b);
      if (exceso > 0) { data[o + 1] = Math.max(r, b); if (exceso > 25) data[o + 3] = Math.max(0, 255 - (exceso - 25) * 4); }
    }
  }
  const limpio = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  // La cenefa horizontal se recorta a su contenido; los marcos conservan su lienzo (el slide se calibra sobre el).
  const salida = recortar ? sharp(limpio).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }) : sharp(limpio);
  await salida.webp({ quality: 88, alphaQuality: 90 }).toFile(path.join(RAIZ, destino));
  console.log(`${origen} -> ${destino}`);
}

(async () => { for (const p of PIEZAS) await procesar(p); })().catch((e) => { console.error(e); process.exit(1); });
