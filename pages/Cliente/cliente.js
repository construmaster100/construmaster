// Pagina del cliente (pages/Cliente/index.html): Proyecto (fotografias de la obra) y Planos (PDF por categoria,
// con lector embebido y descarga). Datos: assets/datos/contenido.js y pages/Cliente/planos.js.
(function () {
  'use strict';
  // El ingreso (usuario y contrasena) esta en usuario.html; esta pagina NO bloquea: se abre siempre.
  // Si se llego desde el ingreso, muestra la obra del usuario (assets/datos/usuarios.js); si no, San Esteban.
  var sesion = null;
  try { sesion = JSON.parse(sessionStorage.getItem('construmaster_sesion')); } catch (e) { /* sin almacenamiento */ }
  var PROYECTO = (sesion && sesion.proyecto) || 'san-esteban';
  var salir = document.querySelector('.nav-salir');
  if (salir) salir.addEventListener('click', function () { try { sessionStorage.removeItem('construmaster_sesion'); } catch (e) { /* sin almacenamiento */ } });

  // Las rutas de los datos son desde la raiz del proyecto; esta pagina esta dos carpetas abajo
  var RAIZ = '../../';
  var $ = function (id) { return document.getElementById(id); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var C = window.CONTENIDO || { proyectos: [] };
  var obra = C.proyectos.filter(function (p) { return p.id === PROYECTO; })[0] || C.proyectos.filter(function (p) { return p.id === 'san-esteban'; })[0];
  var carpeta = obra ? obra.carpeta.split('/').pop() : '';

  // ---- Pendones (izquierdo y derecho): si aun no existen pages/Cliente/pendon.jpg y pendon-derecho.jpg
  // se muestra una foto del proyecto (la primera a la izquierda, la ultima a la derecha)
  [["pendon-img", 0], ["pendon-derecho-img", -1]].forEach(function (p) {
    var img = $(p[0]); if (!img) return;
    var reemplazo = function () { var s = (obra && obra.slide) || []; var f = s[p[1] < 0 ? s.length - 1 : 0]; if (f && img.getAttribute("src") !== RAIZ + f.src) img.src = RAIZ + f.src; };
    img.addEventListener("error", reemplazo);
    if (img.complete && !img.naturalWidth) reemplazo();
  });

  // ---- Ficha del cliente (lugar del logo): nombre del proyecto, propietario (linea "propietario:" del info.txt de la obra)
  // e icono de un edificio
  (function fichaCliente() {
    var f = $('ficha-cliente'); if (!f || !obra) return;
    var info = obra.info || {};
    var edificio = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 22V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6h3a1 1 0 0 1 1 1v12h2v2H2v-2h2zm2 0h4v-4h2v4h2V4H6v18zm10 0h2V11h-2v11zM8 6h2v2H8V6zm0 4h2v2H8v-2zm0 4h2v2H8v-2zm4-8h1v2h-1V6zm0 4h1v2h-1v-2zm0 4h1v2h-1v-2z"/></svg>';
    f.innerHTML = '<span class="ficha-cliente-avatar ficha-edificio">' + edificio + '</span>' +
      '<small>Proyecto</small><strong>' + E(info.nombre || obra.nombre) + '</strong>' +
      '<span class="propietario">' + (info.propietario ? E(info.propietario) : 'Propietario por registrar') + '</span>';
  })();

  // ---- Proyecto: fotografias en el main
  function renderProyecto() {
    var cont = $('proyecto-contenido');
    if (!obra) { cont.innerHTML = '<p class="vacio">No hay obras en pages/Cliente. Ejecuta: node tools/generar_contenido.js</p>'; return; }
    if ($('titulo-proyecto')) $('titulo-proyecto').textContent = obra.nombre;
    // Grupos: recorrido y galeria del proyecto, y luego cada etapa de obra (con sus subetapas) que tenga fotos
    var grupos = [['Recorrido del proyecto', obra.slide || []], ['Galería', obra.galeria || []]];
    Object.keys(obra.etapas || {}).sort().forEach(function (k) {
      var et = obra.etapas[k]; var fotos = (et.imagenes || []).slice();
      Object.keys(et.subetapas || {}).sort().forEach(function (s) { fotos = fotos.concat(et.subetapas[s].imagenes || et.subetapas[s] || []); });
      grupos.push(['Etapa ' + k.replace(/^(\d+)_/, '$1 · ').replace(/_/g, ' ').toLowerCase().replace(/(^|· )(\S)/g, function (m) { return m.toUpperCase(); }), fotos]);
    });
    // Carrusel tipo slide con todas las fotos en orden (cada una lleva el nombre de su grupo)
    var fotos = [];
    grupos.forEach(function (g) { g[1].forEach(function (f) { fotos.push({ f: f, grupo: g[0] }); }); });
    if (!fotos.length) { cont.innerHTML = '<p class="vacio">Aún no hay fotografías de este proyecto.</p>'; return; }
    // Dos capas de imagen que se funden (con acercamiento lento); avance automatico cada 3 s con barra de progreso;
    // se pausa con el cursor encima o con el boton de pausa
    var INTERVALO = 3000;
    cont.innerHTML = '<div class="carrusel-proyecto">' +
      '<div class="carrusel-escena"><img class="carrusel-capa" alt=""><img class="carrusel-capa" alt="">' +
      '<div class="carrusel-velo"></div>' +
      '<div class="carrusel-texto"><span class="carrusel-grupo" data-rol="grupo"></span><strong data-rol="obra">' + E(obra.nombre) + '</strong><span class="carrusel-contador" data-rol="contador"></span></div>' +
      '<button type="button" class="carrusel-flecha anterior" data-paso="-1" aria-label="Anterior">‹</button><button type="button" class="carrusel-flecha siguiente" data-paso="1" aria-label="Siguiente">›</button>' +
      '<button type="button" class="carrusel-pausa" data-rol="pausa" aria-label="Pausar">❚❚</button>' +
      '<div class="carrusel-progreso"><span data-rol="progreso"></span></div></div>' +
      '<div class="carrusel-miniaturas">' + fotos.map(function (o, i) { return '<button type="button" data-i="' + i + '" aria-label="Foto ' + (i + 1) + '"><img src="' + E(RAIZ + (o.f.mini || o.f.src)) + '" alt="" loading="lazy"></button>'; }).join('') + '</div></div>';
    var actual = -1, capa = 0, reloj = null, pausado = false, encima = false;
    var q = function (r) { return cont.querySelector('[data-rol="' + r + '"]'); };
    var capas = cont.querySelectorAll('.carrusel-capa');
    function ir(i) {
      actual = (i + fotos.length) % fotos.length;
      var o = fotos[actual];
      var nueva = capas[capa = 1 - capa], vieja = capas[1 - capa];
      nueva.onload = function () { nueva.classList.add('visible'); vieja.classList.remove('visible'); };
      nueva.classList.remove('visible'); void nueva.offsetWidth;
      nueva.src = RAIZ + o.f.src; nueva.alt = o.grupo;
      if (nueva.complete && nueva.naturalWidth) nueva.onload();
      q('grupo').textContent = o.grupo;
      q('contador').textContent = String(actual + 1).padStart(2, '0') + ' / ' + String(fotos.length).padStart(2, '0');
      cont.querySelectorAll('.carrusel-miniaturas button').forEach(function (b, k) {
        b.classList.toggle('activa', k === actual);
        if (k === actual) { var t = b.parentNode; t.scrollTo({ left: b.offsetLeft - t.clientWidth / 2 + b.clientWidth / 2, behavior: 'smooth' }); }
      });
      programar();
    }
    // Avance automatico: la barra de progreso se llena en 3 s y pasa a la siguiente foto
    function programar() {
      clearTimeout(reloj);
      var barra = q('progreso');
      barra.style.transition = 'none'; barra.style.width = '0'; void barra.offsetWidth;
      if (pausado || encima) return;
      barra.style.transition = 'width ' + INTERVALO + 'ms linear'; barra.style.width = '100%';
      reloj = setTimeout(function () { if (cont.offsetParent) ir(actual + 1); else programar(); }, INTERVALO);
    }
    var escenaAuto = cont.querySelector('.carrusel-escena');
    escenaAuto.addEventListener('mouseenter', function () { encima = true; programar(); });
    escenaAuto.addEventListener('mouseleave', function () { encima = false; programar(); });
    cont.addEventListener('click', function (e) {
      if (e.target.closest('[data-rol="pausa"]')) { pausado = !pausado; q('pausa').textContent = pausado ? '▶' : '❚❚'; q('pausa').setAttribute('aria-label', pausado ? 'Reproducir' : 'Pausar'); return programar(); }
      var p = e.target.closest('[data-paso]'); if (p) return ir(actual + Number(p.getAttribute('data-paso')));
      var m = e.target.closest('[data-i]'); if (m) ir(Number(m.getAttribute('data-i')));
    });
    // Flechas del teclado y deslizar con el dedo
    document.addEventListener('keydown', function (e) {
      if (!cont.offsetParent) return;
      if (e.key === 'ArrowLeft') ir(actual - 1); else if (e.key === 'ArrowRight') ir(actual + 1);
    });
    var x0 = null; var escena = cont.querySelector('.carrusel-escena');
    escena.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    escena.addEventListener('touchend', function (e) { if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 40) ir(actual + (d < 0 ? 1 : -1)); x0 = null; });
    ir(0);
  }

  // ---- Planos: listado por categoria; "Ver" abre el lector de PDF embebido, "Descargar" baja el archivo
  function renderPlanos() {
    var cont = $('planos-contenido');
    var cats = (window.PLANOS_CLIENTE || {})[carpeta] || [];
    if (!cats.length) { cont.innerHTML = '<p class="vacio">Falta pages/Cliente/planos.js. Ejecuta: node tools/generar_planos_cliente.js</p>'; return; }
    cont.innerHTML = '<div class="lector-pdf" id="lector-pdf" hidden><div class="lector-barra"><strong id="lector-titulo"></strong><a id="lector-descargar" download>Descargar</a><button type="button" id="lector-cerrar">Cerrar</button></div><iframe id="lector-marco" title="Lector de PDF"></iframe></div>' +
      cats.map(function (c) {
        return '<section class="categoria-planos" data-categoria="' + c.carpeta.toLowerCase() + '"><h3>' + E(c.titulo) + ' <span>' + c.archivos.length + '</span></h3>' +
          (c.archivos.length ? '<ul>' + c.archivos.map(function (a) {
            return '<li><span class="icono-pdf">PDF</span><span class="nombre-plano">' + E(a.nombre) + '<small>' + a.kb + ' KB</small></span>' +
              '<button type="button" data-ver="' + E(RAIZ + a.ruta) + '" data-nombre="' + E(a.nombre) + '">Ver</button><a href="' + E(RAIZ + a.ruta) + '" download>Descargar</a></li>';
          }).join('') + '</ul>' : '<p class="vacio">Sin planos todavía.</p>') + '</section>';
      }).join('');
    cont.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ver]');
      if (b) {
        $('lector-marco').src = b.getAttribute('data-ver');
        $('lector-titulo').textContent = b.getAttribute('data-nombre');
        $('lector-descargar').href = b.getAttribute('data-ver');
        $('lector-pdf').hidden = false;
        $('lector-pdf').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (e.target.id === 'lector-cerrar') { $('lector-pdf').hidden = true; $('lector-marco').src = 'about:blank'; }
    });
  }

  // ---- Programacion de obra: etapas de la plantilla en diagrama de barras por fechas (pages/Cliente/<OBRA>/PROGRAMACION.txt)
  function nombreEtapa(k) { return k.replace(/^(\d+)_/, '$1 · ').replace(/_/g, ' ').toLowerCase().replace(/(^|· )(\S)/g, function (m) { return m.toUpperCase(); }); }
  function renderProgramacion() {
    var cont = $('programacion-contenido');
    var filas = (window.PROGRAMACION_CLIENTE || {})[carpeta] || [];
    if (!filas.length) { cont.innerHTML = '<p class="vacio">Falta pages/Cliente/planos.js. Ejecuta: node tools/generar_planos_cliente.js</p>'; return; }
    var dia = 864e5; var fecha = function (s) { return new Date(s + 'T00:00:00').getTime(); };
    var conFechas = filas.filter(function (f) { return f.inicio && f.fin; });
    var ini = conFechas.length ? Math.min.apply(null, conFechas.map(function (f) { return fecha(f.inicio); })) : 0;
    var fin = conFechas.length ? Math.max.apply(null, conFechas.map(function (f) { return fecha(f.fin); })) + dia : 0;
    var hoy = Date.now();
    var fmt = function (s) { return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); };
    cont.innerHTML = (obra && obra.info && obra.info.inicio ? '<p class="texto-suave">Inicio de obra: <b>' + E(obra.info.inicio) + '</b></p>' : '') +
      (conFechas.length ? '' : '<p class="aviso">Aún no hay fechas de programación. Se llenan en <code>pages/Cliente/' + E(carpeta) + '/PROGRAMACION.txt</code> y luego se ejecuta <code>node tools/generar_planos_cliente.js</code>.</p>') +
      '<div class="gantt">' + filas.map(function (f) {
        var barra = '';
        if (f.inicio && f.fin) {
          var a = fecha(f.inicio), b = fecha(f.fin) + dia;
          var estado = hoy >= b ? 'terminada' : hoy >= a ? 'en-curso' : 'pendiente';
          barra = '<span class="gantt-barra ' + estado + '" style="left:' + ((a - ini) / (fin - ini) * 100) + '%;width:' + Math.max(1, (b - a) / (fin - ini) * 100) + '%" title="' + fmt(f.inicio) + ' – ' + fmt(f.fin) + '"></span>';
        }
        return '<div class="gantt-fila"><span class="gantt-etapa">' + E(nombreEtapa(f.etapa)) + '</span>' +
          '<span class="gantt-fechas">' + (f.inicio ? fmt(f.inicio) + ' – ' + fmt(f.fin) + ' · ' + Math.round((fecha(f.fin) - fecha(f.inicio)) / dia + 1) + ' días' : 'Sin fechas') + '</span>' +
          '<span class="gantt-pista">' + barra + (conFechas.length && hoy >= ini && hoy <= fin ? '<i class="gantt-hoy" style="left:' + ((hoy - ini) / (fin - ini) * 100) + '%"></i>' : '') + '</span></div>';
      }).join('') + '</div>' +
      (conFechas.length ? '<p class="gantt-leyenda"><span class="terminada"></span>Terminada <span class="en-curso"></span>En curso <span class="pendiente"></span>Pendiente</p>' : '');
  }

  // ---- Listado de archivos de una carpeta de la obra: PDF e imagenes con "Ver" (lector embebido), el resto para descargar
  // Presupuesto de obra: <OBRA>/PRESUPUESTO · Control de obra: <OBRA>/CONTROL DE OBRA
  function renderPresupuesto() { renderArchivos('presupuesto-contenido', window.PRESUPUESTO_CLIENTE, 'Archivos del presupuesto', 'PRESUPUESTO'); }
  function renderControl() { renderArchivos('control-contenido', window.CONTROL_CLIENTE, 'Archivos de control de obra', 'CONTROL DE OBRA'); }
  function renderArchivos(idCont, datos, titulo, subcarpeta) {
    var cont = $(idCont);
    var archivos = (datos || {})[carpeta] || [];
    var clase = function (t) { return t === 'pdf' ? '' : /^xls/.test(t) ? ' icono-excel' : ' icono-otro'; };
    var seVe = function (t) { return /^(pdf|jpe?g|png|webp|gif|txt)$/.test(t); };
    cont.innerHTML = '<div class="lector-pdf" data-rol="lector" hidden><div class="lector-barra"><strong data-rol="titulo"></strong><a data-rol="descargar" download>Descargar</a><button type="button" data-rol="cerrar">Cerrar</button></div><iframe data-rol="marco" title="Lector de archivos"></iframe></div>' +
      '<section class="categoria-planos"><h3>' + E(titulo) + ' <span>' + archivos.length + '</span></h3>' +
      (archivos.length ? '<ul>' + archivos.map(function (a) {
        return '<li><span class="icono-pdf' + clase(a.tipo) + '">' + E(a.tipo.toUpperCase()) + '</span><span class="nombre-plano">' + E(a.nombre) + '<small>' + a.kb + ' KB</small></span>' +
          (seVe(a.tipo) ? '<button type="button" data-ver="' + E(RAIZ + a.ruta) + '" data-nombre="' + E(a.nombre) + '">Ver</button>' : '') + '<a href="' + E(RAIZ + a.ruta) + '" download>Descargar</a></li>';
      }).join('') + '</ul>' : '<p class="vacio">Aún no hay archivos. Se agregan en <code>pages/Cliente/' + E(carpeta) + '/' + E(subcarpeta) + '</code> y luego se ejecuta <code>node tools/generar_planos_cliente.js</code>.</p>') + '</section>';
    var q = function (r) { return cont.querySelector('[data-rol="' + r + '"]'); };
    cont.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ver]");
      if (b) { q("marco").src = b.getAttribute("data-ver"); q("titulo").textContent = b.getAttribute("data-nombre"); q("descargar").href = b.getAttribute("data-ver"); q("lector").hidden = false; q("lector").scrollIntoView({ behavior: "smooth", block: "start" }); }
      if (e.target.closest('[data-rol="cerrar"]')) { q("lector").hidden = true; q("marco").src = "about:blank"; }
    });
  }

  // ---- Rutas por hash: #proyecto (inicial), #planos y #programacion
  var RENDER = { proyecto: renderProyecto, planos: renderPlanos, programacion: renderProgramacion, presupuesto: renderPresupuesto, control: renderControl };
  var hechos = {};
  function mostrar() {
    var partes = location.hash.replace('#', '').split('/');
    var v = partes[0], sub = partes[1] || '';
    if (!RENDER[v]) v = 'proyecto';
    document.querySelectorAll('main [data-vista]').forEach(function (s) { s.classList.toggle('activa', s.getAttribute('data-vista') === v); });
    document.querySelectorAll('#navbar a[data-ir]').forEach(function (a) { a.classList.toggle('activo', a.getAttribute('data-ir') === v); });
    $('navbar').classList.remove('abierto');
    document.querySelectorAll('.menu-desplegable').forEach(function (m) { m.classList.remove('abierto'); });
    if (!hechos[v]) { RENDER[v](); hechos[v] = true; }
    // Planos: #planos/<categoria> muestra solo esa categoria (menu "Planos disponibles" del navbar)
    if (v === 'planos') filtrarPlanos(sub);
    window.scrollTo(0, 0);
  }
  function filtrarPlanos(sub) {
    document.querySelectorAll('#planos-contenido .categoria-planos').forEach(function (s) { s.hidden = !!sub && s.getAttribute('data-categoria') !== sub; });
    document.querySelectorAll('.menu-planos a').forEach(function (a) { a.classList.toggle('activo', a.getAttribute('href') === '#planos' + (sub ? '/' + sub : '')); });
  }
  // Menu desplegable "Planos disponibles": se abre al pasar el cursor (computador) o al tocar la flecha (celular)
  (function menuPlanos() {
    var li = document.querySelector('.menu-desplegable'); if (!li) return;
    var cats = (window.PLANOS_CLIENTE || {})[carpeta] || [];
    li.querySelector('.menu-planos').innerHTML = '<p>Planos disponibles</p><a href="#planos">Todos los planos <span>' + cats.reduce(function (s, c) { return s + c.archivos.length; }, 0) + '</span></a>' +
      cats.map(function (c) { return '<a href="#planos/' + c.carpeta.toLowerCase() + '">' + E(c.titulo.replace(/^Planos /, '').replace(/^./, function (x) { return x.toUpperCase(); })) + ' <span>' + c.archivos.length + '</span></a>'; }).join('');
    li.querySelector('.flecha-menu').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); li.classList.toggle('abierto'); });
    document.addEventListener('click', function (e) { if (!li.contains(e.target)) li.classList.remove('abierto'); });
  })();
  $('boton-menu').addEventListener('click', function () { $('navbar').classList.toggle('abierto'); });
  window.addEventListener('hashchange', mostrar);
  mostrar();
})();
