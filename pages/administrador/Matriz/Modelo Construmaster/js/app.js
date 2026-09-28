(function () {
  'use strict';
  var datos = window.DATOS_CONSTRUMASTER;
  var vistaActual = 'resumen';
  var filtroMateriales = '';
  var etiquetaMateriales = '';

  var NOMBRE_POR_CAP = {
    1: 'Preliminares', 2: 'Estructura en concreto', 3: 'Hidrosanitario', 4: 'Mampostería',
    5: 'Pañetes, bordes y filos', 6: 'Carpintería Metálica', 7: 'Vidrios y ventanas',
    8: 'Estucado y pintura de muros', 9: 'Techo en drywall', 10: 'Pisos y enchapes',
    11: 'Aparatos hidrosanitarios', 12: 'Muebles de armario y cocina', 13: 'Aseo y entrega',
  };
  var ETAPA_POR_CAP = { 1: 'negra', 2: 'negra', 3: 'negra', 4: 'gris', 5: 'gris',
    6: 'blanca', 7: 'blanca', 8: 'blanca', 9: 'blanca', 10: 'blanca', 11: 'blanca', 12: 'blanca', 13: 'blanca' };

  function renderSidebar() {
    var html = Motor.renderSidebarCapitulos(datos.capitulos, datos.etapas, vistaActual, '');
    html += '<button type="button" class="item-sidebar' + (vistaActual === 'materiales' ? ' activo' : '') + '" data-vista="materiales">Materiales (' + datos.materiales.length + ')</button>';
    html += '<button type="button" class="item-sidebar' + (vistaActual === 'imagenes' ? ' activo' : '') + '" data-vista="imagenes">Imágenes' +
      (datos.imagenes.length ? ' (' + datos.imagenes.length + ')' : '') + '</button>';
    var cont = document.getElementById('sidebar-contenido');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }

  function conectarClicksVista(cont) {
    cont.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }

  function renderMaterialesVista() {
    var main = document.getElementById('main-contenido');
    main.innerHTML = Motor.renderMateriales(datos.materiales, filtroMateriales, etiquetaMateriales);
    var input = document.getElementById('buscador-materiales');
    input.addEventListener('input', function () { filtroMateriales = input.value; renderMaterialesVista(); input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
    main.querySelectorAll('.chip-etiqueta').forEach(function (el) {
      el.addEventListener('click', function () { etiquetaMateriales = el.getAttribute('data-etiqueta'); renderMaterialesVista(); });
    });
  }

  function mostrarVista(vista) {
    vistaActual = vista;
    renderSidebar();
    var main = document.getElementById('main-contenido');
    if (vista === 'resumen') { main.innerHTML = Motor.renderResumen(datos, ''); conectarClicksVista(main); return; }
    if (vista === 'imagenes') { main.innerHTML = Motor.renderGaleriaImagenes(datos.imagenes); return; }
    if (vista === 'materiales') { renderMaterialesVista(); return; }
    var m = /^cap-(\d+)$/.exec(vista);
    if (m) {
      var cap = datos.capitulos.filter(function (c) { return c.n === Number(m[1]); })[0];
      var etapa = datos.etapas[cap.etapa];
      main.innerHTML = Motor.renderTablaCapitulo(cap, etapa.color);
    }
  }

  function cargarArchivo(file) {
    var estado = document.getElementById('nombre-archivo');
    estado.textContent = 'Leyendo ' + file.name + '…';
    var reader = new FileReader();
    reader.onload = function (e) {
      var arrayBuffer = e.target.result;
      var wb;
      try {
        wb = XLSX.read(arrayBuffer, { type: 'array' });
      } catch (err) {
        estado.textContent = 'No se pudo leer el archivo: ' + err.message;
        return;
      }
      var capitulos = [];
      wb.SheetNames.forEach(function (nombreHoja) {
        var m = /^(\d+)/.exec(nombreHoja.trim());
        if (!m) return;
        var n = Number(m[1]);
        if (!NOMBRE_POR_CAP[n]) return;
        var resultado = Motor.parsearHojaCapitulo(wb.Sheets[nombreHoja]);
        capitulos.push({ n: n, nombre: NOMBRE_POR_CAP[n], etapa: ETAPA_POR_CAP[n], hoja: nombreHoja, filas: resultado.filas, subtotal: resultado.subtotal });
      });
      capitulos.sort(function (a, b) { return a.n - b.n; });
      datos.capitulos = capitulos;
      datos.proyecto = wb.Sheets['INICIO'] ? Motor.extraerCamposProyecto(wb.Sheets['INICIO'], 0, 16, 7, 11) : datos.proyecto;
      datos.materiales = wb.Sheets['COMFER'] ? Motor.extraerMateriales(wb.Sheets['COMFER']) : datos.materiales;
      Motor.extraerImagenesDesdeBuffer(arrayBuffer.slice(0)).then(function (imgs) {
        datos.imagenes = imgs;
        estado.textContent = file.name;
        mostrarVista('resumen');
      });
    };
    reader.onerror = function () { estado.textContent = 'Error al leer el archivo.'; };
    reader.readAsArrayBuffer(file);
  }

  document.getElementById('input-excel').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) cargarArchivo(e.target.files[0]);
  });

  renderSidebar();
  mostrarVista('resumen');
})();
