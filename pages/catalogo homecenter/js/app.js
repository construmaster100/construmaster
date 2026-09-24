(function () {
  'use strict';
  var datos = window.DATOS_HOMECENTER;
  var vistaActual = 'resumen';
  var CLAVE_SELECCION = 'cm_categorias_seleccionadas';

  function escapar(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function formatoNumero(n) { return n == null ? '?' : n.toLocaleString('es-CO'); }

  var NAV_GLOBAL = [
    { texto: 'Inicio', href: '../presupuesto y seguimiento de obra/index.html#inicio' },
    { texto: 'MP', href: '../presupuesto y seguimiento de obra/index.html#mp-resumen', titulo: 'Proyectado · Boulevard de los Sueños' },
    { texto: 'ME', href: '../presupuesto y seguimiento de obra/index.html#me-resumen', titulo: 'Modelo Ejecutado · V1 Construmaster' },
    { texto: 'MO', href: '../presupuesto y seguimiento de obra/index.html#mo-resumen', titulo: 'Modelo Optimizado · pendiente de construir' },
    { texto: 'Materiales', href: '../presupuesto y seguimiento de obra/index.html#materiales' },
    { texto: 'Catálogo Homecenter', activo: true },
    { texto: 'Catálogo COMFER', href: '../catalogo comfer/index.html' },
  ];

  function renderNavGlobal() {
    var html = NAV_GLOBAL.map(function (t) {
      if (t.activo) return '<button type="button" class="activo" disabled title="Estás acá">' + t.texto + '</button>';
      return '<a href="' + t.href + '" title="' + escapar(t.titulo || '') + '" style="text-decoration:none;">' + t.texto + '</a>';
    }).join('');
    document.getElementById('navtabs').innerHTML = html;
  }

  function cargarSeleccion() {
    try { return JSON.parse(localStorage.getItem(CLAVE_SELECCION) || '[]'); } catch (e) { return []; }
  }
  function guardarSeleccion(lista) {
    try { localStorage.setItem(CLAVE_SELECCION, JSON.stringify(lista)); } catch (e) {}
  }
  function claveSubcat(dep, sub) { return dep.nombre + ' » ' + sub.nombre; }
  function estaSeleccionada(dep, sub) {
    return cargarSeleccion().indexOf(claveSubcat(dep, sub)) !== -1;
  }
  function alternarSeleccion(dep, sub) {
    var lista = cargarSeleccion();
    var clave = claveSubcat(dep, sub);
    var idx = lista.indexOf(clave);
    if (idx === -1) lista.push(clave); else lista.splice(idx, 1);
    guardarSeleccion(lista);
  }

  function slug(nombre) { return nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function formatoMoneda(n) { return n == null ? '' : '$ ' + Number(n).toLocaleString('es-CO'); }

  var PRODUCTOS = datos.productos || [];
  function productosDeSubcategoria(nombreSub) {
    return PRODUCTOS.filter(function (p) { return p.subcategoria === nombreSub; });
  }

  function vistaSubcategoria(dep, sub) { return 'subcat-' + slug(dep.nombre) + '__' + slug(sub.nombre); }

  function depSlugDeVista(vista) {
    if (vista.indexOf('dep-') === 0) return vista.slice(4);
    if (vista.indexOf('subcat-') === 0) return vista.slice(7).split('__')[0];
    return null;
  }

  function renderSidebar() {
    var html = '<button type="button" class="item-sidebar' + (vistaActual === 'resumen' ? ' activo' : '') + '" data-vista="resumen">Resumen</button>';
    datos.departamentos.forEach(function (dep) {
      var depSlug = slug(dep.nombre);
      var abierto = depSlugDeVista(vistaActual) === depSlug;
      html += '<details class="grupo-etapa"' + (abierto ? ' open' : '') + '>' +
        '<summary style="border-left-color:#2b2d34">' + escapar(dep.nombre) + ' (' + dep.subcategorias.length + ')</summary>' +
        '<button type="button" class="item-capitulo' + (vistaActual === 'dep-' + depSlug ? ' activo' : '') + '" data-vista="dep-' + depSlug + '" style="padding-left:18px;">Ver todas en grilla</button>';
      dep.subcategorias.forEach(function (sub) {
        var vistaSub = vistaSubcategoria(dep, sub);
        html += '<button type="button" class="item-capitulo' + (vistaActual === vistaSub ? ' activo' : '') + '" data-vista="' + vistaSub + '" style="padding-left:30px;font-size:0.78rem;" title="' + escapar(sub.nombre) + '">' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapar(sub.nombre) + '</span>' +
          '<span style="color:var(--color-texto-suave);font-size:0.7rem;flex:0 0 auto;">' + (sub.cantidad != null ? formatoNumero(sub.cantidad) : '?') + '</span>' +
          '</button>';
      });
      html += '</details>';
    });
    var seleccion = cargarSeleccion();
    html += '<button type="button" class="item-sidebar' + (vistaActual === 'seleccion' ? ' activo' : '') + '" data-vista="seleccion">Seleccionadas (' + seleccion.length + ')</button>';
    var cont = document.getElementById('sidebar-contenido');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }

  function totalProductosConocidos() {
    var total = 0, desconocidas = 0;
    datos.departamentos.forEach(function (dep) {
      dep.subcategorias.forEach(function (s) {
        if (typeof s.cantidad === 'number') total += s.cantidad; else desconocidas++;
      });
    });
    return { total: total, desconocidas: desconocidas };
  }

  function renderResumen() {
    var stats = totalProductosConocidos();
    var totalSubcats = datos.departamentos.reduce(function (a, d) { return a + d.subcategorias.length; }, 0);
    var html = '<h2>Catálogo Homecenter · mapa de categorías</h2>' +
      '<p>Leído de <a href="' + datos.fuente + '" target="_blank" rel="noopener">' + datos.fuente + '</a> el ' + datos.fechaLectura + '.</p>' +
      '<div class="aviso-nota">Las 15 subcategorías de "Materiales de Construcción" y las 8 de "Herramientas y Maquinarias" ya tienen productos reales cargados (' + formatoNumero(PRODUCTOS.length) + ' en total, con nombre, precio y foto real leídos directamente de la API de homecenter.com.co) — entrá a esos departamentos y buscá el botón "Ver productos ya cargados". El resto de departamentos todavía es solo <strong>mapa</strong> (nombres, cantidad y enlaces). ' +
      'Marcá con el check las subcategorías que te interesan y quedan guardadas en "Seleccionadas" para seguir bajando el catálogo completo.</div>' +
      '<div class="grilla-capitulos">' +
      '<div class="campo" style="background:var(--color-panel);border:1px solid var(--color-borde);border-radius:10px;padding:14px 16px;"><label>Departamentos</label><span>' + datos.departamentos.length + '</span></div>' +
      '<div class="campo" style="background:var(--color-panel);border:1px solid var(--color-borde);border-radius:10px;padding:14px 16px;"><label>Subcategorías mapeadas</label><span>' + totalSubcats + '</span></div>' +
      '<div class="campo" style="background:var(--color-panel);border:1px solid var(--color-borde);border-radius:10px;padding:14px 16px;"><label>Productos ya cargados (foto real)</label><span>' + formatoNumero(PRODUCTOS.length) + '</span></div>' +
      '</div>' +
      '<h3 class="titulo-etapa">Departamentos</h3><div class="grilla-capitulos">';
    datos.departamentos.forEach(function (dep) {
      html += '<button type="button" class="tarjeta-capitulo" data-vista="dep-' + slug(dep.nombre) + '">' +
        '<span class="num">' + dep.subcategorias.length + ' subcategorías</span><span class="nombre">' + escapar(dep.nombre) + '</span>' +
        '<span class="subtotal">' + escapar(dep.nota || '') + '</span></button>';
    });
    html += '</div>';
    return html;
  }

  function renderDepartamento(dep) {
    var html = '<h2>' + escapar(dep.nombre) + '</h2>' +
      '<p class="fuente-hoja"><a href="' + dep.url + '" target="_blank" rel="noopener">Ver departamento en Homecenter ↗</a></p>';
    if (dep.nota) html += '<div class="aviso-nota">' + escapar(dep.nota) + '</div>';
    dep.subcategorias.forEach(function (sub) {
      var marcada = estaSeleccionada(dep, sub);
      var productos = productosDeSubcategoria(sub.nombre);
      html += '<div class="bloque-subcat">' +
        '<div class="cabecera-subcat">' +
        '<div><span class="nombre">' + escapar(sub.nombre) + '</span> <span class="conteo">' + (sub.cantidad != null ? '(' + formatoNumero(sub.cantidad) + ' productos)' : '(cantidad no visible en la página)') + '</span></div>' +
        '<div class="acciones-subcat">' +
        (sub.url ? '<a href="' + sub.url + '" target="_blank" rel="noopener">Ver en Homecenter ↗</a>' : '<span class="vacio">Sin enlace directo</span>') +
        '<label class="chk-seleccion"><input type="checkbox" data-dep="' + escapar(dep.nombre) + '" data-sub="' + escapar(sub.nombre) + '"' + (marcada ? ' checked' : '') + '> Seleccionar</label>' +
        '</div></div>';
      if (productos.length) {
        html += '<details class="detalle-productos"><summary>Ver ' + formatoNumero(productos.length) + ' productos cargados (con imagen) ▾</summary>' +
          '<div class="grilla-departamentos">' + productos.map(tarjetaProducto).join('') + '</div>' +
          '</details>';
      } else {
        html += '<div class="aviso-nota" style="margin:0;border-radius:0;">Todavía no hay productos reales cargados para esta subcategoría — es solo mapa.</div>';
      }
      html += '</div>';
    });
    return html;
  }

  function renderSubcategoria(dep, sub) {
    var marcada = estaSeleccionada(dep, sub);
    var productos = productosDeSubcategoria(sub.nombre);
    var html = '<p class="fuente-hoja">' + escapar(dep.nombre) + ' » <strong>' + escapar(sub.nombre) + '</strong></p>' +
      '<h2>' + escapar(sub.nombre) + '</h2>' +
      '<div class="acciones-subcat" style="margin-bottom:14px;">' +
      '<span class="conteo">' + (sub.cantidad != null ? formatoNumero(sub.cantidad) + ' productos en Homecenter' : 'cantidad no visible en la página') + '</span>' +
      '<label class="chk-seleccion"><input type="checkbox" data-dep="' + escapar(dep.nombre) + '" data-sub="' + escapar(sub.nombre) + '"' + (marcada ? ' checked' : '') + '> Seleccionar</label>' +
      '</div>' +
      (sub.url ? '<p class="fuente-hoja"><a href="' + sub.url + '" target="_blank" rel="noopener">Ver subcategoría en Homecenter ↗</a></p>' : '');
    if (productos.length) {
      var nota = productos[0].nota ? '<div class="aviso-nota">' + escapar(productos[0].nota) + '</div>' : '';
      html += nota + '<p class="fuente-hoja">' + formatoNumero(productos.length) + ' producto(s) — nombre, precio y foto real de homecenter.com.co.</p>' +
        '<div class="grilla-departamentos">' + productos.map(tarjetaProducto).join('') + '</div>';
    } else {
      html += '<div class="aviso-nota">Todavía no hay productos reales cargados para esta subcategoría — es solo mapa. Marcala con "Seleccionar" si querés priorizarla.</div>';
    }
    return html;
  }

  function tarjetaProducto(p) {
    return '<div class="tarjeta-subcat" style="padding:0;overflow:hidden;">' +
      '<img src="' + p.imagen + '" alt="' + escapar(p.nombre) + '" loading="lazy" style="width:100%;height:150px;object-fit:cover;display:block;background:#eee;">' +
      '<div style="padding:10px 12px;display:flex;flex-direction:column;gap:4px;">' +
      '<span class="nombre" style="font-size:0.8rem;">' + escapar(p.nombre) + '</span>' +
      '<span style="font-weight:700;color:var(--color-negra);">' + formatoMoneda(p.precio) + '</span>' +
      '</div></div>';
  }

  function renderSeleccion() {
    var seleccion = cargarSeleccion();
    if (!seleccion.length) return '<h2>Seleccionadas</h2><p class="vacio">Todavía no marcaste ninguna subcategoría. Entrá a un departamento y usá el check "Seleccionar".</p>';
    var html = '<h2>Seleccionadas (' + seleccion.length + ')</h2><p>Decime cuáles de estas querés que baje con productos, imágenes y precios, y armo el listado + Excel.</p><ul class="lista-seleccion">';
    seleccion.forEach(function (clave) {
      html += '<li>' + escapar(clave) + ' <button type="button" data-quitar="' + escapar(clave) + '">quitar</button></li>';
    });
    html += '</ul>';
    return html;
  }

  function conectarClicksMain(main) {
    main.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
    main.querySelectorAll('input[type="checkbox"][data-dep]').forEach(function (el) {
      el.addEventListener('change', function () {
        var dep = datos.departamentos.filter(function (d) { return d.nombre === el.getAttribute('data-dep'); })[0];
        var sub = dep.subcategorias.filter(function (s) { return s.nombre === el.getAttribute('data-sub'); })[0];
        alternarSeleccion(dep, sub);
        renderSidebar();
      });
    });
    main.querySelectorAll('[data-quitar]').forEach(function (el) {
      el.addEventListener('click', function () {
        var lista = cargarSeleccion().filter(function (c) { return c !== el.getAttribute('data-quitar'); });
        guardarSeleccion(lista);
        mostrarVista('seleccion');
      });
    });
  }

  function mostrarVista(vista) {
    vistaActual = vista;
    renderSidebar();
    var main = document.getElementById('main-contenido');
    if (vista === 'resumen') { main.innerHTML = renderResumen(); conectarClicksMain(main); return; }
    if (vista === 'seleccion') { main.innerHTML = renderSeleccion(); conectarClicksMain(main); return; }
    if (vista.indexOf('subcat-') === 0) {
      var partes = vista.slice(7).split('__');
      var depSub = datos.departamentos.filter(function (d) { return slug(d.nombre) === partes[0]; })[0];
      var subSub = depSub && depSub.subcategorias.filter(function (s) { return slug(s.nombre) === partes[1]; })[0];
      if (depSub && subSub) { main.innerHTML = renderSubcategoria(depSub, subSub); conectarClicksMain(main); }
      return;
    }
    var dep = datos.departamentos.filter(function (d) { return 'dep-' + slug(d.nombre) === vista; })[0];
    if (dep) { main.innerHTML = renderDepartamento(dep); conectarClicksMain(main); }
  }

  renderNavGlobal();
  mostrarVista('resumen');
})();
