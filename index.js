// ConstruMaster — logica de la pagina unica.
// Encabezado, navbar y sidebar se construyen una sola vez y nunca se vuelven a dibujar:
// la navegacion solo cambia el contenido de <main> (rutas por hash: #materiales, #proyectos/san-esteban...).
(function () {
  'use strict';

  var E = Motor.escaparHtml;
  var $ = function (id) { return document.getElementById(id); };
  var VISTAS = ['inicio', 'proyectos', 'servicios', 'materiales', 'herramientas', 'presupuesto', 'construccion', 'diseno', 'estadisticas', 'proveedores', 'casas', 'casa', 'remodelacion', 'ingresar'];
  // index.html y usuario.html comparten este codigo: cada pagina solo usa las vistas que existen en su HTML.
  VISTAS = VISTAS.filter(function (v) { return document.querySelector('main [data-vista="' + v + '"]'); });
  var CONTENIDO = window.CONTENIDO || { proyectos: [], etapas: {}, diseno: [] };
  var MP = window.DATOS_BOULEVARD;
  var OBRA = window.DATOS_ETAPAS;
  var navbar = $('navbar');
  var sidebar = $('sidebar-menu');

  // =====================================================================
  // Sidebar: su menu cambia segun la pestaña del navbar y lista los datos de esa seccion
  // (con conteos que siguen los filtros activos). El marco y el estilo del sidebar no cambian.
  // =====================================================================
  var SIDEBAR_TOPE = 25;

  // Contador de visitas y clics de la pagina del cliente. Sin servidor se guarda en el navegador (localStorage):
  // cuenta lo que ocurre en ESTE equipo; para contar clientes reales hace falta servidor (docs/PLAN_CATALOGO_PREFABRICADOS.md).
  var CONTADOR_CLAVE = 'construmaster_contador';
  function leerContador() {
    try { var c = JSON.parse(localStorage.getItem(CONTADOR_CLAVE)); if (c && c.dias) return c; } catch (e) { /* sin almacenamiento */ }
    return { total: 0, dias: {}, clics: {} };
  }
  function guardarContador(c) { try { localStorage.setItem(CONTADOR_CLAVE, JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ } }
  function hoyTexto() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function registrarVisita() { var c = leerContador(); c.total++; c.dias[hoyTexto()] = (c.dias[hoyTexto()] || 0) + 1; guardarContador(c); }
  function registrarClicCasa(x) { if (!x) return; var c = leerContador(); var k = x.empresa + ' · ' + x.modelo; c.clics[k] = (c.clics[k] || 0) + 1; guardarContador(c); }
  if (document.body.getAttribute('data-pagina') === 'usuario') registrarVisita();
  // Pendones de usuario.html: si falta la imagen del pendon, se usa una foto de un proyecto (la primera o la ultima)
  document.querySelectorAll('img[data-pendon]').forEach(function (img) {
    var reemplazo = function () {
      var p = ((window.CONTENIDO || {}).proyectos || []).filter(function (x) { return x.slide && x.slide.length; })[0];
      if (!p) return;
      var f = p.slide[Number(img.getAttribute('data-pendon')) < 0 ? p.slide.length - 1 : 0];
      if (img.getAttribute('src') !== f.src) img.src = f.src;
    };
    img.addEventListener('error', reemplazo);
    if (img.complete && !img.naturalWidth) reemplazo();
  });
  // Se actualiza el sidebar del index si la pagina del cliente cuenta algo en otra pestana del mismo navegador
  window.addEventListener('storage', function (e) { if (e.key === CONTADOR_CLAVE && typeof pintarSidebarDerecho === 'function') pintarSidebarDerecho(); });

  function marcarNavbar(vista) {
    if (vista === 'casa') vista = 'casas'; // la vista de producto pertenece a Casas Prefabricadas
    if (vista === 'estadisticas' || (vista === 'materiales' && $('proveedores-contenido'))) vista = 'proveedores'; // Materiales y Estadisticas estan dentro del desplegable Catalogo
    if (vista === 'servicios' && $('construccion-registro')) vista = 'construccion'; // Servicios se fusiono con Construccion
    // Opcion activa dentro del desplegable Catalogo (Proveedores · Marcas · Estadisticas)
    var hashActual = location.hash || '';
    navbar.querySelectorAll('.menu-catalogo a').forEach(function (a) {
      var h = a.getAttribute('href');
      a.classList.toggle('activo', h === ({ materiales: '#materiales', estadisticas: '#estadisticas', ferreterias: '#proveedores/ferreterias', casas: '#proveedores/casas-prefabricadas', alquiler: '#proveedores/alquiler', marcas: '#proveedores' })[seccionCatalogo()]);
    });
    document.body.classList.toggle('en-producto', leerRuta().vista === 'casa');
    navbar.querySelectorAll('a[data-ir]').forEach(function (a) { a.classList.toggle('activo', a.getAttribute('data-ir') === vista); });
  }

  // Seccion del desplegable Catalogo segun la ruta: materiales · marcas (incluye proveedores de productos) · ferreterias · casas · estadisticas
  function seccionCatalogo() {
    var h = location.hash || '';
    if (/^#materiales/.test(h)) return 'materiales';
    if (/^#estadisticas/.test(h)) return 'estadisticas';
    if (!/^#proveedores/.test(h)) return '';
    if (/^#proveedores\/ferreterias/.test(h)) return 'ferreterias';
    if (/^#proveedores\/casas-prefabricadas/.test(h)) return 'casas';
    if (/^#proveedores\/alquiler/.test(h)) return 'alquiler';
    var m = /^#proveedores\/empresa-(\d+)$/.exec(h); var e = m && INV && empresas()[Number(m[1])];
    if (e) return e.grupo === 'Casas prefabricadas' ? 'casas' : e.tipo === 0 ? 'ferreterias' : 'marcas';
    return 'marcas';
  }
  function sbTitulo(texto) { return '<p class="sidebar-titulo">' + E(texto) + '</p>'; }
  function sbNota(texto) { return '<p class="sidebar-nota">' + texto + '</p>'; }
  function sbConteo(n) { return n === undefined || n === null ? '' : '<span class="conteo">' + E(typeof n === 'number' ? n.toLocaleString('es-CO') : n) + '</span>'; }
  function sbEnlace(href, texto, n, activo, sub) {
    return '<a href="' + E(href) + '" class="' + (activo ? 'activo' : '') + (sub ? ' sub' : '') + '"><span class="texto">' + E(texto) + '</span>' + sbConteo(n) + '</a>';
  }
  function sbFiltro(filtro, valor, texto, n, activo) {
    return '<button type="button" class="' + (activo ? 'activo' : '') + '" data-filtro="' + filtro + '" data-valor="' + E(valor) + '"><span class="texto">' + E(texto) + '</span>' + sbConteo(n) + '</button>';
  }

  // Lista de un filtro: "Todas" + items ordenados por cantidad (hasta SIDEBAR_TOPE).
  function sbListaFiltro(titulo, filtro, conteos, nombre, seleccion, textoTodos) {
    var ids = Object.keys(conteos).map(Number).sort(function (a, b) { return conteos[b] - conteos[a]; });
    var total = ids.reduce(function (s, id) { return s + conteos[id]; }, 0);
    var visibles = ids.slice(0, SIDEBAR_TOPE);
    if (seleccion !== '' && visibles.indexOf(Number(seleccion)) === -1 && conteos[seleccion]) visibles.push(Number(seleccion));
    return sbTitulo(titulo + ' (' + ids.length + ')') +
      sbFiltro(filtro, '', textoTodos, total, seleccion === '') +
      visibles.map(function (id) { return sbFiltro(filtro, id, nombre(id), conteos[id], String(seleccion) === String(id)); }).join('') +
      (ids.length > visibles.length ? sbNota('+' + (ids.length - visibles.length) + ' más en el selector de la vista.') : '');
  }

  var SIDEBAR = {
    inicio: function () {
      if (document.body.getAttribute('data-pagina') === 'usuario') {
        return sbTitulo('Explora') + [['casas', 'Casas prefabricadas'], ['construccion', 'Construcción'], ['remodelacion', 'Remodelación'], ['presupuesto', 'Presupuesto'], ['ingresar', 'Ingresar']]
          .map(function (x) { return sbEnlace('#' + x[0], x[1]); }).join('');
      }
      return sbTitulo('Explora') +
        sbEnlace('#proyectos', 'Proyectos', CONTENIDO.proyectos.length) + sbEnlace('#servicios', 'Servicios') +
        sbEnlace('#materiales', 'Materiales') + sbEnlace('#herramientas', 'Herramientas') +
        sbEnlace('#presupuesto', 'Presupuesto y obra', OBRA.etapas.length) + sbEnlace('#construccion', 'Construcción') +
        sbEnlace('#diseno', 'Diseño') + sbEnlace('#estadisticas', 'Estadísticas') + sbEnlace('#proveedores', 'Proveedores');
    },
    materiales: function () { return sidebarCatalogo(CATALOGOS.materiales); },
    herramientas: function () { return sidebarCatalogo(CATALOGOS.herramientas); },
    servicios: function (sub) { return VISTAS_SERVICIOS.servicios.sidebar(sub); },
    construccion: function (sub) {
      if (!$('construccion-registro')) return VISTAS_SERVICIOS.construccion.sidebar(sub); // usuario.html
      return sidebarRegistroObra(sub) + (sub && !/^e-\d+/.test(sub) ? VISTAS_SERVICIOS.construccion.sidebar(sub === 'actividades' ? '' : sub) : '');
    },
    remodelacion: function (sub) { return VISTAS_SERVICIOS.remodelacion.sidebar(sub); },
    casa: function () { return sbTitulo('Casa'); },
    casas: function () {
      var P = window.PREFABRICADAS; if (!P) return sbTitulo('Casas prefabricadas');
      var conFoto = P.modelos.filter(function (x) { return x.precioM2 && x.imagen; });
      return sbTitulo('Casas prefabricadas') + sbEnlace('#casas', 'Casas disponibles', conFoto.length, true) +
        sbTitulo('Empresas') + [...new Set(conFoto.map(function (x) { return x.empresa; }))].map(function (e) { return sbEnlace('#casas', e, conFoto.filter(function (x) { return x.empresa === e; }).length, false, true); }).join('') +
        sbNota('Precio total y precio por m² publicados por cada empresa.');
    },
    ingresar: function () { return sbTitulo('Ingresar') + sbEnlace('#ingresar', 'Tengo usuario y contraseña') + sbEnlace('#ingresar', 'Deseo registrarme'); },
    proyectos: function (sub) {
      var partes = sub.split('/');
      var proyecto = buscarProyecto(partes[0]);
      if (!proyecto) {
        return sbTitulo('Proyectos (' + CONTENIDO.proyectos.length + ')') + sbEnlace('#proyectos', 'Todos los proyectos', CONTENIDO.proyectos.length, true) +
          CONTENIDO.proyectos.map(function (p) { return sbEnlace('#proyectos/' + p.id, p.nombre, Object.keys(p.etapas || {}).length + '/' + estructuraEtapas().length, false, true); }).join('') +
          sbNota('El número indica las etapas con imágenes.') +
          (window.PREFABRICADAS ? sbTitulo('Casas prefabricadas') +
            sbEnlace('#proyectos', 'Catálogo de casas disponibles', window.PREFABRICADAS.modelos.filter(function (x) { return x.precioM2 && x.imagen; }).length) +
            sbEnlace('#proyectos', 'Estadísticas por área y precio', window.PREFABRICADAS.resumen.conPrecioYArea) +
            sbNota('Al final de esta página: costo por m² de ' + window.PREFABRICADAS.resumen.conPrecioYArea + ' modelos.') : '');
      }
      var base = '#proyectos/' + proyecto.id;
      var html = sbTitulo(proyecto.nombre) + sbEnlace(base, 'Resumen del proyecto', null, partes.length === 1);
      ['negra', 'gris', 'blanca'].forEach(function (clave) {
        var etapas = estructuraEtapas().filter(function (e) { return datosEtapa(e.carpeta).etapa === clave; });
        if (!etapas.length) return;
        html += sbTitulo(OBRA.etapasColor[clave].nombre) + etapas.map(function (e) {
          var d = datosEtapa(e.carpeta);
          var abierta = partes[1] === e.carpeta;
          var enlace = sbEnlace(base + '/' + e.carpeta, d.n + '. ' + d.nombre, imagenesEtapa(proyecto, e.carpeta).length, abierta && !partes[2]);
          if (!abierta) return enlace;
          return enlace + e.subetapas.map(function (s) {
            return sbEnlace(base + '/' + e.carpeta + '/' + s, nombreSubetapa(e.carpeta, s), imagenesEtapa(proyecto, e.carpeta, s).length, partes[2] === s, true);
          }).join('');
        }).join('');
      });
      return html + sbTitulo('Otros proyectos') + CONTENIDO.proyectos.filter(function (p) { return p !== proyecto; }).map(function (p) { return sbEnlace('#proyectos/' + p.id, p.nombre); }).join('') +
        sbNota('El número indica las imágenes de cada etapa.');
    },
    presupuesto: function (sub) {
      var notas = leerNotas();
      // index.html: el sidebar muestra solo la seccion abierta (presupuesto V1, seguimiento por etapas o modelo de referencia);
      // se cambia de seccion con las pestanas de arriba
      var seccion = !$('presupuesto-v1') ? 'todo' : (sub === '' || sub === 'programacion' || /^v1-\d+$/.test(sub)) ? 'v1' : (sub === 'mp' || /^cap-\d+$/.test(sub)) ? 'mp' : 'etapas';
      if (seccion === 'v1') return sidebarPresupuestoV1(sub) + sbNota('Programación, seguimiento por etapas y Caralis: pestañas de arriba.');
      if (seccion === 'mp') return sbTitulo('Caralis (modelo xlsx)') + sbEnlace('#presupuesto/mp', 'Resumen del modelo', MP.capitulos.length, sub === 'mp') +
        MP.capitulos.map(function (c) { return sbEnlace('#presupuesto/cap-' + c.n, c.n + '. ' + c.nombre, null, sub === 'cap-' + c.n, true); }).join('') + sbNota('Modelo de otro proyecto, solo como referencia. El presupuesto del proyecto es el modelo V1.');
      var html = sbTitulo('Seguimiento: etapas de obra') + sbEnlace($('presupuesto-v1') ? '#presupuesto/etapas' : '#presupuesto', 'Todas las etapas', OBRA.etapas.length, ($('presupuesto-v1') ? false : sub === '') || sub === 'etapas');
      ['negra', 'gris', 'blanca'].forEach(function (clave) {
        var etapas = OBRA.etapas.filter(function (e) { return e.etapa === clave; }).sort(function (a, b) { return a.n - b.n; });
        if (!etapas.length) return;
        html += sbTitulo(OBRA.etapasColor[clave].nombre) + etapas.map(function (e) {
          return sbEnlace('#presupuesto/etapa-' + e.n, e.n + '. ' + e.nombre, notasDeEtapa(e, notas) + '/' + e.subetapas.length, sub === 'etapa-' + e.n, true);
        }).join('');
      });
      if (seccion === 'todo') {
        html += sbTitulo('Modelo proyectado (MP)') + sbEnlace('#presupuesto/mp', 'Resumen del modelo', MP.capitulos.length, sub === 'mp');
        MP.capitulos.forEach(function (c) { if (sub === 'cap-' + c.n) html += sbEnlace('#presupuesto/cap-' + c.n, c.n + '. ' + c.nombre, null, true, true); });
      }
      return html + sbNota('En el seguimiento, el número indica las subetapas con notas.');
    },
    proveedores: function (sub) { return sidebarProveedores(sub); },
    estadisticas: function () {
      if (!INV || !EST.montado) return sbTitulo('Estadísticas') + sbNota('Cargando inventario…');
      var resumen = resumenEstadisticas();
      var conteos = {};
      resumen.forEach(function (r, i) { conteos[i] = r.n; });
      return sbListaFiltro('Proveedores', 'prov', conteos, function (i) { return resumen[i].nombre; }, EST.prov, 'Todos los proveedores') +
        sbTitulo('Descargas') + sbEnlace('pages/Servicios/Analisis_Precios_Unitarios.xlsx', 'Análisis de precios unitarios (Excel)');
    },
    diseno: function () {
      return sbTitulo('Servicios de diseño') + sbNota('01 · Digitación de planos<br>02 · Trámite de licencia ante curaduría<br>03 · Planos de construcción') +
        sbEnlace('#proyectos', 'Ver proyectos', CONTENIDO.proyectos.length) +
        sbTitulo('Biblioteca de proyectos') + sbEnlace('#diseno', 'Todos los proyectos', bibProyectos().length) + sbEnlace('#diseno/crear', '+ Crear proyecto');
    },
  };

  function sidebarCatalogo(cfg) {
    if (!INV || !cfg.lista) return sbTitulo(cfg.id === 'herramientas' ? 'Herramientas' : 'Materiales') + sbNota('Cargando inventario…');
    var D = INV.D;
    var st = cfg.estado;
    var html = '';
    if (cfg.porFamilia) html += sbListaFiltro('Familias', 'fam', contar(filtrar(cfg.lista, st, 'fam'), 'fam'), function (i) { return D.familias[i]; }, st.fam, 'Todas las familias');
    html += sbListaFiltro('Categorías', 'cat', contar(filtrar(cfg.lista, st, 'cat'), 'cat'), function (i) { return D.categorias[i]; }, st.cat, 'Todas las categorías');
    html += sbListaFiltro('Tipo de proveedor', 'tipo', contar(filtrar(cfg.lista, st, 'tipo'), 'tipo'), nombreTipo, st.tipo, 'Todos los tipos');
    html += sbListaFiltro('Proveedores', 'prov', contar(filtrar(cfg.lista, st, 'prov'), 'prov'), function (i) { return D.proveedores[i]; }, st.prov, 'Todos los proveedores');
    html += sbListaFiltro('Archivos Excel', 'arch', contar(filtrar(cfg.lista, st, 'arch'), 'arch'), function (i) { return D.archivos[i].nombre; }, st.arch, 'Todos los archivos');
    return html;
  }

  function pintarSidebar() {
    var r = leerRuta();
    sidebar.innerHTML = SIDEBAR[r.vista](r.sub);
    if (typeof pintarSidebarDerecho === 'function') pintarSidebarDerecho();
  }

  // Sidebar derecho (solo index.html): resumen de los datos del sitio, accesos rapidos y descargas.
  function pintarSidebarDerecho() {
    var d = $('sidebar-derecho');
    if (!d) return;
    var ruta = leerRuta();
    // Catalogo (Materiales, Marcas, Ferreterias, Casas prefabricadas, Estadisticas) y Herramientas: estadisticas de lo que se esta viendo
    if (ruta.vista === 'presupuesto' && $('presupuesto-v1')) { d.innerHTML = panelPresupuestoV1(); conectarAccionesV1(d); return; }
    var panel = panelEstadisticasCatalogo(ruta);
    if (panel !== null) { d.innerHTML = panel; return; }
    var P = window.PREFABRICADAS;
    var casas = P ? P.modelos.filter(function (x) { return x.precioM2 && x.imagen; }).length : null;
    var c = leerContador(); var clics = Object.keys(c.clics).map(function (k) { return [k, c.clics[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var totalClics = clics.reduce(function (s, a) { return s + a[1]; }, 0);
    d.innerHTML = sbTitulo('Clientes · página usuario') +
      '<a href="usuario.html"><span class="texto">Visitas hoy</span><span class="conteo">' + (c.dias[hoyTexto()] || 0) + '</span></a>' +
      '<a href="usuario.html"><span class="texto">Visitas en total</span><span class="conteo">' + c.total + '</span></a>' +
      '<a href="usuario.html#casas"><span class="texto">Clics en casas</span><span class="conteo">' + totalClics + '</span></a>' +
      clics.slice(0, 3).map(function (a) { return '<a href="usuario.html#casas" title="' + E(a[0]) + '"><span class="texto">' + E(a[0]) + '</span><span class="conteo">' + a[1] + '</span></a>'; }).join('') +
      '<p class="sidebar-nota">Conteo de este navegador (sin servidor).</p>' +
      sbTitulo('Resumen') +
      sbEnlace('#materiales', 'Productos en inventario', INV ? INV.productos.length : 'abrir') +
      sbEnlace('#proveedores', 'Empresas proveedoras', INV && INV.D.empresas ? INV.D.empresas.length : null) +
      sbEnlace('#construccion', 'Actividades de construcción', window.APU && window.APU.edificacion ? Object.keys(window.APU.edificacion.actividades).length : null) +
      sbEnlace('#proyectos', 'Casas prefabricadas', casas) +
      sbEnlace('#proyectos', 'Proyectos', CONTENIDO.proyectos.length) +
      sbTitulo('Accesos rápidos') +
      '<a href="usuario.html"><span class="texto">Página del cliente (usuario)</span><span class="conteo">↗</span></a>' +
      sbEnlace('#construccion/remodelacion', 'Remodelación') +
      sbEnlace('#servicios/edificacion', 'Clasificación de edificación') +
      sbEnlace('#servicios/salario', 'Salario mínimo y costo laboral') +
      sbTitulo('Descargas') +
      '<a href="pages/Servicios/Analisis_Precios_Unitarios.xlsx" download><span class="texto">Análisis de precios unitarios</span><span class="conteo">xlsx</span></a>' +
      '<a href="pages/Servicios/Clasificacion_Edificacion.xlsx" download><span class="texto">Clasificación de edificación</span><span class="conteo">xlsx</span></a>' +
      '<a href="pages/Servicios/Calculo_Salario_Minimo.xlsx" download><span class="texto">Cálculo del salario mínimo</span><span class="conteo">xlsx</span></a>' +
      '<a href="pages/Cliente/Plantilla Modelo/ETAPAS OBRA/Formato_Unico_Etapas.xlsx" download><span class="texto">Formato único de etapas</span><span class="conteo">xlsx</span></a>';
  }

  sidebar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filtro]');
    if (!b) return;
    var filtro = b.getAttribute('data-filtro');
    var valor = b.getAttribute('data-valor');
    var vista = leerRuta().vista;
    if (vista === 'estadisticas') { EST[filtro] = valor; pintarEstadisticas(); window.scrollTo(0, 0); return; }
    var cfg = CATALOGOS[vista];
    if (!cfg) return;
    cfg.estado[filtro] = valor;
    if (filtro === 'fam') cfg.estado.cat = '';
    cfg.estado.limite = PASO;
    actualizarCatalogo(cfg);
    window.scrollTo(0, 0);
  });

  // =====================================================================
  // Rutas
  // =====================================================================
  function leerRuta() {
    // usuario.html arranca siempre en Casas Prefabricadas; index.html en Inicio
    // (usuario.html no tiene Inicio: cualquier ruta desconocida va a Casas Prefabricadas)
    var portada = VISTAS.indexOf('inicio') !== -1 ? 'inicio' : 'casas';
    var h = decodeURIComponent(location.hash.replace(/^#/, '')) || portada;
    var partes = h.split('/');
    // La antigua pestaña Obra ahora vive dentro de Presupuesto.
    if (partes[0] === 'obra') { partes = ['presupuesto', partes[1] ? 'etapa-' + partes[1] : '']; h = partes.join('/'); }
    // Obra Nueva y Remodelacion se fusionaron en Construccion (remodelacion = categoria).
    if (partes[0] === 'obra-nueva') { partes = ['construccion'].concat(partes.slice(1)); h = partes.join('/'); }
    if (partes[0] === 'remodelacion' && VISTAS.indexOf('remodelacion') === -1) { partes = ['construccion', partes[1] || 'remodelacion']; h = partes.join('/'); }
    var vista = VISTAS.indexOf(partes[0]) !== -1 ? partes[0] : portada;
    return { vista: vista, sub: partes.slice(1).join('/'), hash: '#' + h };
  }

  var RENDER = {
    inicio: function () {},
    materiales: function () { montarCatalogo(CATALOGOS.materiales); },
    herramientas: function () { montarCatalogo(CATALOGOS.herramientas); },
    servicios: function (sub) { VISTAS_SERVICIOS.servicios.montar(sub); },
    construccion: function (sub) {
      // usuario.html: formulario como el de Remodelacion, arriba del listado de servicios de construccion
      var fc = $('construccion-formulario');
      if (fc && !$('form-construccion')) formularioSolicitud(fc, { id: 'construccion', intro: 'Cuéntanos qué deseas construir y agrega fotografías del lugar.', tituloVivienda: 'Lo que deseas construir', etiquetaArea: 'Área a construir', boton: 'Solicitar presupuesto de construcción', fotos: true });
      // index.html: Construccion (fusion con Servicios) = registro de actividades y cantidades por etapa; el catalogo
      // de actividades sigue en #construccion/actividades (y sus categorias).
      var reg = $('construccion-registro');
      var enRegistro = reg && (sub === '' || /^e-\d+/.test(sub || ''));
      if (reg) { reg.hidden = !enRegistro; $('construccion-contenido').hidden = !!enRegistro; }
      if (enRegistro) return renderRegistroObra(sub);
      VISTAS_SERVICIOS.construccion.montar(sub === 'actividades' ? '' : sub);
    },
    // Solo en usuario.html
    remodelacion: function (sub) {
      // usuario.html: el formulario de Presupuesto con fotografias, arriba del listado de servicios de remodelacion
      var fr = $('remodelacion-formulario');
      if (fr && !$('form-remodelacion')) formularioSolicitud(fr, { id: 'remodelacion', intro: 'Cuéntanos qué deseas remodelar y agrega fotografías del lugar.', tituloVivienda: 'Lo que deseas remodelar', etiquetaArea: 'Área a intervenir', boton: 'Solicitar presupuesto de remodelación', fotos: true });
      VISTAS_SERVICIOS.remodelacion.montar(sub);
    },
    casas: function () { $('casas-contenido').innerHTML = catalogoClienteHtml(); },
    casa: function (sub) { renderProductoCasa(sub); },
    ingresar: function () { conectarIngreso(); },
    proyectos: function (sub) { renderProyectos(sub); },
    presupuesto: function (sub) {
      // index.html: presupuesto con el modelo V1 Construmaster (#presupuesto y #presupuesto/v1-N); el seguimiento por
      // etapas y el modelo proyectado siguen en #presupuesto/etapas, /etapa-N, /mp y /cap-N
      var v1 = $('presupuesto-v1');
      var enV1 = v1 && (sub === '' || sub === 'programacion' || /^v1-\d+$/.test(sub || ''));
      if (v1) { v1.hidden = !enV1; $('presupuesto-contenido').hidden = !!enV1; }
      if (enV1) return renderPresupuestoV1(sub);
      renderPresupuesto(sub === 'etapas' ? '' : sub);
    },
    diseno: function (sub) { renderDiseno(sub); },
    estadisticas: function () { montarEstadisticas(); },
    proveedores: function (sub) { montarProveedores(sub); },
  };

  function aplicarRuta() {
    var r = leerRuta();
    detenerSlide();
    document.querySelectorAll('main .vista').forEach(function (el) { el.classList.toggle('activa', el.getAttribute('data-vista') === r.vista); });
    marcarNavbar(r.vista);
    marcarBarraInferior(r.vista);
    navbar.classList.remove('abierto');
    window.scrollTo(0, 0);
    RENDER[r.vista](r.sub);
    pintarSidebar();
    pintarSidebarDerecho();
    sidebar.parentNode.scrollTop = 0;
  }

  // =====================================================================
  // Inventario (se carga una sola vez, al entrar a Materiales/Herramientas/Servicios)
  // =====================================================================
  var INV = null;
  var cargaInventario = null;

  function cargarInventario() {
    if (INV) return Promise.resolve(INV);
    if (cargaInventario) return cargaInventario;
    cargaInventario = new Promise(function (resolver, rechazar) {
      var s = document.createElement('script');
      s.src = 'assets/datos/inventario.js';
      s.onload = function () { INV = prepararInventario(window.INVENTARIO); resolver(INV); };
      s.onerror = function () { cargaInventario = null; rechazar(new Error('No se pudo cargar assets/datos/inventario.js. Ejecuta: node tools/generar_inventario.js')); };
      document.head.appendChild(s);
    });
    return cargaInventario;
  }

  function prepararInventario(D) {
    var productos = D.productos.map(function (p) {
      return {
        nombre: p[0], precio: p[1], cat: p[2], sub: p[3], fam: p[4], prov: p[5], arch: p[6],
        img: p[7] >= 0 ? D.prefijos[p[7]] + p[8] : '', marca: p[9], desde: p[10],
        tipo: D.tipoProveedor ? D.tipoProveedor[p[5]] : 0,
        url: D.sitiosUrl && p[11] >= 0 ? D.sitiosUrl[p[11]] + p[12] : '',
        busq: Motor.normalizar(p[0] + ' ' + D.marcas[p[9]] + ' ' + D.categorias[p[2]] + ' ' + D.subcategorias[p[3]] + ' ' + D.proveedores[p[5]]),
      };
    });
    return { D: D, productos: productos, famHerramientas: D.familias.indexOf('Herramientas y maquinaria') };
  }

  function conCargaInventario(contenedor, alListo) {
    if (INV) { alListo(); return; }
    if (contenedor) contenedor.innerHTML = '<p class="texto-suave">Cargando inventario de los archivos Excel…</p>';
    cargarInventario().then(alListo).catch(function (error) { if (contenedor) contenedor.innerHTML = '<p class="vacio">' + E(error.message) + '</p>'; });
  }

  function coincideTexto(p, palabras) {
    for (var i = 0; i < palabras.length; i++) if (p.busq.indexOf(palabras[i]) === -1) return false;
    return true;
  }

  function contar(lista, campo) {
    var c = {};
    lista.forEach(function (p) { c[p[campo]] = (c[p[campo]] || 0) + 1; });
    return c;
  }

  function opciones(conteos, nombres, seleccion, textoTodos) {
    var ids = Object.keys(conteos).map(Number).sort(function (a, b) { return conteos[b] - conteos[a]; });
    return '<option value="">' + E(textoTodos) + '</option>' + ids.map(function (id) {
      return '<option value="' + id + '"' + (String(seleccion) === String(id) ? ' selected' : '') + '>' + E(nombres(id)) + ' (' + conteos[id] + ')</option>';
    }).join('');
  }

  function precioHtml(p) {
    if (!p.precio) return '<p class="precio-producto sin-precio">Precio: consultar</p>';
    return '<p class="precio-producto">' + (p.desde ? 'Desde ' : '') + Motor.formatoMoneda(p.precio) + '</p>';
  }

  function imagenHtml(src, alt, clase) {
    if (!src) return '<div class="imagen-producto sin-imagen" aria-hidden="true">▦</div>';
    return '<img class="imagen-producto ' + (clase || '') + '" src="' + E(src) + '" alt="' + E(alt) + '" loading="lazy" decoding="async">';
  }

  // Color de identidad por proveedor: COMFER naranja, Homecenter azul (tokens --comfer / --homecenter en index.css).
  var CLASE_PROVEEDOR = { COMFER: 'prov-comfer', Homecenter: 'prov-homecenter' };

  function tarjetaProducto(p) {
    var D = INV.D;
    var proveedor = D.proveedores[p.prov];
    return '<article class="tarjeta-producto ' + (CLASE_PROVEEDOR[proveedor] || '') + '">' + imagenHtml(p.img, p.nombre) +
      '<div class="cuerpo-producto">' + (CLASE_PROVEEDOR[proveedor] ? '<span class="marca-proveedor">' + E(proveedor) + '</span>' : '') +
      '<p class="nombre-producto">' + E(p.nombre) + '</p>' +
      '<p class="meta-producto">' + E(D.categorias[p.cat]) + (p.sub && D.subcategorias[p.sub] ? ' · ' + E(D.subcategorias[p.sub]) : '') + '</p>' +
      '<p class="meta-producto">' + E(D.proveedores[p.prov]) + ' · ' + E(D.archivos[p.arch].nombre) + '</p>' +
      precioHtml(p) +
      (p.url ? '<a class="enlace-producto" href="' + E(p.url) + '" target="_blank" rel="noopener">Ver en la tienda ↗</a>' : '') +
      '</div></article>';
  }

  // Las imagenes que no cargan (enlaces remotos caidos) se cambian por un marcador, sin mover la rejilla.
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || !img.classList.contains('imagen-producto')) return;
    var marcador = document.createElement('div');
    marcador.className = 'imagen-producto sin-imagen';
    marcador.textContent = '▦';
    img.replaceWith(marcador);
  }, true);

  function panelArchivos(lista, idCatalogo) {
    var D = INV.D;
    var porArchivo = contar(lista, 'arch');
    var sinPrecio = {};
    lista.forEach(function (p) { if (!p.precio) sinPrecio[p.arch] = (sinPrecio[p.arch] || 0) + 1; });
    var filas = D.archivos.map(function (a, i) {
      var acciones = a.copiaDe
        ? '<span class="ruta">Copia idéntica de ' + E(a.copiaDe) + '</span>'
        : (porArchivo[i] ? '<button type="button" data-archivo="' + i + '">Ver productos</button> · ' : '') + '<a href="' + E(encodeURI(a.ruta)) + '" download>Descargar</a>';
      return '<tr><td>' + E(a.nombre) + '<span class="ruta">' + E(a.ruta) + '</span></td><td>' + E(a.proveedor) + '</td>' +
        '<td class="num">' + (porArchivo[i] || 0).toLocaleString('es-CO') + '</td><td class="num">' + (sinPrecio[i] || 0).toLocaleString('es-CO') + '</td><td>' + acciones + '</td></tr>';
    }).join('');
    return '<details class="panel-archivos" id="archivos-' + idCatalogo + '"><summary>Archivos Excel de inventario (' + D.archivos.length + ') · actualizado ' + E(D.generado) + '</summary>' +
      '<table class="tabla"><thead><tr><th>Archivo</th><th>Proveedor</th><th class="num">Productos aquí</th><th class="num">Sin precio</th><th>Acciones</th></tr></thead><tbody>' + filas + '</tbody></table></details>';
  }

  // =====================================================================
  // Catalogo reutilizable: Materiales (todo) y Herramientas (familia herramientas)
  // =====================================================================
  // Tipo de proveedor: "Empresas de ferretería" (tiendas multimarca) o "Proveedores de productos" (fabricantes y catálogos oficiales).
  function nombreTipo(i) { return String((INV.D.tipos || [])[i] || '').replace('ferreteria', 'ferretería'); }
  function estadoNuevo() { return { texto: '', tipo: '', fam: '', cat: '', prov: '', arch: '', conPrecio: false, orden: '', limite: 60, montado: false }; }
  var CATALOGOS = {
    materiales: { id: 'materiales', contenedor: 'materiales-contenido', estado: estadoNuevo(), porFamilia: true, base: function (p) { return true; } },
    herramientas: { id: 'herramientas', contenedor: 'herramientas-contenido', estado: estadoNuevo(), porFamilia: false, base: function (p) { return p.fam === INV.famHerramientas; } },
  };
  var PASO = 60;

  function montarCatalogo(cfg) {
    var cont = $(cfg.contenedor);
    conCargaInventario(cont, function () {
      if (!cfg.lista) cfg.lista = INV.productos.filter(cfg.base);
      if (!cfg.estado.montado) {
        cont.innerHTML =
          panelArchivos(cfg.lista, cfg.id) +
          '<div class="filtros">' +
          '<input type="search" data-rol="texto" placeholder="Buscar por nombre, marca o categoría…" aria-label="Buscar">' +
          (cfg.porFamilia ? '<select data-rol="fam" aria-label="Familia"></select>' : '') +
          '<select data-rol="cat" aria-label="Categoría"></select>' +
          '<select data-rol="tipo" aria-label="Tipo de proveedor"></select>' +
          '<select data-rol="prov" aria-label="Proveedor"></select>' +
          '<select data-rol="arch" aria-label="Archivo Excel"></select>' +
          (cfg.porFamilia ? '' : '<select data-rol="orden" aria-label="Orden"></select>') +
          '</div>' +
          '<div class="filtros-extra"><label><input type="checkbox" data-rol="conPrecio"> Solo con precio</label>' +
          (cfg.porFamilia ? '<label>Orden <select data-rol="orden" aria-label="Orden"></select></label>' : '') +
          '<button type="button" class="boton claro" data-rol="limpiar">Limpiar filtros</button></div>' +
          '<div data-rol="resultados"></div>';
        conectarCatalogo(cfg, cont);
        cfg.estado.montado = true;
      }
      actualizarCatalogo(cfg);
    });
  }

  function conectarCatalogo(cfg, cont) {
    var st = cfg.estado;
    var q = function (rol) { return cont.querySelector('[data-rol="' + rol + '"]'); };
    var temporizador = null;
    q('texto').value = st.texto;
    q('texto').addEventListener('input', function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { st.texto = q('texto').value; st.limite = PASO; actualizarCatalogo(cfg); }, 180);
    });
    ['tipo', 'fam', 'cat', 'prov', 'arch', 'orden'].forEach(function (rol) {
      var sel = q(rol);
      if (!sel) return;
      sel.addEventListener('change', function () {
        st[rol] = sel.value;
        if (rol === 'fam') st.cat = '';
        st.limite = PASO;
        actualizarCatalogo(cfg);
      });
    });
    q('conPrecio').addEventListener('change', function () { st.conPrecio = q('conPrecio').checked; st.limite = PASO; actualizarCatalogo(cfg); });
    q('limpiar').addEventListener('click', function () {
      var nuevo = estadoNuevo(); nuevo.montado = true;
      Object.keys(nuevo).forEach(function (k) { st[k] = nuevo[k]; });
      q('texto').value = ''; q('conPrecio').checked = false;
      actualizarCatalogo(cfg);
    });
    cont.addEventListener('click', function (e) {
      var archivo = e.target.closest('[data-archivo]');
      if (archivo) { st.arch = archivo.getAttribute('data-archivo'); st.limite = PASO; actualizarCatalogo(cfg); q('resultados').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    });
  }

  function filtrar(lista, st, excluir) {
    var palabras = Motor.normalizar(st.texto).split(' ').filter(Boolean);
    return lista.filter(function (p) {
      if (excluir !== 'fam' && st.fam !== '' && p.fam !== Number(st.fam)) return false;
      if (excluir !== 'cat' && st.cat !== '' && p.cat !== Number(st.cat)) return false;
      if (excluir !== 'tipo' && st.tipo !== '' && p.tipo !== Number(st.tipo)) return false;
      if (excluir !== 'prov' && st.prov !== '' && p.prov !== Number(st.prov)) return false;
      if (excluir !== 'arch' && st.arch !== '' && p.arch !== Number(st.arch)) return false;
      if (st.conPrecio && !p.precio) return false;
      return !palabras.length || coincideTexto(p, palabras);
    });
  }

  function actualizarCatalogo(cfg) {
    var cont = $(cfg.contenedor);
    var st = cfg.estado;
    var D = INV.D;
    var q = function (rol) { return cont.querySelector('[data-rol="' + rol + '"]'); };
    // Cada selector muestra conteos segun los demas filtros activos.
    if (q('fam')) q('fam').innerHTML = opciones(contar(filtrar(cfg.lista, st, 'fam'), 'fam'), function (i) { return D.familias[i]; }, st.fam, 'Todas las familias');
    q('cat').innerHTML = opciones(contar(filtrar(cfg.lista, st, 'cat'), 'cat'), function (i) { return D.categorias[i]; }, st.cat, 'Todas las categorías');
    q('tipo').innerHTML = opciones(contar(filtrar(cfg.lista, st, 'tipo'), 'tipo'), nombreTipo, st.tipo, 'Todos los tipos de proveedor');
    q('prov').innerHTML = opciones(contar(filtrar(cfg.lista, st, 'prov'), 'prov'), function (i) { return D.proveedores[i]; }, st.prov, 'Todos los proveedores');
    q('arch').innerHTML = opciones(contar(filtrar(cfg.lista, st, 'arch'), 'arch'), function (i) { return D.archivos[i].nombre; }, st.arch, 'Todos los archivos Excel');
    q('orden').innerHTML = [['', 'Orden del archivo'], ['precio-asc', 'Precio: menor a mayor'], ['precio-desc', 'Precio: mayor a menor'], ['nombre', 'Nombre A–Z']].map(function (o) {
      return '<option value="' + o[0] + '"' + (st.orden === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    cfg.filtrados = filtrar(cfg.lista, st);
    if (st.orden === 'precio-asc' || st.orden === 'precio-desc') {
      var signo = st.orden === 'precio-asc' ? 1 : -1;
      cfg.filtrados.sort(function (a, b) { return (a.precio ? 0 : 1) - (b.precio ? 0 : 1) || signo * ((a.precio || 0) - (b.precio || 0)); });
    } else if (st.orden === 'nombre') {
      cfg.filtrados.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    }
    pintarResultados(cfg);
    if (leerRuta().vista === cfg.id) pintarSidebar();
  }

  // Desplazamiento infinito hacia abajo: al acercarse al final se agregan mas tarjetas y, cuando se
  // acaba la lista filtrada, vuelve a empezar desde el primer producto (loop). Para no saturar el
  // navegador, las tarjetas mas antiguas se retiran por arriba compensando el scroll (la vista no salta).
  var MAX_TARJETAS = 480;

  // Vista general ("todas las familias", sin filtros): en lugar de desplegar todos los productos se muestra la ESTRUCTURA
  // del catalogo como diagrama: catalogo -> familias -> categorias (con conteos). Un clic filtra y entonces si aparecen las cards.
  function sinFiltros(st) { return !st.texto && st.fam === '' && st.cat === '' && st.prov === '' && st.tipo === '' && st.arch === '' && !st.conPrecio; }
  function estructuraCatalogoHtml(cfg) {
    var D = INV.D; var lista = cfg.lista; var porFam = {};
    lista.forEach(function (p) { var f = porFam[p.fam] || (porFam[p.fam] = { n: 0, cats: {} }); f.n++; f.cats[p.cat] = (f.cats[p.cat] || 0) + 1; });
    var fams = Object.keys(porFam).sort(function (a, b) { return porFam[b].n - porFam[a].n; });
    var una = fams.length === 1; // Herramientas: una sola familia -> sus categorias como ramas
    var nodo = function (k) {
      var f = porFam[k]; var cats = Object.keys(f.cats).sort(function (a, b) { return f.cats[b] - f.cats[a]; });
      var nombre = D.familias[k]; var color = COLOR_FAMILIA[nombre] || '#999';
      return '<div class="nodo-familia" style="--color:' + color + '"><button type="button" class="nodo-cabeza" data-fam="' + k + '"><strong>' + E(nombre) + '</strong><span>' + f.n.toLocaleString('es-CO') + ' productos · ' + cats.length + ' categorías</span></button>' +
        '<ul class="nodo-ramas">' + cats.slice(0, una ? 60 : 8).map(function (c) { return '<li><button type="button" data-fam="' + k + '" data-cat="' + c + '">' + E(D.categorias[c] || 'Sin categoría') + ' <b>' + f.cats[c].toLocaleString('es-CO') + '</b></button></li>'; }).join('') +
        (cats.length > (una ? 60 : 8) ? '<li class="mas"><button type="button" data-fam="' + k + '">+ ' + (cats.length - (una ? 60 : 8)) + ' categorías más</button></li>' : '') + '</ul></div>';
    };
    return '<div class="estructura-catalogo"><div class="estructura-raiz"><strong>' + E(cfg.id === 'herramientas' ? 'Herramientas' : cfg.id === 'materiales' ? 'Catálogo de materiales' : 'Catálogo') + '</strong><span>' + lista.length.toLocaleString('es-CO') + ' productos · ' + fams.length + ' familias</span></div>' +
      '<div class="estructura-ramas' + (una ? ' una' : '') + '">' + fams.map(nodo).join('') + '</div>' +
      '<p class="texto-suave estructura-nota">Elige una familia o una categoría (aquí o en la barra lateral) para ver sus productos.</p></div>';
  }

  function pintarResultados(cfg) {
    var cont = $(cfg.contenedor).querySelector('[data-rol="resultados"]');
    var total = cfg.filtrados.length;
    if (sinFiltros(cfg.estado) && cfg.lista.length > 150) {
      if (cfg.observador) cfg.observador.disconnect();
      cont.innerHTML = estructuraCatalogoHtml(cfg);
      if (!cont.getAttribute('data-estructura')) {
        cont.setAttribute('data-estructura', '1');
        cont.addEventListener('click', function (e) {
          var b = e.target.closest('.estructura-catalogo [data-fam]'); if (!b) return;
          cfg.estado.fam = cfg.porFamilia ? b.getAttribute('data-fam') : ''; cfg.estado.cat = b.getAttribute('data-cat') || '';
          if (!cfg.porFamilia && !cfg.estado.cat) return;
          cfg.estado.limite = PASO; actualizarCatalogo(cfg); window.scrollTo(0, 0);
        });
      }
      return;
    }
    cfg.cursor = 0;
    cfg.vuelta = 1;
    cont.innerHTML = '<p class="texto-suave">' + total.toLocaleString('es-CO') + ' resultado(s)' + (total ? ' · desplázate hacia abajo para seguir viendo el catálogo' : '') + '</p>' +
      (total ? '<div class="rejilla-productos" data-rol="rejilla"></div><div class="centinela" data-rol="centinela" aria-hidden="true"></div>' : '<p class="vacio">Sin resultados con estos filtros.</p>');
    if (!total) return;
    if (!cfg.observador) {
      cfg.observador = new IntersectionObserver(function (entradas) {
        if (entradas.some(function (en) { return en.isIntersecting; })) agregarLote(cfg);
      }, { rootMargin: '0px 0px 900px 0px' });
    }
    cfg.observador.disconnect();
    cfg.observador.observe(cont.querySelector('[data-rol="centinela"]'));
    agregarLote(cfg);
  }

  function agregarLote(cfg) {
    var cont = $(cfg.contenedor);
    var rejilla = cont.querySelector('[data-rol="rejilla"]');
    var total = cfg.filtrados.length;
    if (!rejilla || !total || leerRuta().vista !== cfg.id) return;
    var html = '';
    for (var i = 0; i < PASO; i++) {
      if (cfg.cursor >= total) {
        cfg.cursor = 0;
        cfg.vuelta++;
        html += '<div class="separador-loop">↻ De nuevo desde el inicio del catálogo · vuelta ' + cfg.vuelta + '</div>';
      }
      html += (cfg.tarjeta || tarjetaProducto)(cfg.filtrados[cfg.cursor++]);
    }
    rejilla.insertAdjacentHTML('beforeend', html);
    podarRejilla(rejilla);
    // Si la pantalla sigue sin llenarse (pocas tarjetas), se pide otro lote.
    var centinela = cont.querySelector('[data-rol="centinela"]');
    if (centinela && centinela.getBoundingClientRect().top < window.innerHeight + 900) requestAnimationFrame(function () { agregarLote(cfg); });
  }

  function podarRejilla(rejilla) {
    var sobrantes = rejilla.children.length - MAX_TARJETAS;
    if (sobrantes < PASO) return;
    var altoAntes = rejilla.scrollHeight;
    for (var i = 0; i < sobrantes; i++) rejilla.removeChild(rejilla.firstElementChild);
    window.scrollBy(0, rejilla.scrollHeight - altoAntes);
  }

  // =====================================================================
  // Servicios y Construccion (antes Obra Nueva y Remodelacion): vistas del mismo catalogo de actividades del analisis de
  // precios unitarios (pages/Servicios), clasificadas en cuatro ejes con codigo de dos letras y dos numeros
  // (tools/clasificacion_servicios.js): AM ambito · ON/OG/OB secuencia · ES especialidad · NP naturaleza.
  // Rutas de cada vista (<id> = servicios | construccion; construccion/remodelacion = categoria Remodelacion):
  //   #<id> indice · #<id>/catalogo · #<id>/c/<CODIGO> catalogo filtrado · #<id>/<codigo actividad> analisis.
  // =====================================================================
  var EJES_SERV = ['am', 'sec', 'es', 'np'];
  var SV = null;
  var COLOR_TIPO_OBRA = { negra: '#2b2d34', gris: '#6b7280', blanca: '#c9a24b', transversal: '#8a8c82' };
  var COLOR_EJE = { es: '#354b3e', np: '#7a5a2e' };

  function prepararServicios() {
    if (SV) return SV;
    var A = window.APU;
    var indice = {};
    A.clasificacion.forEach(function (e, ie) { e.categorias.forEach(function (c, i) { indice[c.codigo] = { eje: EJES_SERV[ie], i: i, c: c }; }); });
    var unidades = []; var idxUni = {};
    var lista = A.actividades.map(function (a) {
      var u = a[10] || a[2];
      if (!(u in idxUni)) { idxUni[u] = unidades.length; unidades.push(u); }
      var s = { codigo: a[0], nombre: a[1], unidad: a[2], precio: a[3], insumos: a[8], revisar: a[7], icono: a[9], unidadNombre: a[10], codigos: a[11], uni: idxUni[u],
        busq: Motor.normalizar(a[0] + ' ' + a[1] + ' ' + a[10] + ' ' + a[11].join(' ') + ' ' + a[8].map(function (i) { return i[1]; }).join(' ')) };
      a[11].forEach(function (cod) { s[indice[cod].eje] = indice[cod].i; });
      return s;
    });
    SV = { lista: lista, ejes: A.clasificacion, indice: indice, unidades: unidades };
    return SV;
  }

  function categoria(eje, i) { return SV.ejes[EJES_SERV.indexOf(eje)].categorias[i]; }
  function codigoDe(s, eje) { return categoria(eje, s[eje]).codigo; }

  // Color de un codigo: ambito con su color propio; secuencia con el de obra negra/gris/blanca; resto, color del eje.
  function colorCodigo(codigo, oscuro) {
    var info = SV.indice[codigo];
    if (!info) return '#8a8c82';
    if (info.eje === 'am') return oscuro ? info.c.colorOscuro : info.c.color;
    if (info.eje === 'sec') return COLOR_TIPO_OBRA[info.c.tipo] || '#8a8c82';
    return COLOR_EJE[info.eje];
  }
  function tintaSobre(hex) {
    var n = parseInt(hex.slice(1), 16);
    var l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l > 0.62 ? '#20211e' : '#ffffff';
  }
  function chipCodigo(codigo, oscuro) {
    var color = colorCodigo(codigo, oscuro);
    return '<span class="codigo-clas" style="background:' + color + ';color:' + tintaSobre(color) + '">' + E(codigo) + '</span>';
  }
  function iconoRuta(clave) { return window.APU.carpetaIconos + clave + '.svg'; }
  function porUnidad(s) { return s.unidadNombre ? 'por ' + s.unidadNombre.toLowerCase() : ''; }
  function estadoVacio() { return { texto: '', am: '', sec: '', es: '', np: '', uni: '', cat: '' }; }

  // Categoria "Remodelacion" dentro de Construccion: trabajos sobre una construccion existente
  // (demolicion o mantenimiento, instalaciones, cubierta, acabados u oficios de intervencion).
  var CODIGOS_REMODELACION_ES = ['ES02', 'ES07', 'ES08', 'ES09', 'ES10', 'ES11', 'ES12', 'ES13', 'ES14'];
  function esRemodelacion(s) {
    return enCodigos(s, 'np', ['NP05', 'NP06']) || enCodigos(s, 'sec', ['OG06', 'ON07', 'OB08']) || enCodigos(s, 'es', CODIGOS_REMODELACION_ES);
  }

  function filtrarServicios(lista, st, excluir) {
    var palabras = Motor.normalizar(st.texto).split(' ').filter(Boolean);
    return lista.filter(function (s) {
      if (excluir !== 'cat' && st.cat === 'remodelacion' && !esRemodelacion(s)) return false;
      for (var k = 0; k < EJES_SERV.length; k++) {
        var eje = EJES_SERV[k];
        if (excluir !== eje && st[eje] !== '' && s[eje] !== Number(st[eje])) return false;
      }
      if (excluir !== 'uni' && st.uni !== '' && s.uni !== Number(st.uni)) return false;
      return !palabras.length || coincideTexto(s, palabras);
    });
  }

  function crearVistaServicios(opc) {
    var V = { id: opc.id, st: estadoVacio(), montado: false, lista: null };
    var cat = { id: opc.id, contenedor: opc.contenedor, tarjeta: tarjeta };
    var cont = function () { return $(opc.contenedor); };
    var q = function (rol) { return cont().querySelector('[data-rol="' + rol + '"]'); };
    var ruta = function (resto) { return '#' + opc.id + (resto ? '/' + resto : ''); };

    function base() {
      if (!V.lista) V.lista = SV.lista.filter(function (s) { return opc.base(s); });
      return V.lista;
    }

    function tarjeta(s) {
      var esp = categoria('es', s.es);
      return '<article class="tarjeta-producto tarjeta-servicio">' +
        '<a class="icono-servicio" href="' + E(ruta(s.codigo)) + '" title="' + E(esp.nombre) + '"><img src="' + E(iconoRuta(s.icono)) + '" alt="" loading="lazy"></a>' +
        '<div class="cuerpo-producto"><span class="codigos-clas">' + s.codigos.map(function (c) { return chipCodigo(c); }).join('') + '</span>' +
        '<p class="nombre-producto">' + E(s.nombre) + '</p>' +
        '<p class="meta-producto">' + E(s.codigo) + ' · ' + E(categoria('sec', s.sec).nombre) + ' · ' + E(esp.nombre) + '</p>' +
        '<p class="unidad-servicio">Unidad: <strong>' + E(s.unidadNombre || s.unidad) + '</strong> (' + E(s.unidad) + ')</p>' +
        '<p class="precio-producto">' + Motor.formatoMoneda(s.precio) + ' <small>' + E(porUnidad(s)) + '</small></p>' +
        '<a class="enlace-analisis" href="' + E(ruta(s.codigo)) + '">Ver análisis · ' + s.insumos.length + ' insumos</a></div></article>';
    }

    // Secciones del indice: [{eje, titulo, explicacion, codigos?}] (sin codigos = todas las categorias con actividades).
    function codigosSeccion(sec) {
      var conteo = contar(base(), sec.eje);
      return SV.ejes[EJES_SERV.indexOf(sec.eje)].categorias
        .map(function (c, i) { return { c: c, i: i, n: conteo[i] || 0 }; })
        .filter(function (x) { return x.n && (!sec.codigos || sec.codigos.indexOf(x.c.codigo) !== -1); });
    }

    function indiceHtml() {
      var total = base().length;
      return '<div class="indice-intro">' +
        '<div class="acciones-formato"><a class="boton" href="' + ruta('catalogo') + '">Ver catálogo completo (' + total.toLocaleString('es-CO') + ')</a>' +
        '<a class="boton claro" href="pages/Servicios/Analisis_Precios_Unitarios.xlsx" download>Descargar Excel</a></div></div>' +
        (opc.extraIndice ? opc.extraIndice() : '') +
        opc.secciones.map(function (sec, is) {
          var eje = SV.ejes[EJES_SERV.indexOf(sec.eje)];
          return '<section class="eje-clas"><h3><span class="eje-num">' + (is + 1) + '</span>' + E(sec.titulo || eje.titulo) + ' <span class="eje-letras">' + E(eje.letras) + '</span><small>' + E(eje.pregunta) + '</small></h3>' +
            '<p class="texto-suave">' + E(sec.explicacion || eje.explicacion) + '</p><div class="rejilla-clas">' +
            codigosSeccion(sec).map(function (x) {
              return '<a class="tile-clas" href="' + ruta('c/' + x.c.codigo) + '" style="--color-clas:' + colorCodigo(x.c.codigo) + '">' +
                '<span class="tile-clas-cabeza">' + chipCodigo(x.c.codigo) + '<img src="' + E(iconoRuta(x.c.icono)) + '" alt=""></span>' +
                '<strong>' + E(x.c.nombre) + '</strong><span class="tile-clas-conteo">' + x.n.toLocaleString('es-CO') + ' actividades</span>' +
                (x.c.descripcion ? '<small>' + E(x.c.descripcion) + '</small>' : '') + '</a>';
            }).join('') + '</div></section>';
        }).join('') + (opc.nota ? '<div class="aviso recomendacion-clas">' + opc.nota + '</div>' : '') + '<aside class="nota-pagina"><strong>Nota · clasificación</strong>' + opc.intro(total) + '</aside>';
    }

    function detalleHtml(s) {
      var G = window.APU.grupos;
      var subtotales = {};
      s.insumos.forEach(function (i) { subtotales[i[0]] = (subtotales[i[0]] || 0) + (i[5] || 0); });
      return '<a class="volver" href="' + ruta('catalogo') + '">← Catálogo</a>' +
        '<div class="detalle-servicio"><div class="icono-servicio grande"><img src="' + E(iconoRuta(s.icono)) + '" alt=""></div>' +
        '<div><span class="codigos-clas">' + s.codigos.map(function (c) { return chipCodigo(c); }).join('') + '</span><h3>' + E(s.nombre) + '</h3>' +
        '<dl class="datos-servicio"><dt>Código APU</dt><dd>' + E(s.codigo) + '</dd><dt>Unidad</dt><dd>' + E(s.unidadNombre || s.unidad) + ' (' + E(s.unidad) + ')</dd>' +
        '<dt>Precio</dt><dd class="precio-producto">' + Motor.formatoMoneda(s.precio) + ' <small>' + E(porUnidad(s)) + '</small></dd>' +
        EJES_SERV.map(function (eje, ie) { var c = categoria(eje, s[eje]); return '<dt>' + E(SV.ejes[ie].titulo) + '</dt><dd><a href="' + ruta('c/' + c.codigo) + '">' + E(c.codigo) + ' · ' + E(c.nombre) + '</a></dd>'; }).join('') +
        (window.APU.edificacion && window.APU.edificacion.actividades[s.codigo] ? (function () {
          var d = window.APU.edificacion.actividades[s.codigo];
          var cap = window.APU.edificacion.capitulos.filter(function (c) { return c[0] === d[1]; })[0] || [d[1], '', []];
          var g = cap[2].filter(function (x) { return x[0] === d[2]; })[0] || [d[2], ''];
          return '<dt>Clasificación interna</dt><dd><a href="#servicios/edificacion"><code>' + E(d[0]) + '</code></a> · ' + E(cap[1]) + ' › ' + E(g[1]) + ' · ' + E(d[3]) + ' · ' + E(d[4]) + '</dd>';
        })() : '') + '</dl>' +
        (s.revisar ? '<p class="aviso">El costo total del documento no coincide con la suma de sus insumos: revisar en el documento original.</p>' : '') +
        '<p class="texto-suave">' + Object.keys(subtotales).map(function (g) { return E(G[g]) + ': ' + Motor.formatoMoneda(subtotales[g]); }).join(' · ') + '</p></div></div>' +
        '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Grupo</th><th>Producto / insumo</th><th>Unidad</th><th class="num">Cantidad</th><th class="num">Valor unitario</th><th class="num">Valor parcial</th></tr></thead><tbody>' +
        s.insumos.map(function (i) {
          return '<tr><td>' + E(G[i[0]] || '') + '</td><td>' + E(i[1]) + '</td><td>' + E(i[2]) + '</td><td class="num">' + (i[3] == null ? '' : i[3].toLocaleString('es-CO', { maximumFractionDigits: 4 })) + '</td>' +
            '<td class="num">' + Motor.formatoMoneda(i[4]) + '</td><td class="num">' + Motor.formatoMoneda(i[5]) + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr><td colspan="5">Precio ' + E(porUnidad(s)) + '</td><td class="num">' + Motor.formatoMoneda(s.precio) + '</td></tr></tfoot></table></div>';
    }

    // Clasificacion interna de Edificacion (AM01): capitulo -> grupo -> actividades, con tipo de trabajo y material.
    // Datos: APU.edificacion (tools/clasificacion_edificacion.js). Ruta: #servicios/edificacion.
    function edificacionHtml() {
      var ED = window.APU.edificacion;
      if (!ED) return '<p class="vacio">Falta la clasificación de Edificación. Ejecuta: node tools/generar_apu.js</p>';
      var porCodigo = {}; base().forEach(function (s) { porCodigo[s.codigo] = s; });
      var total = Object.keys(ED.actividades).length;
      var html = '<a class="volver" href="' + ruta('') + '">← Índice de servicios</a>' +
        '<h3 class="subtitulo-vista">Edificación · clasificación interna</h3>' +
        '<p class="texto-suave">' + total.toLocaleString('es-CO') + ' actividades del ámbito AM01 organizadas en capítulo → grupo de trabajo, con su tipo de trabajo y material principal. ' +
        'Código interno <strong>ED-capítulo-grupo-consecutivo</strong>. <a href="pages/Servicios/Clasificacion_Edificacion.xlsx">Descargar el listado en Excel</a>.</p>';
      ED.capitulos.forEach(function (cap) {
        var delCap = Object.keys(ED.actividades).filter(function (k) { return ED.actividades[k][1] === cap[0]; });
        if (!delCap.length) return;
        html += '<details class="capitulo-ed"><summary><strong>' + E(cap[0]) + ' · ' + E(cap[1]) + '</strong> <span class="conteo">' + delCap.length + '</span></summary>';
        cap[2].forEach(function (g) {
          var acts = delCap.filter(function (k) { return ED.actividades[k][2] === g[0]; });
          if (!acts.length) return;
          html += '<p class="grupo-ed">' + E(cap[0].split('.')[1] + '-' + g[0]) + ' · ' + E(g[1]) + ' <span class="conteo">' + acts.length + '</span></p>' +
            '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Código interno</th><th>Actividad</th><th>Unidad</th><th class="num">Precio</th><th>Tipo de trabajo</th><th>Material</th></tr></thead><tbody>' +
            acts.map(function (k) {
              var d = ED.actividades[k]; var s = porCodigo[k] || { nombre: k, unidad: '', precio: null };
              return '<tr><td><code>' + E(d[0]) + '</code></td><td><a href="' + ruta(k) + '">' + E(s.nombre) + '</a></td><td>' + E(s.unidad) + '</td>' +
                '<td class="num">' + (s.precio ? Motor.formatoMoneda(s.precio) : '—') + '</td><td>' + E(d[3]) + '</td><td>' + E(d[4]) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        });
        html += '</details>';
      });
      return html;
    }

    function limpiar() { var v = estadoVacio(); Object.keys(v).forEach(function (k) { V.st[k] = v[k]; }); }

    V.montar = function (sub) {
      if (!window.APU) cont().innerHTML = '<p class="texto-suave">Cargando servicios…</p>';
      cargarApu().then(function () {
        prepararServicios();
        if (!V.montado) {
          cont().innerHTML = '<div data-rol="indice"></div>' +
            '<div data-rol="catalogo"><a class="volver" href="' + ruta('') + '">← Índice</a>' +
            '<div class="filtros filtros-servicios">' +
            '<input type="search" data-rol="texto" placeholder="Buscar servicio, código (ej. ES04) o insumo…" aria-label="Buscar servicio">' +
            '<select data-rol="am" aria-label="Ámbito"></select><select data-rol="sec" aria-label="Secuencia"></select>' +
            '<select data-rol="es" aria-label="Especialidad"></select><select data-rol="np" aria-label="Naturaleza del precio"></select><select data-rol="uni" aria-label="Unidad"></select>' +
            (opc.categoriaRemodelacion ? '<select data-rol="cat" aria-label="Categoría"></select>' : '') + '</div>' +
            '<div class="filtros-extra"><button type="button" class="boton claro" data-rol="limpiar">Limpiar filtros</button>' +
            '<a class="boton claro" href="pages/Servicios/Analisis_Precios_Unitarios.xlsx" download>Descargar Excel</a></div>' +
            '<div data-rol="resultados"></div></div><div data-rol="detalle"></div>';
          var t = null;
          q('texto').addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { V.st.texto = e.target.value; V.pintar(); }, 180); });
          EJES_SERV.concat('uni', opc.categoriaRemodelacion ? ['cat'] : []).forEach(function (rol) { q(rol).addEventListener('change', function (e) { V.st[rol] = e.target.value; V.pintar(); }); });
          q('limpiar').addEventListener('click', function () { limpiar(); q('texto').value = ''; V.pintar(); });
          q('indice').innerHTML = indiceHtml();
          if (opc.alMontarIndice) opc.alMontarIndice(cont());
          V.montado = true;
        }
        V.modo(sub);
      }).catch(function () { cont().innerHTML = '<p class="vacio">No se pudo cargar assets/datos/apu.js. Ejecuta: node tools/generar_apu.js</p>'; });
    };

    // sub: '' indice · 'catalogo' · 'c/<CODIGO>' · codigo de actividad
    V.modo = function (sub) {
      var m = /^c\/(\w+)$/.exec(sub || '');
      if (m && SV.indice[m[1]]) { limpiar(); q('texto').value = ''; V.st[SV.indice[m[1]].eje] = String(SV.indice[m[1]].i); }
      // Categoria Remodelacion (Construccion): catalogo filtrado a los trabajos sobre una construccion existente
      var remodelar = opc.categoriaRemodelacion && sub === 'remodelacion';
      if (remodelar) { limpiar(); q('texto').value = ''; V.st.cat = 'remodelacion'; }
      var actividad = sub && !m && !remodelar && sub !== 'catalogo' && sub !== 'salario' && sub !== 'edificacion' ? base().filter(function (x) { return x.codigo === sub; })[0] : null;
      var modo = sub === 'edificacion' ? 'edificacion' : actividad ? 'detalle' : (m || remodelar || sub === 'catalogo') ? 'catalogo' : 'indice';
      V.enCatalogo = modo === 'catalogo';
      q('indice').style.display = modo === 'indice' ? '' : 'none';
      q('catalogo').style.display = modo === 'catalogo' ? '' : 'none';
      q('detalle').innerHTML = modo === 'edificacion' ? edificacionHtml() : actividad ? detalleHtml(actividad) : '';
      // Texto que llega desde el buscador "¿Que deseas construir?" (usuario.html)
      if (modo === 'catalogo' && typeof BUSQUEDA_PENDIENTE !== 'undefined' && BUSQUEDA_PENDIENTE) { limpiar(); V.st.texto = BUSQUEDA_PENDIENTE; q('texto').value = BUSQUEDA_PENDIENTE; BUSQUEDA_PENDIENTE = ''; }
      if (modo === 'catalogo') V.pintar();
      else pintarSidebar();
      var ancla = sub === 'salario' && cont().querySelector('#calculo-salario');
      // Desplaza hasta el calculo dejando visible su titulo bajo el encabezado y el navbar fijos.
      if (ancla) window.scrollTo(0, ancla.getBoundingClientRect().top + window.scrollY - document.querySelector('.site-header').offsetHeight - 16);
    };

    V.pintar = function () {
      EJES_SERV.forEach(function (eje, ie) {
        var e = SV.ejes[ie];
        q(eje).innerHTML = opciones(contar(filtrarServicios(base(), V.st, eje), eje), function (i) { return e.categorias[i].codigo + ' · ' + e.categorias[i].nombre; }, V.st[eje], e.titulo + ': todos');
      });
      q('uni').innerHTML = opciones(contar(filtrarServicios(base(), V.st, 'uni'), 'uni'), function (i) { return SV.unidades[i]; }, V.st.uni, 'Unidad: todas');
      if (q('cat')) {
        var nRem = filtrarServicios(base(), V.st, 'cat').filter(esRemodelacion).length;
        q('cat').innerHTML = '<option value=""' + (V.st.cat === '' ? ' selected' : '') + '>Categoría: todas las actividades</option>' +
          '<option value="remodelacion"' + (V.st.cat === 'remodelacion' ? ' selected' : '') + '>Remodelación (' + nRem.toLocaleString('es-CO') + ')</option>';
      }
      cat.filtrados = filtrarServicios(base(), V.st);
      pintarResultados(cat);
      if (leerRuta().vista === opc.id) pintarSidebar();
    };

    // Sidebar: indice de la vista con sus codigos (color + icono + conteo que sigue los filtros en el catalogo).
    V.sidebar = function (sub) {
      if (!SV || !V.montado) return sbTitulo(opc.nombre) + sbNota('Cargando clasificación…');
      var st = V.enCatalogo ? V.st : estadoVacio();
      var html = '<a href="' + ruta('') + '" class="' + (!sub ? 'activo' : '') + '"><span class="texto">Índice · ' + E(opc.nombre) + '</span></a>' +
        '<a href="' + ruta('catalogo') + '" class="' + (sub === 'catalogo' ? 'activo' : '') + '"><span class="texto">Catálogo completo</span>' + sbConteo(base().length) + '</a>' +
        (opc.extraSidebar ? opc.extraSidebar(sub) : '');
      opc.secciones.forEach(function (sec, is) {
        var eje = SV.ejes[EJES_SERV.indexOf(sec.eje)];
        var conteos = contar(filtrarServicios(base(), st, sec.eje), sec.eje);
        html += '<p class="sidebar-titulo">' + (is + 1) + ' · ' + E(sec.titulo || eje.titulo) + ' <span class="letras-eje">' + E(eje.letras) + '</span></p>' +
          '<p class="sidebar-nota">' + E(eje.pregunta) + '</p>' +
          codigosSeccion(sec).map(function (x) {
            var activo = V.enCatalogo && V.st[sec.eje] === String(x.i);
            return '<a class="item-clas' + (activo ? ' activo' : '') + '" href="' + ruta('c/' + x.c.codigo) + '" title="' + E(x.c.nombre) + '">' +
              chipCodigo(x.c.codigo, true) + '<span class="icono-mini"><img src="' + E(iconoRuta(x.c.icono)) + '" alt=""></span>' +
              '<span class="texto">' + E(x.c.nombre) + '</span>' + sbConteo(conteos[x.i] || 0) + '</a>';
          }).join('');
      });
      return html + sbNota('Código de cada servicio: ámbito · secuencia · especialidad · naturaleza.');
    };

    return V;
  }

  // =====================================================================
  // Salario minimo y costo de la mano de obra (pestaña Servicios).
  // La matematica vive en assets/motor/salario_minimo.js (la misma que escribe el Excel
  // pages/Servicios/Calculo_Salario_Minimo.xlsx con formulas). Todo es proporcion del salario minimo
  // (SMMLV) y de la TRM: si cambian, se recalcula todo sin tocar las formulas.
  // =====================================================================
  var SM = window.SalarioMinimo;
  var ENTRADA_SALARIO = SM.valoresIniciales();
  var EXCEL_SALARIO = 'pages/Servicios/Calculo_Salario_Minimo.xlsx';

  function formatoPesos(v) {
    if (Math.abs(v) >= 100) return '$ ' + Math.round(v).toLocaleString('es-CO');
    return '$ ' + v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 4 : 2 });
  }
  function formatoDolares(v) {
    var dec = v >= 100 ? 0 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
    return 'US$ ' + v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function formatoNumero(v, dec) { return v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function parametro(id) { return SM.PARAMETROS.filter(function (p) { return p.id === id; })[0]; }

  function salarioHtml() {
    var campo = function (id, etiqueta, paso, factor) {
      return '<label>' + E(etiqueta) + '<input type="number" step="' + paso + '" min="0" data-param="' + id + '" data-factor="' + (factor || 1) + '" value="' + (ENTRADA_SALARIO[id] * (factor || 1)).toFixed(factor === 100 ? 2 : 2).replace(/\.00$/, '') + '"></label>';
    };
    return '<section class="calculo-salario" id="calculo-salario">' +
      '<h3><span class="eje-num">$</span>Salario mínimo y costo de la mano de obra</h3>' +
      '<p class="texto-suave">Todo se calcula como <strong>proporción de dos datos</strong>: el salario mínimo mensual (<strong>SMMLV</strong>) y la tasa de cambio (<strong>TRM</strong>). ' +
      'Cada periodo es una fracción del mes y cada valor en dólares es el valor en pesos dividido entre la TRM. Si el próximo año sube el salario o cambia el dólar, basta con escribir el nuevo valor: todo se recalcula con las mismas fórmulas. ' +
      'La misma matemática está en el Excel con fórmulas vivas.</p>' +
      '<div class="acciones-formato"><a class="boton" href="' + E(EXCEL_SALARIO) + '" download>Descargar Excel con las fórmulas</a><button type="button" class="boton claro" data-rol="restaurar-salario">Volver a los valores vigentes</button></div>' +
      '<div class="parametros-salario">' +
      campo('SMMLV', 'Salario mínimo mensual ($)', 1) +
      campo('TRM', 'TRM ($ por dólar)', 0.01) +
      '<label>Clase de riesgo ARL<select data-param="ARL_PCT">' + SM.ARL_CLASES.map(function (a) {
        return '<option value="' + a[1] + '"' + (a[1] === ENTRADA_SALARIO.ARL_PCT ? ' selected' : '') + '>Clase ' + a[0] + ' · ' + formatoNumero(a[1] * 100, 3) + ' % · ' + E(a[2]) + '</option>';
      }).join('') + '</select></label>' +
      campo('SALUD_PCT', 'Salud empleador (%)', 0.1, 100) +
      campo('TRANSPORTE_DIA', 'Transporte por día ($)', 500) +
      campo('DIAS_TRABAJADOS', 'Días trabajados al mes', 1) +
      campo('HORAS_SEMANA', 'Jornada semanal (horas)', 1) +
      '</div><div data-rol="resultado-salario"></div>' +
      '<p class="texto-suave nota-salario">Fuentes: ' + SM.PARAMETROS.slice(0, 2).map(function (p) { return E(p.id) + ' — ' + E(p.fuente); }).join('; ') + '; jornada — ' + E(parametro('HORAS_SEMANA').fuente) + '; ARL — ' + E(parametro('ARL_PCT').fuente) + '. ' +
      'El auxilio de transporte legal 2026 es $ 249.095 al mes; aquí se usa el valor por día definido arriba. No incluye pensión, caja de compensación ni prestaciones sociales. Si el empleador es persona jurídica y el trabajador gana menos de 10 salarios mínimos, puede estar exonerado del 8,5 % de salud (art. 114-1 del Estatuto Tributario): en ese caso escribe 0.</p>' +
      '</section>';
  }

  function pintarSalario(seccion) {
    var r = SM.calcular(ENTRADA_SALARIO);
    var v = r.v;
    var total = r.tabla.filter(function (t) { return t.concepto.total; })[0];
    var tile = function (etiqueta, principal, nota) { return '<div class="tile-dato"><span class="tile-etiqueta">' + etiqueta + '</span><strong class="tile-valor">' + principal + '</strong><span class="tile-nota">' + nota + '</span></div>'; };
    var valorPeriodo = function (id) { return total.valores.filter(function (x) { return x.periodo.id === id; })[0]; };
    var formatoRelacion = function (x) {
      var val = x.valor;
      if (x.relacion.porcentaje) return formatoNumero(val * 100, 4) + ' %';
      if (/US\$/.test(x.relacion.unidad)) return formatoDolares(val);
      return formatoNumero(val, 2) + ' ' + E(x.relacion.unidad);
    };
    seccion.querySelector('[data-rol="resultado-salario"]').innerHTML =
      '<div class="tiles">' + ['MES', 'DIA_TRABAJADO', 'HORA', 'SEGUNDO'].map(function (id) {
        var x = valorPeriodo(id);
        return tile('Costo total por ' + E(x.periodo.nombre.toLowerCase()), formatoPesos(x.cop), formatoDolares(x.usd));
      }).join('') + '</div>' +
      '<div class="tabla-desplazable"><table class="tabla tabla-salario"><thead><tr><th>Concepto</th>' +
      SM.PERIODOS.map(function (p) { return '<th class="num" title="Factor: ' + E(p.texto) + '">' + E(p.nombre) + '</th>'; }).join('') + '</tr>' +
      '<tr class="fila-factor"><th>Factor del mes</th>' + SM.PERIODOS.map(function (p) { return '<th class="num">' + E(p.texto) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      r.tabla.map(function (t) {
        return '<tr class="' + (t.concepto.total ? 'total' : '') + '"><td>' + E(t.concepto.nombre) + '</td>' + t.valores.map(function (x) {
          return '<td class="num">' + formatoPesos(x.cop) + '<span class="usd">' + formatoDolares(x.usd) + '</span></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<h4 class="subtitulo-salario">Relación numérica entre el salario mínimo y el dólar</h4>' +
      '<div class="rejilla-relaciones">' + r.relaciones.map(function (x) {
        return '<div class="relacion"><span class="tile-etiqueta">' + E(x.relacion.nombre) + '</span><strong>' + formatoRelacion(x) + '</strong>' +
          '<code>' + E(x.relacion.texto) + '</code><small>' + E(x.relacion.explicacion) + '</small></div>';
      }).join('') + '</div>' +
      '<details class="matematica-salario"><summary>La matemática de cada función (fórmulas con los valores actuales)</summary>' +
      '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Nombre</th><th>Fórmula</th><th class="num">Valor actual</th><th>Explicación</th></tr></thead><tbody>' +
      SM.PARAMETROS.map(function (p) { return '<tr><td><code>' + E(p.id) + '</code></td><td>Dato de entrada</td><td class="num">' + (p.unidad === '%' ? formatoNumero(v[p.id] * 100, 3) + ' %' : p.id === 'TRM' ? '$ ' + formatoNumero(v.TRM, 2) : /\$/.test(p.unidad) ? formatoPesos(v[p.id]) : formatoNumero(v[p.id], 0)) + '</td><td>' + E(p.nombre) + '</td></tr>'; }).join('') +
      SM.DERIVADOS.map(function (d) { return '<tr><td><code>' + E(d.id) + '</code></td><td><code>' + E(d.texto) + '</code></td><td class="num">' + (d.id === 'DIVISOR_HORAS' ? formatoNumero(v[d.id], 0) + ' h' : formatoPesos(v[d.id])) + '</td><td>' + E(d.explicacion) + '</td></tr>'; }).join('') +
      SM.PERIODOS.map(function (p) { return '<tr><td>Factor ' + E(p.nombre.toLowerCase()) + '</td><td><code>' + E(p.texto) + '</code></td><td class="num">' + formatoNumero(p.calc(v), 8) + '</td><td>Valor del periodo = valor mensual × factor.</td></tr>'; }).join('') +
      '<tr><td>Dólares</td><td><code>valor en pesos ÷ TRM</code></td><td class="num">' + formatoDolares(v.SMMLV / v.TRM) + '</td><td>Ejemplo: salario mínimo en dólares.</td></tr>' +
      '</tbody></table></div></details>';
  }

  function conectarSalario(cont) {
    var seccion = cont.querySelector('#calculo-salario');
    if (!seccion || seccion.dataset.conectado) return;
    seccion.dataset.conectado = '1';
    seccion.addEventListener('input', function (e) {
      var campo = e.target.closest('[data-param]');
      if (!campo) return;
      var numero = Number(campo.value);
      if (!isFinite(numero) || numero < 0) return;
      ENTRADA_SALARIO[campo.getAttribute('data-param')] = numero / Number(campo.getAttribute('data-factor') || 1);
      if (ENTRADA_SALARIO.DIAS_TRABAJADOS < 1) ENTRADA_SALARIO.DIAS_TRABAJADOS = 1;
      if (ENTRADA_SALARIO.HORAS_SEMANA < 1) ENTRADA_SALARIO.HORAS_SEMANA = 1;
      if (ENTRADA_SALARIO.TRM <= 0) ENTRADA_SALARIO.TRM = SM.valoresIniciales().TRM;
      pintarSalario(seccion);
    });
    seccion.addEventListener('click', function (e) {
      if (!e.target.closest('[data-rol="restaurar-salario"]')) return;
      ENTRADA_SALARIO = SM.valoresIniciales();
      seccion.outerHTML = salarioHtml();
      conectarSalario(cont);
    });
    pintarSalario(seccion);
  }

  function enCodigos(s, eje, lista) { return lista.indexOf(codigoDe(s, eje)) !== -1; }
  var VISTAS_SERVICIOS = {
    servicios: crearVistaServicios({
      id: 'servicios', nombre: 'Servicios', contenedor: 'servicios-contenido',
      base: function () { return true; },
      intro: function (total) {
        return '<p>Las <strong>' + total.toLocaleString('es-CO') + ' actividades</strong> del análisis de precios unitarios se clasifican en <strong>cuatro ejes independientes</strong>, porque cada uno responde una pregunta distinta. Una sola etiqueta mezclaba dónde se construye, cuándo, quién lo hace y qué incluye el precio.</p>' +
          '<p>Cada servicio lleva un <strong>código compuesto</strong> de dos letras y dos números por eje, por ejemplo ' +
          ['AM01', 'ON04', 'ES04', 'NP01'].map(function (c) { return chipCodigo(c); }).join(' ') + ' = edificación · estructura (obra negra) · concreto · construcción.</p>';
      },
      secciones: [{ eje: 'am' }, { eje: 'sec' }, { eje: 'es' }, { eje: 'np' }],
      extraIndice: salarioHtml,
      alMontarIndice: conectarSalario,
      extraSidebar: function (sub) {
        return '<a href="#servicios/edificacion" class="' + (sub === 'edificacion' ? 'activo' : '') + '"><span class="texto">Edificación · clasificación interna</span>' + sbConteo(window.APU && window.APU.edificacion ? Object.keys(window.APU.edificacion.actividades).length : 0) + '</a>' +
          '<a href="#servicios/salario" class="' + (sub === 'salario' ? 'activo' : '') + '"><span class="texto">Salario mínimo y costo laboral</span><span class="conteo">' + formatoPesos(ENTRADA_SALARIO.SMMLV) + '</span></a>';
      },
      nota: '<strong>Cómo navegar:</strong> primero el ámbito (una vivienda usa Edificación, AM01), luego la secuencia constructiva (etapa y subetapa), y la especialidad y la naturaleza del precio como filtros. Administración (AM05) y Análisis básicos (AM06) quedan aparte como referencia de costos indirectos e insumos compuestos. La pestaña <a href="#construccion">Construcción</a> es este mismo catálogo filtrado para edificación, con Remodelación como categoría.',
    }),
    // Solo en usuario.html: Remodelacion como pestana propia con su listado de servicios (misma regla que la categoria).
    remodelacion: crearVistaServicios({
      id: 'remodelacion', nombre: 'Remodelación', contenedor: 'remodelacion-contenido',
      base: function (s) { return codigoDe(s, 'am') === 'AM01' && esRemodelacion(s); },
      intro: function (total) {
        return '<p><strong>Remodelación</strong>: ' + total.toLocaleString('es-CO') + ' servicios para intervenir una construcción existente: demoler y retirar ' + chipCodigo('ES02') + ', renovar instalaciones ' + chipCodigo('OG06') + ', cubiertas ' + chipCodigo('ON07') + ' y acabados ' + chipCodigo('OB08') + ', y hacer mantenimiento ' + chipCodigo('NP06') + '.</p>';
      },
      secciones: [
        { eje: 'es', titulo: 'Especialidad', explicacion: 'El oficio que interviene en la remodelación.', codigos: CODIGOS_REMODELACION_ES },
        { eje: 'np', explicacion: 'Qué incluye el precio: demoler y retirar, suministrar e instalar, construir o dar mantenimiento.' },
        { eje: 'sec', titulo: 'Etapa que se interviene', explicacion: 'La etapa de obra a la que pertenece cada trabajo.' },
      ],
      nota: '<strong>Orden sugerido para remodelar:</strong> demolición y retiro (ES02) → redes hidrosanitarias y eléctricas (ES13, ES14) → cubiertas (ES10) → pañetes y cielos (ES07, ES11) → pisos y enchapes (ES08) → carpintería (ES12) → pintura (ES09).',
    }),
    // Construccion = antiguas Obra Nueva + Remodelacion en una sola pestana: todas las actividades de edificacion (AM01);
    // "Remodelacion" es una categoria (filtro) dentro de ellas: #construccion/remodelacion.
    construccion: crearVistaServicios({
      id: 'construccion', nombre: 'Construcción', contenedor: 'construccion-contenido',
      categoriaRemodelacion: true,
      base: function (s) { return codigoDe(s, 'am') === 'AM01'; },
      intro: function (total) {
        var nRem = SV.lista.filter(function (s) { return codigoDe(s, 'am') === 'AM01' && esRemodelacion(s); }).length;
        return '<p><strong>Construcción</strong> reúne las <strong>' + total.toLocaleString('es-CO') + ' actividades de edificación</strong> (' + chipCodigo('AM01') + ') en su secuencia constructiva: obra negra ' + chipCodigo('ON01') + ' → obra gris ' + chipCodigo('OG05') + ' → obra blanca ' + chipCodigo('OB08') + '.</p>' +
          '<p><strong>Remodelación</strong> es una categoría dentro de ellas: ' + nRem.toLocaleString('es-CO') + ' trabajos sobre una construcción existente (demolición y retiro ' + chipCodigo('ES02') + ', instalaciones ' + chipCodigo('OG06') + ', cubiertas ' + chipCodigo('ON07') + ', acabados ' + chipCodigo('OB08') + ' y mantenimiento ' + chipCodigo('NP06') + '). ' +
          '<a href="#construccion/remodelacion">Ver solo remodelación</a>.</p>';
      },
      secciones: [
        { eje: 'sec', titulo: 'Secuencia de obra', explicacion: 'Las etapas en el orden en que se construye una edificación. Cada código abre las actividades de esa etapa.', codigos: ['ON01', 'ON02', 'ON03', 'ON04', 'ON07', 'OG05', 'OG06', 'OB08', 'OB09', 'OB10'] },
        { eje: 'es', explicacion: 'El oficio que ejecuta el trabajo, tanto en obra nueva como en remodelación.' },
        { eje: 'np', explicacion: 'Qué incluye el precio: construir, suministrar e instalar, demoler y retirar o dar mantenimiento.' },
      ],
      extraSidebar: function (sub) {
        var n = SV ? SV.lista.filter(function (s) { return codigoDe(s, 'am') === 'AM01' && esRemodelacion(s); }).length : null;
        return '<p class="sidebar-titulo">Categorías</p>' +
          '<a href="#construccion/catalogo" class="' + (sub === 'catalogo' ? 'activo' : '') + '"><span class="texto">Todas las actividades</span></a>' +
          '<a href="#construccion/remodelacion" class="' + (sub === 'remodelacion' ? 'activo' : '') + '"><span class="texto">Remodelación</span>' + sbConteo(n) + '</a>';
      },
      nota: '<strong>Orden sugerido para construir:</strong> preliminares y replanteo, excavación y cimentación, estructura y cubierta (obra negra); mampostería e instalaciones (obra gris); acabados, exteriores y entrega (obra blanca).<br>' +
        '<strong>Para remodelar:</strong> demolición y retiro (ES02) → redes hidrosanitarias y eléctricas (ES13, ES14) → cubiertas (ES10) → pañetes y cielos (ES07, ES11) → pisos y enchapes (ES08) → carpintería (ES12) → pintura (ES09). ' +
        'El detalle por etapa de cada proyecto está en <a href="#proyectos">Proyectos</a> y <a href="#presupuesto">Presupuesto</a>.',
    }),
  };

  // =====================================================================
  // Proyectos y slide vertical
  // =====================================================================
  var slide = null;
  var ETIQUETAS_FICHA = { tipo: 'Tipo', ubicacion: 'Ubicación', area: 'Área', pisos: 'Pisos', inicio: 'Inicio', cliente: 'Cliente', estado: 'Estado' };

  // ---- Etapas de un proyecto: misma estructura que pages/Cliente/Plantilla Modelo/ETAPAS OBRA
  function estructuraEtapas() {
    if (CONTENIDO.plantilla && CONTENIDO.plantilla.length) return CONTENIDO.plantilla;
    return OBRA.etapas.map(function (e) { return { carpeta: e.carpeta, subetapas: [] }; });
  }
  function limpiarCarpeta(nombre) { return nombre.replace(/^\d+_/, '').replace(/_/g, ' '); }
  function datosEtapa(carpeta) {
    var e = OBRA.etapas.filter(function (x) { return x.carpeta === carpeta; })[0];
    return e || { n: parseInt(carpeta, 10), nombre: limpiarCarpeta(carpeta), etapa: 'gris', subetapas: [] };
  }
  function nombreSubetapa(carpetaEtapa, carpetaSub) {
    var e = datosEtapa(carpetaEtapa);
    var i = parseInt(carpetaSub, 10);
    return (i && e.subetapas[i - 1]) || limpiarCarpeta(carpetaSub);
  }
  function imagenesEtapa(proyecto, carpeta, sub) {
    var info = proyecto.etapas && proyecto.etapas[carpeta];
    if (!info) return [];
    if (sub) return info.subetapas[sub] || [];
    return Object.keys(info.subetapas).sort().reduce(function (lista, s) { return lista.concat(info.subetapas[s]); }, info.imagenes.slice());
  }
  function buscarProyecto(id) { return CONTENIDO.proyectos.filter(function (p) { return p.id === id; })[0]; }

  function renderProyectos(sub) {
    var cont = $('proyectos-contenido');
    var partes = sub.split('/');
    var proyecto = buscarProyecto(partes[0]);
    if (!proyecto) { cont.innerHTML = listaProyectosHtml(); return; }
    var etapa = estructuraEtapas().filter(function (e) { return e.carpeta === partes[1]; })[0];
    if (etapa) { renderEtapaProyecto(cont, proyecto, etapa, partes[2] || ''); return; }
    renderResumenProyecto(cont, proyecto);
  }

  // =====================================================================
  // usuario.html · Catalogo compacto de casas (4 por pantalla) y vista de producto (#casa/<n>)
  // =====================================================================
  // Casas visibles para el cliente: con precio, area y foto, de menor a mayor precio (mismo orden en todas las vistas).
  function casasCliente() {
    var P = window.PREFABRICADAS; if (!P) return [];
    return P.modelos.filter(function (x) { return x.precioM2 && x.imagen; }).sort(function (a, b) { return a.precio - b.precio || a.area - b.area; });
  }
  // Personas segun el area: < 40 m2: 1-2 · 40-70 m2: 3 · 70-120 m2: 5 · mas de 120 m2: 6+
  function personasCasa(area) { return area < 40 ? '1-2' : area <= 70 ? '3' : area <= 120 ? '5' : '6+'; }
  var ICONO_PERSONAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
  var ICONO_OJO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
  // Descripcion corta: nombre del modelo sin la variante y el sistema o acabado
  function nombreCortoCasa(x) { return x.modelo.replace(/\s*-\s*(cimentacion en placa|sobre palafitos|obra gris|obra blanca|acabados full)\s*$/i, ''); }
  function cardCasaCliente(x, i) {
    return '<a class="card-casa" href="#casa/' + i + '">' +
      '<span class="card-casa-foto"><img src="' + E(x.imagen) + '" alt="' + E(nombreCortoCasa(x)) + '" loading="lazy"><span class="card-casa-ojo" title="Ver casa">' + ICONO_OJO + '</span></span>' +
      '<span class="card-casa-texto"><strong>' + E(nombreCortoCasa(x)) + '</strong><small>' + E(x.acabado) + '</small>' +
      '<span class="card-casa-datos"><span>' + x.area + ' m²</span><span class="card-casa-personas" title="' + personasCasa(x.area) + ' personas">' + ICONO_PERSONAS + personasCasa(x.area) + '</span></span></span></a>';
  }
  function catalogoClienteHtml() {
    var lista = casasCliente();
    if (!lista.length) return '<p class="vacio">Falta assets/datos/prefabricadas.js. Ejecuta: node tools/generar_prefabricadas.js</p>';
    return '<div class="rejilla-casas-cliente">' + lista.map(cardCasaCliente).join('') + '</div>';
  }

  // "Comprar" abre una hoja inferior con los servicios de la casa:
  //   Plano de construccion -> pago por Nequi · Construccion del proyecto -> formulario de registro del usuario.
  // Datos del pago: completar el numero Nequi y el valor del plano (0 = "por confirmar"). Sin servidor no se guarda nada.
  var PAGO_NEQUI = { numero: '', titular: 'ConstruMaster', valorPlano: 25000 };
  function cerrarCompraCasa() { var h = $('hoja-compra'); if (h) h.remove(); document.body.classList.remove('hoja-abierta'); }
  function abrirCompraCasa(x) {
    cerrarCompraCasa();
    var h = document.createElement('div'); h.id = 'hoja-compra'; h.className = 'hoja-compra-fondo';
    h.innerHTML = '<div class="hoja-compra" role="dialog" aria-modal="true" aria-label="Comprar"><span class="hoja-asa"></span>' +
      '<button type="button" class="hoja-cerrar" data-rol="cerrar" aria-label="Cerrar">×</button><div data-rol="paso"></div></div>';
    document.body.appendChild(h); document.body.classList.add('hoja-abierta');
    var paso = h.querySelector('[data-rol="paso"]');
    h.addEventListener('click', function (e) {
      if (e.target === h || e.target.closest('[data-rol="cerrar"]')) return cerrarCompraCasa();
      var b = e.target.closest('[data-paso]'); if (b) mostrar(b.getAttribute('data-paso'));
    });
    var cabecera = '<p class="hoja-casa"><img src="' + E(x.imagen) + '" alt=""><span><strong>' + E(nombreCortoCasa(x)) + '</strong><small>' + E(x.empresa) + ' · ' + x.area + ' m²</small></span></p>';
    function mostrar(p) {
      h.querySelector('.hoja-compra').classList.toggle('en-portada', p === 'opciones');
      if (p === 'opciones') {
        // Primer plano: la imagen de la casa; abajo, los dos botones
        paso.innerHTML = '<div class="compra-portada"><img src="' + E(x.imagen) + '" alt="' + E(nombreCortoCasa(x)) + '">' +
          '<p><strong>' + E(nombreCortoCasa(x)) + '</strong><small>' + E(x.empresa) + ' · ' + x.area + ' m²</small></p></div>' +
          '<div class="compra-botones">' +
          '<button type="button" class="boton-opcion-compra" data-paso="plano">Plano de construcción</button>' +
          '<button type="button" class="boton-opcion-compra" data-paso="construccion">Construcción del proyecto</button></div>';
      } else if (p === 'plano') {
        var n = PAGO_NEQUI.numero ? PAGO_NEQUI.numero.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : 'por configurar';
        paso.innerHTML = '<button type="button" class="hoja-atras" data-paso="opciones">← Atrás</button>' +
          '<h3>Plano de construcción</h3>' + cabecera + '<p class="texto-suave">Planos a medio pliego para imprimir.</p>' +
          '<div class="pago-nequi"><p class="nequi-marca">Paga con <b>Nequi</b></p>' +
          '<p class="nequi-valor"><small>Valor a pagar</small><strong>' + (PAGO_NEQUI.valorPlano ? Motor.formatoMoneda(PAGO_NEQUI.valorPlano) : 'Por confirmar') + '</strong></p>' +
          '<ol><li>Abre la app <b>Nequi</b> en tu celular.</li><li>Toca <b>Envía</b> y elige <b>Envía plata</b>.</li><li>Escribe el número <b>' + E(n) + '</b> (' + E(PAGO_NEQUI.titular) + ').</li><li>Ingresa el valor y en el mensaje escribe: <b>Plano ' + E(nombreCortoCasa(x)) + '</b>.</li><li>Guarda el comprobante.</li></ol></div>' +
          '<button type="button" class="boton-comprar ancho" data-rol="pague">Ya pagué</button>' +
          '<p class="aviso" data-rol="aviso-pago" hidden>El pago en línea todavía no está conectado. Esta versión no guardó ningún dato.</p>';
        paso.querySelector('[data-rol="pague"]').addEventListener('click', function () { paso.querySelector('[data-rol="aviso-pago"]').hidden = false; });
      } else if (p === 'construccion') {
        var M = window.MUNICIPIOS;
        paso.innerHTML = '<button type="button" class="hoja-atras" data-paso="opciones">← Atrás</button>' +
          '<h3>Construcción del proyecto</h3>' + cabecera +
          '<form class="formulario-presupuesto formulario-registro-compra" data-rol="registro">' +
          '<label>Nombre<input type="text" name="nombre" autocomplete="given-name" required></label>' +
          '<label>Apellido<input type="text" name="apellido" autocomplete="family-name" required></label>' +
          '<label>Teléfono celular<input type="tel" name="celular" autocomplete="tel" inputmode="numeric" pattern="3[0-9]{9}" placeholder="3001234567" required></label>' +
          '<label>Departamento<select name="departamento" required><option value="">Selecciona el departamento</option>' +
          (M ? M.departamentos.map(function (d, i) { return '<option value="' + i + '">' + E(d.nombre) + '</option>'; }).join('') : '') + '</select></label>' +
          '<label>Ciudad o municipio<select name="municipio" required disabled><option value="">Primero elige el departamento</option></select></label>' +
          '<div class="opciones-radio"><span>Zona</span><label><input type="radio" name="zona" value="Urbana" required> Zona urbana</label><label><input type="radio" name="zona" value="Rural"> Zona rural</label></div>' +
          '<label>Correo electrónico<input type="email" name="correo" autocomplete="email" required></label>' +
          '<label class="casilla-terminos"><input type="checkbox" name="terminos" required> Acepto términos y condiciones</label>' +
          '<button type="submit" class="boton-comprar ancho">Registrarme</button>' +
          '<p class="aviso" data-rol="aviso-registro" hidden></p></form>';
        var f = paso.querySelector('[data-rol="registro"]');
        f.departamento.addEventListener('change', function () {
          var d = M && M.departamentos[f.departamento.value];
          f.municipio.disabled = !d;
          f.municipio.innerHTML = d ? '<option value="">Selecciona la ciudad o municipio</option>' + d.municipios.map(function (m) { return '<option>' + E(m) + '</option>'; }).join('') : '<option value="">Primero elige el departamento</option>';
        });
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var a = f.querySelector('[data-rol="aviso-registro"]');
          a.textContent = 'Gracias, ' + f.nombre.value.trim() + '. Registro listo para "' + nombreCortoCasa(x) + '". El envío se habilitará cuando ConstruMaster funcione con servidor: esta versión no guardó ningún dato.';
          a.hidden = false;
        });
      }
      h.querySelector('.hoja-compra').scrollTop = 0;
    }
    mostrar('opciones');
  }
  window.addEventListener('hashchange', cerrarCompraCasa);

  // Vista de producto: foto principal, galeria pequena, informacion; barra inferior con precio y "Comprar";
  // al bajar, desfile sin fin de casas similares (area parecida; misma empresa primero).
  var observadorSimilares = null;
  function renderProductoCasa(sub) {
    var lista = casasCliente(); var i = Number(sub); var x = lista[i];
    var cont = $('casa-contenido');
    if (!x) { location.hash = '#casas'; return; }
    registrarClicCasa(x);
    var fotos = (x.fotos && x.fotos.length ? x.fotos : [x.imagen]).filter(Boolean);
    cont.innerHTML = '<a class="volver" href="#casas">← Casas</a>' +
      '<div class="producto-casa">' +
      '<div class="producto-foto-principal"><img src="' + E(fotos[0]) + '" alt="' + E(nombreCortoCasa(x)) + '" data-rol="foto-principal"></div>' +
      (fotos.length > 1 ? '<div class="producto-galeria">' + fotos.map(function (f, k) { return '<button type="button" data-foto="' + E(f) + '"' + (k === 0 ? ' class="activa"' : '') + '><img src="' + E(f) + '" alt="Foto ' + (k + 1) + '" loading="lazy"></button>'; }).join('') + '</div>' : '') +
      '<div class="producto-info"><span class="marca-proveedor">' + E(x.empresa) + '</span><h2>' + E(nombreCortoCasa(x)) + '</h2>' +
      '<p class="texto-suave">' + E(x.acabado) + '</p>' +
      '<ul class="producto-datos"><li><b>' + x.area + ' m²</b><small>Área</small></li><li><b class="card-casa-personas">' + ICONO_PERSONAS + personasCasa(x.area) + '</b><small>Personas</small></li><li><b>' + Motor.formatoMoneda(x.precioM2) + '</b><small>Precio m²</small></li></ul>' +
      (x.url ? '<a class="enlace-producto" href="' + E(x.url) + '" target="_blank" rel="noopener">Ver ficha en ' + E(x.empresa) + ' ↗</a>' : '') + '</div></div>' +
      '<h3 class="subtitulo-vista">Casas similares</h3><div class="rejilla-casas-cliente" data-rol="similares"></div><div class="centinela-similares" data-rol="centinela"></div>' +
      '<div class="barra-compra"><span class="barra-compra-precio">' + precioTachadoHtml(x.precio) + '</span><button type="button" class="boton-comprar">Comprar</button></div>';
    cont.querySelector('.producto-galeria') && cont.querySelector('.producto-galeria').addEventListener('click', function (e) {
      var b = e.target.closest('[data-foto]'); if (!b) return;
      cont.querySelector('[data-rol="foto-principal"]').src = b.getAttribute('data-foto');
      cont.querySelectorAll('.producto-galeria button').forEach(function (y) { y.classList.toggle('activa', y === b); });
    });
    cont.querySelector('.boton-comprar').addEventListener('click', function () { abrirCompraCasa(x); });
    // Similares: resto de casas ordenadas por cercania de area (misma empresa primero); se repite en ciclo
    var similares = lista.map(function (y, k) { return { y: y, k: k }; }).filter(function (o) { return o.k !== i; })
      .sort(function (a, b) { return Math.abs(a.y.area - x.area) - Math.abs(b.y.area - x.area) || (a.y.empresa === x.empresa ? -1 : 0) - (b.y.empresa === x.empresa ? -1 : 0); });
    var caja = cont.querySelector('[data-rol="similares"]'); var pos = 0;
    function mas() { var html = ''; for (var n = 0; n < 6; n++) { var o = similares[pos % similares.length]; pos++; html += cardCasaCliente(o.y, o.k); } caja.insertAdjacentHTML('beforeend', html); }
    mas();
    if (observadorSimilares) observadorSimilares.disconnect();
    observadorSimilares = new IntersectionObserver(function (e) { if (e[0].isIntersecting) mas(); }, { rootMargin: '400px' });
    observadorSimilares.observe(cont.querySelector('[data-rol="centinela"]'));
    window.scrollTo(0, 0);
  }

  // =====================================================================
  // Construccion (index.html): REGISTRO DE OBRA por etapa. Sidebar: obra negra, gris y blanca con sus etapas y subetapas
  // (pages/Cliente/Plantilla Modelo/ETAPAS OBRA/datos.js). Cada etapa es un formulario: actividades del analisis de precios
  // unitarios de esa etapa (APU: etapa y subetapas de cada actividad) con cantidad -> valor = cantidad x precio unitario.
  // Sin servidor: las cantidades se guardan en este navegador (localStorage "construmaster_registro_obra") y se descargan en CSV.
  // =====================================================================
  var REG_CLAVE = 'construmaster_registro_obra';
  function regLeer() { try { return JSON.parse(localStorage.getItem(REG_CLAVE)) || {}; } catch (e) { return {}; } }
  function regGuardar(r) { try { localStorage.setItem(REG_CLAVE, JSON.stringify(r)); } catch (e) { /* sin almacenamiento */ } }
  function etapasObra() { return ((window.DATOS_ETAPAS || {}).etapas) || []; }
  function actividadesEtapa(carpeta) { return ((window.APU || {}).actividades || []).filter(function (a) { return a[5] === carpeta; }); }
  function valorEtapa(carpeta, reg) { return actividadesEtapa(carpeta).reduce(function (s, a) { return s + (Number(reg[a[0]]) || 0) * (a[3] || 0); }, 0); }
  var NOMBRE_OBRA = { negra: 'Obra negra', gris: 'Obra gris', blanca: 'Obra blanca' };

  function sidebarRegistroObra(sub) {
    var m = /^e-(\d+)(?:\/(\d+))?/.exec(sub || ''); var nE = m ? Number(m[1]) : 0, nS = m && m[2] ? Number(m[2]) : 0;
    var reg = regLeer();
    return sbEnlace('#construccion', 'Resumen del registro', null, !sub) +
      ['negra', 'gris', 'blanca'].map(function (k) {
        var es = etapasObra().filter(function (e) { return e.etapa === k; });
        return sbTitulo(NOMBRE_OBRA[k]) + es.map(function (e) {
          var v = valorEtapa(e.carpeta, reg);
          return sbEnlace('#construccion/e-' + e.n, ('0' + e.n).slice(-2) + ' · ' + e.nombre, v ? Motor.formatoMoneda(v) : actividadesEtapa(e.carpeta).length, nE === e.n && !nS) +
            (nE === e.n ? e.subetapas.map(function (s, i) { return sbEnlace('#construccion/e-' + e.n + '/' + (i + 1), s, null, nS === i + 1, true); }).join('') : '');
        }).join('');
      }).join('') +
      sbTitulo('Catálogo de actividades') + sbEnlace('#construccion/actividades', 'Todas las actividades', ((window.APU || {}).actividades || []).length, sub === 'actividades') +
      sbEnlace('#construccion/remodelacion', 'Remodelación', null, sub === 'remodelacion') + sbEnlace('#servicios', 'Clasificación por ejes') +
      sbEnlace('#servicios/edificacion', 'Clasificación de edificación') + sbEnlace('#servicios/salario', 'Salario mínimo y costo laboral');
  }

  function renderRegistroObra(sub) {
    var cont = $('construccion-registro'); var reg = regLeer();
    // El analisis de precios unitarios se carga bajo demanda (assets/datos/apu.js)
    if (!window.APU) {
      cont.innerHTML = '<p class="texto-suave">Cargando actividades…</p>';
      cargarApu().then(function () { if (leerRuta().vista === 'construccion') { renderRegistroObra(sub); pintarSidebar(); } })
        .catch(function () { cont.innerHTML = '<p class="vacio">No se pudo cargar assets/datos/apu.js.</p>'; });
      return;
    }
    var m = /^e-(\d+)(?:\/(\d+))?/.exec(sub || '');
    if (!etapasObra().length) { cont.innerHTML = '<p class="vacio">Faltan los datos de etapas o del análisis de precios unitarios.</p>'; return; }
    if (!m) {
      // Resumen: valor registrado por obra negra, gris y blanca y por etapa
      var total = 0;
      var bloques = ['negra', 'gris', 'blanca'].map(function (k) {
        var es = etapasObra().filter(function (e) { return e.etapa === k; });
        var sub2 = es.reduce(function (s, e) { return s + valorEtapa(e.carpeta, reg); }, 0); total += sub2;
        return '<section class="registro-bloque registro-' + k + '"><h3>' + NOMBRE_OBRA[k] + ' <b>' + Motor.formatoMoneda(sub2) + '</b></h3><ul>' +
          es.map(function (e) { var v = valorEtapa(e.carpeta, reg); var n = actividadesEtapa(e.carpeta).filter(function (a) { return Number(reg[a[0]]) > 0; }).length;
            return '<li><a href="#construccion/e-' + e.n + '">' + ('0' + e.n).slice(-2) + ' · ' + E(e.nombre) + '</a><span>' + n + ' actividades registradas</span><b>' + Motor.formatoMoneda(v) + '</b></li>'; }).join('') + '</ul></section>';
      }).join('');
      cont.innerHTML = '' +
        '<div class="tiles">' + tile('Valor registrado', Motor.formatoMoneda(total)) + tile('Actividades con cantidad', Object.keys(reg).filter(function (k) { return Number(reg[k]) > 0; }).length) + tile('Etapas', etapasObra().length, 'obra negra, gris y blanca') + '</div>' +
        '<div class="registro-bloques">' + bloques + '</div>' +
        '<p class="registro-acciones"><button type="button" class="boton-principal oscuro" data-rol="csv">Descargar registro (CSV)</button> <button type="button" class="boton-secundario" data-rol="borrar">Borrar registro</button></p>';
    } else {
      var e = etapasObra().filter(function (x) { return x.n === Number(m[1]); })[0];
      if (!e) { location.hash = '#construccion'; return; }
      var nS = m[2] ? Number(m[2]) : 0; var subNombre = nS ? e.subetapas[nS - 1] : '';
      var claveSub = nS ? ('0' + nS).slice(-2) + '_' : '';
      var acts = actividadesEtapa(e.carpeta).filter(function (a) { return !nS || (a[6] || []).some(function (s) { return s.indexOf(claveSub) === 0; }); });
      cont.innerHTML = '' +
        '<div class="registro-cabecera"><input type="search" data-rol="buscar-act" placeholder="Buscar actividad…" aria-label="Buscar actividad"><span class="registro-total">Valor de la ' + (nS ? 'subetapa' : 'etapa') + ': <b data-rol="total-etapa"></b></span></div>' +
        (acts.length ? '<div class="tabla-desplazable"><table class="tabla tabla-registro"><thead><tr><th>Código</th><th>Actividad</th><th>Unidad</th><th class="num">Precio unitario</th><th class="num">Cantidad</th><th class="num">Valor</th></tr></thead><tbody>' +
          acts.map(function (a) { var c = reg[a[0]] || ''; return '<tr data-cod="' + E(a[0]) + '" data-precio="' + (a[3] || 0) + '"><td>' + E(a[0]) + '</td><td>' + E(a[1]) + '</td><td>' + E(a[2]) + '</td><td class="num">' + Motor.formatoMoneda(a[3] || 0) + '</td>' +
            '<td class="num"><input type="number" min="0" step="any" inputmode="decimal" value="' + E(c) + '" aria-label="Cantidad de ' + E(a[1]) + '"></td><td class="num" data-rol="valor">' + (c ? Motor.formatoMoneda(c * (a[3] || 0)) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="vacio">No hay actividades del análisis de precios unitarios en esta ' + (nS ? 'subetapa' : 'etapa') + '.</p>');
      var sumar = function () { var t = 0; cont.querySelectorAll('tr[data-cod]').forEach(function (tr) { t += (Number(tr.querySelector('input').value) || 0) * Number(tr.getAttribute('data-precio')); }); cont.querySelector('[data-rol="total-etapa"]').textContent = Motor.formatoMoneda(t); };
      sumar();
      cont.querySelectorAll('tr[data-cod] input').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var tr = inp.closest('tr'); var v = Number(inp.value) || 0; var r = regLeer();
          if (v > 0) r[tr.getAttribute('data-cod')] = v; else delete r[tr.getAttribute('data-cod')];
          regGuardar(r); tr.querySelector('[data-rol="valor"]').textContent = v ? Motor.formatoMoneda(v * Number(tr.getAttribute('data-precio'))) : '—'; sumar();
          clearTimeout(inp._t); inp._t = setTimeout(pintarSidebar, 400);
        });
      });
      var b = cont.querySelector('[data-rol="buscar-act"]');
      b.addEventListener('input', function () { var q = Motor.normalizar(b.value); cont.querySelectorAll('tr[data-cod]').forEach(function (tr) { tr.hidden = !!q && Motor.normalizar(tr.textContent).indexOf(q) === -1; }); });
    }
    var csv = cont.querySelector('[data-rol="csv"]');
    if (csv) csv.addEventListener('click', function () {
      var r = regLeer(); var filas = [['Obra', 'Etapa', 'Codigo', 'Actividad', 'Unidad', 'Precio unitario', 'Cantidad', 'Valor']];
      etapasObra().forEach(function (e) { actividadesEtapa(e.carpeta).forEach(function (a) { var c = Number(r[a[0]]) || 0; if (c) filas.push([NOMBRE_OBRA[e.etapa], e.nombre, a[0], a[1], a[2], a[3], c, Math.round(c * a[3])]); }); });
      var texto = '﻿' + filas.map(function (f) { return f.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      var aEl = document.createElement('a'); aEl.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' })); aEl.download = 'registro_obra.csv'; document.body.appendChild(aEl); aEl.click(); aEl.remove();
    });
    var borrar = cont.querySelector('[data-rol="borrar"]');
    if (borrar) borrar.addEventListener('click', function () { if (confirm('¿Borrar todas las cantidades registradas?')) { regGuardar({}); renderRegistroObra(''); pintarSidebar(); } });
  }

  // =====================================================================
  // Presupuesto con el modelo V1 Construmaster (assets/datos/modelo_v1.js; node tools/generar_modelo_v1.js):
  //   capitulo (obra negra 1-4 · gris 5-6 · blanca 7-14; el 4, instalaciones electricas, no esta en el Excel) -> actividad -> materiales con unidad, cantidad y valor unitario.
  //   Cada material se relaciona con el catalogo: al tocarlo se elige un producto del inventario (material o herramienta)
  //   y su precio pasa a ser el valor unitario. Se pueden agregar actividades y materiales. El valor acumulado va al
  //   sidebar derecho. Sin servidor: se guarda en este navegador (localStorage "construmaster_presupuesto_v1").
  // =====================================================================
  var PV1_CLAVE = 'construmaster_presupuesto_v1';
  var NOMBRE_ETAPA_V1 = { negra: 'Obra negra', gris: 'Obra gris', blanca: 'Obra blanca' };
  function pv1Leer() { try { var e = JSON.parse(localStorage.getItem(PV1_CLAVE)); if (e && e.lineas) return pv1Migrar(e); } catch (err) { /* sin almacenamiento */ } return { lineas: {}, actividades: {}, materiales: {} }; }
  // v2 (28/09/2026): nuevo capitulo 4 (instalaciones electricas); lo guardado de los capitulos 4-13 pasa a 5-14
  function pv1Migrar(e) {
    if (e.v === 2) return e;
    var mover = function (o) { var r = {}; Object.keys(o || {}).forEach(function (k) { r[k.replace(/^c(\d+)/, function (x, n) { return 'c' + (Number(n) >= 4 ? Number(n) + 1 : n); })] = o[k]; }); return r; };
    e.lineas = mover(e.lineas); e.actividades = mover(e.actividades); e.materiales = mover(e.materiales);
    if (e.generado && e.vivienda) e.generado = motorVivienda(e.vivienda).caps; e.v = 2; pv1Guardar(e); return e;
  }
  function pv1Guardar(e) { try { localStorage.setItem(PV1_CLAVE, JSON.stringify(e)); } catch (err) { /* sin almacenamiento */ } }
  function capitulosV1() { return ((window.MODELO_V1 || {}).capitulos) || []; }
  // Actividades de un capitulo = las del modelo + las agregadas; cada material con su id estable y su estado guardado
  // Capitulos que el Excel V1 trae vacios, completados con reglas del usuario (27/09/2026):
  // 7. Vidrios y ventanas: vidrio transparente de vidrieria artesanal (no esta en el catalogo) a $25.000 por m²;
  //    la cantidad inicial es el area de ventanas del capitulo 6 (lineas "Ventana", con las cantidades diligenciadas).
  function areaVentanasV1(est) {
    var c6 = capitulosV1().filter(function (c) { return c.n === 7; })[0]; if (!c6) return 0; // carpinteria metalica (ventanas)
    var t = 0;
    c6.actividades.forEach(function (a, i) { a.materiales.forEach(function (m, j) { if (!/VENTANA/.test(nombreMaterialNorm(m.nombre))) return; var s = est.lineas['c6-a' + i + '-m' + j] || {}; t += Number(s.cantidad !== undefined ? s.cantidad : m.cantidad) || 0; }); });
    return Math.round(t * 100) / 100;
  }
  var PV1_PLANTILLAS = {
    4: [{ ref: '4.1', nombre: 'Acometida y tablero', materiales: [['Acometida eléctrica', 'GL'], ['Tablero de circuitos', 'UN'], ['Breaker', 'UN']] },
      { ref: '4.2', nombre: 'Salidas eléctricas', materiales: [['Tubería conduit PVC 1/2"', 'ML'], ['Cable THHN No 12', 'ML'], ['Caja eléctrica', 'UN'], ['Toma eléctrica', 'UN'], ['Interruptor', 'UN'], ['Luminaria', 'UN']] }],
    10: [{ ref: '10.1', nombre: 'Cielo raso en drywall', materiales: [['Lámina de drywall 1,22 x 2,44', 'UN'], ['Perfil omega', 'UN'], ['Perfil canal', 'UN'], ['Masilla para drywall', 'GL'], ['Cinta para juntas', 'ROLL'], ['Tornillos para drywall', 'UN'], ['Instalación de cielo raso (mano de obra)', 'M2']] }],
    14: [{ ref: '14.1', nombre: 'Aseo final y entrega', materiales: [['Productos de aseo', 'UN'], ['Retiro de escombros', 'M3'], ['Aseo general (mano de obra)', 'M2']] }],
  };
  // =====================================================================
  // MOTOR DE REGLAS ALC "Automatic Logic Construction" v1.0 (reglas del usuario, 27/09/2026): con el area total,
  // los pisos, la tipologia y los espacios (cantidad, area, puertas, ventanas ancho x alto) genera las cantidades
  // del presupuesto por capitulo del modelo V1.
  //   R001 toda vivienda tiene area total · R002 area por piso = area total / pisos · R003 cada espacio registra su area
  //   antes de crear componentes · R004 la cubierta cubre el area construida · R005 todo cuarto lleva mamposteria en su perimetro
  //   Tipologias 1 a 6 (campamento ... residencia de lujo) · bano de 1, 2 o 3 puntos · vidrio = ancho x alto de cada ventana
  //   Hidrosanitario opcional (pozo septico, cajas de inspeccion, excavacion, tuberia PVC, tapas, salidas de sifon)
  // Supuestos (editables en el formulario): el espacio es cuadrado (perimetro = 4 x raiz del area), altura de muro 2,40 m,
  // puerta 0,90 x 2,00 m; bloques 14 por m²; lamina de drywall 2,98 m²; perfil de cubierta 1 ml por m²; placa e = 0,10 m.
  // =====================================================================
  // k, nombre, cantidad, area, puertas, ventanas, ancho y alto de ventana, tipo, area minima, max 1
  var VIV_ESPACIOS = [
    { k: 'salon', nom: 'Salón', n: 0, area: 9, pu: 1, ve: 1, an: 1.2, al: 1, tipo: 'salon' },
    { k: 'sala', nom: 'Sala', n: 1, area: 16, pu: 1, ve: 1, an: 1.5, al: 1, tipo: 'sala', min: 9, max1: true },
    { k: 'comedor', nom: 'Comedor', n: 1, area: 10, pu: 0, ve: 1, an: 1.5, al: 1, tipo: 'sala', min: 9, max1: true },
    { k: 'sala_comedor', nom: 'Sala-comedor', n: 0, area: 20, pu: 1, ve: 1, an: 1.5, al: 1, tipo: 'sala', max1: true },
    { k: 'cocina', nom: 'Cocina', n: 1, area: 9, pu: 1, ve: 1, an: 1.2, al: 1, tipo: 'cocina', min: 9, max1: true },
    { k: 'cuarto_ropas', nom: 'Cuarto de ropas', n: 1, area: 3, pu: 1, ve: 0, an: 0.6, al: 1, tipo: 'ropas', min: 2, max1: true },
    { k: 'cocina_ropas', nom: 'Cocina-ropas', n: 0, area: 11, pu: 1, ve: 1, an: 1.2, al: 1, tipo: 'cocina_ropas', min: 11, max1: true },
    { k: 'alcoba', nom: 'Alcoba', n: 2, area: 10, pu: 1, ve: 1, an: 1.5, al: 1, tipo: 'alcoba', min: 9 },
    { k: 'bano', nom: 'Baño', n: 2, area: 4, pu: 1, ve: 1, an: 0.6, al: 0.6, tipo: 'bano', min: 2.5 },
    { k: 'garaje', nom: 'Garaje', n: 0, area: 15, pu: 0, ve: 0, an: 0, al: 0, tipo: 'garaje', max1: true },
  ];
  // Opcionales de cada tipo de espacio (el bano elige 1, 2 o 3 puntos)
  var VIV_OPCIONALES = { salon: ['closet', 'enchape_piso', 'drywall', 'cerrajeria', 'punto_agua', 'hidrosanitario'], alcoba: ['falso_techo'] };
  var VIV_OP_ETIQ = { closet: 'Clóset', enchape_piso: 'Enchape de piso', drywall: 'Drywall', cerrajeria: 'Cerrajería', punto_agua: 'Punto de agua', hidrosanitario: 'Desagüe', falso_techo: 'Falso techo' };
  var VIV_BANO_NIVELES = { 1: ['Sifón'], 2: ['Sanitario', 'Lavamanos', 'Sifón de piso'], 3: ['Sanitario', 'Lavamanos', 'Ducha', 'Sifón de piso'] };
  // Tipologias ALC: area minima/maxima y espacios con su area (alcobas y banos = cantidad; bano 2,5 m², alcoba 9 m²)
  var VIV_TIPOLOGIAS = [
    { c: 1, nombre: 'Campamento', desde: 15, nota: 'Salón libre para herramientas y apoyo de obra.', espacios: { salon: [1, 9], bano: [1, 2.5] } },
    { c: 2, nombre: 'Vivienda Básica', desde: 30, espacios: { alcoba: [1, 9], sala: [1, 9], cocina: [1, 9], bano: [1, 2.5] } },
    { c: 3, nombre: 'Vivienda Familiar', desde: 50, espacios: { alcoba: [2, 9], sala: [1, 9], comedor: [1, 9], cocina: [1, 9], bano: [2, 2.5], cuarto_ropas: [1, 2] } },
    { c: 4, nombre: 'Vivienda Completa', desde: 70, hasta: 90, espacios: { alcoba: [3, 9], sala_comedor: [1, 20], cocina_ropas: [1, 11], bano: [2, 2.5] } },
    { c: 5, nombre: 'Casa Cómoda', desde: 90, hasta: 150 },
    { c: 6, nombre: 'Residencia de Lujo', desde: 151 },
  ];
  function tipologiaPorArea(a) { var t = null; VIV_TIPOLOGIAS.forEach(function (x) { if (a >= x.desde) t = x; }); return t; }
  function viviendaPorDefecto() {
    var v = { area_total: 80, pisos: 1, altura: 2.4, area_puerta: 1.8, bloques_m2: 15.5, desperdicio: 5, factor_cubierta: 1.15, cubierta: true, tipologia: 0, hidro: false, cajas: 2, excavacion: 0, tuberia: 0, espacios: {} };
    VIV_ESPACIOS.forEach(function (d) { v.espacios[d.k] = { n: d.n, area: d.area, puertas: d.pu, ventanas: d.ve, an: d.an, al: d.al, puntos: 3, op: {} }; });
    return v;
  }
  // Vivienda guardada con el formulario anterior (area de ventana "av", falso techo, espacios fijos): se completa
  function viviendaCompleta(v) {
    var base = viviendaPorDefecto(); if (!v) return base;
    var out = Object.assign({}, base, v, { espacios: {} });
    VIV_ESPACIOS.forEach(function (d) {
      var e = Object.assign({}, base.espacios[d.k], (v.espacios || {})[d.k] || {}); if (!(v.espacios || {})[d.k]) e.n = 0;
      if (e.an == null && e.av) { e.an = e.av; e.al = 1; } e.op = Object.assign({}, e.op || {}); if (e.falso) e.op.falso_techo = true;
      out.espacios[d.k] = e;
    });
    return out;
  }
  function motorVivienda(vIn) {
    var v = viviendaCompleta(vIn);
    var caps = {}; var avisos = []; var R = function (n, act, nombre, unidad, cantidad, extra) {
      if (!(cantidad > 0) && !(extra && extra.diligenciar)) return; var a = (caps[n] = caps[n] || {}); (a[act] = a[act] || []).push(Object.assign({ nombre: nombre, unidad: unidad, cantidad: Math.round((cantidad || 0) * 100) / 100, valorU: 0, medida: '' }, extra || {}));
    };
    var H = Number(v.altura) || 2.4, AP = Number(v.area_puerta) || 1.8, AT = Number(v.area_total) || 0, P = Math.max(1, Number(v.pisos) || 1);
    // Revision 28/09/2026 (docs/REVISION_MODELO_ALC.md): bloque No 5 de arcilla 12x20x30 ~15,5 u/m², desperdicio, factor de cubierta
    var BL = Number(v.bloques_m2) || 15.5, DS = 1 + (Number(v.desperdicio) || 0) / 100, FC = Number(v.factor_cubierta) || 1;
    var sumPer = 0, tomasGfci = 0, extractores = 0;
    var suma = 0, muroTotal = 0, muroPan = 0, muroPint = 0, tomas = 0, luces = 0, puertas = 0, cerraduras = 0, ventM2 = 0, falso = 0, aF = 0, aC = 0, des = 0, sifones = 0;
    var detalleMuro = [];
    VIV_ESPACIOS.forEach(function (d) {
      var k = d.k, nom = d.nom, t = d.tipo, e = v.espacios[k] || {}; var n = Math.max(0, Math.round(Number(e.n) || 0)); if (d.max1) n = Math.min(n, 1); if (!n) return;
      var A = Number(e.area) || 0;
      if (!(A > 0)) { avisos.push('R003: ' + nom + ' tiene cantidad ' + n + ' pero no tiene área; primero se registra el área y luego se crean sus componentes.'); return; }
      if (d.min && A < d.min) avisos.push('Área mínima: ' + nom + ' tiene ' + A + ' m² (mínimo ' + String(d.min).replace('.', ',') + ' m²).');
      var op = e.op || {}; var esCocina = t === 'cocina' || t === 'cocina_ropas', esRopas = t === 'ropas' || t === 'cocina_ropas';
      var pu = Math.max(Number(e.puertas) || 0, (t === 'alcoba' || t === 'bano' || t === 'salon') ? 1 : 0); var ve = Number(e.ventanas) || 0;
      if ((t === 'alcoba' || t === 'salon') && !ve) avisos.push(nom + ': la ventana es obligatoria.');
      var aw = (Number(e.an) || 0) * (Number(e.al) || 0);
      suma += A * n;
      // Caras de muro del espacio (para panete, estuco, pintura y enchape); la mamposteria se calcula al final sin contar
      // dos veces los muros compartidos
      var per = 4 * Math.sqrt(A); var muro = Math.max(0, per * H - pu * AP - ve * aw) * n; sumPer += per * n;
      muroTotal += muro; detalleMuro.push(nom + (n > 1 ? ' x' + n : '') + ' ' + (Math.round(muro * 10) / 10) + ' m²');
      puertas += pu * n; ventM2 += ve * aw * n; luces += n;
      if (t === 'garaje') { R(2, 'Piso de garaje', 'Concreto piso garaje (e = 0,10 m)', 'M3', A * 0.10 * n, { medida: A * n + ' m² x 0,10 m' }); R(7, 'Puertas y portón', 'Portón garaje', 'UN', 1); return; }
      muroPan += muro; if (t !== 'bano') muroPint += muro; // el bano va enchapado al 100 %
      // NTC 2050 210-52: ningun punto del muro a mas de 1,8 m de una toma (~1 toma por 3,6 m de perimetro); cocina minimo 3;
      // bano: 1 toma GFCI junto al lavamanos (se cuenta aparte)
      if (t !== 'bano') tomas += (esRopas && !esCocina ? 1 : Math.max(esCocina ? 3 : 1, Math.round(per / 3.6))) * n; else tomasGfci += n;
      if (t === 'bano' && !ve) { extractores += n; avisos.push(nom + ' sin ventana: se agrega extractor (ventilación mecánica).'); }
      if (t === 'salon') {
        R(2, 'Placa de concreto (salón)', 'Concreto placa salón (e = 0,10 m)', 'M3', A * 0.10 * n, { medida: (n > 1 ? n + ' x ' : '') + A + ' m² x 0,10 m' });
        if (op.enchape_piso) R(11, 'Pisos', 'Piso ' + nom.toLowerCase() + (n > 1 ? ' (' + n + ')' : ''), 'M2', A * n);
        if (op.closet) R(13, 'Clósets', 'Clóset salón', 'UN', n);
        if (op.drywall) falso += A * n; if (op.cerrajeria) cerraduras += pu * n; if (op.punto_agua) aF += n; if (op.hidrosanitario) des += n;
      } else R(11, 'Pisos', 'Piso ' + nom.toLowerCase() + (n > 1 ? ' (' + n + ')' : ''), 'M2', A * n * DS, { medida: (n > 1 ? n + ' x ' + A + ' m²' : A + ' m²') + ' + ' + (Number(v.desperdicio) || 0) + ' % de desperdicio' });
      if (t === 'bano') {
        var pts = Math.min(3, Math.max(1, Math.round(Number(e.puntos) || 3))); var aparatos = VIV_BANO_NIVELES[pts];
        aparatos.forEach(function (x) { R(12, 'Aparatos de baño (' + pts + (pts > 1 ? ' puntos)' : ' punto)'), x, 'UN', n); });
        ['División de baño', 'Espejo', 'Porta papel', 'Jabonera', 'Toallero'].forEach(function (x) { R(12, 'Accesorios de baño', x, 'UN', n); });
        R(11, 'Enchape de muros de baño (100 %)', 'Pared baños', 'M2', muro * DS, { medida: 'Todo el muro de ' + n + ' baño(s) + ' + (Number(v.desperdicio) || 0) + ' % de desperdicio' });
        R(9, 'Techos de baño', 'Estuco techo baños', 'M2', A * n); R(9, 'Techos de baño', 'Pintura techo baños', 'M2', A * n);
        aparatos.forEach(function (x) { if (/Sanitario|Lavamanos|Ducha/.test(x)) aF += n; if (x === 'Ducha') aC += n; des += n; });
        sifones += n;
      }
      if (esCocina) { R(13, 'Cocina', 'Mesón de cocina', 'UN', 1); R(12, 'Cocina y ropas', 'Lavaplatos', 'UN', 1); aF += 1; des += 1; sifones += 1; }
      if (esRopas) { R(12, 'Cocina y ropas', 'Lavadero', 'UN', 1); aF += 1; des += 1; sifones += 1; }
      if (t === 'alcoba') { R(13, 'Clósets', 'Clóset alcoba', 'UN', n); if (op.falso_techo) falso += A * n; }
    });
    // Reglas globales y tipologia
    if (suma > 0 && !puertas) avisos.push('Toda tipología debe tener al menos una puerta.');
    if (!(AT > 0)) avisos.push('R001: falta el área total de la vivienda.');
    if (AT > 0 && suma > AT) avisos.push('La suma de las áreas de los espacios (' + (Math.round(suma * 10) / 10) + ' m²) supera el área total (' + AT + ' m²).');
    var tip = VIV_TIPOLOGIAS.filter(function (x) { return x.c === Number(v.tipologia); })[0];
    if (tip && AT > 0 && AT < tip.desde) avisos.push('Tipología ' + tip.c + ' (' + tip.nombre + '): el área mínima es ' + tip.desde + ' m² y la vivienda tiene ' + AT + ' m².');
    if (tip && tip.hasta && AT > tip.hasta) avisos.push('Tipología ' + tip.c + ' (' + tip.nombre + '): el área máxima es ' + tip.hasta + ' m² y la vivienda tiene ' + AT + ' m².');
    // R005 mamposteria: longitud de muro = (suma de perimetros de los espacios + perimetro exterior) / 2, porque cada muro
    // interior es comun a dos espacios; perimetro exterior = 4 x raiz del area por piso, por piso
    var AP1 = AT / P, perExt = AT > 0 ? 4 * Math.sqrt(AP1) * P : 0, Lmuro = (sumPer + perExt) / 2;
    var muroMamp = Math.max(0, Lmuro * H - puertas * AP - ventM2), fachada = Math.max(0, perExt * H - ventM2 - AP);
    R(5, 'Muros en mampostería (R005)', 'Bloque No 5', 'UN', Math.ceil(muroMamp * BL * DS), { medida: (Math.round(muroMamp * 10) / 10) + ' m² de muro (' + (Math.round(Lmuro * 10) / 10) + ' ml, muros comunes una sola vez) x ' + String(BL).replace('.', ',') + ' bloques/m² + ' + (Number(v.desperdicio) || 0) + ' % de desperdicio' });
    R(6, 'Pañete de muros', 'Pañete muros interiores', 'M2', muroPan, { medida: 'Caras interiores de todos los espacios (sin garaje) · ' + detalleMuro.join(', ') });
    R(6, 'Pañete de muros', 'Pañete fachada', 'M2', fachada, { medida: 'Perímetro exterior x altura - ventanas - puerta principal' });
    R(9, 'Estuco y pintura de muros', 'Estuco muros', 'M2', muroPint, { medida: 'Muro sin baños (enchapados) ni garaje' }); R(9, 'Estuco y pintura de muros', 'Pintura muros', 'M2', muroPint);
    R(9, 'Fachada', 'Pintura fachada', 'M2', fachada, { medida: 'Pañete de fachada' });
    // Carpinteria, cerrajeria y vidrio (vidrio = ancho x alto)
    R(7, 'Puertas y portón', 'Puerta', 'UN', puertas, { medida: 'Área de puerta ' + String(AP).replace('.', ',') + ' m²' });
    R(7, 'Cerrajería', 'Cerradura', 'UN', cerraduras);
    R(7, 'Ventanas', 'Ventana (marco)', 'M2', ventM2);
    R(8, 'Vidrios', 'Vidrio transparente', 'M2', ventM2, { valorU: 25000, artesanal: true, medida: 'Ancho x alto de cada ventana' });
    // Falso techo (alcobas marcadas y drywall del salon)
    R(10, 'Falso techo en drywall', 'Lámina de drywall 1,22 x 2,44', 'UN', Math.ceil(falso / 2.98), { medida: falso + ' m² / 2,98 m² por lámina' });
    R(10, 'Falso techo en drywall', 'Instalación de cielo raso (mano de obra)', 'M2', falso);
    // Instalaciones hidraulicas (cocina, bano, ropas) y electricas (minimo 1 toma y 1 luminaria por espacio)
    R(3, 'Instalación hidráulica y sanitaria', 'Punto hidráulico agua fría', 'UN', aF); R(3, 'Instalación hidráulica y sanitaria', 'Punto hidráulico agua caliente', 'UN', aC);
    R(3, 'Instalación hidráulica y sanitaria', 'Punto sanitario (desagüe)', 'UN', des);
    // Capitulo 4, instalaciones electricas: una caja por salida (toma, interruptor, luminaria); un interruptor por espacio
    R(4, 'Salidas eléctricas', 'Toma eléctrica', 'UN', tomas, { medida: 'NTC 2050: 1 por cada 3,6 m de perímetro (mínimo 1; cocina 3)' }); R(4, 'Salidas eléctricas', 'Toma GFCI (baño)', 'UN', tomasGfci, { medida: 'NTC 2050: junto a cada lavamanos' });
    R(4, 'Salidas eléctricas', 'Extractor de baño', 'UN', extractores, { medida: 'Baños sin ventana' }); R(4, 'Salidas eléctricas', 'Interruptor', 'UN', luces, { medida: '1 por espacio' }); R(4, 'Salidas eléctricas', 'Luminaria', 'UN', luces);
    R(4, 'Salidas eléctricas', 'Caja eléctrica', 'UN', tomas + tomasGfci + extractores + luces * 2, { medida: 'Una por salida: tomas, interruptores, luminarias y extractores' });
    var dilE = { diligenciar: true, medida: 'Diligenciar cantidad' };
    R(4, 'Salidas eléctricas', 'Tubería conduit PVC 1/2"', 'ML', 0, dilE); R(4, 'Salidas eléctricas', 'Cable THHN No 12', 'ML', 0, dilE);
    R(4, 'Acometida y tablero', 'Acometida eléctrica', 'GL', 1); R(4, 'Acometida y tablero', 'Tablero de circuitos', 'UN', 1); R(4, 'Acometida y tablero', 'Breaker', 'UN', 0, dilE);
    R(4, 'Acometida y tablero', 'Puesta a tierra (varilla de cobre)', 'UN', 1, { medida: 'RETIE: sistema de puesta a tierra' });
    // Hidrosanitario opcional
    if (v.hidro) {
      var cajas = Math.max(0, Math.round(Number(v.cajas) || 0)); var dil = { diligenciar: true, medida: 'Diligenciar cantidad' };
      R(3, 'Sistema hidrosanitario', 'Pozo séptico', 'UN', 1);
      R(3, 'Sistema hidrosanitario', 'Caja de inspección', 'UN', cajas, cajas ? {} : dil);
      R(3, 'Sistema hidrosanitario', 'Excavación', 'M3', Number(v.excavacion) || 0, Number(v.excavacion) ? {} : dil);
      R(3, 'Sistema hidrosanitario', 'Tubería PVC sanitaria', 'ML', Number(v.tuberia) || 0, Number(v.tuberia) ? {} : dil);
      R(3, 'Sistema hidrosanitario', 'Tapa de concreto', 'UN', cajas + 1, { medida: cajas + ' caja(s) + pozo séptico' });
      R(3, 'Sistema hidrosanitario', 'Salida de sifón', 'UN', sifones, { medida: 'Baños, cocina y ropas' });
    }
    // R004 cubierta: cubre la huella construida (area por piso; con un piso = area total) x factor de pendiente y aleros
    var Acub = AP1 * FC;
    if (v.cubierta !== false) { R(2, 'Cubierta (R004)', 'Teja cubierta', 'M2', Acub, { medida: (Math.round(AP1 * 10) / 10) + ' m² de huella x ' + String(FC).replace('.', ',') + ' (pendiente y aleros)' }); R(2, 'Cubierta (R004)', 'Perfil metálico de cubierta', 'ML', Acub, { medida: '1 ml por m² de cubierta' }); }
    var salida = {};
    Object.keys(caps).forEach(function (n) { salida[n] = Object.keys(caps[n]).map(function (act, i) { return { ref: n + '.R' + (i + 1), nombre: act, materiales: caps[n][act], gen: true }; }); });
    var tipA = tipologiaPorArea(AT);
    return { caps: salida, avisos: avisos, resumen: { area_total: AT, pisos: P, area_piso: Math.round(AT / P * 100) / 100, suma: Math.round(suma * 100) / 100, muro: Math.round(muroMamp * 100) / 100, ventanas: Math.round(ventM2 * 100) / 100, tomas: tomas, luminarias: luces, puertas: puertas, tipologia: tip, tipArea: tipA } };
  }
  function actividadesBaseV1(c, est) {
    // Presupuesto generado por el motor de reglas: reemplaza los capitulos que genera; en el 2 se agregan piso de garaje y
    // cubierta a la estructura del modelo (sin las lineas de cubierta del modelo)
    if (est.modo === 'reglas' && est.generado && est.generado[c.n]) {
      if (c.n === 2) return c.actividades.filter(function (a) { return !a.materiales.some(function (m) { return /TEJA|CABALLETE|GANCHO|POLICARBONATO|PERFIL C/.test(nombreMaterialNorm(m.nombre)); }); }).concat(est.generado[2]);
      return est.generado[c.n];
    }
    if (c.actividades.length) return c.actividades;
    if (c.n === 8) return [{ ref: '8.1', nombre: 'Vidrios', materiales: [{ nombre: 'Vidrio transparente', unidad: 'M2', cantidad: areaVentanasV1(est), valorU: 25000, medida: 'Área de ventanas del capítulo 7', artesanal: true }] }];
    return (PV1_PLANTILLAS[c.n] || []).map(function (a) { return { ref: a.ref, nombre: a.nombre, materiales: a.materiales.map(function (m) { return { nombre: m[0], unidad: m[1], cantidad: 0, valorU: 0, medida: 'Diligenciar cantidad' }; }) }; });
  }
  function actividadesV1(c, est) {
    var acts = actividadesBaseV1(c, est).map(function (a, i) { return { id: 'c' + c.n + (a.gen ? '-g' : '-a') + i, ref: a.ref, nombre: a.nombre, base: a.materiales, modelo: true }; })
      .concat((est.actividades['c' + c.n] || []).map(function (a, i) { return { id: 'c' + c.n + '-x' + i, ref: '', nombre: a.nombre, base: [], modelo: false }; }));
    return acts.map(function (a) {
      var mats = a.base.map(function (m, j) { return tarifaV1(Object.assign({ id: a.id + '-m' + j }, m, m.nombre && m.nombre.trim() ? {} : { nombre: 'Ítem sin nombre en el modelo' + (a.ref ? ' (' + a.ref + ')' : ''), medida: 'Valor que trae el Excel V1' })); }).concat((est.materiales[a.id] || []).map(function (m, j) { return Object.assign({ id: a.id + '-n' + j, nuevo: true }, m); }));
      a.materiales = mats.map(function (m) {
        var s = est.lineas[m.id] || {};
        var cantidad = s.cantidad !== undefined ? s.cantidad : m.cantidad;
        var valorU = s.producto ? s.producto.precio : (s.valorU !== undefined ? s.valorU : m.valorU);
        var linea = Object.assign({}, m, { cantidad: cantidad, valorU: valorU, producto: s.producto || null, valor: (Number(cantidad) || 0) * (Number(valorU) || 0) });
        // Material compuesto (p. ej. concreto): no es un producto; se descompone en sus materiales, cada uno con su
        // cantidad (cantidad del compuesto x dosificacion) y su producto del catalogo. Mientras ningun componente tenga
        // precio, el valor sigue siendo el del modelo (cantidad x valor unitario del modelo).
        var comp = compuestoV1(m.nombre);
        if (comp) {
          linea.componentes = comp.map(function (k, i) {
            var id = m.id + '-k' + i; var sk = est.lineas[id] || {};
            var ck = sk.cantidad !== undefined ? sk.cantidad : Math.round((Number(cantidad) || 0) * k.factor * 100) / 100;
            var vk = sk.producto ? sk.producto.precio : (sk.valorU || 0);
            return { id: id, nombre: k.nombre, unidad: k.unidad, factor: k.factor, cantidad: ck, valorU: vk, producto: sk.producto || null, valor: (Number(ck) || 0) * (Number(vk) || 0) };
          });
          var conPrecio = linea.componentes.some(function (k) { return k.valorU > 0; });
          linea.valorModelo = linea.valor;
          if (conPrecio) linea.valor = linea.componentes.reduce(function (t, k) { return t + k.valor; }, 0);
        }
        return linea;
      });
      a.valor = a.materiales.reduce(function (t, m) { return t + m.valor; }, 0);
      return a;
    });
  }
  function valorCapituloV1(c, est) { return actividadesV1(c, est).reduce(function (t, a) { return t + a.valor; }, 0); }

  function sidebarPresupuestoV1(sub) {
    var est = pv1Leer(); var m = /^v1-(\d+)$/.exec(sub || '');
    // Arriba: la vivienda (motor de reglas); el resumen del presupuesto esta en el sidebar derecho
    return sbTitulo('Presupuesto · modelo V1') + sbEnlace('#presupuesto', 'Vivienda: espacios y reglas', est.modo === 'reglas' ? 'aplicada' : null, !sub) + sbEnlace('#presupuesto/programacion', 'Programación (PERT)', null, sub === 'programacion') +
      sbNota(est.modo === 'reglas' ? 'Base del presupuesto: vivienda por reglas (capítulos generados).' : 'Base del presupuesto: modelo V1 (Excel).') +
      ['negra', 'gris', 'blanca'].map(function (k) {
        return sbTitulo(NOMBRE_ETAPA_V1[k]) + capitulosV1().filter(function (c) { return c.etapa === k; }).map(function (c) {
          var v = valorCapituloV1(c, est);
          return sbEnlace('#presupuesto/v1-' + c.n, c.n + '. ' + c.nombre, v ? Motor.formatoMoneda(v) : '—', m && Number(m[1]) === c.n, true);
        }).join('');
      }).join('');
  }
  // Sidebar derecho: valor acumulado del presupuesto
  function panelPresupuestoV1() {
    var est = pv1Leer(); var total = 0; var porEtapa = { negra: 0, gris: 0, blanca: 0 }; var enlazados = 0, materiales = 0;
    var filas = capitulosV1().map(function (c) {
      var acts = actividadesV1(c, est); var v = acts.reduce(function (t, a) { return t + a.valor; }, 0);
      acts.forEach(function (a) { a.materiales.forEach(function (mm) { (mm.componentes || [mm]).forEach(function (k) { if (esServicioV1(k.nombre)) return; materiales++; if (k.producto) enlazados++; }); }); });
      total += v; porEtapa[c.etapa] += v; return { c: c, v: v };
    });
    var fila = function (t, v, href) { return '<a' + (href ? ' href="' + href + '"' : '') + '><span class="texto">' + E(t) + '</span><span class="conteo">' + v + '</span></a>'; };
    return '<div class="acumulado-presupuesto"><span>Valor acumulado</span><strong>' + Motor.formatoMoneda(total) + '</strong></div>' +
      sbTitulo('Por etapa') + ['negra', 'gris', 'blanca'].map(function (k) { return '<a class="barra-sidebar"><span class="texto">' + NOMBRE_ETAPA_V1[k] + '</span><span class="conteo">' + Motor.formatoMoneda(porEtapa[k]) + '</span><i style="width:' + (total ? porEtapa[k] / total * 100 : 0).toFixed(1) + '%"></i></a>'; }).join('') +
      sbTitulo('Por capítulo') + filas.map(function (x) { return fila(x.c.n + '. ' + x.c.nombre, x.v ? Motor.formatoMoneda(x.v) : '—', '#presupuesto/v1-' + x.c.n); }).join('') +
      sbTitulo('Materiales') + fila('Líneas de material', materiales) + fila('Con producto del catálogo', enlazados) +
      (function () { var gp = calcularProgramacion(est); return sbTitulo('Mano de obra (estimado)') + fila('Cuadrilla', gp.personas + ' personas') + fila('Duración', num1(gp.T) + ' días hábiles', '#presupuesto/programacion') + fila('Mano de obra', Motor.formatoMoneda(gp.totalMO)) + fila('Alquiler de herramientas', Motor.formatoMoneda(gp.herr.total)) + fila('Total (materiales, mano de obra y alquiler)', Motor.formatoMoneda(total + gp.totalMO + gp.herr.total)); })() +
      sbTitulo('Resumen del presupuesto') + fila('Base', est.modo === 'reglas' ? 'Vivienda (reglas)' : 'Modelo V1') +
      '<div class="acciones-sidebar"><button type="button" data-rol="xlsx-v1">Descargar Excel (con fórmulas)</button><button type="button" data-rol="cargar-v1">Cargar Excel</button><input type="file" accept=".xlsx" data-rol="archivo-v1" hidden><button type="button" data-rol="csv-v1">Descargar presupuesto (CSV)</button><button type="button" data-rol="reiniciar-v1">Volver a los valores del modelo</button></div>';
  }

  // ---- Correspondencia con el catalogo: palabras clave del material -> productos del inventario (material o herramienta)
  var PV1_VACIAS = { DE: 1, DEL: 1, LA: 1, EL: 1, LOS: 1, LAS: 1, Y: 1, X: 1, EN: 1, PARA: 1, CON: 1, NO: 1, UN: 1, UND: 1, GL: 1, POR: 1, SIN: 1 };
  // Reglas material del modelo V1 -> lo que se compra en el catalogo. Los nombres del modelo describen el uso
  // ("Eje 4 - Ventana sala 2.80m*1.80m", "Piso baños"), no el producto: cada regla da los terminos de busqueda
  // (en orden de prioridad). Las lineas de mano de obra o servicio no tienen producto en el catalogo.
  var PV1_SERVICIO = /^(CERRAMIENTO|REPLANTEO|TESTEROS|GAS)$|POZO|INSTALACION|MANO DE OBRA|CASETA|EXCAVACION|ACOMETIDA|RETIRO DE ESCOMBROS|SIN NOMBRE EN EL MODELO|^PUNTO /;
  // Equipos que se alquilan por tiempo: la unidad pasa a ser el tiempo de uso (tarifa indicada por el usuario, 27/09/2026).
  // La cantidad inicial = valor del modelo / tarifa (horas equivalentes), editable.
  var PV1_TARIFAS = [[/RETROEXCAVADORA/, { unidad: 'HORA', valorU: 130000, nota: 'Alquiler por hora · $130.000/h' }]];
  function tarifaV1(m) {
    var n = nombreMaterialNorm(m.nombre);
    if (/^ARENA/.test(n) && /^KG/.test(String(m.unidad).toUpperCase())) {
      return Object.assign({}, m, { unidad: 'M3', cantidad: Math.round((Number(m.cantidad) || 0) / 1600 * 100) / 100, valorU: (Number(m.valorU) || 0) * 1600, medida: 'm³ (modelo: ' + (Number(m.cantidad) || 0).toLocaleString('es-CO') + ' kg, a 1.600 kg/m³)' });
    }
    if (/^CEMENTO/.test(n) && /^KG/.test(String(m.unidad).toUpperCase())) {
      return Object.assign({}, m, { unidad: 'BULTO', cantidad: Math.round((Number(m.cantidad) || 0) / 50 * 10) / 10, valorU: (Number(m.valorU) || 0) * 50, medida: 'Bultos de 50 kg (modelo: ' + (Number(m.cantidad) || 0).toLocaleString('es-CO') + ' kg)' });
    }
    for (var i = 0; i < PV1_TARIFAS.length; i++) if (PV1_TARIFAS[i][0].test(n)) {
      var t = PV1_TARIFAS[i][1]; var valorModelo = (Number(m.cantidad) || 0) * (Number(m.valorU) || 0);
      return Object.assign({}, m, { unidad: t.unidad, valorU: t.valorU, cantidad: valorModelo ? Math.round(valorModelo / t.valorU * 10) / 10 : 1, medida: t.nota, alquiler: true });
    }
    return m;
  }
  var PV1_REGLAS = [
    [/CONCRETO/, ['arena', 'gravilla', 'cemento gris']],
    [/ACCESORIOS SANITARIOS/, ['codo sanitario', 'tee sanitaria', 'yee']], [/ACCESORIOS HIDRAULICOS/, ['codo presion', 'tee presion']],
    [/CODOS? SANITARIO/, ['codo sanitario']], [/TUBERIA SANITARIA/, ['tubo sanitario', 'tuberia sanitaria']], [/TUBERIA HIDRAULICA/, ['tubo presion', 'tuberia presion']],
    [/SIFON/, ['sifon']], [/SOLDADURA/, ['soldadura pvc']], [/REGISTRO/, ['registro']], [/TANQUE/, ['tanque agua']],
    [/MALLA/, ['malla electrosoldada', 'malla']], [/^ACERO/, ['varilla']], [/BLOQUELON/, ['bloquelon']], [/BLOQUE/, ['bloque']], [/LADRILLO/, ['ladrillo']],
    [/LAMINA DE DRYWALL|DRYWALL 1/, ['drywall', 'lamina yeso']], [/PERFIL OMEGA/, ['omega']], [/PERFIL CANAL/, ['canal drywall', 'canal']], [/MASILLA/, ['masilla']], [/CINTA/, ['cinta malla', 'cinta papel']], [/TORNILLO/, ['tornillo drywall', 'tornillo']], [/PRODUCTOS DE ASEO/, ['limpiador', 'detergente', 'desinfectante']],
    [/^SANITARIO/, ['sanitario']], [/LAVAMANOS/, ['lavamanos']], [/^DUCHA/, ['ducha']], [/ESPEJO/, ['espejo']], [/PORTA ?PAPEL/, ['portarrollo', 'porta papel']],
    [/ACCESORIOS DE BANO/, ['toallero', 'jabonera']], [/LAVAPLATOS/, ['lavaplatos']], [/MESON/, ['meson']], [/PORTON/, ['porton', 'puerta garaje']], [/^PUERTA/, ['puerta']],
    [/TOMA GFCI/, ['gfci', 'tomacorriente gfci']], [/EXTRACTOR/, ['extractor de bano', 'extractor']], [/PUESTA A TIERRA/, ['varilla cobre', 'varilla puesta a tierra']], [/^TOMA/, ['tomacorriente', 'toma corriente']], [/LUMINARIA/, ['luminaria', 'panel led']], [/^TEJA CUBIERTA/, ['teja fibrocemento', 'teja']],
    [/INTERRUPTOR/, ['interruptor sencillo', 'interruptor']], [/TABLERO DE CIRCUITOS/, ['tablero', 'centro de carga']], [/BREAKER/, ['breaker', 'taco']], [/CONDUIT/, ['tubo conduit', 'conduit']],
    [/CABLE THHN/, ['cable thhn', 'alambre thhn']], [/CAJA ELECTRICA/, ['caja electrica', 'caja 2x4']],
    [/JABONERA/, ['jabonera']], [/TOALLERO/, ['toallero']], [/CERRADURA/, ['cerradura']], [/CAJA DE INSPECCION/, ['caja de inspeccion', 'caja inspeccion']],
    [/TUBERIA PVC/, ['tubo sanitario', 'tuberia sanitaria']], [/TAPA DE CONCRETO/, ['tapa caja', 'tapa concreto']], [/PANETE/, ['mortero', 'panete']],
    [/PERFIL/, ['perfil', 'perfil c']], [/TEJA/, ['teja fibrocemento', 'teja']], [/GANCHO/, ['gancho teja']], [/CABALLETE/, ['caballete']], [/POLICARBONATO/, ['policarbonato']],
    [/^ARENA/, ['arena']], [/^CEMENTO/, ['cemento gris']], [/^GRAVILLA/, ['gravilla']],
    [/VENTANA/, ['ventana aluminio', 'ventana', 'vidrio']], [/PERGOLA/, ['pergola', 'policarbonato']], [/BARANDA/, ['baranda']],
    [/PINTURA FACHADA/, ['pintura fachada']], [/PINTURA/, ['pintura blanca', 'vinilo']], [/ESTUCO/, ['estuco']],
    [/^PISO|BALCON/, ['porcelanato', 'piso ceramic']], [/^PARED/, ['ceramica pared', 'revestimiento']], [/GUARDAESCOBA/, ['guardaescoba']],
    [/DIVISION/, ['division bano', 'division']], [/LAVADERO/, ['lavadero']], [/GRIFERIA/, ['griferia', 'monocontrol']],
    [/COCINA INTEGRAL/, ['cocina integral']], [/CLOSET/, ['closet', 'armario']],
  ];
  // Materiales compuestos: se descomponen en sus materiales con una dosificacion por unidad (editable en cada linea).
  // Concreto 3.000 psi (21 MPa, mezcla 1:2:3) por m³: 7 bultos de cemento de 50 kg, 0,56 m³ de arena y 0,84 m³ de gravilla.
  var PV1_COMPUESTOS = [
    [/CONCRETO/, [{ nombre: 'Cemento (bulto 50 kg)', unidad: 'BULTO', factor: 7 }, { nombre: 'Arena', unidad: 'M3', factor: 0.56 }, { nombre: 'Gravilla', unidad: 'M3', factor: 0.84 }]],
  ];
  function compuestoV1(nombre) { var n = nombreMaterialNorm(nombre); for (var i = 0; i < PV1_COMPUESTOS.length; i++) if (PV1_COMPUESTOS[i][0].test(n)) return PV1_COMPUESTOS[i][1]; return null; }
  var PV1_ETIQUETA = { 'cemento gris': 'Bulto de cemento', 'piso ceramic': 'Piso cerámico', 'ceramica pared': 'Cerámica de pared', 'division bano': 'División de baño', 'tubo presion': 'Tubo de presión', 'tuberia presion': 'Tubería de presión', 'codo presion': 'Codo de presión', 'tee presion': 'Tee de presión', 'gancho teja': 'Gancho para teja', 'tanque agua': 'Tanque de agua', 'soldadura pvc': 'Soldadura PVC', 'malla electrosoldada': 'Malla electrosoldada', 'ventana aluminio': 'Ventana en aluminio', 'teja fibrocemento': 'Teja de fibrocemento' };
  function etiquetaTermino(t) { return PV1_ETIQUETA[t] || t.charAt(0).toUpperCase() + t.slice(1); }
  function nombreMaterialNorm(nombre) { return Motor.normalizar(nombre || '').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function esServicioV1(nombre) { var n = nombreMaterialNorm(nombre); return !n || PV1_SERVICIO.test(n); }
  function equivalenciasMaterial(nombre) { var n = nombreMaterialNorm(nombre); for (var i = 0; i < PV1_REGLAS.length; i++) if (PV1_REGLAS[i][0].test(n)) return PV1_REGLAS[i][1]; return null; }
  function palabrasMaterial(nombre) { return Motor.normalizar(nombre).toUpperCase().split(/[^A-Z0-9]+/).filter(function (w) { return w.length >= 3 && !PV1_VACIAS[w] && !/^\d+$/.test(w); }); }
  function buscarEnCatalogo(texto, tipo, limite) {
    // Material con equivalencias (Concreto -> arena y gravilla): une las busquedas de cada componente
    var eq = equivalenciasMaterial(texto);
    if (eq && eq.indexOf(texto) === -1) { var vistos = {}; var todo = []; eq.forEach(function (t) { buscarEnCatalogo(t, tipo).forEach(function (p) { if (!vistos[p.nombre + p.prov]) { vistos[p.nombre + p.prov] = 1; todo.push(p); } }); }); return limite ? todo.slice(0, limite) : todo; }
    var pal = palabrasMaterial(texto); if (!pal.length || !INV) return [];
    INV.productos.forEach(function (p) { if (p._n === undefined) p._n = Motor.normalizar(p.nombre || '').toUpperCase(); });
    var esHerr = function (p) { return p.fam === INV.famHerramientas; };
    var probar = function (ws) { return INV.productos.filter(function (p) { return (tipo === 'herramienta' ? esHerr(p) : tipo === 'material' ? !esHerr(p) : true) && ws.every(function (w) { return p._n.indexOf(w) !== -1; }); }); };
    var r = probar(pal.slice(0, 2)); if (!r.length && pal.length > 1) r = probar(pal.slice(0, 1));
    // Relevancia: primero los que empiezan por la palabra del material, luego los que tienen precio, y de menor a mayor precio
    var ini = function (p) { return p._n.indexOf(pal[0]) === 0 ? 0 : 1; };
    r.sort(function (a, b) { return ini(a) - ini(b) || (a.precio ? 0 : 1) - (b.precio ? 0 : 1) || (a.precio || 0) - (b.precio || 0); });
    return limite ? r.slice(0, limite) : r;
  }

  function renderPresupuestoV1(sub) {
    var cont = $('presupuesto-v1');
    if (!capitulosV1().length) { cont.innerHTML = '<p class="vacio">Falta assets/datos/modelo_v1.js. Ejecuta: node tools/generar_modelo_v1.js</p>'; return; }
    if (sub === 'programacion') return renderProgramacion(cont);
    var est = pv1Leer(); var m = /^v1-(\d+)$/.exec(sub || '');
    if (!m) return renderViviendaReglas(cont);
    var c = capitulosV1().filter(function (x) { return x.n === Number(m[1]); })[0];
    if (!c) { location.hash = '#presupuesto'; return; }
    var acts = actividadesV1(c, est);
    var todos = capitulosV1(); var pos = todos.indexOf(c); var ant = todos[pos - 1], sig = todos[pos + 1]; var seg = etapasDeCapV1(c.n);
    var navCap = '<nav class="pv1-navegacion">' + (ant ? '<a href="#presupuesto/v1-' + ant.n + '">← ' + ant.n + '. ' + E(ant.nombre) + '</a>' : '<span></span>') + '<a href="#presupuesto">Vivienda y presupuesto</a>' + (sig ? '<a href="#presupuesto/v1-' + sig.n + '">' + sig.n + '. ' + E(sig.nombre) + ' →</a>' : '<span></span>') + '</nav>';
    cont.innerHTML = pestanasPresupuesto('v1') + '<a class="volver" href="#presupuesto">← Vivienda y presupuesto</a>' +
      (seg.length ? '<p class="texto-suave pv1-seguimiento">Seguimiento de obra: ' + seg.map(function (e) { return '<a class="chip" href="#presupuesto/etapa-' + e.n + '">' + e.n + '. ' + E(e.nombre) + '</a>'; }).join(' ') + '</p>' : '') +
      '<div class="pv1-cabecera"><span class="pv1-etapa pv1-' + c.etapa + '">' + NOMBRE_ETAPA_V1[c.etapa] + ' · capítulo ' + c.n + '</span><span class="registro-total">Valor del capítulo: <b data-rol="total-cap">' + Motor.formatoMoneda(valorCapituloV1(c, est)) + '</b></span></div>' +
      (acts.length ? acts.map(function (a) {
        return '<section class="pv1-actividad" data-act="' + a.id + '"><header><strong>' + (a.ref ? E(a.ref) + ' · ' : '') + E(a.nombre) + '</strong><b data-rol="valor-act">' + Motor.formatoMoneda(a.valor) + '</b></header>' +
          '<div class="tabla-desplazable"><table class="tabla pv1-tabla"><thead><tr><th>Material</th><th>Producto del catálogo</th><th class="num">Cantidad</th><th>Unidad</th><th class="num">Valor unitario</th><th class="num">Valor</th></tr></thead><tbody>' +
          a.materiales.map(function (mm) {
            // Material compuesto: fila del compuesto (cantidad que reparte a sus materiales) + una fila por material con su selector
            if (mm.componentes) {
              return '<tr class="pv1-compuesto" data-linea="' + mm.id + '" data-compuesto="1"><td>' + E(mm.nombre) + '<small>Material compuesto: se elige cada material</small></td>' +
                '<td><span class="pv1-servicio">Valor del modelo: ' + Motor.formatoMoneda(mm.valorU) + ' / ' + E(mm.unidad) + '</span></td>' +
                '<td class="num"><input type="number" min="0" step="any" value="' + Number(mm.cantidad) + '" data-rol="cantidad" aria-label="Cantidad de ' + E(mm.nombre) + '"></td><td>' + E(mm.unidad) + '</td><td class="num">—</td>' +
                '<td class="num" data-rol="valor">' + Motor.formatoMoneda(mm.valor) + (mm.componentes.some(function (k) { return k.valorU > 0; }) ? '' : '<small>valor del modelo</small>') + '</td></tr>' +
                mm.componentes.map(function (k) {
                  return '<tr class="pv1-componente" data-linea="' + k.id + '"><td>↳ ' + E(k.nombre) + '<small>' + String(k.factor).replace('.', ',') + ' ' + E(k.unidad) + ' por ' + E(mm.unidad) + '</small></td>' +
                    '<td><button type="button" class="pv1-producto' + (k.producto ? ' elegido' : '') + '" data-material="' + E(k.nombre) + '">' + (k.producto ? E(k.producto.nombre) + '<small>' + E(k.producto.prov) + '</small>' : '<span data-rol="coincidencias">Buscar en el catálogo</span>') + '</button></td>' +
                    '<td class="num"><input type="number" min="0" step="any" value="' + Number(k.cantidad) + '" data-rol="cantidad" aria-label="Cantidad de ' + E(k.nombre) + '"></td><td>' + E(k.unidad) + '</td>' +
                    '<td class="num">' + (k.producto ? Motor.formatoMoneda(k.valorU) : '<input type="number" min="0" step="any" value="' + (Number(k.valorU) || 0) + '" data-rol="valorU" aria-label="Valor unitario">') + '</td>' +
                    '<td class="num" data-rol="valor">' + Motor.formatoMoneda(k.valor) + '</td></tr>';
                }).join('');
            }
            return '<tr data-linea="' + mm.id + '"><td>' + E(mm.nombre) + (mm.medida ? '<small>' + E(mm.medida) + '</small>' : '') + '</td>' +
              '<td>' + (mm.artesanal && !mm.producto ? '<span class="pv1-servicio pv1-alquiler">Vidriería artesanal (no está en el catálogo) · tarifa por m²</span>' : mm.alquiler && !mm.producto ? '<span class="pv1-servicio pv1-alquiler">Alquiler de equipo · tarifa por ' + E(mm.unidad.toLowerCase()) + '</span>' : esServicioV1(mm.nombre) && !mm.producto ? '<span class="pv1-servicio">Mano de obra / servicio' + (mm.valorU ? ' (valor del modelo)' : ' · escribir el valor') + '</span>' :
                '<button type="button" class="pv1-producto' + (mm.producto ? ' elegido' : '') + '" data-material="' + E(mm.nombre) + '">' + (mm.producto ? E(mm.producto.nombre) + '<small>' + E(mm.producto.prov) + '</small>' : '<span data-rol="coincidencias">Buscar en el catálogo</span>') + '</button>') + '</td>' +
              '<td class="num"><input type="number" min="0" step="any" value="' + (mm.cantidad === '' ? '' : Number(mm.cantidad)) + '" data-rol="cantidad" aria-label="Cantidad de ' + E(mm.nombre) + '"></td><td>' + E(mm.unidad) + '</td>' +
              '<td class="num">' + (mm.producto ? Motor.formatoMoneda(mm.valorU) : '<input type="number" min="0" step="any" value="' + (Number(mm.valorU) || 0) + '" data-rol="valorU" aria-label="Valor unitario">') + '</td>' +
              '<td class="num" data-rol="valor">' + Motor.formatoMoneda(mm.valor) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<form class="pv1-agregar" data-rol="agregar-material"><input name="nombre" placeholder="Agregar material (p. ej. Cemento gris)" required><select name="unidad">' + ['UN', 'M2', 'ML', 'M3', 'KG', 'GL', 'BULTO', 'ROLL'].map(function (u) { return '<option>' + u + '</option>'; }).join('') + '</select><input name="cantidad" type="number" min="0" step="any" placeholder="Cantidad"><button type="submit" class="boton claro">+ Agregar</button></form></section>';
      }).join('') : '<p class="vacio">El modelo V1 no trae actividades en este capítulo. Agrega la primera:</p>') +
      '<form class="pv1-agregar pv1-nueva-actividad" data-rol="agregar-actividad"><input name="nombre" placeholder="Nueva actividad del capítulo ' + c.n + '" required><button type="submit" class="boton-principal oscuro">+ Agregar actividad</button></form>' + navCap;
    // Cantidades y valores unitarios: recalculo inmediato y guardado
    cont.querySelectorAll('tr[data-linea] input').forEach(function (inp) {
      var tr0 = inp.closest('tr');
      // Compuesto: al cambiar su cantidad se recalculan las cantidades de sus materiales (dosificacion) y se vuelve a pintar
      if (tr0.hasAttribute('data-compuesto')) {
        inp.addEventListener('change', function () {
          var id = tr0.getAttribute('data-linea'); var e2 = pv1Leer(); (e2.lineas[id] = e2.lineas[id] || {}).cantidad = Number(inp.value) || 0;
          Object.keys(e2.lineas).forEach(function (k) { if (k.indexOf(id + '-k') === 0) delete e2.lineas[k].cantidad; });
          pv1Guardar(e2); renderPresupuestoV1(sub); pintarSidebar();
        });
        return;
      }
      // Material de un compuesto: al terminar de editar se actualiza el valor del compuesto
      if (tr0.classList.contains('pv1-componente')) inp.addEventListener('change', function () { renderPresupuestoV1(sub); pintarSidebar(); });
      inp.addEventListener('input', function () {
        var tr = inp.closest('tr'); var id = tr.getAttribute('data-linea'); var e2 = pv1Leer(); var s = e2.lineas[id] = e2.lineas[id] || {};
        s[inp.getAttribute('data-rol')] = inp.value === '' ? 0 : Number(inp.value); pv1Guardar(e2);
        var ca = Number(tr.querySelector('[data-rol="cantidad"]').value) || 0; var vuI = tr.querySelector('[data-rol="valorU"]');
        var vu = vuI ? Number(vuI.value) || 0 : (s.producto ? s.producto.precio : 0);
        tr.querySelector('[data-rol="valor"]').textContent = Motor.formatoMoneda(ca * vu);
        clearTimeout(inp._t); inp._t = setTimeout(function () { renderTotalesV1(c); }, 250);
      });
    });
    cont.querySelectorAll('form[data-rol="agregar-material"]').forEach(function (f) {
      f.addEventListener('submit', function (ev) { ev.preventDefault(); var id = f.closest('[data-act]').getAttribute('data-act'); var e2 = pv1Leer();
        (e2.materiales[id] = e2.materiales[id] || []).push({ nombre: f.nombre.value.trim(), unidad: f.unidad.value, cantidad: Number(f.cantidad.value) || 0, valorU: 0, medida: '' }); pv1Guardar(e2); renderPresupuestoV1(sub); pintarSidebar(); });
    });
    var fa = cont.querySelector('form[data-rol="agregar-actividad"]');
    fa.addEventListener('submit', function (ev) { ev.preventDefault(); var e2 = pv1Leer(); (e2.actividades['c' + c.n] = e2.actividades['c' + c.n] || []).push({ nombre: fa.nombre.value.trim() }); pv1Guardar(e2); renderPresupuestoV1(sub); pintarSidebar(); });
    cont.querySelectorAll('.pv1-producto').forEach(function (b) { b.addEventListener('click', function () { abrirSelectorProducto(b.closest('tr').getAttribute('data-linea'), b.getAttribute('data-material'), sub); }); });
    // Correspondencia con el catalogo (cuantos productos coinciden con cada material): necesita el inventario
    conCargaInventario(null, function () {
      cont.querySelectorAll('.pv1-producto:not(.elegido) [data-rol="coincidencias"]').forEach(function (s) {
        var n = buscarEnCatalogo(s.closest('button').getAttribute('data-material')).length;
        s.textContent = n ? n.toLocaleString('es-CO') + ' en el catálogo · elegir' : 'Sin coincidencias · buscar';
        s.closest('button').classList.toggle('sin-coincidencias', !n);
      });
    });
  }
  // Formulario de la vivienda (motor ALC): datos generales, tipologia, espacios e hidrosanitario; calcula en vivo y "Aplicar al presupuesto"
  function renderViviendaReglas(cont) {
    var est = pv1Leer(); var v = viviendaCompleta(est.vivienda);
    var num = function (atrs, val, paso, deshab) { return '<input type="number" min="0" step="' + (paso || 'any') + '" ' + atrs + ' value="' + (val == null ? '' : val) + '"' + (deshab ? ' disabled' : '') + '>'; };
    var celda = function (k, campo, val, paso, deshab) { return '<td class="num">' + num('data-esp="' + k + '" data-campo="' + campo + '"', val, paso, deshab) + '</td>'; };
    var gen = function (etq, nombre, val, paso, min) { return '<label>' + etq + '<input type="number" min="' + (min || 0) + '" step="' + (paso || 'any') + '" name="' + nombre + '" value="' + val + '"></label>'; };
    var opciones = function (d, e) {
      if (d.tipo === 'bano') return '<label class="viv-check">Puntos <select data-esp="bano" data-campo="puntos">' + [1, 2, 3].map(function (p) { return '<option value="' + p + '"' + (Number(e.puntos || 3) === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label><small>' + VIV_BANO_NIVELES[Number(e.puntos || 3)].join(', ') + '</small>';
      var ops = VIV_OPCIONALES[d.tipo]; if (!ops) return '—';
      return ops.map(function (o) { return '<label class="viv-check"><input type="checkbox" data-esp="' + d.k + '" data-op="' + o + '"' + ((e.op || {})[o] ? ' checked' : '') + '> ' + VIV_OP_ETIQ[o] + '</label>'; }).join('');
    };
    cont.innerHTML = pestanasPresupuesto('v1') +
      '<form class="viv-form" data-rol="vivienda"><fieldset class="viv-generales"><legend>Vivienda</legend>' +
      gen('Área total (m²)', 'area_total', v.area_total) + gen('Número de pisos', 'pisos', v.pisos, 1, 1) + gen('Altura de muro (m)', 'altura', v.altura, 0.05, 1) + gen('Área de puerta (m²)', 'area_puerta', v.area_puerta, 0.05) + gen('Bloques por m²', 'bloques_m2', v.bloques_m2, 0.1) + gen('Desperdicio (%)', 'desperdicio', v.desperdicio, 1) + gen('Factor de cubierta', 'factor_cubierta', v.factor_cubierta, 0.01, 1) +
      '<label>Tipología<select name="tipologia"><option value="0">Sin elegir</option>' + VIV_TIPOLOGIAS.map(function (t) { return '<option value="' + t.c + '"' + (Number(v.tipologia) === t.c ? ' selected' : '') + '>' + t.c + '. ' + t.nombre + ' (' + (t.hasta ? t.desde + ' a ' + t.hasta : 'desde ' + t.desde) + ' m²)</option>'; }).join('') + '</select></label>' +
      '<label class="viv-check"><input type="checkbox" name="cubierta"' + (v.cubierta !== false ? ' checked' : '') + '> Cubierta</label>' +
      '<label class="viv-check"><input type="checkbox" name="hidro"' + (v.hidro ? ' checked' : '') + '> Hidrosanitario (pozo séptico)</label></fieldset>' +
      '<fieldset class="viv-generales" data-rol="hidro"' + (v.hidro ? '' : ' hidden') + '><legend>Hidrosanitario</legend>' +
      gen('Cajas de inspección', 'cajas', v.cajas, 1) + gen('Excavación (m³)', 'excavacion', v.excavacion) + gen('Tubería PVC (ml)', 'tuberia', v.tuberia) + '</fieldset>' +
      '<p class="registro-acciones" data-rol="tip-accion"></p>' +
      '<div class="tabla-desplazable"><table class="tabla viv-tabla"><thead><tr><th>Espacio</th><th class="num">Cantidad</th><th class="num">Área c/u (m²)</th><th class="num">Puertas c/u</th><th class="num">Ventanas c/u</th><th class="num">Ancho ventana (m)</th><th class="num">Alto ventana (m)</th><th>Opciones</th></tr></thead><tbody>' +
      VIV_ESPACIOS.map(function (d) {
        var e = v.espacios[d.k] || {}; var g = d.tipo === 'garaje';
        return '<tr><td><strong>' + d.nom + '</strong><small>' + (d.max1 ? 'Cantidad 0 o 1' : 'Variable') + (d.min ? ' · mínimo ' + String(d.min).replace('.', ',') + ' m²' : '') + '</small></td>' +
          celda(d.k, 'n', e.n, 1) + celda(d.k, 'area', e.area) + celda(d.k, 'puertas', e.puertas, 1, g) + celda(d.k, 'ventanas', e.ventanas, 1, g) + celda(d.k, 'an', e.an, 'any', g) + celda(d.k, 'al', e.al, 'any', g) +
          '<td class="viv-opciones">' + opciones(d, e) + '</td></tr>';
      }).join('') + '</tbody></table></div></form>' +
      '<div data-rol="resultado"></div>';
    var form = cont.querySelector('[data-rol="vivienda"]');
    var leerForm = function () {
      var f = form; var nv = { area_total: Number(f.area_total.value) || 0, pisos: Number(f.pisos.value) || 1, altura: Number(f.altura.value) || 2.4, area_puerta: Number(f.area_puerta.value) || 1.8,
        bloques_m2: Number(f.bloques_m2.value) || 15.5, desperdicio: Number(f.desperdicio.value) || 0, factor_cubierta: Number(f.factor_cubierta.value) || 1,
        tipologia: Number(f.tipologia.value) || 0, cubierta: f.cubierta.checked, hidro: f.hidro.checked, cajas: Number(f.cajas.value) || 0, excavacion: Number(f.excavacion.value) || 0, tuberia: Number(f.tuberia.value) || 0, espacios: {} };
      VIV_ESPACIOS.forEach(function (d) { nv.espacios[d.k] = { op: {} }; });
      f.querySelectorAll('[data-esp]').forEach(function (i) {
        var e = nv.espacios[i.getAttribute('data-esp')];
        if (i.hasAttribute('data-op')) e.op[i.getAttribute('data-op')] = i.checked; else e[i.getAttribute('data-campo')] = Number(i.value) || 0;
      });
      return nv;
    };
    // Tipologia elegida: boton para llenar los espacios con los de la tipologia (las 5 y 6 no traen espacios)
    var pintarTip = function (nv) {
      var t = VIV_TIPOLOGIAS.filter(function (x) { return x.c === nv.tipologia; })[0]; var p = cont.querySelector('[data-rol="tip-accion"]');
      if (!t) { p.innerHTML = ''; return; }
      p.innerHTML = t.espacios ? '<button type="button" class="boton-secundario" data-rol="usar-tip">Llenar los espacios de la tipología ' + t.c + ' (' + E(t.nombre) + ')</button> <small class="texto-suave">' +
        Object.keys(t.espacios).map(function (k) { var d = VIV_ESPACIOS.filter(function (x) { return x.k === k; })[0]; return (t.espacios[k][0] > 1 ? t.espacios[k][0] + ' x ' : '') + d.nom.toLowerCase() + ' ' + String(t.espacios[k][1]).replace('.', ',') + ' m²'; }).join(' · ') + (t.nota ? ' · ' + E(t.nota) : '') + '</small>'
        : '<small class="texto-suave">La tipología ' + t.c + ' (' + E(t.nombre) + ') no fija espacios: se diligencian en la tabla.</small>';
      var b = p.querySelector('[data-rol="usar-tip"]'); if (b) b.addEventListener('click', function () {
        var e2 = pv1Leer(); var vv = viviendaCompleta(leerForm());
        VIV_ESPACIOS.forEach(function (d) { var e = vv.espacios[d.k]; var s = t.espacios[d.k]; e.n = s ? s[0] : 0; if (s) e.area = s[1]; });
        if (!(vv.area_total >= t.desde)) vv.area_total = t.desde;
        e2.vivienda = vv; pv1Guardar(e2); renderViviendaReglas(cont);
      });
    };
    var pintar = function () {
      var nv = leerForm(); var e2 = pv1Leer(); e2.vivienda = nv; pv1Guardar(e2);
      cont.querySelector('[data-rol="hidro"]').hidden = !nv.hidro; pintarTip(nv);
      var r = motorVivienda(nv); var res = cont.querySelector('[data-rol="resultado"]'); var rs = r.resumen;
      res.innerHTML = (r.avisos.length ? '<div class="aviso viv-aviso">' + r.avisos.map(E).join('<br>') + '</div>' : '') +
        '<div class="tiles">' + tile('Área total (R001)', rs.area_total + ' m²', rs.tipArea ? 'Por área: tipología ' + rs.tipArea.c + ' · ' + rs.tipArea.nombre : 'Menor que la tipología 1 (15 m²)') + tile('Área por piso (R002)', rs.area_piso + ' m²', rs.pisos + ' piso(s)') + tile('Suma de espacios', rs.suma + ' m²', rs.suma > rs.area_total ? 'supera el área total' : 'dentro del área total') + tile('Mampostería (R005)', String(rs.muro).replace('.', ',') + ' m²', rs.puertas + ' puertas · ' + String(rs.ventanas).replace('.', ',') + ' m² de vidrio') + '</div>' +
        '<h3 class="subtitulo-vista">Cantidades generadas por capítulo</h3>' +
        Object.keys(r.caps).map(Number).sort(function (a, b) { return a - b; }).map(function (n) {
          var c = capitulosV1().filter(function (x) { return x.n === n; })[0];
          return '<section class="pv1-actividad"><header><strong>' + n + '. ' + E(c ? c.nombre : '') + '</strong></header><div class="tabla-desplazable"><table class="tabla pv1-tabla"><thead><tr><th>Actividad</th><th>Material</th><th class="num">Cantidad</th><th>Unidad</th><th>Cálculo</th></tr></thead><tbody>' +
            r.caps[n].map(function (a) { return a.materiales.map(function (m) { return '<tr><td>' + E(a.nombre) + '</td><td>' + E(m.nombre) + '</td><td class="num">' + String(m.cantidad).replace('.', ',') + '</td><td>' + E(m.unidad) + '</td><td><small>' + E(m.medida || '') + '</small></td></tr>'; }).join(''); }).join('') + '</tbody></table></div></section>';
        }).join('') +
        '<p class="registro-acciones"><button type="button" class="boton-principal oscuro" data-rol="aplicar-viv">Aplicar al presupuesto</button>' +
        (pv1Leer().modo === 'reglas' ? ' <button type="button" class="boton-secundario" data-rol="modelo-viv">Volver al modelo V1 (Excel)</button>' : '') + '</p>' +
        '<p class="texto-suave">Al aplicar, estos capítulos reemplazan los del modelo (en el 2 se agregan la cubierta, la placa del salón y el piso de garaje a la estructura). Luego en cada capítulo se elige el producto del catálogo de cada material.</p>';
      res.querySelector('[data-rol="aplicar-viv"]').addEventListener('click', function () { var e3 = pv1Leer(); e3.generado = r.caps; e3.modo = 'reglas'; pv1Guardar(e3); pintar(); pintarSidebar(); });
      var vm = res.querySelector('[data-rol="modelo-viv"]'); if (vm) vm.addEventListener('click', function () { var e3 = pv1Leer(); e3.modo = 'modelo'; pv1Guardar(e3); pintar(); pintarSidebar(); });
    };
    form.addEventListener('input', function (ev) { if (ev.target.type === 'checkbox' || ev.target.tagName === 'SELECT') return; clearTimeout(cont._t); cont._t = setTimeout(pintar, 250); });
    // "change" solo para casillas y listas (en los numeros, el cambio al salir del campo redibujaba el boton antes del clic)
    form.addEventListener('change', function (ev) {
      if (ev.target.type !== 'checkbox' && ev.target.tagName !== 'SELECT') return;
      if (ev.target.getAttribute('data-campo') === 'puntos') { var sm = ev.target.closest('td').querySelector('small'); if (sm) sm.textContent = VIV_BANO_NIVELES[Number(ev.target.value)].join(', '); }
      pintar();
    });
    pintar();
  }

  // =====================================================================
  // PROGRAMACION DE OBRA (PERT) y MANO DE OBRA (pedido del usuario, 28/09/2026)
  //   Plazo minimo por categoria: categoria N = N meses (categoria 1 = 1 mes ... categoria 5 = 5 meses), en dias habiles:
  //   K = meses x semanas por mes x dias habiles por semana (constante de tiempo, editable).
  //   Rendimiento: 1,25 m² por dia por espacio con la cuadrilla minima (2 personas); con mas personas avanza en proporcion.
  //   Cuadrilla: minimo 2 y maximo 5 personas por dia; se toma la menor que cumple el plazo de la categoria.
  //   Duracion = el mayor entre el plazo minimo de la categoria y la duracion por rendimiento.
  //   Tareas = capitulos del presupuesto; peso de cada capitulo en el tiempo (PROG_PESOS, supuesto editable en el Excel)
  //   PERT: optimista = 0,75 M, pesimista = 1,5 M, te = (O + 4M + P) / 6, sigma = (P - O) / 6; ruta critica por precedencias.
  //   Mano de obra: personas x dias x costo del dia trabajado (salario minimo con salud, ARL y transporte:
  //   assets/motor/salario_minimo.js).
  // =====================================================================
  var PROG_PESOS = { 1: 4, 2: 22, 3: 6, 4: 6, 5: 14, 6: 9, 7: 5, 8: 2, 9: 8, 10: 3, 11: 10, 12: 4, 13: 4, 14: 3 };
  var PROG_PREC = { 1: [], 2: [1], 3: [2], 4: [2], 5: [2], 6: [3, 4, 5], 7: [6], 8: [7], 9: [6], 10: [6], 11: [6], 12: [11], 13: [9, 11], 14: [8, 10, 12, 13] };
  function progParametros(est) {
    var v = viviendaCompleta(est.vivienda); var r = motorVivienda(v); var p = est.prog || {};
    var catAuto = Number(v.tipologia) || (r.resumen.tipArea ? r.resumen.tipArea.c : 1);
    return {
      categoria: Number(p.categoria) || catAuto, catAuto: catAuto,
      area: r.resumen.suma || Number(v.area_total) || 0,
      rendimiento: Number(p.rendimiento) || 1.25, diasSemana: Number(p.diasSemana) || 6, semanasMes: Number(p.semanasMes) || 4.33,
      pMin: Number(p.pMin) || 2, pMax: Number(p.pMax) || 5, inicio: p.inicio || new Date().toISOString().slice(0, 10),
    };
  }
  function costoDiaTrabajado() {
    if (!window.SalarioMinimo) return { dia: 0, mes: 0, dias: 26 };
    var v = window.SalarioMinimo.calcular().v; return { dia: v.COSTO_MES / v.DIAS_TRABAJADOS, mes: v.COSTO_MES, dias: v.DIAS_TRABAJADOS, smmlv: v.SMMLV };
  }
  // Fecha del dia habil numero n (0 = inicio), saltando domingos (y sabados si se trabajan 5 dias)
  function fechaHabil(inicio, n, diasSemana) {
    var d = new Date(inicio + 'T00:00:00'); var cuenta = 0; var libre = function (x) { var w = x.getDay(); return w === 0 || (diasSemana <= 5 && w === 6); };
    while (libre(d)) d.setDate(d.getDate() + 1);
    while (cuenta < Math.floor(n)) { d.setDate(d.getDate() + 1); if (!libre(d)) cuenta++; }
    return d;
  }
  function calcularProgramacion(est) {
    var P = progParametros(est); var costo = costoDiaTrabajado();
    var K = Math.round(P.categoria * P.semanasMes * P.diasSemana); // plazo minimo en dias habiles
    var base = P.area / P.rendimiento; // dias con la cuadrilla minima
    var personas = Math.min(P.pMax, Math.max(P.pMin, Math.ceil(P.pMin * base / Math.max(1, K))));
    var durRend = base * P.pMin / personas; var D = Math.max(K, durRend); var avisos = [];
    if (durRend > K) avisos.push('Con ' + P.pMax + ' personas el rendimiento pide ' + Math.ceil(durRend) + ' días hábiles: supera el plazo de la categoría ' + P.categoria + ' (' + K + ' días).');
    // Tareas: capitulos con cantidades (1 y 14 siempre)
    var caps = capitulosV1().filter(function (c) { return c.n === 1 || c.n === 4 || c.n === 14 || actividadesV1(c, est).some(function (a) { return a.materiales.some(function (m) { return Number(m.cantidad) > 0; }); }); });
    var hay = {}; caps.forEach(function (c) { hay[c.n] = true; });
    var prec0 = function (n) { var out = []; (PROG_PREC[n] || []).forEach(function (q) { if (hay[q]) out.push(q); else out = out.concat(prec0(q)); }); return out.filter(function (x, i, a) { return a.indexOf(x) === i; }); };
    // Sin precedencias redundantes: se quita la que ya es antecesora de otra precedente (p. ej. 6 -> 14 cuando 14 ya depende de 8, 12 y 13)
    var ancestros = function (n) { var r = {}; prec0(n).forEach(function (q) { r[q] = true; Object.keys(ancestros(q)).forEach(function (a) { r[a] = true; }); }); return r; };
    var prec = function (n) { var ps = prec0(n); return ps.filter(function (q) { return !ps.some(function (p) { return p !== q && ancestros(p)[q]; }); }); };
    var fte = (0.75 + 4 + 1.5) / 6;
    var red = function (escala) {
      var t = {}; caps.forEach(function (c) {
        var M = (PROG_PESOS[c.n] || 3) * escala; var ps = prec(c.n); var es = ps.reduce(function (mx, q) { return Math.max(mx, t[q].ef); }, 0);
        t[c.n] = { c: c, M: M, O: 0.75 * M, Pe: 1.5 * M, te: fte * M, sd: (1.5 - 0.75) * M / 6, prec: ps, es: es, ef: es + fte * M };
      });
      return t;
    };
    var t1 = red(1); var cp1 = Math.max.apply(null, caps.map(function (c) { return t1[c.n].ef; }));
    var t = red(D / cp1); var T = Math.max.apply(null, caps.map(function (c) { return t[c.n].ef; }));
    // Holguras y ruta critica (pasada hacia atras)
    caps.slice().reverse().forEach(function (c) {
      var suc = caps.filter(function (x) { return t[x.n].prec.indexOf(c.n) !== -1; });
      t[c.n].lf = suc.length ? Math.min.apply(null, suc.map(function (x) { return t[x.n].lf - t[x.n].te; })) : T;
      t[c.n].holgura = Math.max(0, t[c.n].lf - t[c.n].ef); t[c.n].critica = t[c.n].holgura < 0.01;
    });
    var sigma = Math.sqrt(caps.reduce(function (s, c) { return s + (t[c.n].critica ? t[c.n].sd * t[c.n].sd : 0); }, 0));
    var sumTe = caps.reduce(function (s, c) { return s + t[c.n].te; }, 0);
    var totalMO = personas * T * costo.dia;
    var tareas = caps.map(function (c) { var x = t[c.n]; x.costo = totalMO * x.te / sumTe; x.inicio = fechaHabil(P.inicio, x.es, P.diasSemana); x.fin = fechaHabil(P.inicio, Math.max(x.es, x.ef - 1), P.diasSemana); return x; });
    var salida = { cp1: cp1, P: P, K: K, base: base, personas: personas, durRend: durRend, D: D, T: T, sigma: sigma, tareas: tareas, costo: costo, totalMO: totalMO, avisos: avisos,
      fin: fechaHabil(P.inicio, Math.max(0, T - 1), P.diasSemana), fin84: fechaHabil(P.inicio, T + sigma - 1, P.diasSemana), fin98: fechaHabil(P.inicio, T + 2 * sigma - 1, P.diasSemana) };
    salida.herr = herramientasProgramacion(salida); return salida;
  }
  // ---- Herramientas de alquiler por tarea (pedido del usuario, 28/09/2026): cada capitulo lleva sus equipos; se alquilan
  // durante la duracion PERT de la tarea (te, que sale de la constante de tiempo de la categoria) x fraccion de uso.
  // Tarifa por dia = mediana de las tarifas del catalogo de alquiler (assets/datos/alquiler.js) que coinciden con los
  // terminos y superan el precio minimo (descarta accesorios sueltos). [nombre, terminos, cantidad, fraccion de uso, minimo]
  var PROG_HERRAMIENTAS = {
    1: [['Apisonador tipo canguro', ['canguro', 'apisonador'], 1, 0.5, 20000]],
    2: [['Mezcladora de concreto', ['mezcladora', 'trompo'], 1, 1, 20000], ['Vibrador de concreto', ['vibrador'], 1, 0.5, 15000], ['Formaleta (tablero)', ['formaleta'], 40, 1, 100],
      ['Paral / taco metálico', ['taco metalico', 'paral'], 30, 1, 50], ['Cercha metálica', ['cercha metalica'], 20, 1, 50], ['Apisonador tipo canguro', ['canguro', 'apisonador'], 1, 0.3, 20000]],
    3: [['Rotomartillo', ['rotomartillo'], 1, 0.5, 20000]],
    4: [['Rotomartillo', ['rotomartillo'], 1, 0.5, 20000]],
    5: [['Andamio tubular (sección)', ['andamio tubular', 'andamios'], 8, 1, 2000], ['Mezcladora de concreto', ['mezcladora', 'trompo'], 1, 0.5, 20000], ['Cortadora', ['cortadora'], 1, 0.3, 30000]],
    6: [['Andamio tubular (sección)', ['andamio tubular', 'andamios'], 8, 1, 2000], ['Mezcladora de concreto', ['mezcladora', 'trompo'], 1, 0.5, 20000]],
    7: [['Equipo de soldadura', ['motosoldador', 'planta de soldar', 'soldador'], 1, 0.5, 80000], ['Taladro', ['taladro'], 1, 0.3, 15000]],
    9: [['Andamio tubular (sección)', ['andamio tubular', 'andamios'], 6, 1, 2000], ['Compresor / equipo de pintura', ['maquina pintura', 'equipo de pintura', 'compresor'], 1, 0.3, 30000]],
    10: [['Andamio tubular (sección)', ['andamio tubular', 'andamios'], 4, 1, 2000], ['Atornillador', ['atornillador'], 1, 1, 15000]],
    11: [['Cortadora', ['cortadora'], 1, 1, 30000], ['Pulidora', ['pulidora'], 1, 0.5, 20000]],
    12: [['Taladro', ['taladro'], 1, 0.3, 15000]],
    13: [['Taladro', ['taladro'], 1, 0.3, 15000]],
    14: [['Hidrolavadora', ['hidrolavadora'], 1, 1, 30000], ['Aspiradora', ['aspiradora'], 1, 1, 30000]],
  };
  var TARIFAS_ALQ = {};
  function tarifaAlquiler(terminos, minimo) {
    var clave = terminos.join('|') + '|' + minimo; if (TARIFAS_ALQ[clave]) return TARIFAS_ALQ[clave];
    var eq = ((window.ALQUILER || {}).equipos) || []; var n = function (x) { return Motor.normalizar(x || '').toLowerCase(); };
    var l = eq.filter(function (x) { return x.precio >= minimo && /d[ií]a/.test(x.unidad || '') && terminos.some(function (t) { return n(x.nombre).indexOf(t) !== -1; }); });
    var p = l.map(function (x) { return x.precio; }).sort(function (a, b) { return a - b; });
    var r = { precio: p.length ? p[Math.floor(p.length / 2)] : 0, muestras: p.length, empresas: l.map(function (x) { return x.empresa; }).filter(function (x, i, a) { return a.indexOf(x) === i; }) };
    TARIFAS_ALQ[clave] = r; return r;
  }
  function herramientasProgramacion(g) {
    var filas = [];
    g.tareas.forEach(function (x) {
      (PROG_HERRAMIENTAS[x.c.n] || []).forEach(function (h) {
        var t = tarifaAlquiler(h[1], h[4]); var dias = Math.max(1, Math.ceil(x.te * h[3]));
        filas.push({ tarea: x, nombre: h[0], terminos: h[1], cantidad: h[2], fraccion: h[3], dias: dias, tarifa: t.precio, muestras: t.muestras, empresas: t.empresas, costo: h[2] * dias * t.precio });
      });
    });
    return { filas: filas, total: filas.reduce(function (s, f) { return s + f.costo; }, 0) };
  }
  var fmtFecha = function (d) { return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); };
  var num1 = function (x) { return (Math.round(x * 10) / 10).toLocaleString('es-CO'); };
  // ---- Diagrama BPMN de la programacion (pedido del usuario, 28/09/2026): evento de inicio -> tareas (capitulos) ->
  // compuertas paralelas (division cuando una tarea tiene varias sucesoras, union cuando tiene varias precedentes) ->
  // evento de fin; ruta critica resaltada. Misma disposicion para el SVG de la pagina y el archivo BPMN 2.0 (.bpmn).
  function bpmnLayout(g) {
    var T = g.tareas; var porN = {}; T.forEach(function (x) { porN[x.c.n] = x; });
    var suc = {}; T.forEach(function (x) { suc[x.c.n] = []; }); T.forEach(function (x) { x.prec.forEach(function (q) { suc[q].push(x.c.n); }); });
    var nodos = {}; var aristas = [];
    var nodo = function (id, tipo, extra) { nodos[id] = Object.assign({ id: id, tipo: tipo, pred: [] }, extra || {}); return nodos[id]; };
    var unir = function (a, b, critica) { aristas.push({ id: 'Flow_' + (aristas.length + 1), de: a, a: b, critica: !!critica }); nodos[b].pred.push(a); };
    nodo('Start', 'inicio'); nodo('End', 'fin');
    T.forEach(function (x) {
      nodo('Task_' + x.c.n, 'tarea', { t: x, critica: x.critica });
      if (x.prec.length > 1) nodo('Join_' + x.c.n, 'union', { critica: x.critica });
      if (suc[x.c.n].length > 1) nodo('Split_' + x.c.n, 'division', { critica: x.critica });
    });
    var salida = function (n) { return suc[n].length > 1 ? 'Split_' + n : 'Task_' + n; };
    var entrada = function (n) { return porN[n].prec.length > 1 ? 'Join_' + n : 'Task_' + n; };
    var raices = T.filter(function (x) { return !x.prec.length; }); var hojas = T.filter(function (x) { return !suc[x.c.n].length; });
    if (raices.length > 1) { nodo('Split_start', 'division', { critica: true }); unir('Start', 'Split_start', true); raices.forEach(function (x) { unir('Split_start', entrada(x.c.n), x.critica); }); }
    else if (raices.length) unir('Start', entrada(raices[0].c.n), raices[0].critica);
    T.forEach(function (x) {
      if (x.prec.length > 1) unir('Join_' + x.c.n, 'Task_' + x.c.n, x.critica);
      if (suc[x.c.n].length > 1) unir('Task_' + x.c.n, 'Split_' + x.c.n, x.critica);
      suc[x.c.n].forEach(function (s) { unir(salida(x.c.n), entrada(s), x.critica && porN[s].critica && Math.abs(porN[s].es - x.ef) < 0.01); });
    });
    if (hojas.length > 1) { nodo('Join_end', 'union', { critica: true }); hojas.forEach(function (x) { unir(salida(x.c.n), 'Join_end', x.critica); }); unir('Join_end', 'End', true); }
    else if (hojas.length) unir(salida(hojas[0].c.n), 'End', true);
    // Columnas por precedencia (camino mas largo) y filas dentro de cada columna ordenadas por la fila de su precedente
    var col = {}; var orden = []; var visitado = {};
    var visitar = function (id) { if (visitado[id]) return; visitado[id] = true; nodos[id].pred.forEach(visitar); orden.push(id); };
    Object.keys(nodos).forEach(visitar);
    orden.forEach(function (id) { col[id] = nodos[id].pred.reduce(function (m, p) { return Math.max(m, col[p] + 1); }, 0); });
    var columnas = []; orden.forEach(function (id) { (columnas[col[id]] = columnas[col[id]] || []).push(id); });
    var TAM = { tarea: [168, 72], union: [44, 44], division: [44, 44], inicio: [38, 38], fin: [38, 38] };
    var fila = {}; var altoFila = 104, margen = 70, cab = 40;
    columnas.forEach(function (ids) {
      ids.sort(function (a, b) { var pa = nodos[a].pred.map(function (p) { return fila[p]; }), pb = nodos[b].pred.map(function (p) { return fila[p]; }); var ma = pa.length ? Math.min.apply(null, pa) : 0, mb = pb.length ? Math.min.apply(null, pb) : 0; return ma - mb || (nodos[b].critica ? 1 : 0) - (nodos[a].critica ? 1 : 0); });
      ids.forEach(function (id, i) { fila[id] = i; });
    });
    var maxFilas = Math.max.apply(null, columnas.map(function (c) { return c.length; }));
    var x = margen + 30; var alto = cab + maxFilas * altoFila + 30;
    columnas.forEach(function (ids) {
      var ancho = Math.max.apply(null, ids.map(function (id) { return TAM[nodos[id].tipo][0]; }));
      var y0 = cab + (maxFilas - ids.length) * altoFila / 2;
      ids.forEach(function (id, i) { var n = nodos[id]; var s = TAM[n.tipo]; n.w = s[0]; n.h = s[1]; n.x = x + (ancho - s[0]) / 2; n.y = y0 + i * altoFila + (altoFila - s[1]) / 2; n.cx = n.x + n.w / 2; n.cy = n.y + n.h / 2; });
      x += ancho + 46;
    });
    aristas.forEach(function (e) {
      var a = nodos[e.de], b = nodos[e.a]; var x1 = a.x + a.w, y1 = a.cy, x2 = b.x, y2 = b.cy;
      if (Math.abs(y1 - y2) < 1) e.puntos = [[x1, y1], [x2, y2]];
      else if (a.tipo === 'division') e.puntos = [[a.cx, y2 < y1 ? a.y : a.y + a.h], [a.cx, y2], [x2, y2]];
      else if (b.tipo === 'union') e.puntos = [[x1, y1], [b.cx, y1], [b.cx, y1 < y2 ? b.y : b.y + b.h]];
      else { var xm = x2 - 22; e.puntos = [[x1, y1], [xm, y1], [xm, y2], [x2, y2]]; }
    });
    return { nodos: nodos, aristas: aristas, ancho: x + 10, alto: alto, margen: margen };
  }
  function bpmnSvg(L, g) {
    var partes = []; var P = g.P;
    partes.push('<rect class="bpmn-pool" x="10" y="10" width="' + (L.ancho - 20) + '" height="' + (L.alto - 20) + '"/><line class="bpmn-pool" x1="' + (L.margen) + '" y1="10" x2="' + L.margen + '" y2="' + (L.alto - 10) + '"/>' +
      '<text class="bpmn-carril" transform="translate(' + (L.margen / 2 + 14) + ',' + (L.alto / 2) + ') rotate(-90)" text-anchor="middle">Obra · categoría ' + P.categoria + ' · cuadrilla de ' + g.personas + ' personas</text>');
    L.aristas.forEach(function (e) { partes.push('<polyline class="bpmn-flujo' + (e.critica ? ' critica' : '') + '" points="' + e.puntos.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" marker-end="url(#bpmn-flecha' + (e.critica ? '-c' : '') + ')"/>'); });
    Object.keys(L.nodos).forEach(function (id) {
      var n = L.nodos[id]; var cls = n.critica ? ' critica' : '';
      if (n.tipo === 'inicio') partes.push('<circle class="bpmn-inicio" cx="' + n.cx + '" cy="' + n.cy + '" r="18"/><text class="bpmn-rotulo" x="' + n.cx + '" y="' + (n.y + n.h + 16) + '" text-anchor="middle">Inicio ' + fmtFecha(fechaHabil(P.inicio, 0, P.diasSemana)) + '</text>');
      else if (n.tipo === 'fin') partes.push('<circle class="bpmn-fin" cx="' + n.cx + '" cy="' + n.cy + '" r="17"/><text class="bpmn-rotulo" x="' + n.cx + '" y="' + (n.y + n.h + 16) + '" text-anchor="middle">Entrega ' + fmtFecha(g.fin) + '</text>');
      else if (n.tipo === 'tarea') {
        var t = n.t; var nombre = t.c.n + '. ' + t.c.nombre; var l1 = nombre, l2 = '';
        if (nombre.length > 22) { var corte = nombre.lastIndexOf(' ', 22); if (corte < 8) corte = 22; l1 = nombre.slice(0, corte); l2 = nombre.slice(corte).trim(); if (l2.length > 22) l2 = l2.slice(0, 21) + '…'; }
        partes.push('<g class="bpmn-tarea' + cls + '"><title>' + E(nombre) + ' · te ' + num1(t.te) + ' días · ' + fmtFecha(t.inicio) + ' → ' + fmtFecha(t.fin) + (t.critica ? ' · ruta crítica' : ' · holgura ' + num1(t.holgura) + ' días') + '</title>' +
          '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="10"/>' +
          '<text x="' + n.cx + '" y="' + (n.y + (l2 ? 20 : 27)) + '" text-anchor="middle" class="bpmn-nombre">' + E(l1) + '</text>' + (l2 ? '<text x="' + n.cx + '" y="' + (n.y + 34) + '" text-anchor="middle" class="bpmn-nombre">' + E(l2) + '</text>' : '') +
          '<text x="' + n.cx + '" y="' + (n.y + 52) + '" text-anchor="middle" class="bpmn-dato">te ' + num1(t.te) + ' d · día ' + num1(t.es) + '–' + num1(t.ef) + '</text>' +
          '<text x="' + n.cx + '" y="' + (n.y + 65) + '" text-anchor="middle" class="bpmn-dato">' + fmtFecha(t.inicio).replace(/ de /g, ' ') + '</text></g>');
      } else {
        var r = n.w / 2; partes.push('<g class="bpmn-compuerta' + cls + '"><title>Compuerta paralela (' + (n.tipo === 'division' ? 'división' : 'unión') + ')</title><polygon points="' + n.cx + ',' + n.y + ' ' + (n.x + n.w) + ',' + n.cy + ' ' + n.cx + ',' + (n.y + n.h) + ' ' + n.x + ',' + n.cy + '"/>' +
          '<path d="M' + (n.cx - r * 0.45) + ' ' + n.cy + 'H' + (n.cx + r * 0.45) + 'M' + n.cx + ' ' + (n.cy - r * 0.45) + 'V' + (n.cy + r * 0.45) + '"/></g>');
      }
    });
    return '<svg class="bpmn" viewBox="0 0 ' + L.ancho + ' ' + L.alto + '" width="' + L.ancho + '" height="' + L.alto + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama BPMN de la programación">' +
      '<defs><marker id="bpmn-flecha" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6b6f63"/></marker>' +
      '<marker id="bpmn-flecha-c" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b8862b"/></marker></defs>' + partes.join('') + '</svg>';
  }
  // Archivo BPMN 2.0 (proceso + diagrama con posiciones), para abrir en Camunda Modeler, bpmn.io u otro editor BPMN
  function bpmnXml(L, g) {
    var X = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var elem = { inicio: 'startEvent', fin: 'endEvent', tarea: 'task', union: 'parallelGateway', division: 'parallelGateway' };
    var ids = Object.keys(L.nodos); var P = g.P;
    var proceso = ids.map(function (id) {
      var n = L.nodos[id]; var nombre = n.tipo === 'inicio' ? 'Inicio de obra' : n.tipo === 'fin' ? 'Entrega' : n.tipo === 'tarea' ? n.t.c.n + '. ' + n.t.c.nombre : '';
      var doc = n.tipo === 'tarea' ? '<bpmn:documentation>' + X('te ' + num1(n.t.te) + ' días (O ' + num1(n.t.O) + ', M ' + num1(n.t.M) + ', P ' + num1(n.t.Pe) + ') · días ' + num1(n.t.es) + ' a ' + num1(n.t.ef) + ' · ' + fmtFecha(n.t.inicio) + ' a ' + fmtFecha(n.t.fin) + (n.t.critica ? ' · ruta crítica' : ' · holgura ' + num1(n.t.holgura) + ' días') + ' · mano de obra ' + Motor.formatoMoneda(n.t.costo)) + '</bpmn:documentation>' : '';
      var ent = L.aristas.filter(function (e) { return e.a === id; }).map(function (e) { return '<bpmn:incoming>' + e.id + '</bpmn:incoming>'; }).join('');
      var sal = L.aristas.filter(function (e) { return e.de === id; }).map(function (e) { return '<bpmn:outgoing>' + e.id + '</bpmn:outgoing>'; }).join('');
      return '    <bpmn:' + elem[n.tipo] + ' id="' + id + '"' + (nombre ? ' name="' + X(nombre) + '"' : '') + '>' + doc + ent + sal + '</bpmn:' + elem[n.tipo] + '>';
    }).join('\n') + '\n' + L.aristas.map(function (e) { return '    <bpmn:sequenceFlow id="' + e.id + '" sourceRef="' + e.de + '" targetRef="' + e.a + '"/>'; }).join('\n');
    var carril = '    <bpmn:laneSet id="LaneSet_1"><bpmn:lane id="Lane_1" name="Cuadrilla de ' + g.personas + ' personas">' + ids.map(function (id) { return '<bpmn:flowNodeRef>' + id + '</bpmn:flowNodeRef>'; }).join('') + '</bpmn:lane></bpmn:laneSet>\n';
    var formas = '      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true"><dc:Bounds x="10" y="10" width="' + (L.ancho - 20) + '" height="' + (L.alto - 20) + '"/></bpmndi:BPMNShape>\n' +
      '      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true"><dc:Bounds x="' + (10 + 30) + '" y="10" width="' + (L.ancho - 50) + '" height="' + (L.alto - 20) + '"/></bpmndi:BPMNShape>\n' +
      ids.map(function (id) { var n = L.nodos[id]; return '      <bpmndi:BPMNShape id="' + id + '_di" bpmnElement="' + id + '"><dc:Bounds x="' + Math.round(n.x) + '" y="' + Math.round(n.y) + '" width="' + n.w + '" height="' + n.h + '"/></bpmndi:BPMNShape>'; }).join('\n') + '\n' +
      L.aristas.map(function (e) { return '      <bpmndi:BPMNEdge id="' + e.id + '_di" bpmnElement="' + e.id + '">' + e.puntos.map(function (p) { return '<di:waypoint x="' + Math.round(p[0]) + '" y="' + Math.round(p[1]) + '"/>'; }).join('') + '</bpmndi:BPMNEdge>'; }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_ConstruMaster" targetNamespace="http://construmaster/bpmn" exporter="ConstruMaster" exporterVersion="1.0">\n' +
      '  <bpmn:collaboration id="Collaboration_1"><bpmn:participant id="Participant_1" name="' + X('Obra · categoría ' + P.categoria + ' · ' + num1(g.T) + ' días hábiles') + '" processRef="Process_Obra"/></bpmn:collaboration>\n' +
      '  <bpmn:process id="Process_Obra" name="Programación de obra (PERT)" isExecutable="false">\n' + carril + proceso + '\n  </bpmn:process>\n' +
      '  <bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">\n' + formas + '\n  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>\n</bpmn:definitions>\n';
  }
  function renderProgramacion(cont) {
    var est = pv1Leer(); var g = calcularProgramacion(est); var P = g.P;
    var campo = function (etq, nombre, val, extra) { return '<label>' + etq + '<input ' + (extra || 'type="number" min="0" step="any"') + ' name="' + nombre + '" value="' + val + '"></label>'; };
    var semanas = Math.ceil(g.T / P.diasSemana); var L = bpmnLayout(g);
    cont.innerHTML = pestanasPresupuesto('prog') +
      '<form class="viv-form" data-rol="prog"><fieldset class="viv-generales"><legend>Programación</legend>' +
      '<label>Categoría<select name="categoria">' + VIV_TIPOLOGIAS.map(function (t) { return '<option value="' + t.c + '"' + (t.c === P.categoria ? ' selected' : '') + '>' + t.c + '. ' + t.nombre + ' · ' + t.c + (t.c > 1 ? ' meses' : ' mes') + '</option>'; }).join('') + '</select></label>' +
      campo('Rendimiento (m²/día por espacio)', 'rendimiento', P.rendimiento) + campo('Días hábiles por semana', 'diasSemana', P.diasSemana, 'type="number" min="5" max="6" step="1"') + campo('Semanas por mes', 'semanasMes', P.semanasMes) +
      campo('Personas mínimo', 'pMin', P.pMin, 'type="number" min="1" step="1"') + campo('Personas máximo', 'pMax', P.pMax, 'type="number" min="1" step="1"') + campo('Fecha de inicio', 'inicio', P.inicio, 'type="date"') + '</fieldset></form>' +
      (g.avisos.length ? '<div class="aviso viv-aviso">' + g.avisos.map(E).join('<br>') + '</div>' : '') +
      '<div class="tiles">' + tile('Constante de la categoría', g.K + ' días hábiles', P.categoria + ' mes(es) x ' + String(P.semanasMes).replace('.', ',') + ' semanas x ' + P.diasSemana + ' días') +
      tile('Rendimiento', num1(g.base) + ' días', num1(P.area) + ' m² de espacios / ' + String(P.rendimiento).replace('.', ',') + ' m²/día con ' + P.pMin + ' personas') +
      tile('Cuadrilla', g.personas + ' personas/día', 'entre ' + P.pMin + ' y ' + P.pMax + ' · duración por rendimiento ' + num1(g.durRend) + ' días') +
      tile('Duración (PERT)', num1(g.T) + ' días hábiles', semanas + ' semanas · fin ' + fmtFecha(g.fin)) + '</div>' +
      '<div class="tiles">' + tile('Mano de obra (estimado)', Motor.formatoMoneda(g.totalMO), g.personas + ' personas x ' + num1(g.T) + ' días x ' + Motor.formatoMoneda(g.costo.dia) + '/día') +
      tile('Costo del día trabajado', Motor.formatoMoneda(g.costo.dia), 'Salario mínimo + salud + ARL + transporte ÷ ' + g.costo.dias + ' días') +
      tile('Alquiler de herramientas', Motor.formatoMoneda(g.herr.total), g.herr.filas.length + ' equipos por tarea · catálogo de alquiler') +
      tile('Desviación de la ruta crítica', num1(g.sigma) + ' días', '84 %: ' + fmtFecha(g.fin84) + ' · 98 %: ' + fmtFecha(g.fin98)) + '</div>' +
      '<h3 class="subtitulo-vista">Tareas del presupuesto (PERT)</h3><div class="tabla-desplazable"><table class="tabla prog-tabla"><thead><tr><th>Tarea (capítulo)</th><th>Precede</th><th class="num">O</th><th class="num">M</th><th class="num">P</th><th class="num">te</th><th class="num">Inicio (día)</th><th class="num">Fin (día)</th><th class="num">Holgura</th><th>Fechas</th><th class="num">Mano de obra</th></tr></thead><tbody>' +
      g.tareas.map(function (x) {
        return '<tr' + (x.critica ? ' class="prog-critica"' : '') + '><td><a href="#presupuesto/v1-' + x.c.n + '">' + x.c.n + '. ' + E(x.c.nombre) + '</a>' + (x.critica ? ' <small>ruta crítica</small>' : '') + '</td><td>' + (x.prec.join(', ') || '—') + '</td>' +
          '<td class="num">' + num1(x.O) + '</td><td class="num">' + num1(x.M) + '</td><td class="num">' + num1(x.Pe) + '</td><td class="num"><strong>' + num1(x.te) + '</strong></td><td class="num">' + num1(x.es) + '</td><td class="num">' + num1(x.ef) + '</td><td class="num">' + num1(x.holgura) + '</td>' +
          '<td><small>' + fmtFecha(x.inicio) + ' → ' + fmtFecha(x.fin) + '</small></td><td class="num">' + Motor.formatoMoneda(x.costo) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<h3 class="subtitulo-vista">Diagrama BPMN de las actividades planeadas</h3>' +
      '<p class="registro-acciones"><button type="button" class="boton-secundario" data-rol="bpmn-descargar">Descargar BPMN 2.0 (.bpmn)</button> <button type="button" class="boton-secundario" data-rol="bpmn-svg">Descargar imagen (SVG)</button></p>' +
      '<div class="tabla-desplazable bpmn-marco">' + bpmnSvg(L, g) + '</div>' +
      '<p class="texto-suave bpmn-leyenda"><span class="l-inicio"></span> Inicio · <span class="l-tarea"></span> Tarea (capítulo) · <span class="l-compuerta"></span> Compuerta paralela: divide o une actividades simultáneas · <span class="l-fin"></span> Entrega · <span class="l-critica"></span> Ruta crítica. Pasa el cursor sobre una tarea para ver su duración, fechas y holgura.</p>' +
      '<h3 class="subtitulo-vista">Herramientas de alquiler por tarea</h3><div class="tabla-desplazable"><table class="tabla prog-tabla"><thead><tr><th>Tarea</th><th>Herramienta</th><th class="num">Cantidad</th><th class="num">Días de alquiler</th><th class="num">Tarifa por día</th><th class="num">Costo</th><th>Fuente</th></tr></thead><tbody>' +
      g.herr.filas.map(function (h) { return '<tr><td>' + h.tarea.c.n + '. ' + E(h.tarea.c.nombre) + '</td><td>' + E(h.nombre) + '</td><td class="num">' + h.cantidad + '</td><td class="num">' + h.dias + ' <small>(' + Math.round(h.fraccion * 100) + ' % de ' + num1(h.tarea.te) + ')</small></td><td class="num">' + (h.tarifa ? Motor.formatoMoneda(h.tarifa) : '—') + '</td><td class="num">' + (h.tarifa ? Motor.formatoMoneda(h.costo) : 'sin tarifa') + '</td><td><small>' + (h.muestras ? 'Mediana de ' + h.muestras + ' tarifa(s): ' + E(h.empresas.slice(0, 3).join(', ')) : 'Sin tarifa por día publicada') + '</small></td></tr>'; }).join('') +
      '<tr class="prog-total"><td colspan="5"><strong>Total alquiler</strong></td><td class="num"><strong>' + Motor.formatoMoneda(g.herr.total) + '</strong></td><td></td></tr></tbody></table></div>' +
      '<h3 class="subtitulo-vista">Diagrama por semanas</h3><div class="tabla-desplazable"><div class="prog-gantt" style="--semanas:' + semanas + '">' +
      '<div class="prog-fila prog-cab"><span></span><div class="prog-escala">' + Array.apply(null, Array(semanas)).map(function (z, i) { return '<i>S' + (i + 1) + '</i>'; }).join('') + '</div></div>' +
      g.tareas.map(function (x) { return '<div class="prog-fila"><span>' + x.c.n + '. ' + E(x.c.nombre) + '</span><div class="prog-escala"><b class="' + (x.critica ? 'critica' : '') + '" style="left:' + (x.es / g.T * 100).toFixed(2) + '%;width:' + Math.max(0.8, x.te / g.T * 100).toFixed(2) + '%" title="' + num1(x.te) + ' días"></b></div></div>'; }).join('') +
      '</div></div>' +
      '<p class="texto-suave">O, M y P: duración optimista, más probable y pesimista (días hábiles); te = (O + 4M + P) / 6. Precede: capítulos que deben terminar antes. Días hábiles sin festivos.</p>';
    var bajar = function (texto, tipo, nombre) { var aEl = document.createElement('a'); aEl.href = URL.createObjectURL(new Blob([texto], { type: tipo })); aEl.download = nombre; document.body.appendChild(aEl); aEl.click(); aEl.remove(); };
    cont.querySelector('[data-rol="bpmn-descargar"]').addEventListener('click', function () { bajar(bpmnXml(L, g), 'application/xml', 'programacion_obra.bpmn'); });
    cont.querySelector('[data-rol="bpmn-svg"]').addEventListener('click', function () { var css = '.bpmn-pool{fill:#fff;stroke:#2f4437;stroke-width:1.5}.bpmn-carril{font:600 13px Segoe UI,Arial;fill:#2f4437}.bpmn-flujo{fill:none;stroke:#6b6f63;stroke-width:1.4}.bpmn-flujo.critica{stroke:#b8862b;stroke-width:2.4}.bpmn-inicio{fill:#fff;stroke:#2f4437;stroke-width:2}.bpmn-fin{fill:#fff;stroke:#2f4437;stroke-width:5}.bpmn-rotulo,.bpmn-dato{font:11px Segoe UI,Arial;fill:#6b6f63}.bpmn-nombre{font:600 12px Segoe UI,Arial;fill:#1f211d}.bpmn-tarea rect{fill:#f6f4ee;stroke:#2f4437;stroke-width:1.5}.bpmn-tarea.critica rect{fill:#fbf1dc;stroke:#b8862b;stroke-width:2.4}.bpmn-compuerta polygon{fill:#fff;stroke:#2f4437;stroke-width:1.5}.bpmn-compuerta.critica polygon{stroke:#b8862b;stroke-width:2.2}.bpmn-compuerta path{stroke:#2f4437;stroke-width:3}';
      bajar(bpmnSvg(L, g).replace('<defs>', '<style>' + css + '</style><defs>'), 'image/svg+xml', 'programacion_obra_bpmn.svg'); });
    var f = cont.querySelector('[data-rol="prog"]');
    var guardar = function () { var e2 = pv1Leer(); var p = {}; ['categoria', 'rendimiento', 'diasSemana', 'semanasMes', 'pMin', 'pMax'].forEach(function (k) { p[k] = Number(f[k].value) || 0; }); p.inicio = f.inicio.value; if (p.pMax < p.pMin) p.pMax = p.pMin; e2.prog = p; pv1Guardar(e2); renderProgramacion(cont); pintarSidebar(); };
    f.addEventListener('change', guardar);
  }

  // ---- Excel del presupuesto (ExcelJS, en el navegador): hojas relacionadas con formulas vivas
  //   Parametros (vivienda, salario, programacion) · Presupuesto (cantidad x valor unitario; compuestos = suma de sus
  //   componentes) · Resumen (SUMIFS por capitulo) · Programacion (PERT con formulas: te, sigma, inicio = MAX de precedentes)
  function descargarExcelV1() {
    return cargarScript('assets/motor/exceljs.min.js', function () { return window.ExcelJS; }).then(function () {
      var est = pv1Leer(); var v = viviendaCompleta(est.vivienda); var g = calcularProgramacion(est); var wb = new window.ExcelJS.Workbook(); wb.creator = 'ConstruMaster';
      var negrita = function (h) { h.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F4437' } }; h.views = [{ state: 'frozen', ySplit: 1 }]; };
      var money = '"$"#,##0';
      // Parametros
      var hp = wb.addWorksheet('Parametros'); hp.columns = [{ header: 'PARAMETRO', width: 42 }, { header: 'VALOR', width: 16 }, { header: 'NOTA', width: 60 }]; negrita(hp);
      var par = [['Área total (m²)', v.area_total], ['Número de pisos', v.pisos], ['Altura de muro (m)', v.altura], ['Bloques por m²', v.bloques_m2], ['Desperdicio (%)', v.desperdicio], ['Factor de cubierta', v.factor_cubierta],
        ['Categoría', g.P.categoria, 'Plazo mínimo = categoría en meses'], ['Semanas por mes', g.P.semanasMes], ['Días hábiles por semana', g.P.diasSemana], ['Área de espacios (m²)', g.P.area], ['Rendimiento (m²/día por espacio)', g.P.rendimiento, 'Con la cuadrilla mínima'],
        ['Personas mínimo', g.P.pMin], ['Personas máximo', g.P.pMax], ['Salario mínimo mensual', g.costo.smmlv || 0, 'assets/motor/salario_minimo.js'], ['Costo del trabajador al mes', g.costo.mes, 'Salario + salud + ARL + transporte'], ['Días trabajados al mes', g.costo.dias]];
      par.forEach(function (x) { hp.addRow(x); });
      var R = {}; ['area', 'pisos', 'altura', 'bloques', 'desp', 'fcub', 'cat', 'sem', 'dsem', 'aesp', 'rend', 'pmin', 'pmax', 'smmlv', 'cmes', 'dtrab'].forEach(function (k, i) { R[k] = 'Parametros!$B$' + (i + 2); });
      var fr = par.length + 2;
      [['Constante de la categoría (días hábiles)', 'ROUND(' + R.cat + '*' + R.sem + '*' + R.dsem + ',0)'], ['Días por rendimiento (cuadrilla mínima)', R.aesp + '/' + R.rend],
        ['Personas por día', 'MIN(' + R.pmax + ',MAX(' + R.pmin + ',ROUNDUP(' + R.pmin + '*B' + (fr + 1) + '/MAX(1,B' + fr + '),0)))'], ['Duración objetivo (días hábiles)', 'MAX(B' + fr + ',B' + (fr + 1) + '*' + R.pmin + '/B' + (fr + 2) + ')'],
        ['Costo del día trabajado', R.cmes + '/' + R.dtrab]].forEach(function (x, i) { var row = hp.addRow([x[0], { formula: x[1] }, 'Fórmula']); row.getCell(2).font = { bold: true }; if (i === 4) row.getCell(2).numFmt = money; });
      R.K = 'Parametros!$B$' + fr; R.pers = 'Parametros!$B$' + (fr + 2); R.D = 'Parametros!$B$' + (fr + 3); R.cdia = 'Parametros!$B$' + (fr + 4);
      // Presupuesto
      var hb = wb.addWorksheet('Presupuesto');
      hb.columns = [['ID', 14], ['ETAPA', 12], ['CAPITULO', 30], ['ACTIVIDAD', 34], ['MATERIAL', 40], ['PRODUCTO DEL CATALOGO', 40], ['UNIDAD', 8], ['CANTIDAD', 11], ['VALOR UNITARIO', 15], ['VALOR', 16], ['NIVEL', 11]].map(function (x) { return { header: x[0], width: x[1] }; }); negrita(hb);
      var fila = 2;
      capitulosV1().forEach(function (c) {
        actividadesV1(c, est).forEach(function (a) {
          a.materiales.forEach(function (m) {
            var r0 = fila; var comp = m.componentes || [];
            var fx = comp.length ? 'IF(SUM(J' + (r0 + 1) + ':J' + (r0 + comp.length) + ')>0,SUM(J' + (r0 + 1) + ':J' + (r0 + comp.length) + '),H' + r0 + '*I' + r0 + ')' : 'H' + r0 + '*I' + r0;
            var vu = comp.length ? (m.valorModelo && m.cantidad ? m.valorModelo / m.cantidad : m.valorU) : m.valorU;
            hb.addRow([m.id, NOMBRE_ETAPA_V1[c.etapa], c.n + '. ' + c.nombre, (a.ref ? a.ref + ' ' : '') + a.nombre, m.nombre, m.producto ? m.producto.nombre : '', m.unidad, Number(m.cantidad) || 0, Number(vu) || 0, { formula: fx, result: m.valor }, 'material']); fila++;
            comp.forEach(function (k) { hb.addRow([k.id, NOMBRE_ETAPA_V1[c.etapa], c.n + '. ' + c.nombre, '', '   ↳ ' + k.nombre, k.producto ? k.producto.nombre : '', k.unidad, Number(k.cantidad) || 0, Number(k.valorU) || 0, { formula: 'H' + fila + '*I' + fila, result: k.valor }, 'componente']); hb.getRow(fila).font = { italic: true, color: { argb: 'FF6B6F63' } }; fila++; });
          });
        });
      });
      var ult = fila - 1; hb.getColumn(9).numFmt = money; hb.getColumn(10).numFmt = money;
      hb.addRow([]); var tot = hb.addRow(['', '', '', '', 'TOTAL MATERIALES', '', '', '', '', { formula: 'SUMIFS(J2:J' + ult + ',K2:K' + ult + ',"material")' }]); tot.font = { bold: true };
      // Resumen
      var hr = wb.addWorksheet('Resumen'); hr.columns = [{ header: 'CAPITULO', width: 36 }, { header: 'ETAPA', width: 12 }, { header: 'MATERIALES', width: 18 }, { header: 'MANO DE OBRA', width: 18 }, { header: 'ALQUILER', width: 18 }, { header: 'TOTAL', width: 18 }]; negrita(hr);
      var capsR = capitulosV1(); var r1 = 2;
      // Programacion (se escribe antes del resumen de mano de obra para referenciar sus filas)
      var hg = wb.addWorksheet('Programacion');
      hg.columns = [['CAP', 6], ['TAREA', 34], ['PRECEDE', 12], ['PESO', 8], ['M (DIAS)', 11], ['O (DIAS)', 11], ['P (DIAS)', 11], ['TE (DIAS)', 11], ['SIGMA', 9], ['INICIO (DIA)', 12], ['FIN (DIA)', 12], ['MANO DE OBRA', 16]].map(function (x) { return { header: x[0], width: x[1] }; }); negrita(hg);
      var filaCap = {}; g.tareas.forEach(function (x, i) { filaCap[x.c.n] = i + 2; });
      var ultG = g.tareas.length + 1; var escala = g.tareas.length ? g.tareas[0].M / (PROG_PESOS[g.tareas[0].c.n] || 3) : 1;
      hp.addRow(['Escala PERT (días por punto de peso)', { formula: R.D + '/' + g.cp1, result: escala }, 'Duración objetivo / ruta crítica con los pesos: la ruta crítica queda igual a la duración']); R.esc = 'Parametros!$B$' + hp.rowCount;
      g.tareas.forEach(function (x, i) {
        var r = i + 2; var ini = x.prec.length ? 'MAX(' + x.prec.map(function (q) { return 'K' + filaCap[q]; }).join(',') + ')' : '0';
        hg.addRow([x.c.n, x.c.nombre, x.prec.join(', '), PROG_PESOS[x.c.n] || 3, { formula: 'D' + r + '*' + R.esc, result: x.M }, { formula: '0.75*E' + r, result: x.O }, { formula: '1.5*E' + r, result: x.Pe },
          { formula: '(F' + r + '+4*E' + r + '+G' + r + ')/6', result: x.te }, { formula: '(G' + r + '-F' + r + ')/6', result: x.sd }, { formula: ini, result: x.es }, { formula: 'J' + r + '+H' + r, result: x.ef },
          { formula: R.pers + '*MAX(K$2:K$' + ultG + ')*' + R.cdia + '*H' + r + '/SUM(H$2:H$' + ultG + ')', result: x.costo }]);
      });
      [5, 6, 7, 8, 9, 10, 11].forEach(function (k) { hg.getColumn(k).numFmt = '0.0'; }); hg.getColumn(12).numFmt = money;
      hg.addRow([]); var tg = hg.addRow(['', 'DURACION (RUTA CRITICA, DIAS HABILES)', '', '', '', '', '', '', '', '', { formula: 'MAX(K2:K' + ultG + ')' }, { formula: 'SUM(L2:L' + ultG + ')' }]); tg.font = { bold: true };
      var hh = wb.addWorksheet('Herramientas');
      hh.columns = [['CAP', 6], ['TAREA', 30], ['HERRAMIENTA', 30], ['CANTIDAD', 10], ['FRACCION DE USO', 15], ['TE TAREA (DIAS)', 15], ['DIAS DE ALQUILER', 16], ['TARIFA POR DIA', 15], ['COSTO', 16], ['FUENTE', 50]].map(function (x) { return { header: x[0], width: x[1] }; }); negrita(hh);
      g.herr.filas.forEach(function (h, i) { var r = i + 2; hh.addRow([h.tarea.c.n, h.tarea.c.nombre, h.nombre, h.cantidad, h.fraccion, { formula: 'Programacion!H' + filaCap[h.tarea.c.n], result: h.tarea.te }, { formula: 'MAX(1,ROUNDUP(F' + r + '*E' + r + ',0))', result: h.dias }, h.tarifa, { formula: 'D' + r + '*G' + r + '*H' + r, result: h.costo }, h.muestras ? 'Mediana de ' + h.muestras + ' tarifa(s) del catálogo de alquiler: ' + h.empresas.join(', ') : 'Sin tarifa por día publicada']); });
      var ultH = g.herr.filas.length + 1; hh.getColumn(8).numFmt = money; hh.getColumn(9).numFmt = money; hh.getColumn(6).numFmt = '0.0'; hh.getColumn(5).numFmt = '0%';
      hh.addRow([]); var th = hh.addRow(['', 'TOTAL ALQUILER', '', '', '', '', '', '', { formula: 'SUM(I2:I' + ultH + ')' }]); th.font = { bold: true };
      capsR.forEach(function (c) {
        var nombre = c.n + '. ' + c.nombre; var fg = filaCap[c.n];
        hr.addRow([nombre, NOMBRE_ETAPA_V1[c.etapa], { formula: 'SUMIFS(Presupuesto!J$2:J$' + ult + ',Presupuesto!C$2:C$' + ult + ',A' + r1 + ',Presupuesto!K$2:K$' + ult + ',"material")' }, fg ? { formula: 'Programacion!L' + fg } : 0, { formula: 'SUMIFS(Herramientas!I$2:I$' + Math.max(2, ultH) + ',Herramientas!A$2:A$' + Math.max(2, ultH) + ',' + c.n + ')' }, { formula: 'C' + r1 + '+D' + r1 + '+E' + r1 }]); r1++;
      });
      var rt = hr.addRow(['TOTAL', '', { formula: 'SUM(C2:C' + (r1 - 1) + ')' }, { formula: 'SUM(D2:D' + (r1 - 1) + ')' }, { formula: 'SUM(E2:E' + (r1 - 1) + ')' }, { formula: 'SUM(F2:F' + (r1 - 1) + ')' }]); rt.font = { bold: true };
      [3, 4, 5, 6].forEach(function (k) { hr.getColumn(k).numFmt = money; });
      wb.calcProperties = { fullCalcOnLoad: true };
      return wb.xlsx.writeBuffer().then(function (buf) {
        var aEl = document.createElement('a'); aEl.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); aEl.download = 'presupuesto_v1_construmaster.xlsx'; document.body.appendChild(aEl); aEl.click(); aEl.remove();
      });
    });
  }
  // Cargar el Excel descargado (con cantidades o valores unitarios cambiados): actualiza las lineas por su ID
  function cargarExcelV1(archivo) {
    return cargarScript('assets/motor/exceljs.min.js', function () { return window.ExcelJS; }).then(function () { return archivo.arrayBuffer(); }).then(function (buf) {
      var wb = new window.ExcelJS.Workbook(); return wb.xlsx.load(buf).then(function () {
        var h = wb.getWorksheet('Presupuesto'); if (!h) throw new Error('El archivo no tiene la hoja "Presupuesto".');
        var est = pv1Leer(); var actual = {};
        capitulosV1().forEach(function (c) { actividadesV1(c, est).forEach(function (a) { a.materiales.forEach(function (m) { actual[m.id] = m; (m.componentes || []).forEach(function (k) { actual[k.id] = k; }); }); }); });
        var val = function (x) { return x && typeof x === 'object' ? (x.result !== undefined ? x.result : 0) : x; };
        var cambios = 0;
        h.eachRow(function (row, i) {
          if (i === 1) return; var id = String(row.getCell(1).value || '').trim(); var m = actual[id]; if (!m) return;
          var cant = Number(val(row.getCell(8).value)); var vu = Number(val(row.getCell(9).value)); var s = est.lineas[id] = est.lineas[id] || {};
          if (isFinite(cant) && cant !== Number(m.cantidad)) { s.cantidad = cant; cambios++; }
          if (isFinite(vu) && !m.componentes && Math.round(vu) !== Math.round(Number(m.valorU) || 0)) { delete s.producto; s.valorU = vu; cambios++; }
        });
        pv1Guardar(est); return cambios;
      });
    });
  }

  function renderTotalesV1(c) {
    var est = pv1Leer(); var cont = $('presupuesto-v1');
    actividadesV1(c, est).forEach(function (a) { var s = cont.querySelector('[data-act="' + a.id + '"] [data-rol="valor-act"]'); if (s) s.textContent = Motor.formatoMoneda(a.valor); });
    var t = cont.querySelector('[data-rol="total-cap"]'); if (t) t.textContent = Motor.formatoMoneda(valorCapituloV1(c, est));
    pintarSidebar();
  }
  function conectarAccionesV1(cont) {
    var bx = cont.querySelector('[data-rol="xlsx-v1"]');
    if (bx) bx.addEventListener('click', function () { bx.disabled = true; bx.textContent = 'Generando Excel…'; descargarExcelV1().catch(function (err) { alert('No se pudo generar el Excel: ' + err.message); }).then(function () { bx.disabled = false; bx.textContent = 'Descargar Excel (con fórmulas)'; }); });
    var bc = cont.querySelector('[data-rol="cargar-v1"]'); var fi = cont.querySelector('[data-rol="archivo-v1"]');
    if (bc && fi) { bc.addEventListener('click', function () { fi.click(); }); fi.addEventListener('change', function () { if (!fi.files[0]) return; cargarExcelV1(fi.files[0]).then(function (n) { alert(n ? 'Excel cargado: ' + n + ' cambio(s) de cantidad o valor unitario.' : 'Excel cargado: no hay cambios frente al presupuesto actual.'); var r = leerRuta(); if (r.vista === 'presupuesto') renderPresupuestoV1(r.sub); pintarSidebar(); }).catch(function (err) { alert('No se pudo leer el Excel: ' + err.message); }); fi.value = ''; }); }
    var csv = cont.querySelector('[data-rol="csv-v1"]');
    if (csv) csv.addEventListener('click', function () {
      var est = pv1Leer(); var filas = [['Etapa', 'Capitulo', 'Actividad', 'Material', 'Producto del catalogo', 'Proveedor', 'Unidad', 'Cantidad', 'Valor unitario', 'Valor']];
      capitulosV1().forEach(function (c) { actividadesV1(c, est).forEach(function (a) { a.materiales.forEach(function (m) { (m.componentes ? [m].concat(m.componentes.map(function (k) { return Object.assign({}, k, { nombre: m.nombre + ' > ' + k.nombre }); })) : [m]).forEach(function (x, i) { filas.push([NOMBRE_ETAPA_V1[c.etapa], c.n + '. ' + c.nombre, (a.ref ? a.ref + ' ' : '') + a.nombre, x.nombre, x.producto ? x.producto.nombre : '', x.producto ? x.producto.prov : '', x.unidad, x.cantidad, m.componentes && !i ? '' : x.valorU, Math.round(x.valor)]); }); }); }); });
      var texto = '﻿' + filas.map(function (f) { return f.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      var aEl = document.createElement('a'); aEl.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' })); aEl.download = 'presupuesto_v1.csv'; document.body.appendChild(aEl); aEl.click(); aEl.remove();
    });
    var rein = cont.querySelector('[data-rol="reiniciar-v1"]');
    if (rein) rein.addEventListener('click', function () { if (confirm('¿Volver a las cantidades y valores del modelo V1? Se borran los productos elegidos y lo agregado.')) { var viv = pv1Leer().vivienda; pv1Guardar({ lineas: {}, actividades: {}, materiales: {}, vivienda: viv, modo: 'modelo' }); if (leerRuta().vista === 'presupuesto') renderPresupuestoV1(leerRuta().sub); pintarSidebar(); } });
  }

  // Selector de producto del inventario para un material: busqueda por palabras clave, material o herramienta
  function abrirSelectorProducto(idLinea, material, sub) {
    var capa = document.createElement('div'); capa.className = 'pv1-selector-fondo';
    capa.innerHTML = '<div class="pv1-selector" role="dialog" aria-modal="true"><header><strong>Elegir producto para: ' + E(material) + '</strong><button type="button" data-rol="cerrar" aria-label="Cerrar">×</button></header>' +
      (equivalenciasMaterial(material) ? '<p class="pv1-equivalencia">' + (/CONCRETO/.test(nombreMaterialNorm(material)) ? E(material) + ' se hace con:' : 'Productos para ' + E(material) + ':') + ' ' + equivalenciasMaterial(material).map(function (t, i) { return '<button type="button" data-termino="' + E(t) + '"' + (i ? '' : ' class="activo"') + '>' + E(etiquetaTermino(t)) + '</button>'; }).join('') + '</p>' : '') +
      '<div class="pv1-selector-filtros"><input type="search" data-rol="q" value="' + E(equivalenciasMaterial(material) ? equivalenciasMaterial(material)[0] : palabrasMaterial(material).slice(0, 2).join(' ').toLowerCase()) + '" aria-label="Buscar en el catálogo">' +
      '<label><input type="radio" name="tipo" value="material" checked> Material</label><label><input type="radio" name="tipo" value="herramienta"> Herramienta</label><label><input type="radio" name="tipo" value=""> Todo</label></div>' +
      '<div class="pv1-selector-lista" data-rol="lista"><p class="texto-suave">Cargando inventario…</p></div>' +
      '<footer><button type="button" class="boton claro" data-rol="quitar">Usar el valor del modelo (quitar producto)</button></footer></div>';
    document.body.appendChild(capa);
    var q = capa.querySelector('[data-rol="q"]'); var lista = capa.querySelector('[data-rol="lista"]'); var resultados = [];
    var cerrar = function () { capa.remove(); };
    var pintar = function () {
      var tipo = capa.querySelector('input[name="tipo"]:checked').value;
      resultados = buscarEnCatalogo(q.value || material, tipo, 400);
      // Bulto de cemento: primero las presentaciones de 50 kg (bulto)
      if (/cemento/i.test(q.value)) { var bulto = function (p) { return /50\s?KG|BULTO/.test(p._n || '') ? 0 : 1; }; resultados.sort(function (a, b) { return bulto(a) - bulto(b); }); }
      resultados = resultados.slice(0, 80);
      lista.innerHTML = resultados.length ? resultados.map(function (p, i) {
        return '<button type="button" data-i="' + i + '"><span>' + E(p.nombre) + '<small>' + E(INV.D.proveedores[p.prov] || '') + (p.marca >= 0 ? ' · ' + E(INV.D.marcas[p.marca]) : '') + '</small></span><b>' + (p.precio ? Motor.formatoMoneda(p.precio) : 'Sin precio') + '</b></button>';
      }).join('') : '<p class="vacio">Sin productos con esas palabras. Prueba otra búsqueda.</p>';
    };
    conCargaInventario(null, pintar);
    var t = null; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(pintar, 200); });
    capa.querySelectorAll('input[name="tipo"]').forEach(function (r) { r.addEventListener('change', pintar); });
    capa.addEventListener('click', function (e) {
      if (e.target === capa || e.target.closest('[data-rol="cerrar"]')) return cerrar();
      var term = e.target.closest('[data-termino]');
      if (term) { q.value = term.getAttribute('data-termino'); capa.querySelectorAll('[data-termino]').forEach(function (x) { x.classList.toggle('activo', x === term); }); pintar(); return; }
      var est = pv1Leer(); var s = est.lineas[idLinea] = est.lineas[idLinea] || {};
      if (e.target.closest('[data-rol="quitar"]')) { delete s.producto; pv1Guardar(est); cerrar(); renderPresupuestoV1(sub); pintarSidebar(); return; }
      var b = e.target.closest('[data-i]'); if (!b) return;
      var p = resultados[Number(b.getAttribute('data-i'))];
      s.producto = { nombre: p.nombre, prov: INV.D.proveedores[p.prov] || '', precio: p.precio || 0 };
      pv1Guardar(est); cerrar(); renderPresupuestoV1(sub); pintarSidebar();
    });
    q.focus();
  }

  // Precio de una casa: el 110 % tachado y el valor real en negrilla (cards y slide).
  function precioTachadoHtml(precio) {
    return '<span class="precio-tachado"><s>' + Motor.formatoMoneda(Math.round(precio * 1.1)) + '</s> <strong>' + Motor.formatoMoneda(precio) + '</strong></span>';
  }

  // Tira de fotos pequenas deslizable en la card (cada miniatura abre el slide en esa foto).
  function miniaturasCasaHtml(x, i) {
    var fotos = (x.fotos || []).filter(Boolean);
    if (fotos.length < 2) return '';
    return '<div class="miniaturas-casa" aria-label="Fotos de ' + E(x.modelo) + '">' + fotos.map(function (f, k) {
      return '<button type="button" class="abrir-casa" data-casa="' + i + '" data-foto="' + k + '" aria-label="Foto ' + (k + 1) + '"><img src="' + E(f) + '" alt="" loading="lazy"></button>';
    }).join('') + '</div>';
  }
  // Calificacion por estrellas: valor de ejemplo "aleatorio" entre 3,5 y 5,0, fijo por modelo (no cambia al recargar).
  function estrellasHtml(nombre) {
    var h = 0; for (var k = 0; k < nombre.length; k++) h = (h * 31 + nombre.charCodeAt(k)) >>> 0;
    var nota = Math.round((3.5 + (h % 1000) / 1000 * 1.5) * 10) / 10;
    return '<p class="estrellas" title="Calificación de ejemplo (aleatoria)" aria-label="Calificación ' + nota.toFixed(1).replace('.', ',') + ' de 5">' +
      '<span class="estrellas-fondo">★★★★★<span class="estrellas-relleno" style="width:' + (nota / 5 * 100) + '%">★★★★★</span></span> <b>' + nota.toFixed(1).replace('.', ',') + '</b></p>';
  }

  // Slide de fotos de una casa: se abre con zoom al tocar la foto de la card; abajo solo el precio (110 % tachado + real).
  var CASAS_SLIDE = [];
  function abrirSlideCasa(i, inicio) {
    var x = CASAS_SLIDE[i]; if (!x) return;
    var fotos = (x.fotos && x.fotos.length ? x.fotos : [x.imagen]).filter(Boolean);
    var capa = document.createElement('div');
    capa.className = 'slide-casa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', 'Fotos de ' + x.modelo);
    capa.innerHTML = '<div class="slide-casa-marco"><button type="button" class="slide-casa-cerrar" aria-label="Cerrar">×</button>' +
      '<div class="slide-casa-fotos">' + fotos.map(function (f, k) { return '<img src="' + E(f) + '" alt="' + E(x.modelo) + ' · foto ' + (k + 1) + '"' + (k ? ' loading="lazy"' : '') + (k === 0 ? ' class="activa"' : '') + '>'; }).join('') + '</div>' +
      (fotos.length > 1 ? '<button type="button" class="slide-casa-flecha anterior" aria-label="Foto anterior">‹</button><button type="button" class="slide-casa-flecha siguiente" aria-label="Foto siguiente">›</button>' +
        '<div class="slide-casa-puntos">' + fotos.map(function (f, k) { return '<span' + (k === 0 ? ' class="activo"' : '') + '></span>'; }).join('') + '</div>' : '') +
      '<div class="slide-casa-precio">' + precioTachadoHtml(x.precio) + '</div></div>';
    document.body.appendChild(capa);
    var actual = 0; var imgs = capa.querySelectorAll('.slide-casa-fotos img'); var puntos = capa.querySelectorAll('.slide-casa-puntos span');
    function ir(n) { actual = (n + imgs.length) % imgs.length; imgs.forEach(function (im, k) { im.classList.toggle('activa', k === actual); }); puntos.forEach(function (p, k) { p.classList.toggle('activo', k === actual); }); }
    function cerrar() { capa.classList.remove('abierto'); setTimeout(function () { capa.remove(); }, 220); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight') ir(actual + 1); if (e.key === 'ArrowLeft') ir(actual - 1); }
    capa.addEventListener('click', function (e) {
      if (e.target === capa || e.target.closest('.slide-casa-cerrar')) cerrar();
      else if (e.target.closest('.siguiente')) ir(actual + 1);
      else if (e.target.closest('.anterior')) ir(actual - 1);
    });
    var inicioX = null;
    capa.addEventListener('touchstart', function (e) { inicioX = e.touches[0].clientX; }, { passive: true });
    capa.addEventListener('touchend', function (e) { if (inicioX === null) return; var dx = e.changedTouches[0].clientX - inicioX; if (Math.abs(dx) > 40) ir(actual + (dx < 0 ? 1 : -1)); inicioX = null; });
    document.addEventListener('keydown', tecla);
    if (inicio) ir(inicio);
    requestAnimationFrame(function () { capa.classList.add('abierto'); });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('.abrir-casa'); if (b) abrirSlideCasa(Number(b.getAttribute('data-casa')), Number(b.getAttribute('data-foto')) || 0); });

  // Estadisticas de casas prefabricadas (window.PREFABRICADAS, tools/generar_prefabricadas.js): por area y precio, con costo por m2.
  function prefabricadasHtml() {
    var P = window.PREFABRICADAS;
    if (!P) return '';
    var m = P.modelos.filter(function (x) { return x.precioM2; }).sort(function (a, b) { return a.area - b.area || a.precio - b.precio; });
    if (!m.length) return '';
    var prom = function (l, k) { return l.reduce(function (s, x) { return s + x[k]; }, 0) / l.length; };
    var mediana = function (l) { var v = l.map(function (x) { return x.precioM2; }).sort(function (a, b) { return a - b; }); var i = Math.floor(v.length / 2); return v.length % 2 ? v[i] : (v[i - 1] + v[i]) / 2; };
    var $$ = Motor.formatoMoneda;
    var rangos = [[0, 30, 'Hasta 30 m²'], [30.01, 60, '31 a 60 m²'], [60.01, 100, '61 a 100 m²'], [100.01, 150, '101 a 150 m²'], [150.01, 1e9, 'Más de 150 m²']];
    var porEmpresa = {};
    m.forEach(function (x) { var k = x.empresa + '|' + x.acabado; (porEmpresa[k] = porEmpresa[k] || []).push(x); });
    var minM2 = m.reduce(function (a, x) { return x.precioM2 < a.precioM2 ? x : a; });
    var maxM2 = m.reduce(function (a, x) { return x.precioM2 > a.precioM2 ? x : a; });
    // Catalogo en cards: solo modelos con PRECIO, AREA, FOTO y EMPRESA (precio total y precio por m2), de menor a mayor precio total.
    var conFoto = m.filter(function (x) { return x.imagen; }).sort(function (a, b) { return a.precio - b.precio || a.area - b.area; });
    CASAS_SLIDE = conFoto;
    // En usuario.html solo las cards (sin titulo ni texto de introduccion)
    var soloCards = document.body.getAttribute('data-pagina') === 'usuario';
    var catalogo = '<section class="catalogo-prefabricadas">' + '' +
      '<div class="rejilla-productos">' + conFoto.map(function (x) {
        // Foto (abre el slide con zoom), plano (si la empresa lo publica, p. ej. Concasaya) y ficha son elementos separados dentro de la card.
        return '<article class="tarjeta-producto tarjeta-casa"><button type="button" class="abrir-casa" data-casa="' + conFoto.indexOf(x) + '" aria-label="Ver fotos de ' + E(x.modelo) + '">' + imagenHtml(x.imagen, x.modelo) + '</button>' +
          (x.plano ? '<a class="plano-casa" href="' + E(x.plano) + '" target="_blank" rel="noopener" title="Ver plano de ' + E(x.modelo) + '"><img src="' + E(x.plano) + '" alt="Plano de ' + E(x.modelo) + '" loading="lazy"><span>Ver plano ↗</span></a>' : '') +
          miniaturasCasaHtml(x, conFoto.indexOf(x)) +
          '<div class="cuerpo-producto"><span class="marca-proveedor">' + E(x.empresa) + '</span>' +
          '<p class="nombre-producto">' + E(x.modelo) + '</p>' +
          estrellasHtml(x.modelo) +
          '<p class="meta-producto">' + E(x.acabado) + '</p>' +
          '<dl class="datos-casa"><dt>Área</dt><dd>' + x.area + ' m²</dd><dt>Precio total</dt><dd>' + precioTachadoHtml(x.precio) + '</dd><dt>Precio m²</dt><dd>' + Motor.formatoMoneda(x.precioM2) + '</dd></dl>' +
          '<a class="enlace-producto" href="' + E(x.url) + '" target="_blank" rel="noopener">Ver en ' + E(x.empresa) + ' ↗</a></div></article>';
      }).join('') + '</div></section>';
    return catalogo + '<section class="estadisticas-prefabricadas" id="casas-prefabricadas"><h3 class="subtitulo-vista">Casas prefabricadas · estadísticas por área y precio</h3>' +
      '<p class="texto-suave">' + m.length + ' modelos con precio y área publicados por ' + P.resumen.empresasConPrecio.length + ' empresas (' + E(P.resumen.empresasConPrecio.join(', ')) + '), de ' + P.resumen.empresas + ' empresas investigadas. ' +
      'Costo por m² = precio del modelo ÷ área. Los precios son los publicados por cada empresa (obra negra, obra gris, obra blanca o acabados full, según se indique).</p>' +
      '<div class="tiles">' +
      '<div class="tile-dato"><span class="tile-etiqueta">Costo promedio por m²</span><strong class="tile-valor">' + $$(prom(m, 'precioM2')) + '</strong><span class="tile-nota">mediana ' + $$(mediana(m)) + '</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">m² más económico</span><strong class="tile-valor">' + $$(minM2.precioM2) + '</strong><span class="tile-nota">' + E(minM2.empresa + ' · ' + minM2.modelo) + '</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">m² más costoso</span><strong class="tile-valor">' + $$(maxM2.precioM2) + '</strong><span class="tile-nota">' + E(maxM2.empresa + ' · ' + maxM2.modelo) + '</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Precio promedio por vivienda</span><strong class="tile-valor">' + $$(prom(m, 'precio')) + '</strong><span class="tile-nota">área promedio ' + Math.round(prom(m, 'area')) + ' m²</span></div></div>' +
      '<h4 class="subtitulo-empresas">Por rango de área</h4><div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Área</th><th class="num">Modelos</th><th class="num">Área promedio</th><th class="num">Precio promedio</th><th class="num">Costo m² promedio</th><th class="num">Costo m² mínimo</th><th class="num">Costo m² máximo</th></tr></thead><tbody>' +
      rangos.map(function (r) {
        var l = m.filter(function (x) { return x.area >= r[0] && x.area <= r[1]; });
        if (!l.length) return '';
        return '<tr><td>' + r[2] + '</td><td class="num">' + l.length + '</td><td class="num">' + Math.round(prom(l, 'area')) + ' m²</td><td class="num">' + $$(prom(l, 'precio')) + '</td><td class="num">' + $$(prom(l, 'precioM2')) + '</td>' +
          '<td class="num">' + $$(Math.min.apply(null, l.map(function (x) { return x.precioM2; }))) + '</td><td class="num">' + $$(Math.max.apply(null, l.map(function (x) { return x.precioM2; }))) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<h4 class="subtitulo-empresas">Por empresa y nivel de acabado</h4><div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Empresa</th><th>Sistema / acabado</th><th class="num">Modelos</th><th class="num">Área (mín–máx)</th><th class="num">Costo m² promedio</th></tr></thead><tbody>' +
      Object.keys(porEmpresa).sort(function (a, b) { return prom(porEmpresa[a], 'precioM2') - prom(porEmpresa[b], 'precioM2'); }).map(function (k) {
        var l = porEmpresa[k]; var p = k.split('|');
        return '<tr><td>' + E(p[0]) + '</td><td>' + E(p[1]) + '</td><td class="num">' + l.length + '</td><td class="num">' + Math.min.apply(null, l.map(function (x) { return x.area; })) + '–' + Math.max.apply(null, l.map(function (x) { return x.area; })) + ' m²</td><td class="num">' + $$(prom(l, 'precioM2')) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<h4 class="subtitulo-empresas">Todos los modelos (de menor a mayor área y precio)</h4><div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Empresa</th><th>Modelo</th><th>Sistema / acabado</th><th class="num">Área</th><th class="num">Precio</th><th class="num">Costo m²</th></tr></thead><tbody>' +
      m.map(function (x) {
        return '<tr><td>' + E(x.empresa) + '</td><td>' + (x.url ? '<a href="' + E(x.url) + '" target="_blank" rel="noopener">' + E(x.modelo) + ' ↗</a>' : E(x.modelo)) + '</td><td>' + E(x.acabado) + '</td>' +
          '<td class="num">' + x.area + ' m²</td><td class="num">' + $$(x.precio) + '</td><td class="num"><strong>' + $$(x.precioM2) + '</strong></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  function listaProyectosHtml() {
    return '' +
      '<div class="rejilla-productos">' + CONTENIDO.proyectos.map(function (p) {
        var primeraEtapa = Object.keys(p.etapas || {}).sort()[0];
        var portada = (p.slide[0] || (primeraEtapa && imagenesEtapa(p, primeraEtapa)[0]) || p.galeria[0] || {}).mini;
        var datos = [p.info.tipo, p.info.ubicacion, p.info.area].filter(Boolean).join(' · ');
        return '<a class="tarjeta-producto tarjeta-proyecto" href="#proyectos/' + E(p.id) + '">' + imagenHtml(portada, p.nombre) +
          '<div class="cuerpo-producto"><p class="nombre-producto">' + E(p.nombre) + '</p>' +
          '<p class="meta-producto">' + E(datos || 'Información del proyecto — próximamente') + '</p>' +
          '<p class="meta-producto">' + Object.keys(p.etapas || {}).length + ' de ' + estructuraEtapas().length + ' etapas con imágenes</p></div></a>';
      }).join('') + '</div>' + prefabricadasHtml();
  }

  function tarjetasEtapasHtml(proyecto) {
    return ['negra', 'gris', 'blanca'].map(function (clave) {
      var info = OBRA.etapasColor[clave];
      var etapas = estructuraEtapas().filter(function (e) { return datosEtapa(e.carpeta).etapa === clave; });
      if (!etapas.length) return '';
      return '<h3 class="titulo-etapa" style="border-left-color:' + info.color + '">' + E(info.nombre) + '</h3><div class="grilla-capitulos">' +
        etapas.map(function (e) {
          var d = datosEtapa(e.carpeta);
          var imgs = imagenesEtapa(proyecto, e.carpeta);
          var mini = imgs.length ? '<img class="mini-etapa" src="' + E(imgs[0].mini) + '" alt="" loading="lazy">' : '';
          return '<a class="tarjeta-capitulo' + (imgs.length ? '' : ' sin-contenido') + '" style="--borde-etapa:' + info.color + '" href="#proyectos/' + E(proyecto.id) + '/' + E(e.carpeta) + '">' + mini +
            '<span class="num">Etapa ' + d.n + '</span><span class="nombre">' + E(d.nombre) + '</span>' +
            '<span class="subtotal">' + (imgs.length ? imgs.length + ' imagen(es)' : 'Sin imágenes aún') + ' · ' + (e.subetapas.length || d.subetapas.length) + ' subetapas</span></a>';
        }).join('') + '</div>';
    }).join('');
  }

  function renderResumenProyecto(cont, proyecto) {
    var ficha = Object.keys(proyecto.info).filter(function (k) { return k !== 'nombre'; }).map(function (k) {
      return '<dt>' + E(ETIQUETAS_FICHA[k] || k) + '</dt><dd>' + E(proyecto.info[k]) + '</dd>';
    }).join('');
    var recorrido = proyecto.slide.length ? proyecto.slide : proyecto.galeria;
    cont.innerHTML = '<a class="volver" href="#proyectos">← Todos los proyectos</a>' +
      '<div class="detalle-proyecto">' +
      (recorrido.length ? slideHtml(recorrido) : '<p class="aviso">Este proyecto todavía no tiene recorrido. Copia imágenes en <code>' + E(proyecto.carpeta) + '/img/slide secuencial</code> y ejecuta <code>node tools/generar_contenido.js</code>.</p>') +
      '<div class="ficha-proyecto"><h3>' + E(proyecto.nombre) + '</h3>' +
      (ficha ? '<dl>' + ficha + '</dl>' : '<p class="texto-suave">Agrega un archivo <code>info.txt</code> (líneas "clave: valor") en la carpeta del proyecto para completar esta ficha.</p>') +
      '<p class="texto-suave">Carpeta: <code>' + E(proyecto.carpeta) + '</code></p>' +
      (proyecto.slide.length && proyecto.galeria.length ? '<p class="eyebrow" style="margin-top:22px">GALERÍA</p>' + galeriaHtml(proyecto.galeria) : '') +
      '</div></div>' +
      '<p class="eyebrow" style="margin-top:40px">ETAPAS DE OBRA</p>' +
      '<p class="texto-suave">Cada etapa muestra las imágenes de <code>' + E(proyecto.carpeta) + '/ETAPAS OBRA/&lt;etapa&gt;</code> y de sus subetapas.</p>' +
      tarjetasEtapasHtml(proyecto);
    if (recorrido.length) iniciarSlide(cont.querySelector('.slide-vertical'), recorrido);
  }

  function renderEtapaProyecto(cont, proyecto, etapa, sub) {
    var d = datosEtapa(etapa.carpeta);
    var color = OBRA.etapasColor[d.etapa] || { nombre: '', color: 'var(--verde)' };
    var imagenes = imagenesEtapa(proyecto, etapa.carpeta, sub);
    var info = proyecto.etapas[etapa.carpeta] || { imagenes: [], subetapas: {} };
    var base = '#proyectos/' + proyecto.id + '/' + etapa.carpeta;
    var carpetaDestino = proyecto.carpeta + '/ETAPAS OBRA/' + etapa.carpeta + (sub ? '/' + sub : '');
    var subetapas = etapa.subetapas.map(function (s) {
      return '<li><a class="' + (sub === s ? 'activo' : '') + '" href="' + E(base + '/' + s) + '"><span>' + E(nombreSubetapa(etapa.carpeta, s)) + '</span><span class="conteo">' + (info.subetapas[s] || []).length + '</span></a></li>';
    }).join('');
    cont.innerHTML = '<a class="volver" href="#proyectos/' + E(proyecto.id) + '">← ' + E(proyecto.nombre) + '</a>' +
      '<h3 class="titulo-etapa" style="border-left-color:' + color.color + '">Etapa ' + d.n + '. ' + E(d.nombre) + (sub ? ' · ' + E(nombreSubetapa(etapa.carpeta, sub)) : '') + ' <span class="carpeta-nombre">' + E(color.nombre) + '</span></h3>' +
      (etapa.carpeta === '04_ESTRUCTURA' ? '<img class="cenefa-etapa" src="img/corporativo/cenefa_estructura.webp" alt="Estructura · flejes y aceros">' : '') +
      '<div class="detalle-proyecto">' +
      (imagenes.length ? slideHtml(imagenes) : '<p class="aviso">Aún no hay imágenes en esta ' + (sub ? 'subetapa' : 'etapa') + '. Cópialas en <code>' + E(carpetaDestino) + '</code> y ejecuta <code>node tools/generar_contenido.js</code>.</p>') +
      '<div class="ficha-proyecto"><p class="eyebrow">SUBETAPAS</p><ul class="lista-subetapas">' +
      '<li><a class="' + (!sub ? 'activo' : '') + '" href="' + E(base) + '"><span>Toda la etapa</span><span class="conteo">' + imagenesEtapa(proyecto, etapa.carpeta).length + '</span></a></li>' + subetapas + '</ul>' +
      '<p class="texto-suave">Carpeta: <code>' + E(carpetaDestino) + '</code></p></div></div>' +
      '<div class="visor-apu" data-rol="visor-apu"></div>';
    if (imagenes.length) iniciarSlide(cont.querySelector('.slide-vertical'), imagenes);
    montarVisorApu(cont, etapa.carpeta, sub);
  }

  function galeriaHtml(lista) {
    return '<div class="galeria">' + lista.map(function (g) {
      return '<a href="' + E(g.src) + '" target="_blank" rel="noopener" title="' + E(g.titulo) + '"><img src="' + E(g.mini) + '" alt="' + E(g.titulo) + '" loading="lazy"></a>';
    }).join('') + '</div>';
  }

  function slideHtml(imagenes) {
    return '<div class="slide-vertical">' +
      '<div><div class="slide-marco"><div class="slide-ventana">' + imagenes.map(function (img, i) {
        return '<img class="slide-img' + (i === 0 ? ' activo' : '') + '" src="' + E(img.src) + '" alt="' + E(img.titulo) + '"' + (i > 1 ? ' loading="lazy"' : '') + '>';
      }).join('') + '</div>' +
      '<img class="slide-marco-img" src="img/corporativo/marco_estructura_vertical.webp" alt="">' +
      '<span class="slide-contador" data-rol="contador"></span></div>' +
      '<p class="slide-pie" data-rol="pie"></p></div>' +
      '<div class="slide-controles">' +
      '<button type="button" data-rol="anterior" aria-label="Imagen anterior">▲</button>' +
      '<div class="slide-miniaturas">' + imagenes.map(function (img, i) {
        return '<button type="button" data-indice="' + i + '" aria-label="Ver ' + E(img.titulo) + '"><img src="' + E(img.mini) + '" alt="" loading="lazy"></button>';
      }).join('') + '</div>' +
      '<button type="button" data-rol="siguiente" aria-label="Imagen siguiente">▼</button>' +
      '<button type="button" data-rol="pausa" aria-label="Pausar">❚❚</button>' +
      '<button type="button" data-rol="ajuste" title="Alternar entre llenar el marco y ver la imagen completa">⤢</button>' +
      '</div></div>';
  }

  function iniciarSlide(raiz, imagenes) {
    var slides = raiz.querySelectorAll('.slide-img');
    var minis = raiz.querySelectorAll('[data-indice]');
    var q = function (rol) { return raiz.querySelector('[data-rol="' + rol + '"]'); };
    slide = { indice: 0, pausado: false, timer: null };
    function ir(i) {
      slide.indice = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('activo', k === slide.indice); });
      minis.forEach(function (m, k) { m.classList.toggle('activo', k === slide.indice); });
      minis[slide.indice].scrollIntoView({ block: 'nearest' });
      q('contador').textContent = (slide.indice + 1) + ' / ' + slides.length;
      q('pie').textContent = imagenes[slide.indice].titulo;
    }
    function programar() {
      clearInterval(slide.timer);
      if (!slide.pausado && slides.length > 1) slide.timer = setInterval(function () { ir(slide.indice + 1); }, 4000);
    }
    q('anterior').addEventListener('click', function () { ir(slide.indice - 1); programar(); });
    q('siguiente').addEventListener('click', function () { ir(slide.indice + 1); programar(); });
    q('pausa').addEventListener('click', function () {
      slide.pausado = !slide.pausado;
      q('pausa').textContent = slide.pausado ? '▶' : '❚❚';
      programar();
    });
    q('ajuste').addEventListener('click', function () { raiz.querySelector('.slide-marco').classList.toggle('ajustar'); });
    minis.forEach(function (m) { m.addEventListener('click', function () { ir(Number(m.getAttribute('data-indice'))); programar(); }); });
    slide.teclado = function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); ir(slide.indice + 1); programar(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); ir(slide.indice - 1); programar(); }
    };
    document.addEventListener('keydown', slide.teclado);
    ir(0);
    programar();
  }

  function detenerSlide() {
    if (!slide) return;
    clearInterval(slide.timer);
    document.removeEventListener('keydown', slide.teclado);
    slide = null;
  }

  // =====================================================================
  // Presupuesto y obra (una sola pagina): etapas de obra agrupadas en OBRA NEGRA / GRIS / BLANCA, con
  // sus capitulos del presupuesto MP, las notas de seguimiento por subetapa y las imagenes de la
  // plantilla. El modelo proyectado (MP) completo sigue disponible en #presupuesto/mp.
  // El Excel "Formato unico de etapas" se arma con assets/motor/formato_etapas.js (igual que en Node).
  // =====================================================================
  var CLAVE_NOTAS = 'cm_admin_notas_etapas';
  function leerNotas() { try { return JSON.parse(localStorage.getItem(CLAVE_NOTAS) || '{}'); } catch (e) { return {}; } }
  function guardarNotas(n) { try { localStorage.setItem(CLAVE_NOTAS, JSON.stringify(n)); } catch (e) {} }
  function claveNota(n, s) { return n + '::' + s; }
  function notasDeEtapa(e, notas) { return e.subetapas.filter(function (s) { return (notas[claveNota(e.n, s)] || '').trim(); }).length; }
  var ARCHIVO_FORMATO = 'pages/Cliente/Plantilla Modelo/ETAPAS OBRA/Formato_Unico_Etapas.xlsx';

  // usuario.html · Formulario de solicitud (Presupuesto y Remodelacion): ubicacion por departamento y municipio del DANE
  // (con "Activar ubicacion": municipio mas cercano a la posicion del telefono), zona, area, habitaciones, banos, cocinas,
  // garaje y, en Remodelacion, fotografias del lugar. Sin servidor no se envia: muestra el resumen.
  function formularioSolicitud(cont, opc) {
    var M = window.MUNICIPIOS;
    var id = 'form-' + opc.id;
    var numero = function (nombre, etiqueta, min, max) {
      var ops = ''; for (var i = min; i <= max; i++) ops += '<option value="' + i + '">' + i + '</option>';
      return '<label>' + etiqueta + '<select name="' + nombre + '" required><option value="">Selecciona</option>' + ops + '</select></label>';
    };
    cont.innerHTML = '<form class="formulario-presupuesto" id="' + id + '">' +
      '<p class="texto-suave">' + opc.intro + '</p>' +
      '<fieldset><legend>Ubicación</legend>' +
      '<button type="button" class="boton-ubicacion" data-rol="ubicacion"><span class="icono-ubicacion" aria-hidden="true"></span>Activar ubicación</button>' +
      '<p class="estado-ubicacion texto-suave" data-rol="estado-ubicacion" hidden></p>' +
      '<label>Departamento<select name="departamento" required><option value="">Selecciona el departamento</option>' +
      (M ? M.departamentos.map(function (d, i) { return '<option value="' + i + '">' + E(d.nombre) + '</option>'; }).join('') : '') + '</select></label>' +
      '<label>Ciudad o municipio<select name="municipio" required disabled><option value="">Primero elige el departamento</option></select></label>' +
      '<div class="opciones-radio"><span>Zona</span><label><input type="radio" name="zona" value="Urbano" required> Urbano</label><label><input type="radio" name="zona" value="Rural"> Rural</label></div>' +
      '</fieldset>' +
      '<fieldset><legend>' + E(opc.tituloVivienda) + '</legend>' +
      '<label>' + E(opc.etiquetaArea) + ' (m²)<input type="number" name="area" min="1" max="2000" step="1" inputmode="numeric" placeholder="Ej. 72" required></label>' +
      numero('habitaciones', 'Número de habitaciones', 0, 8) + numero('banos', 'Número de baños', 0, 6) + numero('cocinas', 'Cocinas', 0, 3) +
      '<div class="opciones-radio"><span>Garaje</span><label><input type="radio" name="garaje" value="Sí" required> Sí</label><label><input type="radio" name="garaje" value="No"> No</label></div>' +
      '</fieldset>' +
      (opc.fotos ? '<fieldset><legend>Fotografías del lugar</legend>' +
        '<label class="boton-fotos"><span class="icono-camara" aria-hidden="true"></span>Agregar fotografías<input type="file" name="fotos" accept="image/*" multiple hidden></label>' +
        '<div class="miniaturas-fotos" data-rol="miniaturas"></div></fieldset>' : '') +
      '<button type="submit" class="boton-principal oscuro">' + E(opc.boton) + '</button>' +
      '<div class="resumen-presupuesto" hidden></div></form>';
    var f = $(id);
    var fotos = [];
    function llenarMunicipios(iDep, nombre) {
      var d = M && M.departamentos[iDep];
      f.municipio.disabled = !d;
      f.municipio.innerHTML = d ? '<option value="">Selecciona la ciudad o municipio</option>' + d.municipios.map(function (m) { return '<option' + (m === nombre ? ' selected' : '') + '>' + E(m) + '</option>'; }).join('') : '<option value="">Primero elige el departamento</option>';
    }
    f.departamento.addEventListener('change', function () { llenarMunicipios(f.departamento.value); });
    // Activar ubicacion: posicion del telefono -> municipio mas cercano (coordenadas DIVIPOLA)
    f.querySelector('[data-rol="ubicacion"]').addEventListener('click', function () {
      var estado = f.querySelector('[data-rol="estado-ubicacion"]');
      estado.hidden = false;
      if (!navigator.geolocation) { estado.textContent = 'Este navegador no permite obtener la ubicación. Elige el departamento y el municipio.'; return; }
      estado.textContent = 'Buscando tu ubicación…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var la = pos.coords.latitude, lo = pos.coords.longitude, mejor = null;
        M.departamentos.forEach(function (d, i) {
          d.coords.forEach(function (c, j) { var dd = Math.pow(c[0] - la, 2) + Math.pow((c[1] - lo) * Math.cos(la * Math.PI / 180), 2); if (!mejor || dd < mejor.dd) mejor = { dd: dd, i: i, j: j }; });
        });
        var dep = M.departamentos[mejor.i];
        f.departamento.value = String(mejor.i); llenarMunicipios(mejor.i, dep.municipios[mejor.j]);
        f.dataset.coordenadas = la.toFixed(5) + ', ' + lo.toFixed(5);
        estado.textContent = 'Ubicación activada: ' + dep.municipios[mejor.j] + ', ' + dep.nombre + ' (' + f.dataset.coordenadas + ', precisión ±' + Math.round(pos.coords.accuracy) + ' m).';
      }, function (err) {
        estado.textContent = err.code === 1 ? 'Permiso de ubicación negado. Actívalo en el navegador o elige el departamento y el municipio.' : 'No se pudo obtener la ubicación. Elige el departamento y el municipio.';
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
    if (opc.fotos) {
      f.fotos.addEventListener('change', function () {
        [].slice.call(f.fotos.files).forEach(function (a) { fotos.push(a); });
        f.fotos.value = '';
        f.querySelector('[data-rol="miniaturas"]').innerHTML = fotos.map(function (a, k) {
          return '<figure><img src="' + URL.createObjectURL(a) + '" alt="Foto ' + (k + 1) + '"><button type="button" data-quitar="' + k + '" aria-label="Quitar foto">×</button></figure>';
        }).join('');
      });
      f.querySelector('[data-rol="miniaturas"]').addEventListener('click', function (e) {
        var b = e.target.closest('[data-quitar]'); if (!b) return;
        fotos.splice(Number(b.getAttribute('data-quitar')), 1);
        f.fotos.dispatchEvent(new Event('change'));
      });
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = M.departamentos[f.departamento.value];
      var filas = [['Ubicación', f.municipio.value + ', ' + d.nombre + ' · ' + f.zona.value + (f.dataset.coordenadas ? ' (' + f.dataset.coordenadas + ')' : '')], [opc.etiquetaArea, f.area.value + ' m²'],
        ['Habitaciones', f.habitaciones.value], ['Baños', f.banos.value], ['Cocinas', f.cocinas.value], ['Garaje', f.garaje.value]];
      if (opc.fotos) filas.push(['Fotografías', fotos.length + ' adjunta(s)']);
      var r = f.querySelector('.resumen-presupuesto');
      r.innerHTML = '<h3>Resumen de tu solicitud</h3><dl>' + filas.map(function (x) { return '<dt>' + E(x[0]) + '</dt><dd>' + E(x[1]) + '</dd>'; }).join('') + '</dl>' +
        '<p class="aviso">El envío de la solicitud se habilitará cuando ConstruMaster funcione con servidor. Esta versión es local: los datos y las fotos no salen del teléfono.</p>';
      r.hidden = false; r.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  function renderPresupuestoUsuario(cont) {
    formularioSolicitud(cont, { id: 'presupuesto', intro: 'Diligencia los datos de lo que deseas construir para preparar tu presupuesto.', tituloVivienda: 'La vivienda', etiquetaArea: 'Área a construir', boton: 'Solicitar presupuesto', fotos: false });
  }

  function renderPresupuesto(sub) {
    var cont = $('presupuesto-contenido');
    if (document.body.getAttribute('data-pagina') === 'usuario') { if (!$('form-presupuesto')) renderPresupuestoUsuario(cont); return; }
    var enMp = sub === 'mp' || /^cap-\d+$/.test(sub);
    var html = pestanasPresupuesto(enMp ? 'mp' : 'etapas');
    var m = /^cap-(\d+)$/.exec(sub);
    var cap = m && MP.capitulos.filter(function (c) { return c.n === Number(m[1]); })[0];
    if (cap) {
      cont.innerHTML = html + '<a class="volver" href="#presupuesto/mp">← Resumen del modelo</a>' + Motor.renderTablaCapitulo(cap, MP.etapas[cap.etapa].color);
      return;
    }
    if (sub === 'mp') {
      cont.innerHTML = html + ($('presupuesto-v1') ? '<p class="texto-suave">Caralis · archivo <code>' + E(MP.archivoFuente) + '</code>.</p>' : '<p class="texto-suave">' + E(MP.titulo.replace(/^Modelo Est[aá]ndar/, 'Modelo proyectado')) + ' · archivo <code>' + E(MP.archivoFuente) + '</code>.</p>') + Motor.renderResumen(MP, 'mp-');
      return;
    }
    var enfocada = /^etapa-(\d+)$/.exec(sub);
    cont.innerHTML = html + etapasHtml(enfocada ? Number(enfocada[1]) : null);
  }

  // Pestanas internas de Presupuesto (index.html): el presupuesto con el modelo V1, el seguimiento por etapas y el modelo de referencia
  function pestanasPresupuesto(activa) {
    if (!$('presupuesto-v1')) return '<div class="selector-interno"><a href="#presupuesto"' + (activa !== 'mp' ? ' class="activo"' : '') + '>Etapas de obra y seguimiento</a><a href="#presupuesto/mp"' + (activa === 'mp' ? ' class="activo"' : '') + '>Modelo proyectado (MP)</a></div>';
    return '<div class="selector-interno">' + [['v1', '#presupuesto', 'Presupuesto (modelo V1)'], ['prog', '#presupuesto/programacion', 'Programación (PERT)'], ['etapas', '#presupuesto/etapas', 'Seguimiento por etapas'], ['mp', '#presupuesto/mp', 'Caralis (modelo xlsx)']]
      .map(function (p) { return '<a href="' + p[1] + '"' + (p[0] === activa ? ' class="activo"' : '') + '>' + p[2] + '</a>'; }).join('') + '</div>';
  }
  // Etapa de obra (seguimiento) -> capitulos del modelo V1 que la presupuestan
  var ETAPA_A_CAP_V1 = { 1: [1], 2: [1], 3: [2], 4: [2], 5: [5], 6: [3, 4], 7: [], 8: [6, 7, 8, 9, 10, 11, 12, 13], 9: [], 10: [14] };
  function capsV1DeEtapa(n) { return (ETAPA_A_CAP_V1[n] || []).map(function (k) { return capitulosV1().filter(function (c) { return c.n === k; })[0]; }).filter(Boolean); }
  function etapasDeCapV1(n) { return OBRA.etapas.filter(function (e) { return (ETAPA_A_CAP_V1[e.n] || []).indexOf(n) !== -1; }); }

  function etapasHtml(soloEtapa) {
    var notas = leerNotas();
    var totalNotas = Object.keys(notas).filter(function (k) { return notas[k] && notas[k].trim(); }).length;
    var resumen = FormatoEtapas.resumen(OBRA, MP);
    var cabecera = soloEtapa ? '<a class="volver" href="' + ($('presupuesto-v1') ? '#presupuesto/etapas' : '#presupuesto') + '">← Todas las etapas</a>' : '';
    return cabecera +
      '<div class="barra-formato"><p class="aviso">' + totalNotas + ' subetapa(s) con notas. Las notas se guardan en este navegador y salen en el Excel del formato único.</p>' +
      '<div class="acciones-formato"><button type="button" class="boton" data-rol="descargar-formato">Descargar formato único de etapas (con notas)</button>' +
      '<a class="boton claro" href="' + E(encodeURI(ARCHIVO_FORMATO)) + '" download>Formato vacío (plantilla)</a></div>' +
      '<p class="texto-suave" data-rol="estado-guardado"></p></div>' +
      ['negra', 'gris', 'blanca'].map(function (clave, i) {
        var info = OBRA.etapasColor[clave];
        var etapas = OBRA.etapas.filter(function (e) { return e.etapa === clave && (!soloEtapa || e.n === soloEtapa); }).sort(function (a, b) { return a.n - b.n; });
        if (!etapas.length) return '';
        var r = resumen[i].valores;
        return '<div class="arbol-grupo"><p class="arbol-grupo-titulo tipo-obra tipo-' + clave + '"><span class="punto" style="background:' + info.color + '"></span>' + E(info.nombre.toUpperCase()) +
          '<span class="carpeta-nombre">' + r[2] + ' subetapas' + ($('presupuesto-v1') ? ' · presupuesto V1: ' + Motor.formatoMoneda(capitulosV1().filter(function (c) { return c.etapa === clave; }).reduce(function (t, c) { return t + valorCapituloV1(c, pv1Leer()); }, 0)) : ' · ' + r[3] + ' capítulos MP · ' + Motor.formatoMoneda(r[4])) + '</span></p>' +
          etapas.map(function (e) { return etapaHtml(e, info, notas, !!soloEtapa); }).join('') + '</div>';
      }).join('');
  }

  function etapaHtml(e, info, notas, abierta) {
    var infoImgs = CONTENIDO.etapas[e.carpeta];
    var imgs = infoImgs ? Object.keys(infoImgs.subetapas).sort().reduce(function (l, s) { return l.concat(infoImgs.subetapas[s]); }, infoImgs.imagenes.slice()) : [];
    var caps = FormatoEtapas.capitulosDe(OBRA, MP, e);
    return '<details class="arbol-etapa" style="--borde-etapa:' + info.color + '"' + (abierta ? ' open' : '') + '>' +
      '<summary>' + e.n + '. ' + E(e.nombre) + ' <span class="carpeta-nombre">' + E(e.carpeta) + ' · ' + notasDeEtapa(e, notas) + '/' + e.subetapas.length + ' con notas' + (imgs.length ? ' · ' + imgs.length + ' imágenes' : '') + '</span></summary>' +
      '<div class="arbol-cuerpo">' + (e.carpeta === '04_ESTRUCTURA' ? '<img class="cenefa-etapa" src="img/corporativo/cenefa_estructura.webp" alt="Estructura · flejes y aceros">' : '') +
      ($('presupuesto-v1') ? (function () {
        var cv = capsV1DeEtapa(e.n); var est = pv1Leer();
        return cv.length ? '<p class="capitulos-etapa">Presupuesto (modelo V1): ' + cv.map(function (c) { var v = valorCapituloV1(c, est); return '<a class="chip" href="#presupuesto/v1-' + c.n + '">' + c.n + '. ' + E(c.nombre) + (v ? ' · ' + Motor.formatoMoneda(v) : '') + '</a>'; }).join(' ') + '</p>'
          : '<p class="capitulos-etapa texto-suave">El modelo V1 no tiene un capítulo para esta etapa: se puede agregar como actividad en el capítulo más cercano del <a href="#presupuesto">presupuesto</a>.</p>';
      })() : (caps.length ? '<p class="capitulos-etapa">Presupuesto: ' + caps.map(function (c) {
        return '<a class="chip" href="#presupuesto/cap-' + c.n + '">' + c.n + '. ' + E(c.nombre) + (c.subtotal ? ' · ' + Motor.formatoMoneda(c.subtotal) : '') + '</a>';
      }).join(' ') + '</p>' : '<p class="capitulos-etapa texto-suave">Sin capítulo propio en el presupuesto MP.</p>')) +
      e.subetapas.map(function (s, i) {
        var clave = claveNota(e.n, s);
        return '<div class="campo-nota"><label for="nota-' + e.n + '-' + i + '">' + dos(e.n) + '.' + dos(i + 1) + ' · ' + E(s) + '</label>' +
          '<textarea id="nota-' + e.n + '-' + i + '" data-clave="' + E(clave) + '" placeholder="Notas / observaciones de seguimiento…">' + E(notas[clave] || '') + '</textarea></div>';
      }).join('') +
      (imgs.length ? galeriaHtml(imgs) : '') + '</div></details>';
  }
  function dos(n) { return (n < 10 ? '0' : '') + n; }

  $('presupuesto-contenido').addEventListener('click', function (e) {
    var b = e.target.closest('[data-vista^="mp-"]');
    if (b) { location.hash = '#presupuesto/' + b.getAttribute('data-vista').replace(/^mp-/, ''); return; }
    if (e.target.closest('[data-rol="descargar-formato"]')) descargarFormato(e.target.closest('[data-rol="descargar-formato"]'));
  });

  $('presupuesto-contenido').addEventListener('input', function (e) {
    var ta = e.target.closest('textarea[data-clave]');
    if (!ta) return;
    var notas = leerNotas();
    notas[ta.getAttribute('data-clave')] = ta.value;
    guardarNotas(notas);
    pintarSidebar();
    var estado = $('presupuesto-contenido').querySelector('[data-rol="estado-guardado"]');
    if (estado) estado.textContent = 'Notas guardadas ' + new Date().toLocaleTimeString('es-CO');
  });

  function descargarFormato(boton) {
    var texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Preparando Excel…';
    Promise.all([
      cargarScript('assets/motor/exceljs.min.js', function () { return window.ExcelJS; }),
      cargarApu().catch(function () { return null; }),
    ]).then(function () {
      var libro = FormatoEtapas.libro(window.ExcelJS, OBRA, MP, { plantilla: CONTENIDO.plantilla, apu: window.APU, notas: leerNotas(), claveNota: claveNota });
      return libro.xlsx.writeBuffer();
    }).then(function (buffer) {
      var url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Formato_Unico_Etapas.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }).catch(function (error) {
      alert('No se pudo generar el Excel: ' + error.message);
    }).then(function () { boton.disabled = false; boton.textContent = texto; });
  }

  function cargarScript(src, yaCargado) {
    if (yaCargado()) return Promise.resolve();
    return new Promise(function (resolver, rechazar) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolver; s.onerror = rechazar;
      document.head.appendChild(s);
    });
  }

  // =====================================================================
  // Proveedores: catalogo de marcas de la construccion.
  // #proveedores = portada (ranking A/B/C + esqueleto del repositorio, destino del scraping)
  // #proveedores/<slug> = catalogo de esa marca (mismo loop infinito y filtros que Materiales).
  // Datos: INVENTARIO.ranking (tools/generar_inventario.js + tools/marcas_construccion.js).
  // Repositorio: pages/PROVEEDORES/Grupo X/NN - Marca/ (logo.*, pagina web.txt, Inventario_*.xlsx, data.json, img/).
  // =====================================================================
  var BUSQUEDA_MARCA = '';
  var TOPE_LISTA_MARCAS = Infinity; // todas las marcas del catalogo

  function rankingMarcas() { return (INV && INV.D.ranking) || []; }
  // Las 10 marcas con mas presencia: presentes en mas catalogos (tiendas); empate por numero de productos.
  function marcasPorPresencia() {
    return rankingMarcas().slice().sort(function (a, b) { return b.tiendas.length - a.tiendas.length || b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'); }).slice(0, 10);
  }
  function presenciaHtml() {
    var top = marcasPorPresencia();
    var r = rankingMarcas();
    var lider = r[0];
    var conPrecio = INV.productos.filter(function (p) { return p.precio; });
    var promedio = conPrecio.reduce(function (s, p) { return s + p.precio; }, 0) / conPrecio.length;
    var promedioTop = top.reduce(function (s, m) { return s + (m.precioPromedio || 0) * m.conPrecio; }, 0) / top.reduce(function (s, m) { return s + m.conPrecio; }, 0);
    return '<section class="presencia-marcas"><h3 class="subtitulo-vista">Las 10 marcas con más presencia en los catálogos</h3>' +
      '<p class="texto-suave">Marcas que aparecen en más catálogos (tiendas e inventarios); a igual número de catálogos, la de más productos. Precio promedio = suma de precios ÷ productos con precio.</p>' +
      '<div class="tiles">' +
      '<div class="tile-dato"><span class="tile-etiqueta">Marca con más productos</span><strong class="tile-valor">' + E(lider.nombre) + '</strong><span class="tile-nota">' + lider.n.toLocaleString('es-CO') + ' productos · promedio ' + Motor.formatoMoneda(lider.precioPromedio) + '</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Marca con más presencia</span><strong class="tile-valor">' + E(top[0].nombre) + '</strong><span class="tile-nota">' + top[0].tiendas.length + ' catálogos · ' + top[0].n.toLocaleString('es-CO') + ' productos</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Valor promedio del producto</span><strong class="tile-valor">' + Motor.formatoMoneda(promedio) + '</strong><span class="tile-nota">todo el catálogo · ' + conPrecio.length.toLocaleString('es-CO') + ' con precio</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Valor promedio en el top 10</span><strong class="tile-valor">' + Motor.formatoMoneda(promedioTop) + '</strong><span class="tile-nota">productos de estas 10 marcas</span></div></div>' +
      '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>#</th><th>Marca</th><th class="num">Catálogos</th><th>Dónde está</th><th class="num">Productos</th><th class="num">Precio promedio</th></tr></thead><tbody>' +
      top.map(function (m, i) {
        return '<tr><td>' + (i + 1) + '</td><td><a class="marca-en-tabla" href="#proveedores/' + E(m.slug) + '">' + monograma(m) + '<strong>' + E(m.nombre) + '</strong></a></td>' +
          '<td class="num">' + m.tiendas.length + '</td><td>' + E(m.tiendas.join(', ')) + '</td><td class="num">' + m.n.toLocaleString('es-CO') + '</td>' +
          '<td class="num">' + (m.precioPromedio ? Motor.formatoMoneda(m.precioPromedio) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }
  function marcaPorSlug(s) { return rankingMarcas().filter(function (m) { return m.slug === s; })[0]; }

  // Listado de empresas: tiendas (empresas de ferreteria) y fabricantes o duenos de marca (proveedores de productos).
  // Datos: INVENTARIO.empresas (una fila por proveedor, mismo indice que INVENTARIO.proveedores). Ruta de cada una: #proveedores/empresa-<indice>.
  function empresas() { return (INV && INV.D.empresas) || []; }
  // Catalogo -> Ferreterias: cada ferreteria con sus marcas (de mas a menos productos), enlazadas al catalogo de la marca
  function marcasPorFerreteriaHtml() {
    var lista = empresas().map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.tipo === 0; }).sort(function (a, b) { return b.e.n - a.e.n; });
    var cuenta = {};
    INV.productos.forEach(function (p) { if (p.marca < 0) return; var c = cuenta[p.prov] = cuenta[p.prov] || {}; c[p.marca] = (c[p.marca] || 0) + 1; });
    var slugDe = {}; rankingMarcas().forEach(function (m) { slugDe[m.nombre] = m.slug; });
    return '<section class="listado-empresas">' +
      lista.map(function (x) {
        var c = cuenta[x.i] || {};
        var marcas = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
        return '<details class="ferreteria-marcas"><summary><strong>' + E(x.e.nombre) + '</strong><span class="texto-suave">' + E([x.e.ciudad, x.e.grupo].filter(Boolean).join(' · ')) + '</span>' +
          '<span class="conteos-ferreteria">' + x.e.n.toLocaleString('es-CO') + ' productos · ' + marcas.length.toLocaleString('es-CO') + ' marcas</span></summary>' +
          '<p><a class="enlace-abrir" href="#proveedores/empresa-' + x.i + '">Ver todos los productos de ' + E(x.e.nombre) + ' →</a></p>' +
          '<div class="chips-marcas">' + marcas.map(function (k) {
            var nombre = INV.D.marcas[k]; var sl = slugDe[nombre];
            return (sl ? '<a href="#proveedores/' + sl + '">' : '<span>') + E(nombre) + ' <b>' + c[k].toLocaleString('es-CO') + '</b>' + (sl ? '</a>' : '</span>');
          }).join('') + '</div></details>';
      }).join('') + '</section>';
  }
  // ---- Herramientas de alquiler: 10 empresas (Tunja, Bogota, Medellin, nacional), equipos con precio por dia/hora
  //      o por cotizacion, y valores estimados de internet para los equipos pedidos por el usuario.
  //      Rutas: #proveedores/alquiler (estructura por categoria) · /alquiler/c-N (categoria) · /alquiler/e-N (empresa)
  function alquilerDatos() { return window.ALQUILER || { empresas: [], equipos: [], estimados: [] }; }
  function categoriasAlquiler() {
    var A = alquilerDatos(); var c = {};
    A.equipos.forEach(function (x) { (c[x.categoria] = c[x.categoria] || []).push(x); });
    return Object.keys(c).sort(function (a, b) { return a === 'Otros equipos' ? 1 : b === 'Otros equipos' ? -1 : c[b].length - c[a].length; }).map(function (k) { return { nombre: k, equipos: c[k] }; });
  }
  function filtroAlquiler(sub) {
    var m = /^alquiler\/(c|e)-(\d+)$/.exec(sub || ''); if (!m) return null;
    return m[1] === 'c' ? { tipo: 'c', i: Number(m[2]), cat: categoriasAlquiler()[Number(m[2])] } : { tipo: 'e', i: Number(m[2]), emp: alquilerDatos().empresas[Number(m[2])] };
  }
  function equiposFiltradosAlquiler(sub) {
    var f = filtroAlquiler(sub); var A = alquilerDatos();
    if (!f) return A.equipos;
    return f.tipo === 'c' ? (f.cat ? f.cat.equipos : []) : A.equipos.filter(function (x) { return f.emp && x.empresa === f.emp.nombre; });
  }
  function precioAlquiler(x) { return x.precio ? Motor.formatoMoneda(x.precio) + ' / ' + E(x.unidad || 'día') : 'Cotización'; }
  function alquilerHtml(sub) {
    var A = alquilerDatos(); if (!A.equipos.length && !A.empresas.length) return '<p class="vacio">Falta assets/datos/alquiler.js. Ejecuta: node tools/scraper/alquiler/alquiler.js</p>';
    var f = filtroAlquiler(sub);
    if (f) {
      var lista = equiposFiltradosAlquiler(sub).slice().sort(function (a, b) { return (a.precio ? 0 : 1) - (b.precio ? 0 : 1) || (a.precio || 0) - (b.precio || 0); });
      var emp = f.tipo === 'e' ? f.emp : null;
      return '<a class="volver" href="#proveedores/alquiler">← Herramientas de alquiler</a>' +
        (emp ? '<p class="texto-suave"><strong>' + E(emp.nombre) + '</strong> · ' + E(emp.ciudad) + ' · ' + E(emp.nota) + (emp.contacto ? ' · ' + E(emp.contacto) : '') + ' · <a href="' + E(emp.web) + '" target="_blank" rel="noopener">sitio web ↗</a></p>' : '<p class="texto-suave"><strong>' + E(f.cat ? f.cat.nombre : '') + '</strong> · ' + lista.length + ' equipos</p>') +
        (lista.length ? '<div class="rejilla-alquiler">' + lista.map(function (x) {
          return '<article class="card-alquiler"><span class="card-alquiler-cat">' + E(x.categoria) + '</span><strong>' + E(x.nombre) + '</strong>' +
            '<span class="card-alquiler-precio' + (x.precio ? '' : ' cotiza') + '">' + precioAlquiler(x) + '</span>' +
            '<small>' + E(x.empresa) + ' · ' + E(x.ciudad) + (x.detalle ? ' · ' + E(x.detalle) : '') + '</small>' +
            (x.url ? '<a href="' + E(x.url) + '" target="_blank" rel="noopener">Ver en la tienda ↗</a>' : '') + '</article>';
        }).join('') + '</div>' : '<p class="vacio">Esta empresa no publica un listado de equipos en su página: consultar por teléfono o en su sitio.</p>');
    }
    // Vista general: equipos pedidos (valores estimados), estructura por categoria y empresas
    var cats = categoriasAlquiler();
    var rango = function (l) { var p = l.map(function (x) { return x.precio; }).filter(Boolean).sort(function (a, b) { return a - b; }); return p.length ? Motor.formatoMoneda(p[0]) + ' – ' + Motor.formatoMoneda(p[p.length - 1]) : 'por cotización'; };
    return '<section class="alquiler-estimados"><h3 class="subtitulo-vista">Equipos más usados en obra · valores estimados</h3><div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Equipo</th><th class="num">Valor</th><th>Unidad</th><th>Fuente</th></tr></thead><tbody>' +
      (A.estimados || []).map(function (x) { return '<tr><td>' + E(x.equipo) + '</td><td class="num">' + (x.valor ? Motor.formatoMoneda(x.valor) : '—') + '</td><td>' + E(x.unidad) + '</td><td><a href="' + E(x.url) + '" target="_blank" rel="noopener">' + E(x.fuente) + ' ↗</a></td></tr>'; }).join('') + '</tbody></table></div></section>' +
      '<div class="estructura-catalogo"><div class="estructura-raiz"><strong>Herramientas de alquiler</strong><span>' + A.equipos.length + ' equipos · ' + A.empresas.length + ' empresas</span></div><div class="estructura-ramas">' +
      cats.map(function (c, i) {
        var top = c.equipos.slice().sort(function (a, b) { return (b.precio ? 1 : 0) - (a.precio ? 1 : 0); }).slice(0, 6);
        return '<div class="nodo-familia" style="--color:#586c4f"><a class="nodo-cabeza" href="#proveedores/alquiler/c-' + i + '"><strong>' + E(c.nombre) + '</strong><span>' + c.equipos.length + ' equipos · ' + rango(c.equipos) + '</span></a>' +
          '<ul class="nodo-ramas">' + top.map(function (x) { return '<li><a href="#proveedores/alquiler/c-' + i + '">' + E(x.nombre.slice(0, 40)) + ' <b>' + (x.precio ? Motor.formatoMoneda(x.precio) : 'cotiza') + '</b></a></li>'; }).join('') + '</ul></div>';
      }).join('') + '</div></div>' +
      '<h3 class="subtitulo-vista">Empresas</h3><div class="rejilla-empresas-alquiler">' + A.empresas.map(function (e, i) {
        return '<a class="empresa-alquiler" href="#proveedores/alquiler/e-' + i + '"><strong>' + E(e.nombre) + '</strong><span>' + E(e.ciudad) + ' · ' + (e.precios ? e.conPrecio + ' equipos con precio' : e.equipos ? e.equipos + ' equipos por cotización' : 'por cotización') + '</span><small>' + E(e.nota) + '</small></a>';
      }).join('') + '</div>';
  }

  // Listado de empresas; tipo: 0 = empresas de ferreteria, 1 = proveedores de productos (sin tipo: ambos)
  function empresasHtml(tipo) {
    var lista = empresas().map(function (e, i) { e.idx = i; return e; });
    if (!lista.length) return '';
    var tipos = tipo === undefined ? [0, 1] : [tipo];
    return '<section class="listado-empresas" id="listado-empresas"><h3 class="subtitulo-vista">' + (tipo === 1 ? 'Proveedores de productos' : tipo === 0 ? 'Empresas de ferretería' : 'Listado de empresas') + '</h3>' +
      '<p class="texto-suave">' + (tipo === 1 ? 'Fabricantes o dueños de la marca, con su catálogo oficial.' : 'Empresas de ferretería (tiendas que venden muchas marcas) y proveedores de productos (fabricantes o dueños de la marca, con su catálogo oficial).') + ' Elige una empresa para ver todos sus productos.</p>' +
      tipos.map(function (t) {
        var filas = lista.filter(function (e) { return e.tipo === t; }).sort(function (a, b) { return b.n - a.n; });
        return '<h4 class="subtitulo-empresas">' + E(nombreTipo(t)) + ' (' + filas.length + ')</h4>' +
          '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Empresa</th><th>Grupo</th><th>Ciudad</th><th class="num">Productos</th><th class="num">Con precio</th><th class="num">Marcas</th><th>Sitio web</th></tr></thead><tbody>' +
          filas.map(function (e) {
            return '<tr><td><a href="#proveedores/empresa-' + e.idx + '"><strong>' + E(e.nombre) + '</strong></a></td><td>' + E(e.grupo || '—') + '</td><td>' + E(e.ciudad || '—') + '</td>' +
              '<td class="num">' + e.n.toLocaleString('es-CO') + '</td><td class="num">' + e.conPrecio.toLocaleString('es-CO') + '</td><td class="num">' + e.marcas.toLocaleString('es-CO') + '</td>' +
              '<td>' + (e.web ? '<a href="' + E(e.web) + '" target="_blank" rel="noopener">' + E(e.web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + ' ↗</a>' : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }).join('') + '</section>';
  }
  function cabeceraEmpresaHtml(e) {
    return '<a class="volver" href="#proveedores">← Proveedores</a>' +
      '<p class="texto-suave"><strong>' + E(e.nombre) + '</strong> · ' + E(nombreTipo(e.tipo)) + (e.grupo ? ' · ' + E(e.grupo) : '') + (e.ciudad ? ' · ' + E(e.ciudad) : '') + ' · ' +
      e.n.toLocaleString('es-CO') + ' productos, ' + e.conPrecio.toLocaleString('es-CO') + ' con precio, ' + e.marcas.toLocaleString('es-CO') + ' marcas' +
      (e.web ? ' · <a href="' + E(e.web) + '" target="_blank" rel="noopener">sitio web ↗</a>' : '') + '</p>';
  }

  function monograma(m, clase) {
    if (m.logo) return '<span class="monograma ' + (clase || '') + ' con-logo' + (m.estado && m.estado.logoFondo === 'oscuro' ? ' fondo-oscuro' : '') + '"><img src="' + E(encodeURI(m.logo)) + '" alt="' + E(m.nombre) + '"></span>';
    var iniciales = m.nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase();
    return '<span class="monograma ' + (clase || '') + '" aria-hidden="true">' + E(iniciales || '?') + '</span>';
  }
  function marcaEstado(ok, texto) { return '<span class="estado-carpeta ' + (ok ? 'ok' : 'pendiente') + '" title="' + E(texto) + '">' + (ok ? '✓' : '—') + '</span>'; }

  function montarProveedores(sub) {
    var cont = $('proveedores-contenido');
    conCargaInventario(cont, function () {
      // Catalogo -> Proveedores: listado de todas las empresas (ferreterias y proveedores de productos)
      if (sub === 'empresas') { cont.innerHTML = '<a class="volver" href="#proveedores">← Marcas</a>' + empresasHtml(1); pintarSidebar(); return; }
      if (sub === 'ferreterias') { cont.innerHTML = '<a class="volver" href="#proveedores">← Marcas</a>' + marcasPorFerreteriaHtml(); pintarSidebar(); return; }
      // Catalogo -> Herramientas de alquiler (assets/datos/alquiler.js; node tools/scraper/alquiler/alquiler.js)
      if (/^alquiler/.test(sub || '')) { cont.innerHTML = alquilerHtml(sub); pintarSidebar(); return; }
      // Catalogo -> Casas prefabricadas: estadisticas por area y precio + catalogo de casas (lo documentado de las 6 empresas)
      if (sub === 'casas-prefabricadas') { cont.innerHTML = prefabricadasHtml(); pintarSidebar(); return; }
      var mEmp = /^empresa-(\d+)$/.exec(sub || '');
      var empresa = mEmp && empresas()[Number(mEmp[1])];
      if (empresa) {
        var idxEmp = Number(mEmp[1]);
        cont.innerHTML = cabeceraEmpresaHtml(empresa) + '<div id="proveedor-catalogo"></div>';
        // El catalogo de la empresa queda en CATALOGOS.proveedores para que el sidebar muestre sus familias y categorias
        CATALOGOS.proveedores = { id: 'proveedores', contenedor: 'proveedor-catalogo', estado: estadoNuevo(), porFamilia: true, base: function (p) { return p.prov === idxEmp; } };
        montarCatalogo(CATALOGOS.proveedores);
        return;
      }
      var marca = sub && marcaPorSlug(sub);
      cont.innerHTML = marca ? cabeceraMarcaHtml(marca) + '<div id="proveedor-catalogo"></div>' : portadaProveedoresHtml();
      if (marca) {
        var idx = INV.D.marcas.indexOf(marca.nombre);
        CATALOGOS.proveedores = { id: 'proveedores', contenedor: 'proveedor-catalogo', estado: estadoNuevo(), porFamilia: true, base: function (p) { return p.marca === idx; } };
        montarCatalogo(CATALOGOS.proveedores);
      } else {
        pintarSidebar();
      }
    });
  }

  function cabeceraMarcaHtml(m) {
    var fams = Object.keys(m.familias).sort(function (a, b) { return m.familias[b] - m.familias[a]; });
    return '<a class="volver" href="#proveedores">← Todas las marcas</a>' +
      '<div class="cabecera-marca">' + monograma(m, 'grande') +
      '<div>' +
      '<h3>' + E(m.nombre) + '</h3>' +
      '<p class="texto-suave">' + m.n.toLocaleString('es-CO') + ' productos en ' + m.tiendas.length + ' tienda(s): ' + E(m.tiendas.join(', ')) + '. ' + m.conPrecio.toLocaleString('es-CO') + ' con precio.</p>' +
      '<p class="texto-suave">Familias: ' + fams.slice(0, 5).map(function (f) { return E(f) + ' (' + m.familias[f].toLocaleString('es-CO') + ')'; }).join(' · ') + '</p>' +
      (m.web ? '<p><a class="boton claro" href="' + E(m.web) + '" target="_blank" rel="noopener">Sitio oficial ↗</a></p>' : '') +
      (m.carpeta ? '<p class="ruta-carpeta">Carpeta: <code>' + E(m.carpeta) + '</code> ' + marcaEstado(m.estado.logo, 'logo') + ' logo ' + marcaEstado(m.estado.web, 'página web') + ' web ' + marcaEstado(m.estado.inventario, 'inventario del scraping') + ' inventario</p>' : '') +
      '</div></div>';
  }

  function portadaProveedoresHtml() {
    var r = rankingMarcas();
    var total = INV.productos.length;
    var conMarca = r.reduce(function (s, m) { return s + m.n; }, 0);
    var top30 = r.slice(0, 30);
    var enTop = top30.reduce(function (s, m) { return s + m.n; }, 0);
    var multi = r.filter(function (m) { return m.tiendas.length >= 3; }).length;
    var grupos = ['A', 'B', 'C'];
    return '' +
      '<div class="tiles">' +
      '<div class="tile-dato"><span class="tile-etiqueta">Marcas identificadas</span><strong class="tile-valor">' + r.length.toLocaleString('es-CO') + '</strong><span class="tile-nota">en 12 tiendas</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Productos con marca</span><strong class="tile-valor">' + Math.round(conMarca / total * 100) + '%</strong><span class="tile-nota">' + conMarca.toLocaleString('es-CO') + ' de ' + total.toLocaleString('es-CO') + '</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Peso del top 30</span><strong class="tile-valor">' + Math.round(enTop / conMarca * 100) + '%</strong><span class="tile-nota">de los productos con marca</span></div>' +
      '<div class="tile-dato"><span class="tile-etiqueta">Marcas en 3 o más tiendas</span><strong class="tile-valor">' + multi + '</strong><span class="tile-nota">presencia amplia</span></div></div>' +
      presenciaHtml() +
      empresasHtml() +
      '<h3 class="subtitulo-vista">Ranking de marcas por número de productos</h3><p class="texto-suave">Las 30 marcas con más productos (empates: más tiendas, luego orden alfabético), en grupos A (1–10), B (11–20) y C (21–30).</p>' +
      '<div class="grupos-marcas">' + grupos.map(function (g) {
        return '<div class="grupo-marcas"><p class="grupo-marcas-titulo">Grupo ' + g + '</p>' + top30.filter(function (m) { return m.grupo === g; }).map(function (m) {
          return '<a class="fila-marca" href="#proveedores/' + E(m.slug) + '"><span class="puesto">' + m.puesto + '</span>' + monograma(m) +
            '<span class="texto"><strong>' + E(m.nombre) + '</strong><small>' + m.n.toLocaleString('es-CO') + ' productos · ' + m.tiendas.length + ' tienda(s)</small></span></a>';
        }).join('') + '</div>';
      }).join('') + '</div>' +
      directorioMarcasHtml(r) +
      esqueletoHtml(top30, r);
  }

  // Directorio completo A-Z: TODAS las marcas presentes en el catalogo, agrupadas por inicial.
  // Tipo de producto de una marca: la familia donde tiene mas productos (nombre corto para el directorio y la barra lateral).
  var FAMILIA_CORTA = {
    'Herramientas y maquinaria': 'Herramientas', 'Estructura y obra gris': 'Obra gris', 'Cubiertas, drywall y techos': 'Cubiertas y drywall',
    'Pisos y revestimientos': 'Pisos y revestimientos', 'Baños y cocinas': 'Baños y cocinas', 'Plomería y tubería': 'Plomería',
    'Electricidad e iluminación': 'Eléctricos', 'Pinturas y acabados': 'Pinturas', 'Cerrajería y ferretería': 'Ferretería',
    'Aseo y químicos': 'Aseo y químicos', 'Hogar, jardín y otros': 'Hogar y jardín', 'Casas prefabricadas': 'Casas prefabricadas', Otros: 'Varios',
    'Tecnología y electrónica': 'Tecnología', Automotor: 'Automotor', 'Otros productos': 'Varios',
  };
  function tipoProductoMarca(m) {
    // Primero la clasificacion constructiva unificada (tools/clasificar_marcas.js); si no existe, la familia principal
    var C = window.CLASIFICACION_MARCAS, c = C && C.marcas[m.slug];
    if (c) return FAMILIA_CORTA[c.categoria] || c.categoria;
    var f = Object.keys(m.familias || {}).sort(function (a, b) { return m.familias[b] - m.familias[a]; });
    var principal = f[0] === 'Otros' && f[1] ? f[1] : f[0];
    return principal ? (FAMILIA_CORTA[principal] || principal) : '';
  }

  function directorioMarcasHtml(r) {
    var porLetra = {};
    r.forEach(function (m) {
      var l = Motor.normalizar(m.nombre).charAt(0).toUpperCase();
      if (!/[A-Z]/.test(l)) l = '#';
      (porLetra[l] = porLetra[l] || []).push(m);
    });
    var letras = Object.keys(porLetra).sort(function (a, b) { return a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b); });
    return '<section class="directorio-marcas"><h3 class="subtitulo-vista">Directorio completo · ' + r.length.toLocaleString('es-CO') + ' marcas</h3>' +
      '<p class="texto-suave">Todas las marcas presentes en el catálogo, en orden alfabético: NOMBRE (tipo de producto) y número de productos. El tipo es la familia donde la marca tiene más productos.</p>' +
      '<nav class="indice-letras">' + letras.map(function (l) { return '<a href="#letra-marcas-' + (l === '#' ? 'num' : l) + '" data-letra>' + l + '</a>'; }).join('') + '</nav>' +
      letras.map(function (l) {
        var lista = porLetra[l].slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
        return '<div class="letra-marcas" id="letra-marcas-' + (l === '#' ? 'num' : l) + '"><p class="letra">' + l + ' <small>' + lista.length + '</small></p><div class="rejilla-directorio">' +
          lista.map(function (m) { var t = tipoProductoMarca(m); return '<a href="#proveedores/' + E(m.slug) + '" title="' + E(m.nombre + (t ? ' (' + t + ')' : '')) + '"><span>' + E(m.nombre) + (t ? ' <small class="tipo-marca">(' + E(t) + ')</small>' : '') + '</span><span class="conteo">' + m.n.toLocaleString('es-CO') + '</span></a>'; }).join('') + '</div></div>';
      }).join('') + '</section>';
  }

  // Estructura de carpetas donde caera cada dato del scraping, con su estado actual (para validar antes de capturar).
  function esqueletoHtml(top30, todas) {
    var cuenta = function (k) { return top30.filter(function (m) { return k === 'imagenes' ? m.estado.imagenes > 0 : m.estado[k]; }).length; };
    return '<section class="esqueleto">' +
      '<h3 class="subtitulo-vista">Esqueleto del repositorio · destino del scraping</h3>' +
      '<p class="aviso"><strong>El scraping no ha empezado.</strong> Primero se valida esta estructura y el plan (<code>docs/PLAN_PROVEEDORES_MARCAS.md</code>); luego se ejecuta un piloto con el 10 % de las marcas y una auditoría del 5 % de lo capturado.</p>' +
      '<div class="esqueleto-grid"><pre class="arbol-carpetas">pages/PROVEEDORES/\n' +
      '├── LEEME.md\n├── verificacion/            piloto 10 % y auditoría 5 %\n' +
      '└── Grupo A | B | C/\n    └── NN - Marca/\n' +
      '        ├── logo.*               logo oficial\n' +
      '        ├── pagina web.txt       URL del sitio oficial\n' +
      '        ├── Inventario_marca.xlsx  catálogo capturado\n' +
      '        ├── data.json            datos del scraper\n' +
      '        └── img/                 fotos de producto</pre>' +
      '<div class="tiles esqueleto-tiles">' +
      [['Marcas con carpeta', todas.filter(function (m) { return m.carpeta; }).length + ' de ' + todas.length.toLocaleString('es-CO')], ['Con logo', cuenta('logo')], ['Con sitio web', cuenta('web')], ['Con inventario capturado', cuenta('inventario')]].map(function (t) {
        return '<div class="tile-dato"><span class="tile-etiqueta">' + t[0] + '</span><strong class="tile-valor">' + (typeof t[1] === 'number' ? t[1] + ' / 30' : t[1]) + '</strong></div>';
      }).join('') + '</div></div>' +
      '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>#</th><th>Marca</th><th>Carpeta</th><th>Logo</th><th>Página web</th><th>Inventario</th><th>data.json</th><th class="num">Fotos</th></tr></thead><tbody>' +
      top30.map(function (m) {
        return '<tr><td>' + m.puesto + '</td><td><a href="#proveedores/' + E(m.slug) + '">' + E(m.nombre) + '</a></td><td><code>' + E(m.carpeta) + '</code></td>' +
          '<td>' + marcaEstado(m.estado.logo, 'logo') + '</td><td>' + (m.web ? '<a href="' + E(m.web) + '" target="_blank" rel="noopener">' + E(m.web.replace(/^https?:\/\//, '')) + '</a>' : marcaEstado(false, 'sin página web')) + '</td>' +
          '<td>' + marcaEstado(m.estado.inventario, 'inventario') + '</td><td>' + marcaEstado(m.estado.datos, 'data.json') + '</td><td class="num">' + m.estado.imagenes + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  function listaMarcasHtml(sub) {
    var r = rankingMarcas();
    var palabras = Motor.normalizar(BUSQUEDA_MARCA).split(' ').filter(Boolean);
    var lista = palabras.length ? r.filter(function (m) { var n = Motor.normalizar(m.nombre); return palabras.every(function (p) { return n.indexOf(p) !== -1; }); }) : r.slice(30);
    var visibles = lista.slice(0, TOPE_LISTA_MARCAS);
    return (palabras.length ? sbTitulo('Resultados (' + lista.length + ')') : sbTitulo('Más marcas (' + (r.length - 30).toLocaleString('es-CO') + ')')) +
      visibles.map(function (m) { var t = tipoProductoMarca(m); return sbEnlace('#proveedores/' + m.slug, m.nombre + (t ? ' (' + t + ')' : ''), m.n, sub === m.slug, true); }).join('') +
      (lista.length > visibles.length ? sbNota('+' + (lista.length - visibles.length).toLocaleString('es-CO') + ' marcas más: escribe en el buscador.') : '') +
      (!lista.length ? sbNota('Ninguna marca coincide.') : '');
  }

  function sidebarProveedores(sub) {
    if (!INV) return sbTitulo('Proveedores') + sbNota('Cargando marcas…');
    var r = rankingMarcas();
    // El sidebar izquierdo cambia segun la opcion del desplegable Catalogo:
    //   Proveedores (#proveedores/empresas) -> proveedores de productos · Ferreterias (#proveedores/ferreterias) -> nacionales, Bogota y Tunja
    //   Casas prefabricadas -> empresas de casas · Marcas (#proveedores y cada marca) -> etapa -> categoria -> marcas
    var todas = empresas().map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) { return b.e.n - a.e.n; });
    var lista = function (titulo, filtro) { var f = todas.filter(function (x) { return filtro(x.e); }); return f.length ? sbTitulo(titulo) + f.map(function (x) { return sbEnlace('#proveedores/empresa-' + x.i, x.e.nombre, x.e.n, sub === 'empresa-' + x.i, true); }).join('') : ''; };
    var mEmp = /^empresa-(\d+)$/.exec(sub || ''); var empActual = mEmp && empresas()[Number(mEmp[1])];
    var esCasas = function (e) { return e.grupo === 'Casas prefabricadas'; };
    // Herramientas de alquiler: categorias de equipo y empresas por ciudad
    if (/^alquiler/.test(sub || '')) {
      var A = alquilerDatos(); var fa = filtroAlquiler(sub);
      var ciudades = ['Tunja', 'Bogotá', 'Medellín', 'Nacional (42 tiendas)'];
      return sbEnlace('#proveedores/alquiler', 'Todas las herramientas de alquiler', A.equipos.length, !fa) +
        sbTitulo('Categorías de equipo') + categoriasAlquiler().map(function (c, i) { return sbEnlace('#proveedores/alquiler/c-' + i, c.nombre, c.equipos.length, fa && fa.tipo === 'c' && fa.i === i, true); }).join('') +
        ciudades.map(function (ci) {
          var es = A.empresas.map(function (e, i) { return { e: e, i: i }; }).filter(function (x) { return x.e.ciudad === ci; });
          return es.length ? sbTitulo('Empresas · ' + ci.replace(' (42 tiendas)', '')) + es.map(function (x) { return sbEnlace('#proveedores/alquiler/e-' + x.i, x.e.nombre, x.e.equipos || 'cotiza', fa && fa.tipo === 'e' && fa.i === x.i, true); }).join('') : '';
        }).join('');
    }
    // Dentro de una empresa (ferreteria o proveedor): primero las familias y categorias de SU catalogo (filtros), luego la navegacion
    var filtrosEmpresa = '';
    var cfgE = CATALOGOS.proveedores;
    var marcaActual = !empActual && sub && marcaPorSlug(sub);
    if ((empActual || marcaActual) && cfgE && cfgE.lista) {
      var st = cfgE.estado, D = INV.D;
      filtrosEmpresa = (empActual ? '<a class="volver-sidebar" href="#proveedores/' + (esCasas(empActual) ? 'casas-prefabricadas' : empActual.tipo === 0 ? 'ferreterias' : 'empresas') + '">← ' + E(empActual.nombre) + '</a>' : '<a class="volver-sidebar" href="#proveedores">← ' + E(marcaActual.nombre) + '</a>') +
        sbListaFiltro('Familias', 'fam', contar(filtrar(cfgE.lista, st, 'fam'), 'fam'), function (i) { return D.familias[i]; }, st.fam, 'Todas las familias') +
        sbListaFiltro('Categorías', 'cat', contar(filtrar(cfgE.lista, st, 'cat'), 'cat'), function (i) { return D.categorias[i]; }, st.cat, 'Todas las categorías');
    }
    if (sub === 'casas-prefabricadas' || (empActual && esCasas(empActual))) {
      return filtrosEmpresa + sbEnlace('#proveedores/casas-prefabricadas', 'Casas prefabricadas', null, sub === 'casas-prefabricadas') + lista('Empresas de casas prefabricadas', esCasas);
    }
    if (sub === 'ferreterias' || (empActual && empActual.tipo === 0)) {
      return filtrosEmpresa + sbEnlace('#proveedores/ferreterias', 'Ferreterías y sus marcas', todas.filter(function (x) { return x.e.tipo === 0; }).length, sub === 'ferreterias') +
        lista('Ferreterías nacionales', function (e) { return e.tipo === 0 && !/^Ferreterias (Boyaca|Bogota)$/.test(e.grupo); }) +
        lista('Ferreterías de Bogotá', function (e) { return e.grupo === 'Ferreterias Bogota'; }) +
        lista('Ferreterías de Tunja (Boyacá)', function (e) { return e.grupo === 'Ferreterias Boyaca'; });
    }
    if (sub === 'empresas' || (empActual && empActual.tipo === 1)) {
      return filtrosEmpresa + sbEnlace('#proveedores/empresas', 'Todos los proveedores', todas.filter(function (x) { return x.e.tipo === 1 && !esCasas(x.e); }).length, sub === 'empresas') +
        lista('Marcas oficiales', function (e) { return e.tipo === 1 && /\(oficial\)/.test(e.nombre); }) +
        lista('Otros proveedores de productos', function (e) { return e.tipo === 1 && !/\(oficial\)/.test(e.nombre) && !esCasas(e); });
    }
    // Marcas: por categoria constructiva unificada (etapa -> categoria -> marcas; tools/clasificar_marcas.js)
    return '<div class="buscador-sidebar"><input type="search" data-rol="buscar-marca" placeholder="Buscar marca…" aria-label="Buscar marca" value="' + E(BUSQUEDA_MARCA) + '"></div>' +
      sbEnlace('#proveedores', 'Portada y ranking', r.length, !sub) +
      '<div data-rol="lista-marcas">' + (BUSQUEDA_MARCA ? listaMarcasHtml(sub) : '') + '</div>' +
      '<div data-rol="arbol-marcas"' + (BUSQUEDA_MARCA ? ' hidden' : '') + '>' + filtrosEmpresa + arbolMarcasHtml(sub) +
      lista('Marcas con catálogo oficial', function (e) { return e.tipo === 1 && !esCasas(e); }) + '</div>';
  }
  // Arbol de marcas: etapa de obra -> categoria constructiva -> marcas (de mas a menos productos)
  function arbolMarcasHtml(sub) {
    var C = window.CLASIFICACION_MARCAS;
    if (!C) return sbTitulo('Marcas por categoría') + sbNota('Falta assets/datos/clasificacion_marcas.js. Ejecuta: node tools/clasificar_marcas.js');
    var marcaActual = C.marcas[sub];
    return sbTitulo('Marcas por categoría constructiva') + C.arbol.map(function (e) {
      var total = e.categorias.reduce(function (s, c) { return s + c.marcas.length; }, 0);
      var abiertaEtapa = marcaActual && marcaActual.etapa === e.etapa;
      return '<details class="arbol-etapa"' + (abiertaEtapa ? ' open' : '') + '><summary><span class="texto">' + E(e.etapa) + '</span>' + sbConteo(total) + '</summary>' +
        e.categorias.map(function (c) {
          var abierta = marcaActual && marcaActual.categoria === c.nombre;
          return '<details class="arbol-categoria"' + (abierta ? ' open' : '') + '><summary><span class="texto">' + E(c.nombre) + '</span>' + sbConteo(c.marcas.length) + '</summary>' +
            c.marcas.map(function (slug) { var m = C.marcas[slug]; return sbEnlace('#proveedores/' + slug, m.nombre, m.productos, sub === slug, true); }).join('') + '</details>';
        }).join('') + '</details>';
    }).join('');
  }
  // ---- Sidebar derecho del Catalogo: rango de estadisticas de la informacion presentada (sigue los filtros activos)
  var RANGOS_PRECIO = [[0, 10000, 'Hasta $10.000'], [10000, 50000, '$10.000 – $50.000'], [50000, 100000, '$50.000 – $100.000'], [100000, 500000, '$100.000 – $500.000'], [500000, 1000000, '$500.000 – $1 M'], [1000000, 5000000, '$1 M – $5 M'], [5000000, Infinity, 'Más de $5 M']];
  function estadisticasListaHtml(titulo, lista) {
    var D = INV.D; var precios = lista.map(function (p) { return p.precio; }).filter(Boolean).sort(function (a, b) { return a - b; });
    var n = lista.length; var fam = {}; lista.forEach(function (p) { fam[p.fam] = (fam[p.fam] || 0) + 1; });
    var enRango = RANGOS_PRECIO.map(function (r) { return precios.filter(function (x) { return x >= r[0] && x < r[1]; }).length; });
    var fila = function (t, v) { return '<a><span class="texto">' + E(t) + '</span><span class="conteo">' + v + '</span></a>'; };
    var $$ = Motor.formatoMoneda;
    return sbTitulo(titulo) + fila('Productos', n.toLocaleString('es-CO')) + fila('Con precio', (n ? Math.round(precios.length / n * 100) : 0) + ' %') +
      (precios.length ? fila('Precio mínimo', $$(precios[0])) + fila('Precio mediano', $$(precios[Math.floor(precios.length / 2)])) +
        fila('Precio promedio', $$(Math.round(precios.reduce(function (s, x) { return s + x; }, 0) / precios.length))) + fila('Precio máximo', $$(precios[precios.length - 1])) : '') +
      (precios.length ? sbTitulo('Rango de precios') + RANGOS_PRECIO.map(function (r, i) { return '<a class="barra-sidebar"><span class="texto">' + r[2] + '</span><span class="conteo">' + enRango[i].toLocaleString('es-CO') + '</span><i style="width:' + (enRango[i] / Math.max.apply(null, enRango.concat([1])) * 100).toFixed(1) + '%"></i></a>'; }).join('') : '') +
      sbTitulo('Tipos de producto') + Object.keys(fam).sort(function (a, b) { return fam[b] - fam[a]; }).slice(0, 8).map(function (k) {
        return '<a class="barra-sidebar"><span class="texto"><span class="punto-familia" style="background:' + (COLOR_FAMILIA[D.familias[k]] || '#999') + '"></span>' + E(D.familias[k]) + '</span><span class="conteo">' + (fam[k] / (n || 1) * 100).toFixed(1) + ' %</span></a>';
      }).join('');
  }
  function panelEstadisticasCatalogo(ruta) {
    var v = ruta.vista, sec = seccionCatalogo();
    if (v !== 'herramientas' && !sec) return null;
    if (!INV) return sbTitulo('Estadísticas') + sbNota('Cargando inventario…');
    var cfg = v === 'materiales' || v === 'herramientas' ? CATALOGOS[v] : (/^empresa-\d+$/.test(ruta.sub) || marcaPorSlug(ruta.sub)) ? CATALOGOS.proveedores : null;
    if (cfg && cfg.lista) return estadisticasListaHtml(v === 'herramientas' ? 'Herramientas' : v === 'materiales' ? 'Materiales' : 'Este catálogo', filtrar(cfg.lista, cfg.estado));
    if (sec === 'estadisticas') { var ip = EST.prov === '' ? -1 : Number(EST.prov); return estadisticasListaHtml(ip >= 0 ? INV.D.proveedores[ip] : 'Todo el inventario', ip >= 0 ? INV.productos.filter(function (p) { return p.prov === ip; }) : INV.productos); }
    if (sec === 'ferreterias') { var tip0 = {}; empresas().forEach(function (e, i) { if (e.tipo === 0) tip0[i] = 1; }); return estadisticasListaHtml('Ferreterías', INV.productos.filter(function (p) { return tip0[p.prov]; })); }
    if (sec === 'alquiler') {
      var eqs = equiposFiltradosAlquiler(ruta.sub); var dia = eqs.filter(function (x) { return x.precio && /d[ií]a/.test(x.unidad || ''); }).map(function (x) { return x.precio; }).sort(function (a, b) { return a - b; });
      var fila3 = function (t, val) { return '<a><span class="texto">' + E(t) + '</span><span class="conteo">' + val + '</span></a>'; };
      var RD = [[0, 1000, 'Hasta $1.000 (piezas)'], [1000, 20000, '$1.000 – $20.000'], [20000, 60000, '$20.000 – $60.000'], [60000, 120000, '$60.000 – $120.000'], [120000, Infinity, 'Más de $120.000']];
      var cuenta = RD.map(function (r) { return dia.filter(function (p) { return p >= r[0] && p < r[1]; }).length; }); var mx = Math.max.apply(null, cuenta.concat([1]));
      return sbTitulo('Alquiler · lo que se ve') + fila3('Equipos', eqs.length) + fila3('Con precio publicado', eqs.filter(function (x) { return x.precio; }).length) + fila3('Por cotización', eqs.filter(function (x) { return !x.precio; }).length) +
        (dia.length ? fila3('Precio por día · mínimo', Motor.formatoMoneda(dia[0])) + fila3('Precio por día · mediano', Motor.formatoMoneda(dia[Math.floor(dia.length / 2)])) + fila3('Precio por día · máximo', Motor.formatoMoneda(dia[dia.length - 1])) +
          sbTitulo('Rango de precio por día') + RD.map(function (r, i) { return '<a class="barra-sidebar"><span class="texto">' + r[2] + '</span><span class="conteo">' + cuenta[i] + '</span><i style="width:' + (cuenta[i] / mx * 100).toFixed(1) + '%"></i></a>'; }).join('') : '') +
        sbNota('Precios de ESCO: lista 2019 antes de IVA (referencia). Renty y Ferretería Donda: precios vigentes por día.');
    }
    if (sec === 'casas') {
      var P = window.PREFABRICADAS; var mm = P ? P.modelos.filter(function (x) { return x.precioM2; }) : [];
      var pr = mm.map(function (x) { return x.precio; }).sort(function (a, b) { return a - b; }); var m2 = mm.map(function (x) { return x.precioM2; }).sort(function (a, b) { return a - b; });
      var fila2 = function (t, val) { return '<a><span class="texto">' + E(t) + '</span><span class="conteo">' + val + '</span></a>'; };
      return sbTitulo('Casas prefabricadas') + fila2('Modelos con precio', mm.length) + fila2('Empresas', new Set(mm.map(function (x) { return x.empresa; })).size) +
        (pr.length ? fila2('Precio mínimo', Motor.formatoMoneda(pr[0])) + fila2('Precio máximo', Motor.formatoMoneda(pr[pr.length - 1])) +
          fila2('m² más barato', Motor.formatoMoneda(m2[0])) + fila2('m² mediano', Motor.formatoMoneda(m2[Math.floor(m2.length / 2)])) + fila2('m² más caro', Motor.formatoMoneda(m2[m2.length - 1])) : '') +
        sbTitulo('Por área') + [[0, 30, 'Hasta 30 m²'], [30, 60, '30 – 60 m²'], [60, 100, '60 – 100 m²'], [100, 1e9, 'Más de 100 m²']].map(function (r) { return fila2(r[2], mm.filter(function (x) { return x.area > r[0] && x.area <= r[1]; }).length); }).join('');
    }
    // Marcas (portada): todo el inventario + marcas con mas productos
    var r = rankingMarcas();
    return estadisticasListaHtml('Todo el inventario', INV.productos) + sbTitulo('Marcas con más productos') +
      r.slice(0, 10).map(function (m) { return sbEnlace('#proveedores/' + m.slug, m.puesto + '. ' + m.nombre, m.n, false, true); }).join('');
  }

  // Sidebar derecho en Proveedores: empresas de ferreteria y proveedores de productos
  function empresasSidebarHtml(sub) {
    if (!INV) return sbTitulo('Empresas') + sbNota('Cargando…');
    // Ferreterias por ciudad (grupos Ferreterias Boyaca = Tunja y Ferreterias Bogota), luego las nacionales y los proveedores de productos
    var todas = empresas().map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) { return b.e.n - a.e.n; });
    var secciones = [
      ['Ferreterías de Tunja (Boyacá)', function (e) { return e.grupo === 'Ferreterias Boyaca'; }],
      ['Ferreterías de Bogotá', function (e) { return e.grupo === 'Ferreterias Bogota'; }],
      ['Otras empresas de ferretería', function (e) { return e.tipo === 0 && !/^Ferreterias (Boyaca|Bogota)$/.test(e.grupo); }],
      ['Proveedores de productos', function (e) { return e.tipo === 1; }],
    ];
    return secciones.map(function (s) {
      var filas = todas.filter(function (x) { return s[1](x.e); });
      return filas.length ? sbTitulo(s[0]) + filas.map(function (x) { return sbEnlace('#proveedores/empresa-' + x.i, x.e.nombre, x.e.n, sub === 'empresa-' + x.i, true); }).join('') : '';
    }).join('');
  }

  // Indice de letras del directorio: desplaza hasta la letra sin cambiar la ruta de la pagina.
  // Solo existe en index.html (usuario.html no tiene Proveedores)
  if ($('proveedores-contenido')) $('proveedores-contenido').addEventListener('click', function (e) {
    var a = e.target.closest('[data-letra]');
    if (!a) return;
    e.preventDefault();
    var destino = document.getElementById(a.getAttribute('href').slice(1));
    if (destino) window.scrollTo(0, destino.getBoundingClientRect().top + window.scrollY - document.querySelector('.site-header').offsetHeight - 12);
  });

  sidebar.addEventListener('input', function (e) {
    var campo = e.target.closest('[data-rol="buscar-marca"]');
    if (!campo) return;
    BUSQUEDA_MARCA = campo.value;
    var lista = sidebar.querySelector('[data-rol="lista-marcas"]');
    if (lista) lista.innerHTML = BUSQUEDA_MARCA ? listaMarcasHtml(leerRuta().sub) : '';
    var arbol = sidebar.querySelector('[data-rol="arbol-marcas"]');
    if (arbol) arbol.hidden = !!BUSQUEDA_MARCA; // con busqueda, solo resultados; sin busqueda, el arbol por categoria
  });

  // =====================================================================
  // Estadisticas: los inventarios en Excel de pages/ESTADISTICAS (COMFER, Homecenter y marcas)
  // Barras horizontales (magnitud por proveedor), color = identidad del proveedor, etiqueta y valor
  // escritos en cada barra (el color nunca es la unica pista) y tooltip al pasar el cursor.
  // =====================================================================
  var EST = { prov: '', montado: false };
  var RESUMEN_EST = null;

  function colorProveedor(nombre) {
    return nombre === 'COMFER' ? 'var(--comfer)' : nombre === 'Homecenter' ? 'var(--homecenter)' : 'var(--otros-proveedores)';
  }

  function mediana(lista) {
    if (!lista.length) return null;
    var o = lista.slice().sort(function (a, b) { return a - b; });
    var m = o.length >> 1;
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  }

  function resumenEstadisticas() {
    if (RESUMEN_EST) return RESUMEN_EST;
    var D = INV.D;
    var porProv = D.proveedores.map(function (nombre) { return { nombre: nombre, n: 0, precios: [], familias: {}, archivos: {} }; });
    INV.productos.forEach(function (p) {
      var r = porProv[p.prov];
      r.n++;
      if (p.precio) r.precios.push(p.precio);
      r.familias[p.fam] = (r.familias[p.fam] || 0) + 1;
      r.archivos[p.arch] = (r.archivos[p.arch] || 0) + 1;
    });
    porProv.forEach(function (r) {
      r.conPrecio = r.precios.length;
      r.min = r.precios.length ? Math.min.apply(null, r.precios) : null;
      r.max = r.precios.length ? Math.max.apply(null, r.precios) : null;
      r.mediana = mediana(r.precios);
      r.promedio = r.precios.length ? Math.round(r.precios.reduce(function (s, x) { return s + x; }, 0) / r.precios.length) : null;
    });
    RESUMEN_EST = porProv;
    return porProv;
  }

  function montarEstadisticas() {
    var cont = $('estadisticas-contenido');
    conCargaInventario(cont, function () {
      if (!EST.montado) {
        cont.innerHTML = '<div data-rol="tiles"></div><div data-rol="graficos"></div><div data-rol="tablas"></div>';
        cont.addEventListener('mousemove', moverTooltip);
        cont.addEventListener('mouseleave', ocultarTooltip);
        cont.addEventListener('click', function (e) {
          var b = e.target.closest('[data-proveedor]');
          if (b) { EST.prov = b.getAttribute('data-proveedor'); pintarEstadisticas(); window.scrollTo(0, 0); }
        });
        EST.montado = true;
      }
      pintarEstadisticas();
    });
  }

  // ---- Analisis del catalogo (todo el inventario o un proveedor): tipo de producto en grafico circular, rango de precios
  // y productos presentes en mas catalogos (mismo nombre normalizado en varios proveedores).
  var COLOR_FAMILIA = {
    'Estructura y obra gris': '#6b5b4b', 'Cubiertas, drywall y techos': '#8a8d88', 'Plomería y tubería': '#2f6f9f', 'Electricidad e iluminación': '#d9a520',
    'Pisos y revestimientos': '#b5764a', 'Baños y cocinas': '#4aa3a2', 'Pinturas y acabados': '#c0504d', 'Cerrajería y ferretería': '#5b6770',
    'Herramientas y maquinaria': '#e07b24', 'Aseo y químicos': '#7fb24a', 'Hogar, jardín y otros': '#9b6fb0', 'Casas prefabricadas': '#354b3e', Otros: '#c9c4b5',
  };
  var CACHE_PRESENCIA = null;
  function productosPresentes() {
    if (CACHE_PRESENCIA) return CACHE_PRESENCIA;
    var mapa = {};
    INV.productos.forEach(function (p) {
      var k = Motor.normalizar(p.nombre || ''); if (k.length < 6) return;
      var x = mapa[k] || (mapa[k] = { nombre: p.nombre, provs: {}, precios: [] });
      x.provs[p.prov] = 1; if (p.precio) x.precios.push(p.precio);
    });
    CACHE_PRESENCIA = Object.keys(mapa).map(function (k) { var x = mapa[k]; x.n = Object.keys(x.provs).length; return x; }).filter(function (x) { return x.n > 1; }).sort(function (a, b) { return b.n - a.n || b.precios.length - a.precios.length; });
    return CACHE_PRESENCIA;
  }
  function circularHtml(titulo, subtitulo, datos) {
    var total = datos.reduce(function (s, d) { return s + d.valor; }, 0) || 1; var ang = -Math.PI / 2; var R = 90, r = 52, c = 100;
    var arcos = datos.map(function (d) {
      var a2 = ang + d.valor / total * Math.PI * 2; var grande = a2 - ang > Math.PI ? 1 : 0;
      var p = function (rad, a) { return (c + rad * Math.cos(a)).toFixed(2) + ' ' + (c + rad * Math.sin(a)).toFixed(2); };
      var path = d.valor / total > 0.9999 ? '<circle cx="100" cy="100" r="71" fill="none" stroke="' + d.color + '" stroke-width="38"/>' :
        '<path d="M ' + p(R, ang) + ' A ' + R + ' ' + R + ' 0 ' + grande + ' 1 ' + p(R, a2) + ' L ' + p(r, a2) + ' A ' + r + ' ' + r + ' 0 ' + grande + ' 0 ' + p(r, ang) + ' Z" fill="' + d.color + '"><title>' + E(d.etiqueta) + ': ' + d.valor.toLocaleString('es-CO') + ' (' + (d.valor / total * 100).toFixed(1) + ' %)</title></path>';
      ang = a2; return path;
    }).join('');
    return '<figure class="grafico grafico-circular"><figcaption><strong>' + E(titulo) + '</strong><span>' + E(subtitulo) + '</span></figcaption>' +
      '<div class="circular-cuerpo"><svg viewBox="0 0 200 200" role="img" aria-label="' + E(titulo) + '">' + arcos + '<text x="100" y="96" text-anchor="middle" class="circular-total">' + total.toLocaleString('es-CO') + '</text><text x="100" y="116" text-anchor="middle" class="circular-nota">productos</text></svg>' +
      '<ul class="circular-leyenda">' + datos.map(function (d) { return '<li><span style="background:' + d.color + '"></span>' + E(d.etiqueta) + '<b>' + (d.valor / total * 100).toFixed(1) + ' %</b></li>'; }).join('') + '</ul></div></figure>';
  }
  function analisisCatalogoHtml(iProv) {
    var D = INV.D; var lista = iProv >= 0 ? INV.productos.filter(function (p) { return p.prov === iProv; }) : INV.productos;
    // Tipo de producto (familia) -> grafico circular
    var fam = {}; lista.forEach(function (p) { fam[p.fam] = (fam[p.fam] || 0) + 1; });
    var datosFam = Object.keys(fam).map(function (k) { var n = D.familias[k]; return { etiqueta: n, valor: fam[k], color: COLOR_FAMILIA[n] || '#999' }; }).sort(function (a, b) { return b.valor - a.valor; });
    // Rango de precios
    var RANGOS = [[0, 10000, 'Hasta $10.000'], [10000, 50000, '$10.000 a $50.000'], [50000, 100000, '$50.000 a $100.000'], [100000, 500000, '$100.000 a $500.000'], [500000, 1000000, '$500.000 a $1 millón'], [1000000, 5000000, '$1 a $5 millones'], [5000000, Infinity, 'Más de $5 millones']];
    var enRango = RANGOS.map(function () { return 0; }); var conPrecio = 0;
    lista.forEach(function (p) { if (!p.precio) return; conPrecio++; for (var i = 0; i < RANGOS.length; i++) if (p.precio >= RANGOS[i][0] && p.precio < RANGOS[i][1]) { enRango[i]++; break; } });
    var tonos = ['#d7c6a5', '#c9b184', '#a8b58a', '#7f9a6c', '#586c4f', '#3f5a48', '#20211e'];
    // Productos presentes en mas catalogos (todo el inventario)
    var presentes = productosPresentes(); if (iProv >= 0) presentes = presentes.filter(function (x) { return x.provs[iProv]; });
    var top = presentes.slice(0, 12);
    return '<section class="analisis-catalogo"><h3 class="subtitulo-vista">Análisis del catálogo' + (iProv >= 0 ? ' · ' + E(empresas()[iProv] ? empresas()[iProv].nombre : '') : '') + '</h3>' +
      '<div class="tiles">' + tile('Número total de productos', lista.length.toLocaleString('es-CO')) + tile('Tipos de producto', datosFam.length, 'familias del catálogo') +
      tile('Producto con más presencia', top[0] ? top[0].n + ' catálogos' : '—', top[0] ? E(top[0].nombre) : 'sin coincidencias') + tile('Con precio', conPrecio.toLocaleString('es-CO'), 'productos con precio publicado') + '</div>' +
      '<div class="graficos">' + circularHtml('Productos por tipo', 'Participación de cada tipo de producto (familia) en el catálogo.', datosFam) +
      barras('Rango de precios', 'Cantidad de productos por rango de precio (solo productos con precio).', RANGOS.map(function (r, i) { return { etiqueta: r[2], valor: enRango[i], color: tonos[i] }; })) + '</div>' +
      '<h3 class="subtitulo-vista">Productos presentes en más catálogos</h3>' +
      (top.length ? '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Catálogos</th><th>Dónde está</th><th class="num">Precio mínimo</th><th class="num">Precio máximo</th></tr></thead><tbody>' +
        top.map(function (x) {
          var mn = x.precios.length ? Math.min.apply(null, x.precios) : 0, mx = x.precios.length ? Math.max.apply(null, x.precios) : 0;
          return '<tr><td>' + E(x.nombre) + '</td><td class="num"><b>' + x.n + '</b></td><td>' + E(Object.keys(x.provs).map(function (k) { return (empresas()[k] || {}).nombre || D.proveedores[k]; }).join(', ')) + '</td><td class="num">' + (mn ? Motor.formatoMoneda(mn) : '—') + '</td><td class="num">' + (mx ? Motor.formatoMoneda(mx) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="vacio">No hay productos con el mismo nombre en varios catálogos.</p>') + '</section>';
  }

  function tile(etiqueta, valor, nota) {
    return '<div class="tile-dato"><span class="tile-etiqueta">' + E(etiqueta) + '</span><strong class="tile-valor">' + valor + '</strong>' + (nota ? '<span class="tile-nota">' + nota + '</span>' : '') + '</div>';
  }

  // Grafico de barras horizontales en HTML: filas [{etiqueta, valor, color, extra, filtro}]
  function barras(titulo, subtitulo, filas, formato) {
    var max = Math.max.apply(null, filas.map(function (f) { return f.valor; }).concat([1]));
    return '<figure class="grafico"><figcaption><strong>' + E(titulo) + '</strong><span>' + E(subtitulo) + '</span></figcaption>' +
      '<div class="barras">' + filas.map(function (f) {
        // La barra mas larga ocupa el 78% de la pista: el resto queda para el valor escrito.
        var ancho = Math.max(0.4, f.valor / max * 78);
        var valor = formato ? formato(f.valor) : f.valor.toLocaleString('es-CO');
        return '<div class="barra-fila"' + (f.filtro !== undefined ? ' data-proveedor="' + E(f.filtro) + '" role="button" tabindex="0"' : '') +
          ' data-tooltip="' + E(f.etiqueta + ' · ' + valor + (f.extra ? ' · ' + f.extra : '')) + '">' +
          '<span class="barra-etiqueta">' + E(f.etiqueta) + '</span>' +
          '<span class="barra-pista"><span class="barra" style="width:' + ancho.toFixed(2) + '%;background:' + f.color + '"></span><span class="barra-valor">' + valor + '</span></span></div>';
      }).join('') + '</div></figure>';
  }

  function pintarEstadisticas() {
    var cont = $('estadisticas-contenido');
    ocultarTooltip();
    var D = INV.D;
    var resumen = resumenEstadisticas();
    var sel = EST.prov === '' ? null : resumen[Number(EST.prov)];
    var productos = sel ? sel.n : INV.productos.length;
    var precios = sel ? sel.precios : resumen.reduce(function (l, r) { return l.concat(r.precios); }, []);
    var archivos = D.archivos.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) { return !x.a.copiaDe && (!sel || sel.archivos[x.i]); });

    cont.querySelector('[data-rol="tiles"]').innerHTML =
      (sel ? '<p class="texto-suave"><button type="button" class="volver" data-proveedor="">← Todos los proveedores</button></p>' : '') +
      '<div class="tiles">' +
      tile(sel ? 'Productos de ' + sel.nombre : 'Productos en inventario', productos.toLocaleString('es-CO')) +
      tile(sel ? 'Archivos Excel' : 'Proveedores', sel ? archivos.length : resumen.length, sel ? '' : archivos.length + ' archivos Excel') +
      tile('Con precio', (productos ? Math.round(precios.length / productos * 100) : 0) + '%', precios.length.toLocaleString('es-CO') + ' productos') +
      tile('Precio mediano', precios.length ? Motor.formatoMoneda(mediana(precios)) : '—', 'mitad de los productos cuesta menos') +
      '</div>';

    var graficos;
    if (!sel) {
      var orden = resumen.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) { return b.r.n - a.r.n; });
      graficos = barras('Productos por proveedor', 'Cantidad de productos leídos de sus archivos Excel. Clic en una barra para ver el detalle.',
        orden.map(function (x) { return { etiqueta: x.r.nombre, valor: x.r.n, color: colorProveedor(x.r.nombre), extra: x.r.conPrecio.toLocaleString('es-CO') + ' con precio', filtro: x.i }; })) +
        barras('Precio mediano por proveedor', 'Solo productos con precio. Los proveedores sin precios publicados no aparecen.',
          orden.filter(function (x) { return x.r.mediana; }).sort(function (a, b) { return b.r.mediana - a.r.mediana; })
            .map(function (x) { return { etiqueta: x.r.nombre, valor: x.r.mediana, color: colorProveedor(x.r.nombre), extra: 'rango ' + Motor.formatoMoneda(x.r.min) + ' – ' + Motor.formatoMoneda(x.r.max), filtro: x.i }; }),
          Motor.formatoMoneda);
    } else {
      var fams = Object.keys(sel.familias).map(Number).sort(function (a, b) { return sel.familias[b] - sel.familias[a]; });
      graficos = barras('Productos de ' + sel.nombre + ' por familia', 'Familias del catálogo general a las que pertenecen sus productos.',
        fams.map(function (f) { return { etiqueta: D.familias[f], valor: sel.familias[f], color: colorProveedor(sel.nombre) }; }));
    }
    cont.querySelector('[data-rol="graficos"]').innerHTML = analisisCatalogoHtml(sel ? resumen.indexOf(sel) : -1) + '<div class="graficos">' + graficos + '</div>';

    var tablaPrecios = '<h3 class="subtitulo-vista">Precios por proveedor</h3><div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Proveedor</th><th class="num">Productos</th><th class="num">Con precio</th><th class="num">Mínimo</th><th class="num">Mediana</th><th class="num">Promedio</th><th class="num">Máximo</th></tr></thead><tbody>' +
      resumen.map(function (r, i) {
        if (sel && r !== sel) return '';
        return '<tr><td><span class="punto-proveedor" style="background:' + colorProveedor(r.nombre) + '"></span><button type="button" data-proveedor="' + i + '">' + E(r.nombre) + '</button></td>' +
          '<td class="num">' + r.n.toLocaleString('es-CO') + '</td><td class="num">' + r.conPrecio.toLocaleString('es-CO') + '</td>' +
          ['min', 'mediana', 'promedio', 'max'].map(function (k) { return '<td class="num">' + (r[k] ? Motor.formatoMoneda(r[k]) : '—') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    var tablaArchivos = '<h3 class="subtitulo-vista">Archivos Excel en <code>pages/ESTADISTICAS</code></h3><div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Archivo</th><th>Carpeta</th><th>Proveedor</th><th class="num">Productos</th><th>Excel</th></tr></thead><tbody>' +
      archivos.map(function (x) {
        var carpeta = x.a.ruta.split('/').slice(2, -1).join('/');
        return '<tr><td>' + E(x.a.nombre) + '</td><td>' + E(carpeta) + '</td><td>' + E(x.a.proveedor) + '</td><td class="num">' + x.a.incluidos.toLocaleString('es-CO') + '</td><td><a href="' + E(encodeURI(x.a.ruta)) + '" download>Descargar</a></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="texto-suave">Para agregar un inventario, copia su Excel en una carpeta de <code>pages/ESTADISTICAS</code> y ejecuta <code>node tools/generar_inventario.js</code>.</p>' +
      '<div class="aviso">Análisis de precios unitarios de obra: <a href="pages/Servicios/Analisis_Precios_Unitarios.xlsx" download>Descargar Excel (actividades, unidad, precio, descripción e insumos)</a>. Su detalle aparece en cada etapa de los proyectos.</div>';
    cont.querySelector('[data-rol="tablas"]').innerHTML = tablaPrecios + tablaArchivos;
    if (leerRuta().vista === 'estadisticas') pintarSidebar();
  }

  var tooltip = null;
  function moverTooltip(e) {
    var fila = e.target.closest('[data-tooltip]');
    if (!fila) { ocultarTooltip(); return; }
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'tooltip-grafico'; document.body.appendChild(tooltip); }
    tooltip.textContent = fila.getAttribute('data-tooltip');
    tooltip.style.display = 'block';
    var x = Math.min(e.clientX + 14, window.innerWidth - tooltip.offsetWidth - 12);
    tooltip.style.left = x + 'px';
    tooltip.style.top = (e.clientY + 16) + 'px';
  }
  function ocultarTooltip() { if (tooltip) tooltip.style.display = 'none'; }

  // =====================================================================
  // Visor de precios unitarios (APU) dentro de cada etapa de un proyecto:
  // actividades de la etapa (nombre, unidad, precio) y, al abrir una, sus insumos con cantidad y precio.
  // =====================================================================
  var APU_LISTO = null;
  function cargarApu() {
    if (!APU_LISTO) APU_LISTO = cargarScript('assets/datos/apu.js', function () { return window.APU; });
    return APU_LISTO;
  }

  function montarVisorApu(cont, carpetaEtapa, sub) {
    var visor = cont.querySelector('[data-rol="visor-apu"]');
    if (!visor) return;
    visor.innerHTML = '<p class="texto-suave">Cargando precios unitarios…</p>';
    cargarApu().then(function () {
      var A = window.APU;
      var todas = A.actividades.filter(function (a) { return a[5] === carpetaEtapa; });
      var lista = sub ? todas.filter(function (a) { return a[6].indexOf(sub) !== -1; }) : todas;
      var nota = '';
      if (sub && !lista.length) {
        lista = todas.filter(function (a) { return !a[6].length; });
        nota = 'Ninguna actividad del análisis corresponde solo a esta subetapa; se muestran las actividades generales de la etapa.';
      }
      visor.innerHTML = '<div class="visor-cabecera"><div><p class="eyebrow">ACTIVIDADES Y PRECIOS UNITARIOS</p>' +
        '<p class="texto-suave">' + lista.length + ' actividad(es) del análisis de precios unitarios para ' + (sub ? 'esta subetapa' : 'esta etapa') + '. Abre una actividad para ver sus insumos: producto, unidad, cantidad y precio.</p>' +
        (nota ? '<p class="aviso">' + E(nota) + '</p>' : '') + '</div>' +
        '<a class="boton claro" href="' + E(encodeURI(A.excel)) + '" download>Descargar Excel</a></div>' +
        '<input type="search" class="buscador-visor" placeholder="Buscar actividad o insumo…" aria-label="Buscar en el análisis">' +
        '<div class="visor-lista" data-rol="lista-apu"></div>';
      var pintar = function (texto) {
        var palabras = Motor.normalizar(texto).split(' ').filter(Boolean);
        var filtradas = lista.filter(function (a) {
          if (!palabras.length) return true;
          var base = Motor.normalizar(a[0] + ' ' + a[1] + ' ' + a[8].map(function (i) { return i[1]; }).join(' '));
          return palabras.every(function (p) { return base.indexOf(p) !== -1; });
        });
        visor.querySelector('[data-rol="lista-apu"]').innerHTML = '<div class="apu-encabezado"><span>Código</span><span>Nombre de la tarea</span><span>Unidad</span><span class="num">Precio unitario</span></div>' +
          (filtradas.length ? filtradas.map(filaApu).join('') : '<p class="vacio">Sin actividades con esa búsqueda.</p>');
      };
      var t = null;
      visor.querySelector('.buscador-visor').addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { pintar(e.target.value); }, 150); });
      pintar('');
    }).catch(function () { visor.innerHTML = '<p class="vacio">No se pudo cargar assets/datos/apu.js. Ejecuta: node tools/generar_apu.js</p>'; });
  }

  function filaApu(a) {
    var G = window.APU.grupos;
    var insumos = a[8].map(function (i) {
      return '<tr><td>' + E(G[i[0]] || '') + '</td><td>' + E(i[1]) + '</td><td>' + E(i[2]) + '</td><td class="num">' + (i[3] == null ? '' : i[3].toLocaleString('es-CO', { maximumFractionDigits: 4 })) + '</td>' +
        '<td class="num">' + Motor.formatoMoneda(i[4]) + '</td><td class="num">' + Motor.formatoMoneda(i[5]) + '</td></tr>';
    }).join('');
    return '<details class="apu-actividad"><summary><span class="apu-codigo">' + E(a[0]) + '</span><span class="apu-nombre">' + E(a[1]) + (a[7] ? ' <span class="apu-revisar" title="El costo total del documento no coincide con la suma de insumos">revisar</span>' : '') + '</span>' +
      '<span>' + E(a[2]) + '</span><span class="num apu-precio">' + Motor.formatoMoneda(a[3]) + '</span></summary>' +
      '<div class="tabla-desplazable"><table class="tabla"><thead><tr><th>Grupo</th><th>Producto / insumo</th><th>Unidad</th><th class="num">Cantidad</th><th class="num">Valor unitario</th><th class="num">Valor parcial</th></tr></thead>' +
      '<tbody>' + insumos + '</tbody><tfoot><tr><td colspan="5">Precio por ' + E(a[2]) + '</td><td class="num">' + Motor.formatoMoneda(a[3]) + '</td></tr></tfoot></table></div></details>';
  }

  // =====================================================================
  // Diseno
  // =====================================================================
  // usuario.html · Buscador "¿Que deseas construir?" (entre el titulo y el navbar): coincidencias en casas prefabricadas y
  // servicios de construccion y remodelacion; Enter abre el catalogo de Construccion filtrado con el texto.
  var BUSQUEDA_PENDIENTE = '';
  (function conectarBuscadorUsuario() {
    var form = $('buscador-usuario');
    if (!form) return;
    var input = $('buscar-usuario'); var caja = $('resultados-busqueda'); var t = null;
    function pintar() {
      var palabras = Motor.normalizar(input.value).split(' ').filter(Boolean);
      if (!palabras.length) { caja.hidden = true; return; }
      var coincide = function (texto) { var n = Motor.normalizar(texto); return palabras.every(function (p) { return n.indexOf(p) !== -1; }); };
      var casas = window.PREFABRICADAS ? window.PREFABRICADAS.modelos.filter(function (x) { return x.precioM2 && x.imagen && coincide(x.modelo + ' ' + x.empresa + ' ' + x.acabado + ' ' + x.area + ' m2'); }) : [];
      var html = '';
      if (casas.length) html += '<p class="grupo-busqueda">Casas prefabricadas (' + casas.length + ')</p>' + casas.slice(0, 4).map(function (x) {
        return '<a href="#casas"><span>' + E(x.modelo) + '</span><small>' + E(x.empresa) + ' · ' + x.area + ' m² · ' + Motor.formatoMoneda(x.precio) + '</small></a>';
      }).join('');
      var pintarServicios = function () {
        var serv = SV.lista.filter(function (s) { return codigoDe(s, 'am') === 'AM01' && coincide(s.nombre + ' ' + s.codigo); });
        var h = html;
        if (serv.length) h += '<p class="grupo-busqueda">Servicios de construcción (' + serv.length + ')</p>' + serv.slice(0, 5).map(function (s) {
          return '<a href="#construccion/' + E(s.codigo) + '"><span>' + E(s.nombre) + '</span><small>' + E(s.unidad) + ' · ' + Motor.formatoMoneda(s.precio) + '</small></a>';
        }).join('') + '<a class="ver-todo-busqueda" href="#construccion/catalogo" data-buscar>Ver todos los servicios con “' + E(input.value) + '” →</a>';
        caja.innerHTML = h || '<p class="grupo-busqueda">Sin resultados</p>';
        caja.hidden = false;
      };
      if (SV) pintarServicios();
      else cargarApu().then(function () { prepararServicios(); pintarServicios(); });
    }
    // Adjuntar fotografia a la busqueda: se muestra como miniatura (la busqueda por imagen requiere servidor)
    var foto = $('foto-busqueda'); var mini = $('miniatura-busqueda');
    if (foto) foto.addEventListener('change', function () {
      var a = foto.files && foto.files[0]; if (!a) return;
      mini.innerHTML = '<img src="' + URL.createObjectURL(a) + '" alt="Foto adjunta"><button type="button" aria-label="Quitar foto">×</button>';
      mini.hidden = false; form.classList.add('con-foto');
      caja.innerHTML = '<p class="grupo-busqueda">Fotografía adjunta</p><p class="aviso-busqueda">La búsqueda por fotografía estará disponible próximamente. Mientras tanto, escribe qué deseas construir.</p>';
      caja.hidden = false; foto.value = '';
    });
    if (mini) mini.addEventListener('click', function (e) { if (e.target.closest('button')) { mini.hidden = true; mini.innerHTML = ''; form.classList.remove('con-foto'); caja.hidden = true; } });
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(pintar, 200); });
    input.addEventListener('focus', function () { if (input.value) pintar(); });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) caja.hidden = true; });
    caja.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      if (a.hasAttribute('data-buscar')) BUSQUEDA_PENDIENTE = input.value;
      caja.hidden = true;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      BUSQUEDA_PENDIENTE = input.value; caja.hidden = true;
      if (location.hash === '#construccion/catalogo') aplicarRuta(); else location.hash = '#construccion/catalogo';
    });
  })();

  // usuario.html · Barra inferior: marca el acceso activo (Inicio / Usuario) y muestra un aviso breve en los que aun no tienen funcion.
  function marcarBarraInferior(vista) {
    document.querySelectorAll('.barra-inferior [data-barra]').forEach(function (x) { x.classList.toggle('activo', x.getAttribute('data-barra') === vista); });
  }
  (function conectarBarraInferior() {
    var barra = document.querySelector('.barra-inferior'); if (!barra) return;
    var aviso = $('aviso-barra'); var t = null;
    barra.addEventListener('click', function (e) {
      var b = e.target.closest('[data-aviso]'); if (!b) return;
      aviso.textContent = b.getAttribute('data-aviso'); aviso.hidden = false;
      clearTimeout(t); t = setTimeout(function () { aviso.hidden = true; }, 2600);
    });
  })();

  // usuario.html · Ingresar: dos opciones (tengo usuario y contrasena / deseo registrarme).
  // El sitio es estatico (sin servidor): los formularios no crean cuentas ni guardan contrasenas; solo avisan.
  function conectarIngreso() {
    var cont = document.querySelector('[data-vista="ingresar"]');
    if (!cont || cont.getAttribute('data-listo')) return;
    cont.setAttribute('data-listo', '1');
    cont.addEventListener('click', function (e) {
      var b = e.target.closest('[data-panel]');
      if (!b) return;
      cont.querySelectorAll('.panel-ingreso').forEach(function (p) { p.hidden = p.id !== b.getAttribute('data-panel'); });
      cont.querySelectorAll('[data-panel]').forEach(function (x) { x.classList.toggle('activo', x === b); });
    });
    // Ingreso: valida usuario y contrasena (assets/datos/usuarios.js, clave en SHA-256) y abre la pagina del cliente
    // con el proyecto de ese usuario. Sesion en sessionStorage (se cierra con "Salir" o al cerrar la pestana).
    var fu = $('panel-usuario');
    if (fu) fu.addEventListener('submit', function (e) {
      e.preventDefault();
      var aviso = fu.querySelector('.aviso-ingreso');
      var usuario = fu.usuario.value.trim().toUpperCase(), clave = fu.clave.value;
      var u = (window.USUARIOS_CLIENTE || []).filter(function (x) { return x.usuario.toUpperCase() === usuario; })[0];
      var mostrar = function (t) { aviso.textContent = t; aviso.hidden = false; };
      if (!window.crypto || !crypto.subtle) return mostrar('Este navegador no permite validar la contraseña.');
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(clave)).then(function (buf) {
        var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        if (!u || u.clave !== hex) { fu.clave.value = ''; return mostrar('Usuario o contraseña incorrectos.'); }
        try { sessionStorage.setItem('construmaster_sesion', JSON.stringify({ usuario: u.usuario, nombre: u.nombre, proyecto: u.proyecto, inicio: new Date().toISOString() })); } catch (err) { /* sin almacenamiento */ }
        location.href = 'pages/Cliente/index.html';
      });
    });
    var fr = $('panel-registro');
    if (fr) fr.addEventListener('submit', function (e) { e.preventDefault(); fr.querySelector('.aviso-ingreso').hidden = false; fr.reset(); });
  }

  // =====================================================================
  // Diseno (administrador): los tres servicios en cards (index.html) y la BIBLIOTECA DE PROYECTOS:
  //   ADMINISTRADOR -> CREAR PROYECTO -> DILIGENCIAR FORMULARIO -> CREAR -> ABRIR REPOSITORIO -> CONSULTAR / AGREGAR
  // Rutas: #diseno (listado) · #diseno/crear (formulario) · #diseno/proyecto-N (repositorio del proyecto).
  // Sin servidor (docs/PLAN_BIBLIOTECA_PROYECTOS.md): los proyectos con carpeta vienen de assets/datos/biblioteca.js
  // (node tools/generar_biblioteca.js); los creados con el formulario, las asignaciones a clientes y los archivos
  // agregados se guardan en este navegador hasta que se cree la carpeta (node tools/crear_proyecto.js "PROYECTO N.json").
  // =====================================================================
  var BIB_CLAVE = 'construmaster_biblioteca';
  var BIB_TIPOS = ['Vivienda', 'Remodelación', 'Licencia', 'Dibujo de planos'];
  var BIB_SECCIONES = [['fotos', 'Proyecto'], ['planos', 'Planos'], ['programacion', 'Programación de obra'], ['presupuesto', 'Presupuesto de obra'], ['adjuntos', 'Adjuntos']];
  function bibLocal() {
    try { var b = JSON.parse(localStorage.getItem(BIB_CLAVE)); if (b && b.proyectos) return b; } catch (e) { /* sin almacenamiento */ }
    return { proyectos: [], asignaciones: {}, adjuntos: {} };
  }
  function bibGuardar(b) { try { localStorage.setItem(BIB_CLAVE, JSON.stringify(b)); } catch (e) { /* sin almacenamiento */ } }
  // Todos los proyectos: los que tienen carpeta y los creados en el navegador que aun no la tienen
  function bibProyectos() {
    var conCarpeta = ((window.BIBLIOTECA || {}).proyectos || []).map(function (p) { return { numero: p.numero, ficha: p.ficha, archivos: p.archivos, carpeta: p.carpeta }; });
    var nums = conCarpeta.map(function (p) { return p.numero; });
    var locales = bibLocal().proyectos.filter(function (f) { return nums.indexOf(f.numero) === -1; }).map(function (f) { return { numero: f.numero, ficha: f, archivos: [], carpeta: null }; });
    return conCarpeta.concat(locales).sort(function (a, b) { return a.numero - b.numero; });
  }
  // Cliente asignado: el que se asigno en este navegador o el de la ficha del proyecto
  function bibCliente(n) {
    var asignado = bibLocal().asignaciones[n]; if (asignado !== undefined) return asignado;
    var p = bibProyectos().filter(function (x) { return x.numero === n; })[0];
    return (p && p.ficha.cliente) || '';
  }
  function descargarJson(nombre, datos) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  }

  function renderDiseno(sub) {
    var cont = $('diseno-contenido'); sub = sub || '';
    var intro = document.querySelector('[data-vista="diseno"] .servicios-diseno');
    if (intro) intro.hidden = !!sub;
    if (sub === 'crear') return formularioCrearProyecto(cont);
    var m = sub.match(/^proyecto-(\d+)/);
    if (m) return repositorioProyecto(cont, Number(m[1]), sub.split('/')[1] || 'fotos');
    // Listado de la Biblioteca
    var lista = bibProyectos();
    cont.innerHTML = '<section class="biblioteca-proyectos"><div class="biblioteca-cabecera"><div></div>' +
      '<a class="boton-principal" href="#diseno/crear">+ Crear proyecto</a></div>' +
      '<div class="tabla-biblioteca"><table><thead><tr><th>Proyecto</th><th>Nombre</th><th>Tipo</th><th>Cliente</th><th>Carpeta</th><th></th></tr></thead><tbody>' +
      lista.map(function (p) {
        return '<tr><td><b>PROYECTO ' + p.numero + '</b></td><td>' + E(p.ficha.nombre || '') + (p.ficha.propietario ? '<small>' + E(p.ficha.propietario) + '</small>' : '') + '</td><td>' + E(p.ficha.tipo || '') + '</td>' +
          '<td>' + (bibCliente(p.numero) ? E(bibCliente(p.numero)) : '<span class="texto-suave">Sin asignar</span>') + '</td>' +
          '<td>' + (p.carpeta ? '<span class="estado-carpeta creada">Creada</span>' : '<span class="estado-carpeta pendiente">Pendiente</span>') + '</td>' +
          '<td><a class="enlace-abrir" href="#diseno/proyecto-' + p.numero + '">Abrir repositorio →</a></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  // Formulario "Crear proyecto"
  function formularioCrearProyecto(cont) {
    var M = window.MUNICIPIOS;
    var siguiente = bibProyectos().reduce(function (mx, p) { return Math.max(mx, p.numero); }, 0) + 1;
    var num = function (n, et, max) { var o = ''; for (var i = 0; i <= max; i++) o += '<option>' + i + '</option>'; return '<label>' + et + '<select name="' + n + '" required><option value="">Selecciona</option>' + o + '</select></label>'; };
    cont.innerHTML = '<a class="volver" href="#diseno">← Biblioteca de proyectos</a>' +
      '<form class="formulario-presupuesto formulario-crear-proyecto" id="form-crear-proyecto">' +
      '<fieldset><legend>Proyecto ' + siguiente + '</legend>' +
      '<label>Nombre del proyecto<input type="text" name="nombre" required></label>' +
      '<label>Nombre del propietario<input type="text" name="propietario" required></label>' +
      '<div class="opciones-radio"><span>Tipo</span>' + BIB_TIPOS.map(function (t, i) { return '<label><input type="radio" name="tipo" value="' + t + '"' + (i ? '' : ' required') + '> ' + t + '</label>'; }).join('') + '</div></fieldset>' +
      '<fieldset><legend>Ubicación</legend>' +
      '<label>Departamento<select name="departamento" required><option value="">Selecciona el departamento</option>' + (M ? M.departamentos.map(function (d, i) { return '<option value="' + i + '">' + E(d.nombre) + '</option>'; }).join('') : '') + '</select></label>' +
      '<label>Ciudad o municipio<select name="municipio" required disabled><option value="">Primero elige el departamento</option></select></label>' +
      '<div class="opciones-radio"><span>Zona</span><label><input type="radio" name="zona" value="Urbana" required> Urbana</label><label><input type="radio" name="zona" value="Rural"> Rural</label></div></fieldset>' +
      '<fieldset><legend>Datos de la construcción</legend>' +
      '<label>Área (m²)<input type="number" name="area" min="1" max="100000" step="0.01" required></label>' +
      num('puertas', 'Número de puertas', 40) + num('banos', 'Número de baños', 12) + '</fieldset>' +
      '<button type="submit" class="boton-principal oscuro">Crear proyecto</button></form>';
    var f = $('form-crear-proyecto');
    f.departamento.addEventListener('change', function () {
      var d = M && M.departamentos[f.departamento.value];
      f.municipio.disabled = !d;
      f.municipio.innerHTML = d ? '<option value="">Selecciona la ciudad o municipio</option>' + d.municipios.map(function (x) { return '<option>' + E(x) + '</option>'; }).join('') : '<option value="">Primero elige el departamento</option>';
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ficha = { numero: siguiente, nombre: f.nombre.value.trim(), propietario: f.propietario.value.trim(), tipo: f.tipo.value,
        departamento: M ? M.departamentos[f.departamento.value].nombre : '', municipio: f.municipio.value, zona: f.zona.value,
        area: Number(f.area.value), puertas: Number(f.puertas.value), banos: Number(f.banos.value), cliente: '', creado: new Date().toISOString().slice(0, 10) };
      var b = bibLocal(); b.proyectos.push(ficha); bibGuardar(b);
      location.hash = '#diseno/proyecto-' + siguiente; // abre el repositorio del proyecto recien creado
    });
  }

  // Repositorio de un proyecto: ficha, cliente asignado y las secciones con archivos (consultar, ver, descargar, agregar)
  function repositorioProyecto(cont, n, sec) {
    var p = bibProyectos().filter(function (x) { return x.numero === n; })[0];
    if (!p) { cont.innerHTML = '<a class="volver" href="#diseno">← Biblioteca de proyectos</a><p class="vacio">No existe el PROYECTO ' + n + '.</p>'; return; }
    var b = bibLocal(); var agregados = (b.adjuntos[n] || []);
    var fi = p.ficha;
    var datos = [['Proyecto ' + n, fi.nombre], ['Propietario', fi.propietario], ['Tipo', fi.tipo], ['Ubicación', [fi.municipio, fi.departamento].filter(Boolean).join(', ') + (fi.zona ? ' · ' + fi.zona : '')],
      ['Área', fi.area ? String(fi.area).replace(/ ?m²$/, '') + ' m²' : ''], ['Puertas', fi.puertas], ['Baños', fi.banos], ['Empresa', fi.empresa], ['Creado', fi.creado]]
      .filter(function (d) { return d[1] !== undefined && d[1] !== '' && d[1] !== null; });
    var enSec = function (s) { return p.archivos.filter(function (a) { return a.seccion === s || (s === 'adjuntos' && a.seccion === 'otros'); }); };
    var archivosSec = enSec(sec); var agregadosSec = agregados.filter(function (a) { return a.seccion === sec; });
    var esImagen = function (n2) { return /\.(webp|jpe?g|png)$/i.test(n2); };
    cont.innerHTML = '<a class="volver" href="#diseno">← Biblioteca de proyectos</a>' +
      '<div class="repo-cabecera"><div></div>' +
      '<div class="repo-cliente"><label>Cliente asignado<input type="text" id="repo-cliente" value="' + E(bibCliente(n)) + '" placeholder="Nombre del cliente"></label><button type="button" class="boton-principal oscuro" id="repo-asignar">Asignar</button></div></div>' +
      '<dl class="repo-ficha">' + datos.map(function (d) { return '<div><dt>' + E(d[0]) + '</dt><dd>' + E(d[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (p.carpeta ? '<p class="texto-suave">Carpeta: <code>' + E(p.carpeta) + '</code></p>'
        : '<p class="aviso repo-pendiente">Carpeta pendiente de crear. <button type="button" id="repo-descargar-ficha">Descargar ficha</button> y ejecutar <code>node tools/crear_proyecto.js "PROYECTO ' + n + '.json"</code>, luego <code>node tools/generar_biblioteca.js</code>.</p>') +
      '<nav class="repo-pestanas">' + BIB_SECCIONES.map(function (s) {
        var c = enSec(s[0]).length + agregados.filter(function (a) { return a.seccion === s[0]; }).length;
        return '<a href="#diseno/proyecto-' + n + '/' + s[0] + '"' + (s[0] === sec ? ' class="activo"' : '') + '>' + s[1] + ' <span>' + c + '</span></a>';
      }).join('') + '</nav>' +
      '<div class="repo-seccion">' +
      (sec === 'fotos' && archivosSec.some(function (a) { return esImagen(a.nombre); }) ? '<div class="fotos-proyecto">' + archivosSec.filter(function (a) { return esImagen(a.nombre); }).map(function (a) { return '<a href="' + E(a.ruta) + '" target="_blank" rel="noopener"><img src="' + E(a.ruta) + '" alt="' + E(a.nombre) + '" loading="lazy"></a>'; }).join('') + '</div>' : '') +
      '<ul class="repo-archivos">' + archivosSec.map(function (a) {
        return '<li><span class="icono-pdf' + (/\.xls/i.test(a.nombre) ? ' icono-excel' : '') + '">' + E((a.nombre.split('.').pop() || '').toUpperCase()) + '</span><span class="nombre-plano">' + E(a.nombre) + '<small>' + a.kb + ' KB</small></span>' +
          '<a href="' + E(a.ruta) + '" target="_blank" rel="noopener">Ver</a><a href="' + E(a.ruta) + '" download>Descargar</a></li>';
      }).join('') + agregadosSec.map(function (a) {
        return '<li><span class="icono-pdf icono-pendiente">NUEVO</span><span class="nombre-plano">' + E(a.nombre) + '<small>' + a.kb + ' KB · agregado el ' + E(a.fecha) + ' · se copia a la carpeta al crearla</small></span></li>';
      }).join('') + '</ul>' +
      (archivosSec.length + agregadosSec.length ? '' : '<p class="vacio">Sin archivos en esta sección.</p>') +
      '<label class="boton-fotos repo-agregar">+ Agregar archivos<input type="file" id="repo-agregar" multiple hidden></label></div>';
    $('repo-asignar').addEventListener('click', function () {
      var b2 = bibLocal(); b2.asignaciones[n] = $('repo-cliente').value.trim(); bibGuardar(b2);
      var loc = b2.proyectos.filter(function (x) { return x.numero === n; })[0]; if (loc) { loc.cliente = b2.asignaciones[n]; bibGuardar(b2); }
      $('repo-asignar').textContent = 'Asignado ✓'; setTimeout(function () { $('repo-asignar').textContent = 'Asignar'; }, 1500);
    });
    var df = $('repo-descargar-ficha');
    if (df) df.addEventListener('click', function () { var fx = Object.assign({}, fi, { cliente: bibCliente(n), adjuntos: agregados }); descargarJson('PROYECTO ' + n + '.json', fx); });
    $('repo-agregar').addEventListener('change', function (e) {
      var b3 = bibLocal(); b3.adjuntos[n] = b3.adjuntos[n] || [];
      Array.prototype.forEach.call(e.target.files, function (a) { b3.adjuntos[n].push({ seccion: sec, nombre: a.name, kb: Math.round(a.size / 1024), fecha: new Date().toISOString().slice(0, 10) }); });
      bibGuardar(b3); repositorioProyecto(cont, n, sec);
    });
  }

  // =====================================================================
  $('boton-menu').addEventListener('click', function () { navbar.classList.toggle('abierto'); });
  // Desplegable "Catalogo" (Proveedores · Marcas): se abre al pasar el cursor; en celular, tocando la flecha
  document.querySelectorAll('#navbar .menu-desplegable').forEach(function (li) {
    var flecha = li.querySelector('.flecha-menu');
    if (flecha) flecha.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); li.classList.toggle('abierto'); });
    document.addEventListener('click', function (e) { if (!li.contains(e.target)) li.classList.remove('abierto'); });
    window.addEventListener('hashchange', function () { li.classList.remove('abierto'); });
  });
  window.addEventListener('hashchange', aplicarRuta);
  aplicarRuta();
}());
