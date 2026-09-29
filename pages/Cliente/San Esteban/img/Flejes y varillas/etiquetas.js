// Imagen dinamica "Flejes y varillas" de San Esteban (pagina del cliente, vista Proyecto).
// Datos tomados de "imagen completa.png": cada etiqueta tiene su codigo, cantidad, etiqueta constructiva y la imagen
// de su tabla (FC1.png, FC2.png...). x / y = posicion del punto sobre estructura.jpg, en % del ancho y del alto.
// estructura.jpg es un recorte de "slide secuencial/Modelado/qflejes_4 - Photo.jpg" (vista frontal sin flechas).
// Cada obra puede tener varias imagenes con etiquetas: este archivo agrega la suya a la lista de la obra.
window.ETIQUETAS_OBRA = window.ETIQUETAS_OBRA || {};
window.ETIQUETAS_OBRA['San Esteban'] = [].concat(window.ETIQUETAS_OBRA['San Esteban'] || [], {
  titulo: 'Flejes y varillas',
  carpeta: 'pages/Cliente/San Esteban/img/Flejes y varillas/',
  imagen: 'estructura.jpg',
  etiquetas: [
    { codigo: 'FCUB', nombre: 'Flejes de cubierta', etiqueta: 'Fleje Entrepiso 3', cantidad: 384, unidad: 'flejes', tabla: 'fc.png', x: 49.2, y: 4.5 },
    { codigo: 'VCUB', nombre: 'Varillas de cubierta', etiqueta: 'Varilla de cubierta', cantidad: 24, unidad: 'varillas', tabla: 'VCUB.png', x: 81.7, y: 18.0 },
    { codigo: 'FC3', nombre: 'Flejes columna 3', etiqueta: 'Flejes Columnas 3', cantidad: 218, unidad: 'flejes', tabla: 'FC3.png', x: 13.3, y: 31.5 },
    { codigo: 'FE3', nombre: 'Flejes entrepiso 2-3', etiqueta: 'Fleje Entrepiso 3', cantidad: 360, unidad: 'flejes', tabla: 'FE3.png', x: 35.0, y: 43.3 },
    { codigo: 'VV3', nombre: 'Varilla viga 3', etiqueta: 'Varilla Viga 3', cantidad: 24, unidad: 'varillas', tabla: 'VV3.png', x: 83.3, y: 43.6 },
    { codigo: 'FC2', nombre: 'Flejes columna 2', etiqueta: 'Flejes Columnas 2', cantidad: 360, unidad: 'flejes', tabla: 'FC2.png', x: 49.2, y: 53.9 },
    { codigo: 'FE2', nombre: 'Flejes entrepiso 2', etiqueta: 'Fleje Entrepiso 2', cantidad: 365, unidad: 'flejes', tabla: 'FE2.png', x: 35.0, y: 66.5 },
    { codigo: 'VV2', nombre: 'Varillas viga 2 nivel', etiqueta: 'Varilla Viga 2', cantidad: 20, unidad: 'varillas', tabla: 'VV2.png', x: 83.3, y: 66.8 },
    { codigo: 'FC1', nombre: 'Flejes columna 1', etiqueta: 'Fleje Columnas 1', cantidad: 829, unidad: 'flejes', tabla: 'FC1.png', x: 21.7, y: 76.4 },
    { codigo: 'VC1', nombre: 'Varillas columnas total', etiqueta: 'Varillas', cantidad: 60, unidad: 'varillas', tabla: 'VC1.png', x: 80.0, y: 76.4 },
    { codigo: 'VV1', nombre: 'Varillas viga 1', etiqueta: 'Varillas de Viga 1', cantidad: 25, unidad: 'varillas', tabla: 'VV1.png', x: 65.0, y: 92.7 },
    { codigo: 'VC', nombre: 'Varillas cimentación', etiqueta: 'Varilla Cimentación', cantidad: 91, unidad: 'varillas', tabla: 'VCIM.png', x: 48.3, y: 94.9 }
  ]
});
