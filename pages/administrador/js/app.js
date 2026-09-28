(function () {
  'use strict';

  var MP = window.DATOS_BOULEVARD;
  var ME = window.DATOS_CONSTRUMASTER;
  var MO = { titulo: 'Modelo Optimizado', proyecto: [], etapas: { negra: { nombre: 'Obra Negra', color: '#2b2d34' }, gris: { nombre: 'Obra Gris', color: '#6b7280' }, blanca: { nombre: 'Obra Blanca', color: '#c9a24b' } }, capitulos: [], imagenes: [] };
  var MODELOS = { mp: MP, me: ME, mo: MO };
  var OBRA = window.DATOS_ETAPAS;

  var vistaActual = 'inicio';
  var filtroMateriales = '';
  var etiquetaMateriales = '';
  var CLAVE_NOTAS = 'cm_admin_notas_etapas';

  function leerNotas() { try { return JSON.parse(localStorage.getItem(CLAVE_NOTAS) || '{}'); } catch (e) { return {}; } }
  function guardarNotas(notas) { try { localStorage.setItem(CLAVE_NOTAS, JSON.stringify(notas)); } catch (e) {} }
  function claveNota(etapaN, subetapa) { return etapaN + '::' + subetapa; }

  var TABS = [
    { id: 'raiz', texto: '← ConstruMaster', titulo: 'Volver al sitio principal de ConstruMaster', href: '../../index.html' },
    { id: 'inicio', texto: 'Inicio' },
    { id: 'mp', texto: 'MP', titulo: 'Proyectado · Boulevard de los Sueños' },
    { id: 'me', texto: 'ME', titulo: 'Modelo Ejecutado · V1 Construmaster' },
    { id: 'mo', texto: 'MO', titulo: 'Modelo Optimizado · pendiente de construir' },
    { id: 'catalogo', texto: 'Catálogo', titulo: 'Materiales y catálogos externos' },
    { id: 'obra', texto: 'OBRA', titulo: 'Etapas de obra y formulario de seguimiento' },
  ];

  function tabActiva() {
    if (vistaActual.indexOf('mp-') === 0) return 'mp';
    if (vistaActual.indexOf('me-') === 0) return 'me';
    if (vistaActual.indexOf('mo-') === 0) return 'mo';
    if (vistaActual === 'materiales') return 'catalogo';
    if (vistaActual.indexOf('obra-') === 0) return 'obra';
    return vistaActual;
  }

  function renderNavtabs() {
    var activa = tabActiva();
    var html = TABS.map(function (t) {
      if (t.href) {
        return '<a href="' + t.href + '" title="' + Motor.escaparHtml(t.titulo || '') + '" style="text-decoration:none;">' + t.texto + '</a>';
      }
      return '<button type="button" class="' + (activa === t.id ? 'activo' : '') + '" data-tab="' + t.id + '" title="' + Motor.escaparHtml(t.titulo || '') + '">' + t.texto + '</button>';
    }).join('');
    var cont = document.getElementById('navtabs');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-tab]').forEach(function (el) {
      el.addEventListener('click', function () {
        var tab = el.getAttribute('data-tab');
        if (tab === 'mp' || tab === 'me' || tab === 'mo') mostrarVista(tab + '-resumen');
        else if (tab === 'catalogo') mostrarVista('materiales');
        else if (tab === 'obra') mostrarVista('obra-resumen');
        else mostrarVista(tab);
      });
    });
  }

  function conectarClicksSidebar(cont) {
    cont.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }
  function conectarClicksMain(main) {
    main.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }

  function renderSidebar() {
    var activa = tabActiva();
    var cont = document.getElementById('sidebar-contenido');

    if (activa === 'mp' || activa === 'me' || activa === 'mo') {
      var datos = MODELOS[activa];
      if (!datos.capitulos.length) {
        cont.innerHTML = '<div style="padding:16px 18px;font-size:0.82rem;color:var(--color-texto-suave);">Todavía no hay capítulos cargados para este modelo.</div>';
        return;
      }
      var html = Motor.renderSidebarCapitulos(datos.capitulos, datos.etapas, vistaActual, activa + '-');
      html += '<button type="button" class="item-sidebar' + (vistaActual === activa + '-imagenes' ? ' activo' : '') + '" data-vista="' + activa + '-imagenes">Imágenes (' + datos.imagenes.length + ')</button>';
      cont.innerHTML = html;
      conectarClicksSidebar(cont);
      return;
    }

    if (activa === 'catalogo') {
      cont.innerHTML = '<div style="padding:16px 18px;">' +
        '<ul class="lista-enlaces-catalogo">' +
        '<li><button type="button" class="item-sidebar' + (vistaActual === 'materiales' ? ' activo' : '') + '" data-vista="materiales" style="border:1px solid var(--color-borde);border-radius:var(--radio);">Materiales (hoja interna COMFER)</button></li>' +
        '<li><a href="../catalogo homecenter/index.html">Catálogo Homecenter ↗</a></li>' +
        '<li><a href="../catalogo comfer/index.html">Catálogo COMFER ↗</a></li>' +
        '</ul></div>';
      return;
    }

    if (activa === 'obra') {
      var htmlObra = '<button type="button" class="item-sidebar' + (vistaActual === 'obra-resumen' ? ' activo' : '') + '" data-vista="obra-resumen">Resumen</button>';
      ['negra', 'gris', 'blanca'].forEach(function (key) {
        var etapaInfo = OBRA.etapasColor[key];
        var etapas = OBRA.etapas.filter(function (e) { return e.etapa === key; });
        if (!etapas.length) return;
        var abierto = etapas.some(function (e) { return vistaActual === 'obra-etapa-' + e.n; });
        htmlObra += '<details class="grupo-etapa"' + (abierto ? ' open' : '') + '>' +
          '<summary style="border-left-color:' + etapaInfo.color + '">' + Motor.escaparHtml(etapaInfo.nombre) + '</summary>';
        etapas.forEach(function (e) {
          var v = 'obra-etapa-' + e.n;
          htmlObra += '<button type="button" class="item-capitulo' + (vistaActual === v ? ' activo' : '') + '" data-vista="' + v + '"><span class="num">' + e.n + '</span>' + Motor.escaparHtml(e.nombre) + '</button>';
        });
        htmlObra += '</details>';
      });
      cont.innerHTML = htmlObra;
      conectarClicksSidebar(cont);
      return;
    }

    cont.innerHTML = '<div style="padding:16px 18px;font-size:0.82rem;color:var(--color-texto-suave);">Elegí MP, ME, MO, Catálogo u OBRA arriba.</div>';
  }

  function renderInicio() {
    return '<h2>Panel de administrador</h2>' +
      '<p>Gestión de los modelos de presupuesto, el catálogo de materiales y el seguimiento de etapas de obra.</p>' +
      '<div class="grilla-capitulos">' +
      '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#2b2d34" data-vista="mp-resumen"><span class="num">MP</span><span class="nombre">Proyectado</span><span class="subtotal">Boulevard de los Sueños</span></button>' +
      '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#c9a24b" data-vista="me-resumen"><span class="num">ME</span><span class="nombre">Modelo Ejecutado</span><span class="subtotal">V1 Construmaster</span></button>' +
      '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#6b7280" data-vista="mo-resumen"><span class="num">MO</span><span class="nombre">Optimizado</span><span class="subtotal">Por construir</span></button>' +
      '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#6b7280" data-vista="materiales"><span class="num">Catálogo</span><span class="nombre">Materiales</span><span class="subtotal">' + ME.materiales.length + ' productos</span></button>' +
      '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#354b3e" data-vista="obra-resumen"><span class="num">OBRA</span><span class="nombre">Etapas de obra</span><span class="subtotal">' + OBRA.etapas.length + ' etapas · formulario de seguimiento</span></button>' +
      '</div>';
  }

  function renderMaterialesVista() {
    var main = document.getElementById('main-contenido');
    main.innerHTML = Motor.renderMateriales(ME.materiales, filtroMateriales, etiquetaMateriales);
    var input = document.getElementById('buscador-materiales');
    input.addEventListener('input', function () {
      filtroMateriales = input.value;
      renderMaterialesVista();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    main.querySelectorAll('.chip-etiqueta').forEach(function (el) {
      el.addEventListener('click', function () { etiquetaMateriales = el.getAttribute('data-etiqueta'); renderMaterialesVista(); });
    });
  }

  function totalEtapasConNotas() {
    var notas = leerNotas();
    var total = 0;
    Object.keys(notas).forEach(function (k) { if (notas[k] && notas[k].trim()) total++; });
    return total;
  }

  function renderObraResumen() {
    var html = '<h2>Etapas de obra · seguimiento</h2>' +
      '<p>Formulario de notas y observaciones por subetapa, basado en <code>docs/ETAPAS OBRA</code>. Se guarda automáticamente en este navegador.</p>' +
      '<div class="aviso-nota">' + totalEtapasConNotas() + ' subetapa(s) con notas cargadas hasta ahora.</div>' +
      '<button type="button" class="boton-cargar" id="boton-exportar-excel" style="margin-bottom:20px;">Descargar Excel de etapas + notas</button>';
    ['negra', 'gris', 'blanca'].forEach(function (key) {
      var etapaInfo = OBRA.etapasColor[key];
      var etapas = OBRA.etapas.filter(function (e) { return e.etapa === key; });
      if (!etapas.length) return;
      html += '<h3 class="titulo-etapa" style="border-left-color:' + etapaInfo.color + '">' + Motor.escaparHtml(etapaInfo.nombre) + '</h3><div class="grilla-capitulos">';
      etapas.forEach(function (e) {
        html += '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:' + etapaInfo.color + '" data-vista="obra-etapa-' + e.n + '"><span class="num">Etapa ' + e.n + '</span><span class="nombre">' + Motor.escaparHtml(e.nombre) + '</span><span class="subtotal">' + e.subetapas.length + ' subetapas</span></button>';
      });
      html += '</div>';
    });
    return html;
  }

  function renderObraEtapa(e) {
    var etapaInfo = OBRA.etapasColor[e.etapa];
    var notas = leerNotas();
    var campos = e.subetapas.map(function (s, i) {
      var clave = claveNota(e.n, s);
      var valor = notas[clave] || '';
      return '<div class="campo-nota"><label for="nota-' + i + '">' + (i + 1) + '. ' + Motor.escaparHtml(s) + '</label>' +
        '<textarea id="nota-' + i + '" data-clave="' + Motor.escaparHtml(clave) + '" placeholder="Notas / observaciones…">' + Motor.escaparHtml(valor) + '</textarea></div>';
    }).join('');
    return '<h2 style="border-left:4px solid ' + etapaInfo.color + '; padding-left:10px;">' + e.n + '. ' + Motor.escaparHtml(e.nombre) + '</h2>' +
      '<p class="fuente-hoja">Carpeta: <code>docs/ETAPAS OBRA/' + Motor.escaparHtml(e.carpeta) + '</code></p>' +
      campos +
      '<div class="barra-guardado"><span class="estado-guardado" id="estado-guardado">Los cambios se guardan automáticamente.</span></div>';
  }

  function conectarFormularioObra(main) {
    main.querySelectorAll('textarea[data-clave]').forEach(function (ta) {
      ta.addEventListener('input', function () {
        var notas = leerNotas();
        notas[ta.getAttribute('data-clave')] = ta.value;
        guardarNotas(notas);
        var estado = document.getElementById('estado-guardado');
        if (estado) { estado.textContent = 'Guardado ' + new Date().toLocaleTimeString('es-CO'); }
      });
    });
    var botonExportar = document.getElementById('boton-exportar-excel');
    if (botonExportar) botonExportar.addEventListener('click', exportarExcelEtapas);
  }

  function exportarExcelEtapas() {
    var notas = leerNotas();
    var filas = [];
    OBRA.etapas.forEach(function (e) {
      e.subetapas.forEach(function (s) {
        filas.push({
          'ETAPA': e.n + '. ' + e.nombre,
          'SUBETAPA': s,
          'CARPETA': e.carpeta,
          'NOTAS / OBSERVACIONES': notas[claveNota(e.n, s)] || '',
        });
      });
    });
    var ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [{ wch: 22 }, { wch: 35 }, { wch: 20 }, { wch: 60 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Etapas de Obra');
    XLSX.writeFile(wb, 'etapas_de_obra.xlsx');
  }

  function mostrarVista(vista) {
    vistaActual = vista;
    renderNavtabs();
    renderSidebar();
    var main = document.getElementById('main-contenido');

    if (vista === 'inicio') { main.innerHTML = renderInicio(); conectarClicksMain(main); return; }
    if (vista === 'materiales') { renderMaterialesVista(); return; }
    if (vista === 'obra-resumen') { main.innerHTML = renderObraResumen(); conectarClicksMain(main); conectarFormularioObra(main); return; }

    var mObra = /^obra-etapa-(\d+)$/.exec(vista);
    if (mObra) {
      var e = OBRA.etapas.filter(function (x) { return x.n === Number(mObra[1]); })[0];
      if (e) { main.innerHTML = renderObraEtapa(e); conectarFormularioObra(main); }
      return;
    }

    var prefijo = /^(mp|me|mo)-/.exec(vista);
    if (prefijo) {
      prefijo = prefijo[1];
      var datos = MODELOS[prefijo];
      var sub = vista.replace(/^(mp|me|mo)-/, '');
      if (sub === 'resumen') {
        if (!datos.capitulos.length) { main.innerHTML = '<h2>' + Motor.escaparHtml(datos.titulo) + '</h2><p class="vacio">Este modelo todavía no tiene capítulos cargados.</p>'; return; }
        main.innerHTML = Motor.renderResumen(datos, prefijo + '-');
        conectarClicksMain(main);
        return;
      }
      if (sub === 'imagenes') { main.innerHTML = Motor.renderGaleriaImagenes(datos.imagenes); return; }
      var m = /^cap-(\d+)$/.exec(sub);
      if (m) {
        var cap = datos.capitulos.filter(function (c) { return c.n === Number(m[1]); })[0];
        var etapa = datos.etapas[cap.etapa];
        main.innerHTML = Motor.renderTablaCapitulo(cap, etapa.color);
      }
    }
  }

  mostrarVista('inicio');
})();
