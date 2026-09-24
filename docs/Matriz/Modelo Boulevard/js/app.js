(function () {
  'use strict';
  var datos = window.DATOS_BOULEVARD;
  var vistaActual = 'resumen';

  function renderSidebar() {
    var html = Motor.renderSidebarCapitulos(datos.capitulos, datos.etapas, vistaActual, '');
    html += '<button type="button" class="item-sidebar' + (vistaActual === 'imagenes' ? ' activo' : '') + '" data-vista="imagenes">Imágenes' +
      (datos.imagenes.length ? ' (' + datos.imagenes.length + ')' : '') + '</button>';
    var cont = document.getElementById('sidebar-contenido');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-vista]').forEach(function (el) {
      el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
    });
  }

  function mostrarVista(vista) {
    vistaActual = vista;
    renderSidebar();
    var main = document.getElementById('main-contenido');
    if (vista === 'resumen') {
      main.innerHTML = Motor.renderResumen(datos, '');
      main.querySelectorAll('[data-vista]').forEach(function (el) {
        el.addEventListener('click', function () { mostrarVista(el.getAttribute('data-vista')); });
      });
      return;
    }
    if (vista === 'imagenes') { main.innerHTML = Motor.renderGaleriaImagenes(datos.imagenes); return; }
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
      var hoja = wb.Sheets['Presupuesto'] || wb.Sheets[wb.SheetNames[0]];
      var ETAPA_POR_CAP = { 1: 'negra', 2: 'negra', 3: 'negra', 4: 'gris', 5: 'gris', 6: 'gris', 7: 'gris', 9: 'gris',
        8: 'blanca', 10: 'blanca', 11: 'blanca', 12: 'blanca', 13: 'blanca', 14: 'blanca', 15: 'blanca', 16: 'blanca', 17: 'blanca' };
      datos.capitulos = Motor.parsearHojaPresupuestoUnica(hoja).map(function (c) { return Object.assign(c, { etapa: ETAPA_POR_CAP[c.n] || 'blanca' }); });
      var camposCabecera = Motor.extraerCamposProyecto(hoja, 1, 7);
      var camposPie = Motor.extraerCamposProyecto(hoja, 190, 196);
      datos.proyecto = camposCabecera.concat(camposPie);
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
