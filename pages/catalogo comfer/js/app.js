(function () {
  'use strict';
  var datos = window.DATOS_COMFER;
  var productosBase = datos.productos || [];
  var nombresBase = {};
  productosBase.forEach(function (p) { nombresBase[normalizar(p.nombre)] = true; });
  var productosV1 = (window.PRODUCTOS_V1 || []).filter(function (p) { return !nombresBase[normalizar(p.nombre)]; });
  productosV1.forEach(function (p) {
    var nombre = normalizar(p.nombre);
    if (/varilla|grafil|alambre|malla|perfil/.test(nombre)) { p.categoria = 'Hierro'; p.subcategoria = 'Estructura'; }
    else if (/cemento/.test(nombre)) { p.categoria = 'Cemento'; p.subcategoria = 'Cementos'; }
    else if (/tubo|codo|union|tee|tapon|buje|adapt|curva|semicodo|soldadura|limpiador.*pvc/.test(nombre)) { p.categoria = 'PVC'; p.subcategoria = 'Tuberías y accesorios'; }
    else if (/pintura|vinilo|barniz|textuco|estuco|brocha|rodillo/.test(nombre)) { p.categoria = 'Pinturas'; p.subcategoria = 'Pinturas y herramientas'; }
    else if (/pegante|pegacor|megapega|boquilla|mastic|alfaquick|concolor/.test(nombre)) { p.categoria = 'Materiales'; p.subcategoria = 'Pegantes y boquillas'; }
    else { p.categoria = 'Materiales'; p.subcategoria = 'Aseo y complementos'; }
  });
  var todosProductos = productosBase.concat(productosV1);
  var vistaActual = 'resumen';
  var filtroTexto = '';

  var ACABADOS = [
    { nombre: 'Pisos', url: 'https://www.comfer.co/pisos', local: true, categoria: 'Pisos' },
    { nombre: 'Paredes', url: 'https://www.comfer.co/paredes', local: true, categoria: 'Paredes' },
    { nombre: 'Sanitarios', url: 'https://www.comfer.co/sanitarios', local: true, categoria: 'Sanitarios' },
    { nombre: 'Lavamanos', url: 'https://www.comfer.co/lavamanos', local: true, categoria: 'Lavamanos' },
    { nombre: 'Combos de baño', url: 'https://www.comfer.co/combos-de-bano', local: true, categoria: 'Combos de Baño' },
    { nombre: 'Griferías', url: 'https://www.comfer.co/griferias', local: true, categoria: 'Griferías' },
    { nombre: 'Duchas', url: 'https://www.comfer.co/duchas-regaderas', local: true, categoria: 'Duchas' },
    { nombre: 'Cocinas integrales', url: 'https://www.comfer.co/muebles-para-cocina-integral', local: true, categoria: 'Cocinas Integrales' },
    { nombre: 'Muebles de baño', url: 'https://www.comfer.co/muebles-bano', local: true, categoria: 'Muebles de Baño' },
    { nombre: 'Jacuzzis', url: 'https://www.comfer.co/jacuzzis-hidromasajes', local: true, categoria: 'Jacuzzis' },
    { nombre: 'Accesorios de baño', url: 'https://www.comfer.co/accesorios-bano', local: true, categoria: 'Accesorios de Baño' },
    { nombre: 'Pinturas', url: 'https://www.comfer.co/pinturas', local: true, categoria: 'Pinturas' }
  ];

  function escapar(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function formatoMoneda(n) { return n == null ? '' : '$ ' + Number(n).toLocaleString('es-CO'); }
  function normalizar(t) { return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function slug(t) { return normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function imagenProducto(p) { return p.imagen || ('imagenes/' + slug(p.nombre) + '.svg'); }

  var NAV_GLOBAL = [
    { texto: 'Inicio', href: '../presupuesto y seguimiento de obra/index.html#inicio' },
    { texto: 'MP', href: '../presupuesto y seguimiento de obra/index.html#mp-resumen', titulo: 'Proyectado · Boulevard de los Sueños' },
    { texto: 'ME', href: '../presupuesto y seguimiento de obra/index.html#me-resumen', titulo: 'Modelo Ejecutado · V1 Construmaster' },
    { texto: 'MO', href: '../presupuesto y seguimiento de obra/index.html#mo-resumen', titulo: 'Modelo Optimizado · pendiente de construir' },
    { texto: 'Materiales', href: '../presupuesto y seguimiento de obra/index.html#materiales' },
    { texto: 'Catálogo Homecenter', href: '../catalogo homecenter/index.html' },
    { texto: 'Catálogo COMFER', activo: true },
  ];

  function renderNavGlobal() {
    var html = NAV_GLOBAL.map(function (t) {
      if (t.activo) return '<button type="button" class="activo" disabled title="Estás acá">' + t.texto + '</button>';
      return '<a href="' + t.href + '" title="' + escapar(t.titulo || '') + '" style="text-decoration:none;">' + t.texto + '</a>';
    }).join('');
    document.getElementById('navtabs').innerHTML = html;
  }

  // ---- agrupar por categoria/subcategoria ----
  var CATEGORIAS = {};
  todosProductos.forEach(function (p) {
    if (!CATEGORIAS[p.categoria]) CATEGORIAS[p.categoria] = {};
    if (!CATEGORIAS[p.categoria][p.subcategoria]) CATEGORIAS[p.categoria][p.subcategoria] = [];
    CATEGORIAS[p.categoria][p.subcategoria].push(p);
  });

  function renderSidebar() {
    var html = '<button type="button" class="item-sidebar' + (vistaActual === 'resumen' ? ' activo' : '') + '" data-vista="resumen">Resumen</button>' +
      '<button type="button" class="item-sidebar' + (vistaActual === 'productos' ? ' activo' : '') + '" data-vista="productos">Todos los productos</button>' +
      '<button type="button" class="item-sidebar' + (vistaActual === 'acabados' ? ' activo' : '') + '" data-vista="acabados">Acabados</button>';
    Object.keys(CATEGORIAS).forEach(function (cat) {
      var subs = CATEGORIAS[cat];
      var abierto = vistaActual.indexOf('cat-' + slug(cat) + '-') === 0 || vistaActual === 'cat-' + slug(cat);
      html += '<details class="grupo-etapa"' + (abierto ? ' open' : '') + '>' +
        '<summary style="border-left-color:#2b2d34">' + escapar(cat) + '</summary>' +
        '<button type="button" class="item-capitulo' + (vistaActual === 'cat-' + slug(cat) ? ' activo' : '') + '" data-vista="cat-' + slug(cat) + '" style="padding-left:18px;">Ver todas en grilla</button>';
      Object.keys(subs).forEach(function (sub) {
        var v = 'cat-' + slug(cat) + '-' + slug(sub);
        html += '<button type="button" class="item-capitulo' + (vistaActual === v ? ' activo' : '') + '" data-vista="' + v + '" style="padding-left:18px;">' + escapar(sub) + ' (' + subs[sub].length + ')</button>';
      });
      html += '</details>';
    });
    var cont = document.getElementById('sidebar-contenido');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }

  function tarjetaProducto(p) {
    return '<div class="tarjeta-producto">' +
      '<div class="visual-producto">' +
      (p.urlOriginal ? '<a href="' + escapar(p.urlOriginal) + '" target="_blank" rel="noopener" title="Abrir imagen original en comfer.co">' : '') +
      '<img src="' + escapar(imagenProducto(p)) + '" alt="' + escapar(p.nombre) + '" loading="lazy" data-imagen-producto>' +
      (p.urlOriginal ? '</a>' : '') +
      '<div class="imagen-ausente"><strong>' + escapar(p.nombre) + '</strong><span>' + formatoMoneda(p.precio) + '</span></div></div>' +
      '<div class="cuerpo">' +
      '<span class="nombre">' + (p.urlOriginal ? '<a href="' + escapar(p.urlOriginal) + '" target="_blank" rel="noopener">' + escapar(p.nombre) + '</a>' : escapar(p.nombre)) + '</span>' +
      '<span class="precio">' + formatoMoneda(p.precio) + '</span>' +
      (p.urlOriginal ? '<a class="enlace-original" href="' + escapar(p.urlOriginal) + '" target="_blank" rel="noopener">Imagen original ↗</a>' : '') +
      '</div></div>';
  }

  function renderResumen() {
    var totalCats = Object.keys(CATEGORIAS).length;
    var html = '<h2>Catálogo COMFER</h2>' +
      '<p>Leído de <a href="' + datos.fuente + '" target="_blank" rel="noopener">comfer.co</a> el ' + datos.fechaLectura + '. ' + todosProductos.length + ' productos en ' + totalCats + ' departamentos.</p>' +
      '<div class="aviso-nota">' + escapar(datos.nota) + '</div>' +
      '<p>Excel con nombre, precio y ruta de imagen: <code>catalogo_comfer.xlsx</code> (en esta misma carpeta).</p>' +
      '<button type="button" class="item-sidebar" data-vista="productos" style="display:inline-block;width:auto;border:1px solid var(--color-borde);border-radius:6px;">Ver listado completo de productos</button>';
    Object.keys(CATEGORIAS).forEach(function (cat) {
      var totalProductosCat = Object.keys(CATEGORIAS[cat]).reduce(function (a, s) { return a + CATEGORIAS[cat][s].length; }, 0);
      html += '<h3 class="titulo-etapa">' + escapar(cat) + ' (' + totalProductosCat + ')</h3><div class="grilla-capitulos">';
      Object.keys(CATEGORIAS[cat]).forEach(function (sub) {
        var v = 'cat-' + slug(cat) + '-' + slug(sub);
        html += '<button type="button" class="tarjeta-capitulo" data-vista="' + v + '">' +
          '<span class="num">' + CATEGORIAS[cat][sub].length + ' productos</span><span class="nombre">' + escapar(sub) + '</span></button>';
      });
      html += '</div>';
    });
    return html;
  }

  function renderAcabados() {
    var html = '<h2>Acabados</h2>' +
      '<p>Explora las mismas pestañas de acabados de <a href="https://www.comfer.co/" target="_blank" rel="noopener">comfer.co</a>, con foto, nombre y precio reales cargados localmente.</p>' +
      '<div class="grilla-capitulos">';
    ACABADOS.forEach(function (item) {
      var cantidad = item.categoria && CATEGORIAS[item.categoria] ? Object.keys(CATEGORIAS[item.categoria]).reduce(function (a, s) { return a + CATEGORIAS[item.categoria][s].length; }, 0) : 0;
      var vista = item.local && cantidad ? 'cat-' + slug(item.categoria) : '';
      html += '<div class="tarjeta-capitulo">' +
        '<span class="num">' + (cantidad ? cantidad + ' productos locales' : 'Catálogo COMFER') + '</span>' +
        '<span class="nombre">' + escapar(item.nombre) + '</span>' +
        '<span class="subtotal">' + (vista ? '<button type="button" data-vista="' + vista + '">Abrir en el catálogo</button>' : '<a href="' + item.url + '" target="_blank" rel="noopener">Explorar en comfer.co ↗</a>') + '</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderCategoria(cat, sub) {
    var productos = CATEGORIAS[cat][sub];
    var filtrados = filtroTexto ? productos.filter(function (p) { return normalizar(p.nombre).indexOf(normalizar(filtroTexto)) !== -1; }) : productos;
    var nota = productos[0].nota ? '<div class="aviso-nota">' + escapar(productos[0].nota) + '</div>' : '';
    return '<h2>' + escapar(cat) + ' › ' + escapar(sub) + '</h2>' + nota +
      '<input type="text" class="buscador-productos" id="buscador-productos" placeholder="Buscar dentro de esta subcategoría…" value="' + escapar(filtroTexto) + '">' +
      '<p class="fuente-hoja">' + filtrados.length + ' producto(s)</p>' +
      '<div class="grilla-productos">' + filtrados.map(tarjetaProducto).join('') + '</div>';
  }

  function renderDepartamento(cat) {
    var subs = CATEGORIAS[cat];
    var total = Object.keys(subs).reduce(function (a, s) { return a + subs[s].length; }, 0);
    var html = '<h2>' + escapar(cat) + '</h2>' +
      '<p class="fuente-hoja">' + total + ' producto(s) con foto real, agrupados por subcategoría.</p>';
    Object.keys(subs).forEach(function (sub) {
      var productos = subs[sub];
      html += '<div class="bloque-subcat">' +
        '<div class="cabecera-subcat"><span class="nombre">' + escapar(sub) + '</span> <span class="conteo">(' + productos.length + ' productos)</span></div>' +
        '<details class="detalle-productos"><summary>Ver ' + productos.length + ' productos (con imagen) ▾</summary>' +
        '<div class="grilla-productos">' + productos.map(tarjetaProducto).join('') + '</div>' +
        '</details></div>';
    });
    return html;
  }

  function renderProductos() {
    var filtrados = filtroTexto ? todosProductos.filter(function (p) { return normalizar(p.nombre).indexOf(normalizar(filtroTexto)) !== -1; }) : todosProductos;
    return '<h2>Listado completo de productos</h2>' +
      '<p class="fuente-hoja">' + filtrados.length + ' de ' + todosProductos.length + ' productos del catálogo COMFER y V1 Construmaster.</p>' +
      '<input type="text" class="buscador-productos" id="buscador-productos" placeholder="Buscar producto en todo el catálogo..." value="' + escapar(filtroTexto) + '">' +
      '<div class="grilla-productos">' + filtrados.map(tarjetaProducto).join('') + '</div>';
  }

  function conectarBuscador(main) {
    var input = document.getElementById('buscador-productos');
    if (!input) return;
    input.addEventListener('input', function () {
      filtroTexto = input.value;
      mostrarVista(vistaActual);
      var nuevo = document.getElementById('buscador-productos');
      nuevo.focus();
      nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length);
    });
  }

  function conectarImagenes(main) {
    main.querySelectorAll('img[data-imagen-producto]').forEach(function (img) {
      img.addEventListener('error', function () {
        img.closest('.tarjeta-producto').classList.add('sin-imagen');
      }, { once: true });
    });
  }

  function conectarClicksMain(main) {
    main.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
    conectarBuscador(main);
    conectarImagenes(main);
  }

  function mostrarVista(vista) {
    vistaActual = vista;
    if (vista.indexOf('cat-') !== 0) filtroTexto = '';
    renderSidebar();
    var main = document.getElementById('main-contenido');
    if (vista === 'resumen') { main.innerHTML = renderResumen(); conectarClicksMain(main); return; }
    if (vista === 'productos') { main.innerHTML = renderProductos(); conectarClicksMain(main); return; }
    if (vista === 'acabados') { main.innerHTML = renderAcabados(); conectarClicksMain(main); return; }
    var encontrado = null;
    Object.keys(CATEGORIAS).some(function (cat) {
      return Object.keys(CATEGORIAS[cat]).some(function (sub) {
        if ('cat-' + slug(cat) + '-' + slug(sub) === vista) { encontrado = [cat, sub]; return true; }
        return false;
      });
    });
    if (encontrado) { main.innerHTML = renderCategoria(encontrado[0], encontrado[1]); conectarClicksMain(main); return; }
    var categoria = Object.keys(CATEGORIAS).filter(function (cat) { return 'cat-' + slug(cat) === vista; })[0];
    if (categoria) { main.innerHTML = renderDepartamento(categoria); conectarClicksMain(main); }
  }

  renderNavGlobal();
  mostrarVista('resumen');
})();
