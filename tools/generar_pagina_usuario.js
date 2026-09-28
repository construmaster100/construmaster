// Genera usuario.html a partir de index.html: misma apariencia y mismo codigo (index.css + index.js), pero solo con
// Casas Prefabricadas (portada) · Construccion · Remodelacion · Presupuesto y, al final, Ingresar (sin Inicio)
// (tengo usuario y contrasena / deseo registrarme). Volver a correr despues de cambiar index.html:
//   node tools/generar_pagina_usuario.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
let h = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const cambiar = (patron, nuevo, nombre) => { const antes = h; h = h.replace(patron, nuevo); if (h === antes) throw new Error('No se encontro en index.html: ' + nombre); };

cambiar(/<title>[^<]*<\/title>/, '<title>ConstruMaster | Usuario</title>', 'title');
cambiar('<body>', '<body data-pagina="usuario">', 'body');

// Encabezado: sin logo ni banner; solo una franja corta con el titulo de la pagina
cambiar(/<header class="site-header">[\s\S]*?<\/header>/, '<header class="site-header franja-usuario"><a class="titulo-usuario" href="#casas">CONSTRU<em>MASTER</em></a>' +
  '<form class="buscador-usuario" id="buscador-usuario" role="search" autocomplete="off"><input type="search" id="buscar-usuario" placeholder="¿Qué deseas construir?" aria-label="¿Qué deseas construir?"><label class="adjuntar-foto-busqueda" title="Buscar con una fotografía" aria-label="Adjuntar fotografía"><span class="icono-camara" aria-hidden="true"></span><input type="file" id="foto-busqueda" accept="image/*" hidden></label><span class="miniatura-busqueda" id="miniatura-busqueda" hidden></span><div class="resultados-busqueda" id="resultados-busqueda" hidden></div></form></header>', 'encabezado');

// Navbar
cambiar(/<div class="topnav-links" id="navbar">[\s\S]*?<\/div>/, `<div class="topnav-links" id="navbar">
      <a href="#casas" data-ir="casas">Casas Prefabricadas</a>
      <a href="#construccion" data-ir="construccion">Construcción</a>
      <a href="#remodelacion" data-ir="remodelacion">Remodelación</a>
      <a href="#presupuesto" data-ir="presupuesto">Presupuesto</a>
      <a href="#ingresar" data-ir="ingresar" class="nav-ingresar">Ingresar</a>
    </div>`, 'navbar');

// Sin Inicio: se quita toda la portada (la pagina arranca en Casas Prefabricadas)
cambiar(/\s*<div class="vista" data-vista="inicio">[\s\S]*?\n    <\/div>\n/, '\n', 'vista inicio');

// Construccion: formulario como el de Remodelacion, arriba del listado de servicios (sin el registro de obra del index)
cambiar('<div id="construccion-registro"></div><div id="construccion-contenido"></div>', '<div id="construccion-formulario"></div><h3 class="subtitulo-vista">Servicios de construcción</h3><div id="construccion-contenido"></div>', 'formulario construccion');
// Las notas de pie de cada pagina (descripcion y origen de los datos) son para el administrador: no van en la pagina del cliente
h = h.replace(/\s*<aside class="nota-pagina">[\s\S]*?<\/aside>/g, '');

