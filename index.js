(function () {
  'use strict';

  var imagenes = [
    { src: 'pages/catalogo comfer/imagenes/10633-porcelanato-adara-gold-blanco-60x60-prim-decor-1-44.jpg', titulo: 'Materiales que dan forma', texto: 'Selecciona acabados y visualiza posibilidades para tu espacio.' },
    { src: 'pages/catalogo comfer/imagenes/10649-e-calama-mult-51x51-prim-corona-2-08.jpg', titulo: 'Avance que se puede ver', texto: 'Consulta el registro visual de tu obra desde el área del cliente.' },
    { src: 'pages/catalogo comfer/imagenes/10817-malla-ondas-moro-30-5x30-5-prim-alfa.jpg', titulo: 'Decisiones con dirección', texto: 'Conecta inspiración, diseño y presupuesto en un mismo lugar.' }
  ];
  var indice = 0;
  var usuarioValido = 'jeicotr';
  var contrasenaValida = '4321';
  var modal = document.getElementById('modal-login');
  var navbar = document.getElementById('navbar');

  function renderCarrusel() {
    var diapositivas = document.getElementById('diapositivas');
    var indicadores = document.getElementById('indicadores');
    diapositivas.innerHTML = imagenes.map(function (imagen, posicion) {
      return '<article class="diapositiva ' + (posicion === indice ? 'visible' : '') + '" style="background-image:linear-gradient(90deg,rgba(23,34,27,.86),rgba(23,34,27,.16)),url(\'' + imagen.src + '\')"><div><h3>' + imagen.titulo + '</h3><p>' + imagen.texto + '</p></div></article>';
    }).join('');
    indicadores.innerHTML = imagenes.map(function (_, posicion) { return '<button class="indicador ' + (posicion === indice ? 'activo' : '') + '" type="button" aria-label="Ir a imagen ' + (posicion + 1) + '" data-slide="' + posicion + '"></button>'; }).join('');
    indicadores.querySelectorAll('[data-slide]').forEach(function (boton) { boton.addEventListener('click', function () { indice = Number(boton.dataset.slide); renderCarrusel(); }); });
  }

  function mostrarLogin() { modal.showModal(); document.getElementById('usuario').focus(); }
  function cerrarLogin() { modal.close(); document.getElementById('mensaje-login').textContent = ''; document.getElementById('formulario-login').reset(); }
  function clienteAutenticado() { return sessionStorage.getItem('construmasterCliente') === 'true'; }
  function protegerProyecto(enlace) {
    enlace.addEventListener('click', function (evento) {
      if (!clienteAutenticado()) { evento.preventDefault(); mostrarLogin(); }
    });
  }

  document.getElementById('boton-ingresar').addEventListener('click', mostrarLogin);
  document.getElementById('cerrar-modal').addEventListener('click', cerrarLogin);
  document.getElementById('formulario-login').addEventListener('submit', function (evento) {
    evento.preventDefault();
    var usuario = document.getElementById('usuario').value.trim();
    var contrasena = document.getElementById('contrasena').value;
    var mensaje = document.getElementById('mensaje-login');
    if (usuario === usuarioValido && contrasena === contrasenaValida) {
      sessionStorage.setItem('construmasterCliente', 'true');
      cerrarLogin();
      document.getElementById('boton-ingresar').textContent = 'Cliente ✓';
      document.getElementById('proyecto').scrollIntoView({ behavior: 'smooth' });
    } else { mensaje.textContent = 'Usuario o contraseña incorrectos.'; }
  });
  document.getElementById('boton-menu').addEventListener('click', function () { navbar.classList.toggle('abierto'); });
  navbar.querySelectorAll('a').forEach(function (enlace) {
    enlace.addEventListener('click', function () { navbar.classList.remove('abierto'); });
    if (enlace.getAttribute('href') === '#proyecto') protegerProyecto(enlace);
  });
  document.querySelectorAll('a[href="#proyecto"]').forEach(protegerProyecto);
  document.querySelector('.anterior').addEventListener('click', function () { indice = (indice + imagenes.length - 1) % imagenes.length; renderCarrusel(); });
  document.querySelector('.siguiente').addEventListener('click', function () { indice = (indice + 1) % imagenes.length; renderCarrusel(); });
  renderCarrusel();
  if (clienteAutenticado()) document.getElementById('boton-ingresar').textContent = 'Cliente ✓';
}());