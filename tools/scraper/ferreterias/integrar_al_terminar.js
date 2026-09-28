// Vigilante: espera a que terminen las corridas del scraper (linea "fin:" en cada registro) y luego
// regenera el inventario (tools/generar_inventario.js) y prueba la pagina (tools/probar_pagina.js).
// Resultado en pages/PROVEEDORES/verificacion/registro_integracion.log
//   node tools/scraper/ferreterias/integrar_al_terminar.js <registro1.log> <registro2.log> ...
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const SALIDA = path.join(RAIZ, 'pages', 'PROVEEDORES', 'verificacion', 'registro_integracion.log');
const registros = process.argv.slice(2).map((r) => path.resolve(RAIZ, r));
const anotar = (m) => { const l = `[${new Date().toLocaleString('es-CO')}] ${m}\n`; fs.appendFileSync(SALIDA, l); };
const terminado = (r) => fs.existsSync(r) && /\] fin: /.test(fs.readFileSync(r, 'utf8'));

anotar('esperando: ' + registros.map((r) => path.relative(RAIZ, r)).join(' | '));
const reloj = setInterval(() => {
  if (!registros.every(terminado)) return;
  clearInterval(reloj);
  registros.forEach((r) => anotar(path.basename(r) + ' -> ' + (fs.readFileSync(r, 'utf8').match(/\] fin: (.*)/) || [])[1]));
  for (const script of ['generar_inventario.js', 'probar_pagina.js']) {
    try {
      const out = execFileSync(process.execPath, [path.join(RAIZ, 'tools', script)], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      anotar(`${script}:\n` + out.split('\n').filter((l) => /^Inventario:|FERRETERIAS|PROVEEDORES|RESULTADO|Sin errores|ERROR|FALLA/.test(l)).join('\n'));
    } catch (e) { anotar(`${script} FALLO:\n${String(e.stdout || '').slice(-3000)}\n${String(e.stderr || e.message).slice(-2000)}`); }
  }
  anotar('integracion terminada');
}, 60000);
