(function () {
  'use strict';

  var MP = window.DATOS_BOULEVARD;       // MP · Proyectado
  var ME = window.DATOS_CONSTRUMASTER;   // ME · Modelo Ejecutado
  var MO = {                             // MO · Modelo Optimizado (por construir)
    modelo: 'MO',
    titulo: 'Modelo Optimizado',
    proyecto: [],
    etapas: { negra: { nombre: 'Obra Negra', color: '#2b2d34' }, gris: { nombre: 'Obra Gris', color: '#6b7280' }, blanca: { nombre: 'Obra Blanca', color: '#c9a24b' } },
    capitulos: [],
    imagenes: [],
  };

  var MODELOS = { mp: MP, me: ME, mo: MO };
  var vistaActual = 'inicio';
  var filtroMateriales = '';
  var etiquetaMateriales = '';
  var CLAVE_CARRITO = 'cm_carrito_materiales';
  var CLAVE_COMPARACION = 'cm_comparacion_materiales';

  var TABS = [
    { id: 'inicio', texto: 'Inicio' },
    { id: 'materiales', texto: 'Materiales', titulo: ME.materiales.length + ' materiales COMFER (hoja interna)' },
    { id: 'homecenter', texto: 'Catálogo Homecenter', titulo: 'Mapa de categorías de homecenter.com.co', href: '../catalogo homecenter/index.html' },
    { id: 'comfer', texto: 'Catálogo COMFER', titulo: 'Catálogo real de comfer.co', href: '../catalogo comfer/index.html' },
    { id: 'alfa', texto: 'ALFA', titulo: 'Catálogo ALFA', href: '../Paginas especializadas/ALFA/index.html' },
    { id: 'baezo', texto: 'BAEZO', titulo: 'Catálogo BAEZO', href: '../Paginas especializadas/BAEZO/index.html' },
    { id: 'corona', texto: 'Corona', titulo: 'Catálogo Corona', href: '../Paginas especializadas/corona/index.html' },
    { id: 'ipecol', texto: 'IPECOL', titulo: 'Catálogo IPECOL', href: '../Paginas especializadas/IPECOL/index.html' },
    { id: 'pavco', texto: 'PAVCO', titulo: 'Catálogo PAVCO', href: '../Paginas especializadas/PAVCO/index.html' },
    { id: 'pinturasyyesos', texto: 'Pinturas y Yesos', titulo: 'Catálogo Pinturas y Yesos', href: '../Paginas especializadas/PinturasYYesos/index.html' },
    { id: 'santafe', texto: 'SANTAFE', titulo: 'Catálogo SANTAFE', href: '../Paginas especializadas/SANTAFE/index.html' },
    { id: 'soelco', texto: 'Soelco', titulo: 'Catálogo Soelco', href: '../Paginas especializadas/Soelco/index.html' },
    { id: 'solimpro', texto: 'Solimpro', titulo: 'Catálogo Solimpro', href: '../Paginas especializadas/Solimpro/index.html' },
    { id: 'gyj', texto: 'G&J', titulo: 'Catálogo G&J', href: '../Paginas especializadas/G&J/inventario-gyj/index.html' },
  ];

  function tabActiva() {
    if (vistaActual.indexOf('mp-') === 0) return 'mp';
    if (vistaActual.indexOf('me-') === 0) return 'me';
    if (vistaActual.indexOf('mo-') === 0) return 'mo';
    return vistaActual; // 'inicio' | 'materiales'
  }

  function totalProyecto(datos) {
    var campoTotal = (datos.proyecto || []).filter(function (c) {
      var n = Motor.normalizar(c.etiqueta);
      return n === 'total' || n === 'valor total';
    })[0];
    if (campoTotal && Number(campoTotal.valor) > 0) return Number(campoTotal.valor);
    return datos.capitulos.reduce(function (acc, c) { return acc + (c.subtotal || 0); }, 0);
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
        mostrarVista(tab);
      });
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
    if (activa === 'materiales') {
      cont.innerHTML = '<div style="padding:16px 18px;font-size:0.82rem;color:var(--color-texto-suave);">' +
        'Catálogo COMFER (hoja interna) extraído de <strong>ME · V1 Construmaster</strong>.<br><br>Usá el buscador y las etiquetas en el panel principal para filtrar.<br><br>Para el catálogo real de comfer.co con imágenes, usá la pestaña <strong>Catálogo COMFER</strong> arriba.</div>';
      return;
    }
    cont.innerHTML = '<div style="padding:16px 18px;font-size:0.82rem;color:var(--color-texto-suave);">' +
      'Elegí <strong>Materiales</strong> para consultar el catálogo interno o seleccioná un almacén en las pestañas superiores.</div>';
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

  function leerPersistido(clave, valorInicial) {
    try { return JSON.parse(localStorage.getItem(clave) || JSON.stringify(valorInicial)); } catch (e) { return valorInicial; }
  }

  function guardarPersistido(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
  }

  function claveMaterial(material) { return material.nombre; }
  function carritoMateriales() { return leerPersistido(CLAVE_CARRITO, {}); }
  function comparacionMateriales() { return leerPersistido(CLAVE_COMPARACION, []); }
  function precioMaterial(material) { return Number(material.precio) || 0; }
  function totalCarrito(carrito) {
    return Object.keys(carrito).reduce(function (total, clave) {
      return total + precioMaterial(carrito[clave]) * Number(carrito[clave].cantidad || 0);
    }, 0);
  }

  function renderCarrito(carrito) {
    var claves = Object.keys(carrito);
    if (!claves.length) return '<p class="vacio">Todavía no agregaste materiales.</p>';
    return '<div class="lista-carrito">' + claves.map(function (clave) {
      var item = carrito[clave];
      return '<div class="fila-carrito"><span>' + Motor.escaparHtml(item.nombre) + '</span><strong>' + item.cantidad + ' × ' + Motor.formatoMoneda(item.precio) + '</strong><button type="button" data-quitar-carrito="' + Motor.escaparHtml(clave) + '" aria-label="Quitar material">×</button></div>';
    }).join('') + '</div>';
  }

  function renderComparacion(materiales) {
    var claves = comparacionMateriales();
    if (!claves.length) return '<p class="vacio">Selecciona hasta 3 materiales para compararlos.</p>';
    var filas = claves.map(function (clave) { return materiales.filter(function (m) { return claveMaterial(m) === clave; })[0]; }).filter(Boolean);
    return '<div class="tabla-comparacion">' + filas.map(function (material) {
      return '<div><strong>' + Motor.escaparHtml(material.nombre) + '</strong><span>' + Motor.formatoMoneda(material.precio) + '</span><button type="button" data-quitar-comparacion="' + Motor.escaparHtml(claveMaterial(material)) + '">Quitar</button></div>';
    }).join('') + '</div>';
  }

  function renderMaterialesTrabajo() {
    var materiales = ME.materiales || [];
    var carrito = carritoMateriales();
    var comparacion = comparacionMateriales();
    var filtrados = materiales.filter(function (material) {
      var texto = Motor.normalizar(filtroMateriales || '');
      return (!texto || Motor.normalizar(material.nombre).indexOf(texto) !== -1) && (!etiquetaMateriales || (material.etiquetas || []).indexOf(etiquetaMateriales) !== -1);
    }).slice(0, 300);
    var filas = filtrados.map(function (material) {
      var clave = claveMaterial(material);
      var cantidad = carrito[clave] ? carrito[clave].cantidad : 0;
      var estaComparando = comparacion.indexOf(clave) !== -1;
      return '<tr><td><strong>' + Motor.escaparHtml(material.nombre) + '</strong><div class="etiquetas-material">' + (material.etiquetas || []).slice(0, 3).map(function (tag) { return '<span>' + Motor.escaparHtml(tag) + '</span>'; }).join('') + '</div></td><td>' + Motor.formatoMoneda(material.precio) + '</td><td><div class="control-cantidad"><button type="button" data-cantidad="-1" data-material="' + Motor.escaparHtml(clave) + '">−</button><output>' + cantidad + '</output><button type="button" data-cantidad="1" data-material="' + Motor.escaparHtml(clave) + '">+</button></div></td><td><button type="button" class="boton-carrito" data-agregar-carrito="' + Motor.escaparHtml(clave) + '">' + (cantidad ? 'En carrito' : 'Agregar') + '</button><button type="button" class="boton-comparar' + (estaComparando ? ' activo' : '') + '" data-comparar="' + Motor.escaparHtml(clave) + '">' + (estaComparando ? 'Comparando' : 'Comparar') + '</button></td></tr>';
    }).join('');
    var etiquetas = Motor.etiquetasUnicas(materiales).slice(0, 20).map(function (e) { return '<button type="button" class="chip-etiqueta' + (etiquetaMateriales === e.etiqueta ? ' activo' : '') + '" data-etiqueta="' + Motor.escaparHtml(e.etiqueta) + '">' + Motor.escaparHtml(e.etiqueta) + ' (' + e.conteo + ')</button>'; }).join('');
    return '<h2>Materiales para tu presupuesto</h2><p class="fuente-hoja">Explora materiales de los almacenes, agrégalos al carrito y compara precios antes de definir tu presupuesto.</p>' +
      '<div class="paneles-materiales"><section class="panel-carrito"><div class="titulo-panel"><strong>Carrito de presupuesto</strong><span>' + Object.keys(carrito).length + ' materiales</span></div>' + renderCarrito(carrito) + '<div class="total-carrito"><span>Total estimado</span><strong>' + Motor.formatoMoneda(totalCarrito(carrito)) + '</strong></div></section><section class="panel-carrito"><div class="titulo-panel"><strong>Comparar materiales</strong><span>' + comparacion.length + '/3</span></div>' + renderComparacion(materiales) + '</section></div>' +
      '<input type="text" class="buscador-materiales" id="buscador-materiales" placeholder="Buscar material por nombre..." value="' + Motor.escaparHtml(filtroMateriales) + '"><div class="chips-etiquetas"><button type="button" class="chip-etiqueta' + (!etiquetaMateriales ? ' activo' : '') + '" data-etiqueta="">Todos (' + materiales.length + ')</button>' + etiquetas + '</div><p class="fuente-hoja">' + filtrados.length + ' resultado(s)</p><div class="tabla-materiales-scroll"><table class="tabla-presupuesto tabla-materiales"><thead><tr><th>Material</th><th>Precio</th><th>Cantidad</th><th>Acciones</th></tr></thead><tbody>' + (filas || '<tr><td colspan="4" class="vacio">Sin resultados.</td></tr>') + '</tbody></table></div>';
  }

  function renderInicio() {
    var totalMP = totalProyecto(MP);
    var totalME = totalProyecto(ME);
    return '<h2>Presupuesto y seguimiento de obra</h2>' +
      '<p>Vista unificada de los modelos guardados en <code>docs/Matriz</code>.</p>' +
      '<div class="grilla-capitulos">' +
        '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#2b2d34" data-vista="mp-resumen">' +
          '<span class="num">MP · Proyectado</span><span class="nombre">Boulevard de los Sueños</span>' +
          '<span class="subtotal">' + MP.capitulos.length + ' capítulos · ' + Motor.formatoMoneda(totalMP) + '</span></button>' +
        '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#c9a24b" data-vista="me-resumen">' +
          '<span class="num">ME · Modelo Ejecutado</span><span class="nombre">V1 Construmaster · Villa Karen</span>' +
          '<span class="subtotal">' + ME.capitulos.length + ' capítulos · ' + Motor.formatoMoneda(totalME) + '</span></button>' +
        '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#6b7280" data-vista="mo-resumen">' +
          '<span class="num">MO · Optimizado</span><span class="nombre">Por construir</span>' +
          '<span class="subtotal vacio">Sin datos todavía</span></button>' +
        '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:#6b7280" data-vista="materiales">' +
          '<span class="num">Materiales</span><span class="nombre">Catálogo COMFER (hoja interna)</span>' +
          '<span class="subtotal">' + ME.materiales.length + ' materiales con etiquetas</span></button>' +
        '<a class="tarjeta-capitulo" style="--borde-etapa:#c9a24b;text-decoration:none;color:inherit;display:block;" href="../catalogo homecenter/index.html">' +
          '<span class="num">Catálogo Homecenter</span><span class="nombre">Mapa de categorías</span>' +
          '<span class="subtotal">homecenter.com.co — referencia externa</span></a>' +
        '<a class="tarjeta-capitulo" style="--borde-etapa:#2b2d34;text-decoration:none;color:inherit;display:block;" href="../catalogo comfer/index.html">' +
          '<span class="num">Catálogo COMFER</span><span class="nombre">Catálogo real, con imágenes</span>' +
          '<span class="subtotal">comfer.co — referencia externa</span></a>' +
      '</div>';
  }

  function renderMaterialesVista() {
    var main = document.getElementById('main-contenido');
    main.innerHTML = renderMaterialesTrabajo();
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
    main.querySelectorAll('[data-cantidad]').forEach(function (el) {
      el.addEventListener('click', function () {
        var carrito = carritoMateriales();
        var material = ME.materiales.filter(function (m) { return claveMaterial(m) === el.getAttribute('data-material'); })[0];
        if (!material) return;
        var cantidad = Math.max(0, Number(carrito[claveMaterial(material)] ? carrito[claveMaterial(material)].cantidad : 0) + Number(el.getAttribute('data-cantidad')));
        if (!cantidad) delete carrito[claveMaterial(material)]; else carrito[claveMaterial(material)] = { nombre: material.nombre, precio: material.precio, cantidad: cantidad };
        guardarPersistido(CLAVE_CARRITO, carrito); renderMaterialesVista();
      });
    });
    main.querySelectorAll('[data-agregar-carrito]').forEach(function (el) {
      el.addEventListener('click', function () {
        var carrito = carritoMateriales();
        var clave = el.getAttribute('data-agregar-carrito');
        var material = ME.materiales.filter(function (m) { return claveMaterial(m) === clave; })[0];
        if (!material) return;
        carrito[clave] = carrito[clave] || { nombre: material.nombre, precio: material.precio, cantidad: 0 };
        carrito[clave].cantidad = Math.max(1, carrito[clave].cantidad);
        guardarPersistido(CLAVE_CARRITO, carrito); renderMaterialesVista();
      });
    });
    main.querySelectorAll('[data-quitar-carrito]').forEach(function (el) {
      el.addEventListener('click', function () { var carrito = carritoMateriales(); delete carrito[el.getAttribute('data-quitar-carrito')]; guardarPersistido(CLAVE_CARRITO, carrito); renderMaterialesVista(); });
    });
    main.querySelectorAll('[data-comparar]').forEach(function (el) {
      el.addEventListener('click', function () {
        var lista = comparacionMateriales();
        var clave = el.getAttribute('data-comparar');
        var posicion = lista.indexOf(clave);
        if (posicion !== -1) lista.splice(posicion, 1); else if (lista.length < 3) lista.push(clave);
        guardarPersistido(CLAVE_COMPARACION, lista); renderMaterialesVista();
      });
    });
    main.querySelectorAll('[data-quitar-comparacion]').forEach(function (el) {
      el.addEventListener('click', function () { guardarPersistido(CLAVE_COMPARACION, comparacionMateriales().filter(function (clave) { return clave !== el.getAttribute('data-quitar-comparacion'); })); renderMaterialesVista(); });
    });
  }

  function esVistaValida(vista) {
    if (vista === 'inicio' || vista === 'materiales') return true;
    return /^(mp|me|mo)-(resumen|imagenes|cap-\d+)$/.test(vista);
  }

  function mostrarVista(vista) {
    vistaActual = vista;
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + vista);
      } else {
        window.location.hash = vista;
      }
    } catch (e) {
      try { window.location.hash = vista; } catch (e2) {}
    }
    renderNavtabs();
    renderSidebar();
    var main = document.getElementById('main-contenido');

    if (vista === 'inicio') { main.innerHTML = renderInicio(); conectarClicksMain(main); return; }
    if (vista === 'materiales') { renderMaterialesVista(); return; }

    var prefijo = /^(mp|me|mo)-/.exec(vista)[1];
    var datos = MODELOS[prefijo];
    var sub = vista.replace(/^(mp|me|mo)-/, '');

    if (sub === 'resumen') {
      if (!datos.capitulos.length) {
        main.innerHTML = '<h2>' + Motor.escaparHtml(datos.titulo) + '</h2><p class="vacio">Este modelo todavía no tiene capítulos cargados.</p>';
        return;
      }
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

  var vistaInicial = (window.location.hash || '').replace(/^#/, '');
  mostrarVista(esVistaValida(vistaInicial) ? vistaInicial : 'inicio');
})();
