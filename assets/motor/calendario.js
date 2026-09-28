// Reloj y calendario del sidebar (ConstruMaster).
// - Bajo el logo: hora (actualizada cada segundo) y fecha de hoy, con la hora local del equipo.
// - Al pulsar el reloj: ficha del mes en curso (se puede avanzar o retroceder de mes) y, abajo,
//   el enlace "Calendario" que despliega el calendario completo del año en curso.
// - Escape o clic fuera cierran la ficha; el calendario del año se cierra con su boton o con Escape.
(function () {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
  var reloj = document.getElementById('reloj');
  var hora = document.getElementById('reloj-hora');
  var fecha = document.getElementById('reloj-fecha');
  var fichaMes = document.getElementById('calendario-mes');
  var fichaAnio = document.getElementById('calendario-anio');
  if (!reloj || !fichaMes || !fichaAnio) return;

  var vista = null; // { anio, mes } mostrado en la ficha del mes
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  var mayus = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  function tic() {
    var ahora = new Date();
    hora.textContent = dos(ahora.getHours()) + ':' + dos(ahora.getMinutes()) + ':' + dos(ahora.getSeconds());
    fecha.textContent = mayus(ahora.toLocaleDateString('es-CO', { weekday: 'long' })) + ', ' + ahora.getDate() + ' de ' + MESES[ahora.getMonth()] + ' de ' + ahora.getFullYear();
    // Si la ficha muestra el mes actual, el dia de hoy cambia a medianoche sin recargar.
    if (!fichaMes.hidden && ahora.getHours() === 0 && ahora.getMinutes() === 0 && ahora.getSeconds() === 0) pintarMes();
  }

  // Cuadricula de un mes (semana de lunes a domingo); marca el dia de hoy.
  function mesHtml(anio, mes, compacto) {
    var hoy = new Date();
    var primero = new Date(anio, mes, 1);
    var desfase = (primero.getDay() + 6) % 7;
    var diasMes = new Date(anio, mes + 1, 0).getDate();
    var celdas = [];
    for (var i = 0; i < desfase; i++) celdas.push('<span class="dia vacio"></span>');
    for (var d = 1; d <= diasMes; d++) {
      var esHoy = d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
      var finde = (desfase + d - 1) % 7 >= 5;
      celdas.push('<span class="dia' + (esHoy ? ' hoy' : '') + (finde ? ' finde' : '') + '"' + (esHoy ? ' aria-current="date"' : '') + '>' + d + '</span>');
    }
    return '<div class="mes' + (compacto ? ' compacto' : '') + '">' +
      (compacto ? '<p class="mes-titulo">' + mayus(MESES[mes]) + '</p>' : '') +
      '<div class="semana">' + DIAS.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
      '<div class="dias">' + celdas.join('') + '</div></div>';
  }

  function pintarMes() {
    fichaMes.innerHTML =
      '<div class="cal-cabecera"><button type="button" class="cal-nav" data-cal="anterior" aria-label="Mes anterior">‹</button>' +
      '<strong>' + mayus(MESES[vista.mes]) + ' ' + vista.anio + '</strong>' +
      '<button type="button" class="cal-nav" data-cal="siguiente" aria-label="Mes siguiente">›</button></div>' +
      mesHtml(vista.anio, vista.mes, false) +
      '<div class="cal-pie"><button type="button" class="cal-enlace" data-cal="hoy">Hoy</button>' +
      '<button type="button" class="cal-enlace" data-cal="anio">Calendario ' + new Date().getFullYear() + ' →</button></div>';
  }

  function abrirMes() {
    var hoy = new Date();
    vista = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
    pintarMes();
    fichaMes.hidden = false;
    reloj.setAttribute('aria-expanded', 'true');
  }
  function cerrarMes() { fichaMes.hidden = true; reloj.setAttribute('aria-expanded', 'false'); }

  function abrirAnio() {
    var anio = new Date().getFullYear();
    fichaAnio.innerHTML = '<div class="calendario-anio"><div class="cal-cabecera anual"><strong>Calendario ' + anio + '</strong>' +
      '<button type="button" class="cal-cerrar" data-cal="cerrar-anio" aria-label="Cerrar calendario">✕</button></div>' +
      '<div class="rejilla-anio">' + MESES.map(function (m, i) { return mesHtml(anio, i, true); }).join('') + '</div></div>';
    cerrarMes();
    fichaAnio.hidden = false;
    fichaAnio.querySelector('[data-cal="cerrar-anio"]').focus();
  }
  function cerrarAnio() { fichaAnio.hidden = true; reloj.focus(); }

  reloj.addEventListener('click', function () { if (fichaMes.hidden) abrirMes(); else cerrarMes(); });
  fichaMes.addEventListener('click', function (e) {
    // Los clics dentro de la ficha no deben llegar al "clic fuera": al redibujar el mes el boton pulsado
    // deja de existir en la pagina y se confundiria con un clic externo.
    e.stopPropagation();
    var b = e.target.closest('[data-cal]');
    if (!b) return;
    var accion = b.getAttribute('data-cal');
    if (accion === 'anterior' || accion === 'siguiente') {
      var d = new Date(vista.anio, vista.mes + (accion === 'siguiente' ? 1 : -1), 1);
      vista = { anio: d.getFullYear(), mes: d.getMonth() };
      pintarMes();
    } else if (accion === 'hoy') { abrirMes(); }
    else if (accion === 'anio') { abrirAnio(); }
  });
  fichaAnio.addEventListener('click', function (e) {
    if (e.target === fichaAnio || e.target.closest('[data-cal="cerrar-anio"]')) cerrarAnio();
  });
  document.addEventListener('click', function (e) {
    if (!fichaMes.hidden && !fichaMes.contains(e.target) && !reloj.contains(e.target)) cerrarMes();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!fichaAnio.hidden) cerrarAnio();
    else if (!fichaMes.hidden) { cerrarMes(); reloj.focus(); }
  });

  tic();
  // Se alinea al cambio de segundo para que el reloj no vaya desfasado.
  setTimeout(function () { tic(); setInterval(tic, 1000); }, 1000 - (Date.now() % 1000));
}());
