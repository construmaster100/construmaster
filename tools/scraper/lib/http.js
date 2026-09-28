// Cliente HTTP cortes para el scraping de marcas (ConstruMaster).
// Reglas del plan (docs/PLAN_PROVEEDORES_MARCAS.md): solo paginas publicas, sin sesion, respetar
// robots.txt y como maximo una solicitud por segundo por sitio.
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36 ConstruMaster-investigacion';
const PAUSA_MS = Number(process.env.PAUSA_MS) || 1000; // Stretto: PAUSA_MS=2000 (paginas de ~2 MB; el sitio limito con 429)
const ultimo = new Map();
const robots = new Map();

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function turno(host) {
  const antes = ultimo.get(host) || 0;
  const falta = antes + PAUSA_MS - Date.now();
  if (falta > 0) await esperar(falta);
  ultimo.set(host, Date.now());
}

// Reglas "User-agent: *" del robots.txt del sitio.
async function reglasRobots(origen) {
  if (robots.has(origen)) return robots.get(origen);
  let reglas = [];
  try {
    const r = await fetch(origen + '/robots.txt', { headers: { 'User-Agent': AGENTE } });
    if (r.ok) {
      let aplica = false;
      (await r.text()).split(/\r?\n/).forEach((linea) => {
        const [k, ...v] = linea.split(':'); const valor = v.join(':').trim();
        if (/^user-agent$/i.test(k.trim())) aplica = valor === '*';
        else if (aplica && /^disallow$/i.test(k.trim()) && valor) reglas.push(valor);
      });
    }
  } catch (e) { reglas = []; }
  robots.set(origen, reglas);
  return reglas;
}

// Regla de robots.txt como expresion regular: "*" = cualquier texto, "$" al final = fin de la ruta.
function reglaARegex(regla) {
  const fin = regla.endsWith('$');
  const cuerpo = (fin ? regla.slice(0, -1) : regla).split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + (cuerpo.startsWith('/') || cuerpo.startsWith('.*') ? '' : '.*') + cuerpo + (fin ? '$' : ''));
}

async function permitido(url) {
  const u = new URL(url);
  const reglas = await reglasRobots(u.origin);
  return !reglas.some((r) => reglaARegex(r).test(u.pathname + u.search));
}

async function obtener(url, { binario = false, intentos = 2, cabeceras = {} } = {}) {
  if (!(await permitido(url))) return { ok: false, estado: 'robots', url };
  const host = new URL(url).host;
  for (let i = 0; i <= intentos; i++) {
    await turno(host);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': AGENTE, 'Accept-Language': 'es-CO,es;q=0.9', ...cabeceras }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      const tipo = r.headers.get('content-type') || '';
      // 429 = el sitio pide bajar el ritmo: se espera lo que indique Retry-After (o 30 s) y se reintenta.
      if (r.status === 429 && i < intentos) { const s = Number(r.headers.get('retry-after')) || 30; console.log(`  429 en ${host}: espera ${s} s`); await esperar(s * 1000); continue; }
      if (!r.ok) { if (r.status >= 500 && i < intentos) continue; return { ok: false, estado: r.status, url: r.url, tipo }; }
      const cuerpo = binario ? Buffer.from(await r.arrayBuffer()) : await r.text();
      return { ok: true, estado: r.status, url: r.url, tipo, cuerpo };
    } catch (e) {
      if (i === intentos) return { ok: false, estado: 'error: ' + e.message, url };
    }
  }
  return { ok: false, estado: 'sin respuesta', url };
}

module.exports = { obtener, permitido, esperar, AGENTE };
