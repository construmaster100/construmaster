// Usuarios de la pagina del cliente (sin servidor: validacion en el navegador; NO es seguridad real, solo control de acceso basico).
// clave = SHA-256 de la contrasena. proyecto = id de la obra en assets/datos/contenido.js (carpeta en pages/Cliente).
// Para agregar un usuario: node -e "console.log(require('crypto').createHash('sha256').update('CLAVE').digest('hex'))"
window.USUARIOS_CLIENTE = [
  { usuario: 'JEICOT', nombre: 'Jeicot Rodriguez', clave: '20f3765880a5c269b747e1e906054a4b4a3a991259f1e16b5dde4742cec2319a', proyecto: 'san-esteban' },
];