// Vistas: se quitan las que no van y se agregan Casas, Remodelacion e Ingresar
for (const v of ['materiales', 'herramientas', 'servicios', 'proyectos', 'estadisticas', 'proveedores', 'diseno']) {
  cambiar(new RegExp(`\\s*<section class="vista vista-contenido" data-vista="${v}">[\\s\\S]*?\\n    </section>`), '', 'vista ' + v);
}
cambiar('  </main>', `    <section class="vista vista-contenido" data-vista="casas">
      <div class="contenedor"><div id="casas-contenido"></div></div>
    </section>
    <section class="vista vista-contenido" data-vista="casa">
      <div class="contenedor"><div id="casa-contenido"></div></div>
    </section>
    <section class="vista vista-contenido" data-vista="remodelacion">
      <div class="contenedor"><p class="eyebrow">SERVICIOS · SOBRE UNA CONSTRUCCIÓN EXISTENTE</p><h2 class="titulo-vista">Remodelación</h2><div id="remodelacion-formulario"></div><h3 class="subtitulo-vista">Servicios de remodelación</h3><div id="remodelacion-contenido"></div></div>
    </section>
    <section class="vista vista-contenido" data-vista="ingresar">
      <div class="contenedor ingreso">
        <p class="eyebrow">ACCESO</p><h2 class="titulo-vista">Ingresar</h2>
        <div class="opciones-ingreso">
          <button type="button" class="opcion-ingreso" data-panel="panel-usuario"><strong>Tengo usuario y contraseña</strong><small>Ingresa con tu cuenta</small></button>
          <button type="button" class="opcion-ingreso" data-panel="panel-registro"><strong>Deseo registrarme</strong><small>Crea tu usuario</small></button>
        </div>
        <form class="panel-ingreso" id="panel-usuario">
          <label>Usuario<input type="text" name="usuario" autocomplete="username" autocapitalize="characters" required></label>
          <label>Contraseña<input type="password" name="clave" autocomplete="current-password" required></label>
          <button type="submit" class="boton-principal oscuro">Ingresar</button>
          <p class="aviso aviso-ingreso" data-rol="aviso-ingreso" hidden></p>
        </form>
        <form class="panel-ingreso" id="panel-registro" hidden>
          <label>Nombre completo<input type="text" name="nombre" autocomplete="name" required></label>
          <label>Correo<input type="email" name="correo" autocomplete="email" required></label>
          <label>Teléfono<input type="tel" name="telefono" autocomplete="tel"></label>
          <label>Contraseña<input type="password" name="clave" autocomplete="new-password" required></label>
          <button type="submit" class="boton-principal oscuro">Registrarme</button>
          <p class="aviso aviso-ingreso" hidden>El registro se habilitará cuando ConstruMaster funcione con servidor. Esta versión es local: no se guardó ningún dato.</p>
        </form>
      </div>
    </section>
  </main>`, 'fin de main');

// Pendones izquierdo y derecho a los lados del formato celular (en pantallas anchas).
// Imagenes: img/banner izq.png e img/banner der.png; si no existen, fotos de un proyecto (index.js)
cambiar('  <main id="main">', `  <aside class="pendon-usuario pendon-usuario-izq" aria-hidden="true"><img data-pendon="0" src="img/banner izq.png" alt=""></aside>
  <aside class="pendon-usuario pendon-usuario-der" aria-hidden="true"><img data-pendon="-1" src="img/banner der.png" alt=""></aside>
  <main id="main">`, 'pendones');

// Barra inferior fija (estilo app): Inicio · Notificaciones · Usuario (centro) · Favoritos · Carrito
const icono = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
cambiar('  </main>', `  </main>
  <nav class="barra-inferior" aria-label="Accesos rápidos">
    <a href="#casas" data-barra="casas">${icono('M12 3 2 11h3v9h5v-6h4v6h5v-9h3L12 3z')}<span>Inicio</span></a>
    <button type="button" data-barra="notificaciones" data-aviso="No tienes notificaciones por ahora.">${icono('M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z')}<span>Notificaciones</span></button>
    <a href="#ingresar" data-barra="ingresar" class="barra-centro">${icono('M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-3.34 0-10 1.67-10 5v3h20v-3c0-3.33-6.66-5-10-5z')}<span>Usuario</span></a>
    <button type="button" data-barra="favoritos" data-aviso="Tus casas favoritas aparecerán aquí (próximamente).">${icono('M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z')}<span>Favoritos</span></button>
    <button type="button" data-barra="carrito" data-aviso="El carrito de compras estará disponible próximamente.">${icono('M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7.2 14h9.45a2 2 0 0 0 1.75-1.03L22 6H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44A2 2 0 0 0 7 19h12v-2H7.42l.78-1.4z')}<span>Carrito</span></button>
  </nav>
  <div class="aviso-barra" id="aviso-barra" role="status" hidden></div>`, 'barra inferior');

// Usuarios de la pagina del cliente (ingreso con usuario y contrasena -> pages/Cliente/index.html)
cambiar('  <script src="index.js', '  <script src="assets/datos/usuarios.js"></script>\n  <script src="index.js', 'script usuarios');
// Departamentos y municipios (DANE): index.html ya carga assets/datos/municipios.js (formularios de Presupuesto y Crear proyecto)
// Presupuesto: sin titulo (el contenido de cada pagina empieza arriba, pedido del usuario 27/09/2026).
// El presupuesto con el modelo V1 es del administrador: en la pagina del cliente queda solo el formulario de solicitud.
cambiar('<div id="presupuesto-v1"></div>', '', 'presupuesto v1');

fs.writeFileSync(path.join(RAIZ, 'usuario.html'), '<!-- Generado por tools/generar_pagina_usuario.js a partir de index.html — no editar a mano. -->\n' + h, 'utf8');
console.log('usuario.html generado');

