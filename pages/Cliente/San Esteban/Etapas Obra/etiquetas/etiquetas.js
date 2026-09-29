// Etiquetas de cantidades de obra de San Esteban (pagina del cliente, vista Proyecto).
// Esta carpeta guarda los recuadros blancos con cantidades (M Muros.png, P Puertas.png, V Ventanas.png, CUB Cubierta.png);
// como no empieza con numero, generar_contenido.js no los pone en el carrusel.
// Cada recuadro se ubica como un punto sobre la fachada: x / y = posicion en % del ancho y del alto de la imagen.
window.ETIQUETAS_OBRA = window.ETIQUETAS_OBRA || {};
window.ETIQUETAS_OBRA['San Esteban'] = [].concat(window.ETIQUETAS_OBRA['San Esteban'] || [], {
  titulo: 'Cantidades de obra',
  carpeta: 'pages/Cliente/San Esteban/Etapas Obra/',
  imagen: '09_EXTERIORES/01_Fachadas/Fachada isometrica.png',
  grupos: [
    { id: 'mamposteria', nombre: 'Mampostería' },
    { id: 'carpinteria', nombre: 'Puertas y ventanas' },
    { id: 'cubierta', nombre: 'Cubierta' }
  ],
  etiquetas: [
    { codigo: 'M', nombre: 'Muros', grupo: 'mamposteria', cantidad: 40, unidad: 'und', tabla: 'etiquetas/M Muros.png', x: 25.9, y: 54.5,
      datos: [['Área del muro', '10,19 m²'], ['Área de superficie', '156,25 m²'], ['Longitud al eje', '81,48 m']] },
    { codigo: 'P', nombre: 'Puertas', grupo: 'carpinteria', cantidad: 7, unidad: 'und', tabla: 'etiquetas/P Puertas.png', x: 43.1, y: 78.6,
      datos: [['Área', '44,73 m²']] },
    { codigo: 'V', nombre: 'Ventanas', grupo: 'carpinteria', cantidad: 6, unidad: 'und', tabla: 'etiquetas/V Ventanas.png', x: 74.1, y: 30.5,
      datos: [['Área', '33,71 m²']] },
    { codigo: 'CUB', nombre: 'Cubierta', grupo: 'cubierta', tabla: 'etiquetas/CUB Cubierta.png', x: 56.9, y: 5.8,
      datos: [['Área', '29,29 m²']] }
  ]
});
