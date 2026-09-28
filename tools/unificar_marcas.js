const fs = require('fs');
const path = require('path');

const RAIZ = 'D:\\Modelo de Presupuesto\\Presupuesto de obra';
const BASE_MARCAS = path.join(RAIZ, 'pages', 'Paginas especializadas');

// { carpeta, marca, upsHastaPages (para calcular rutas relativas) }
const PAGINAS = [
  { rel: 'ALFA/index.html', marca: 'ALFA', upsPages: 2, upsRoot: 3 },
  { rel: 'BAEZO/index.html', marca: 'BAEZO', upsPages: 2, upsRoot: 3 },
  { rel: 'corona/index.html', marca: 'Corona', upsPages: 2, upsRoot: 3 },
  { rel: 'IPECOL/index.html', marca: 'IPECOL', upsPages: 2, upsRoot: 3 },
  { rel: 'PAVCO/index.html', marca: 'PAVCO', upsPages: 2, upsRoot: 3 },
  { rel: 'PinturasYYesos/index.html', marca: 'Pinturas y Yesos', upsPages: 2, upsRoot: 3 },
  { rel: 'SANTAFE/index.html', marca: 'SANTAFE', upsPages: 2, upsRoot: 3 },
  { rel: 'Soelco/index.html', marca: 'Soelco', upsPages: 2, upsRoot: 3 },
  { rel: 'Solimpro/index.html', marca: 'Solimpro', upsPages: 2, upsRoot: 3 },
  { rel: 'G&J/inventario-gyj/index.html', marca: 'G&J', upsPages: 3, upsRoot: 4 },
];

function rutas(upsPages, upsRoot) {
  const p = '../'.repeat(upsPages);
  const r = '../'.repeat(upsRoot);
  return {
    root: r + 'index.html',
    motor: r + 'assets/motor/identidad_navbar.css',
    presupuesto: p + 'presupuesto y seguimiento de obra/index.html',
    homecenter: p + 'catalogo homecenter/index.html',
    comfer: p + 'catalogo comfer/index.html',
    etapas: p + 'etapas de obra/index.html',
  };
}

let procesadas = 0;
PAGINAS.forEach(pg => {
  const archivo = path.join(BASE_MARCAS, pg.rel.replace('/', path.sep));
  if (!fs.existsSync(archivo)) { console.log('NO EXISTE:', archivo); return; }
  let html = fs.readFileSync(archivo, 'utf8');
  const r = rutas(pg.upsPages, pg.upsRoot);

  if (html.indexOf('site-header') !== -1) { console.log('YA UNIFICADO, se omite:', pg.rel); return; }

  // 1) agregar hoja de estilos compartida en <head>, despues de styles.css
  html = html.replace(
    /<link rel="stylesheet" href="styles.css" \/>/,
    `<link rel="stylesheet" href="${r.motor}" />\n<link rel="stylesheet" href="styles.css" />`
  );

  // 2) insertar header+nav justo despues de <body>
  const encabezado = `<body>
  <header class="site-header">
    <a class="site-logo" href="${r.root}" title="Volver a ConstruMaster">
      <span class="logo-emblema">CM<small>construmaster</small></span>
    </a>
    <div class="site-banner" role="img" aria-label="${pg.marca} · Catálogo"></div>
  </header>
  <nav class="topnav" aria-label="Navegación">
    <div class="navtabs">
      <a href="${r.root}">Inicio</a>
      <a href="${r.presupuesto}">Presupuesto</a>
      <a href="${r.homecenter}">Catálogo Homecenter</a>
      <a href="${r.comfer}">Catálogo COMFER</a>
      <a href="${r.etapas}">Etapas de Obra</a>
    </div>
  </nav>
`;
  html = html.replace(/<body>\s*/, encabezado);

  fs.writeFileSync(archivo, html, 'utf8');
  console.log('OK ->', pg.rel);
  procesadas++;
});

console.log('\nTotal procesadas:', procesadas, 'de', PAGINAS.length);
