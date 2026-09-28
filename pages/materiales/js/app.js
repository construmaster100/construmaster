(function () {
  'use strict';

  var ME = window.DATOS_CONSTRUMASTER;
  var COMFER = window.DATOS_COMFER;
  var HOMECENTER = window.DATOS_HOMECENTER;

  var TODOS = [];
  ((ME && ME.materiales) || []).forEach(function (m) {
    TODOS.push({ nombre: m.nombre, precio: m.precio, categoria: (m.etiquetas || [])[0] || 'General', imagen: '', fuente: 'Presupuesto (interno)' });
  });
  ((COMFER && COMFER.productos) || []).forEach(function (p) {
    TODOS.push({ nombre: p.nombre, precio: p.precio, categoria: p.categoria || 'General', imagen: p.imagen ? '../CATALOGOS/catalogo comfer/' + p.imagen : '', fuente: 'COMFER' });
  });
  ((HOMECENTER && HOMECENTER.productos) || []).forEach(function (p) {
    TODOS.push({ nombre: p.nombre, precio: p.precio, categoria: p.categoria || 'General', imagen: p.imagen ? '../CATALOGOS/catalogo homecenter/' + p.imagen : '', fuente: 'Homecenter' });
  });
  (window.DATOS_MAESTRO_MATERIALES && window.DATOS_MAESTRO_MATERIALES.productos || []).forEach(function (p) {
    TODOS.push({ nombre: p[0], precio: p[1], categoria: p[2], subcategoria: p[3], imagen: p[4], fuente: p[5] });
  });

  var NAV_GLOBAL = [
    { texto: 'Inicio', href: '../../index.html' },
    { texto: 'Presupuesto y seguimiento', href: '../presupuesto y seguimiento de obra/index.html' },
    { texto: 'Catálogo COMFER', href: '../CATALOGOS/catalogo comfer/index.html' },
    { texto: 'Catálogo Homecenter', href: '../CATALOGOS/catalogo homecenter/index.html' },
    { texto: 'Etapas de Obra', href: '../../index.html#presupuestos-vista' },
    { texto: 'Materiales', activo: true },
  ];

  var filtro = '';
  var fuenteActiva = '';
  var LIMITE = 200;

  function renderNav() {
    document.getElementById('navtabs').innerHTML = NAV_GLOBAL.map(function (t) {
      if (t.activo) return '<button type="button" class="activo" disabled title="Estás acá">' + t.texto + '</button>';
      return '<a href="' + t.href + '">' + t.texto + '</a>';
    }).join('');
  }

  function conteoPorFuente() {
    var c = {};
    TODOS.forEach(function (m) { c[m.fuente] = (c[m.fuente] || 0) + 1; });
    return c;
  }

  function renderSidebar() {
    var conteos = conteoPorFuente();
    var fuentes = Object.keys(conteos);
    var html = '<div style="padding:16px 18px;">' +
      '<p style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-texto-suave);margin:0 0 10px;">Fuente</p>' +
      '<button type="button" class="item-sidebar' + (!fuenteActiva ? ' activo' : '') + '" data-fuente="">Todas (' + TODOS.length + ')</button>' +
      fuentes.map(function (f) {
        return '<button type="button" class="item-sidebar' + (fuenteActiva === f ? ' activo' : '') + '" data-fuente="' + Motor.escaparHtml(f) + '">' + Motor.escaparHtml(f) + ' (' + conteos[f] + ')</button>';
      }).join('') + '</div>';
    var cont = document.getElementById('sidebar-contenido');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-fuente]').forEach(function (el) {
      el.addEventListener('click', function () { fuenteActiva = el.getAttribute('data-fuente'); renderTodo(); });
    });
  }

  function renderMain() {
    var textoNorm = Motor.normalizar(filtro || '');
    var filtrados = TODOS.filter(function (m) {
      if (fuenteActiva && m.fuente !== fuenteActiva) return false;
      if (textoNorm && Motor.normalizar(m.nombre).indexOf(textoNorm) === -1) return false;
      return true;
    });
    var mostrar = filtrados.slice(0, LIMITE);
    var filas = mostrar.map(function (m) {
      var img = m.imagen ? '<img src="' + Motor.escaparHtml(m.imagen) + '" alt="" loading="lazy" decoding="async" style="width:34px;height:34px;object-fit:contain;border-radius:4px;vertical-align:middle;margin-right:8px;">' : '';
      return '<tr><td>' + img + Motor.escaparHtml(m.nombre) + '</td><td>' + Motor.escaparHtml(m.categoria) + '</td><td>' + Motor.escaparHtml(m.fuente) + '</td><td>' + Motor.formatoMoneda(m.precio) + '</td></tr>';
    }).join('');
    var aviso = filtrados.length > LIMITE ? '<p class="fuente-hoja">Mostrando ' + LIMITE + ' de ' + filtrados.length + ' resultados — refiná la búsqueda para ver más.</p>' : '';
    document.getElementById('main-contenido').innerHTML =
      '<h2>Materiales</h2>' +
      '<p class="fuente-hoja">Búsqueda en el Excel maestro y los catálogos de ConstruMaster, COMFER y Homecenter.</p>' +
      '<input type="text" class="buscador-materiales" id="buscador-materiales" placeholder="Buscar material por nombre…" value="' + Motor.escaparHtml(filtro) + '">' +
      '<p class="fuente-hoja">' + filtrados.length + ' resultado(s)</p>' +
      '<table class="tabla-presupuesto tabla-materiales"><thead><tr><th>Nombre</th><th>Categoría</th><th>Fuente</th><th>Precio</th></tr></thead><tbody>' +
      (filas || '<tr><td colspan="4" class="vacio">Sin resultados.</td></tr>') + '</tbody></table>' + aviso;
    document.querySelectorAll('#main-contenido img').forEach(function (imagen) {
      imagen.addEventListener('error', function () { imagen.remove(); }, { once: true });
    });
    var input = document.getElementById('buscador-materiales');
    input.addEventListener('input', function () {
      filtro = input.value;
      renderMain();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function renderTodo() { renderSidebar(); renderMain(); }

  renderNav();
  renderTodo();
}());
