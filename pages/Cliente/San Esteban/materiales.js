// Materiales de San Esteban (pagina del cliente, vista Proyecto): total de lo listado en las imagenes con etiquetas
// (img/Flejes y varillas/etiquetas.js, Etapas Obra/etiquetas/etiquetas.js) y en la ficha de Entrepisos (Etapas Obra/fichas.js).
// Igual que en Presupuesto (index): cada material trae sus equivalencias = terminos de busqueda en el inventario
// (en orden de prioridad); al tocarlo se comparan los productos por precio y proveedor y se elige uno.
//   factor = unidades del producto por unidad de obra (p. ej. ladrillos por m²); editable en la pagina.
window.MATERIALES_OBRA = window.MATERIALES_OBRA || {};
window.MATERIALES_OBRA['San Esteban'] = {
  titulo: 'Materiales de la obra',
  materiales: [
    { id: 'flejes', grupo: 'Acero de refuerzo', nombre: 'Flejes (estribos)', cantidad: 2516, unidad: 'und',
      detalle: 'FC1 829 · FC2 360 · FC3 218 · FE2 365 · FE3 360 · Cubierta 384', equivalencias: ['fleje', 'estribo'] },
    { id: 'varillas', grupo: 'Acero de refuerzo', nombre: 'Varillas', cantidad: 244, unidad: 'und',
      detalle: 'VC 91 · VC1 60 · VV1 25 · VV2 20 · VV3 24 · Cubierta 24', equivalencias: ['varilla corrugada', 'varilla'] },
    { id: 'bloquelon', grupo: 'Entrepisos', nombre: 'Bloquelón', cantidad: 320, unidad: 'und',
      detalle: '160 por entrepiso · 2 entrepisos', equivalencias: ['bloquelon'] },
    { id: 'perfil-bloquelon', grupo: 'Entrepisos', nombre: 'Perfil para bloquelón', cantidad: 34, unidad: 'und',
      detalle: '17 por entrepiso · 2 entrepisos', equivalencias: ['perfil bloquelon', 'perfil c', 'perfil'] },
    { id: 'ladrillo', grupo: 'Mampostería', nombre: 'Ladrillo para muros', cantidad: 156.25, unidad: 'm²', factor: 13, unidadCompra: 'ladrillos',
      detalle: '40 muros · 81,48 m al eje', nota: '13 ladrillos por m² (bloque No. 5); confirmar el tipo de ladrillo', equivalencias: ['ladrillo', 'bloque'] },
    { id: 'puertas', grupo: 'Puertas y ventanas', nombre: 'Puertas', cantidad: 7, unidad: 'und',
      detalle: '44,73 m² en total', equivalencias: ['puerta interior', 'puerta seguridad', 'puerta madera', 'puerta'] },
    { id: 'ventanas', grupo: 'Puertas y ventanas', nombre: 'Ventanas', cantidad: 6, unidad: 'und',
      detalle: '33,71 m² en total', equivalencias: ['ventana aluminio', 'ventana', 'vidrio'] },
    { id: 'teja', grupo: 'Cubierta', nombre: 'Teja de cubierta', cantidad: 29.29, unidad: 'm²', factor: 0.7, unidadCompra: 'tejas',
      nota: '0,7 tejas por m² (teja No. 6 de fibrocemento); confirmar la teja', equivalencias: ['teja fibrocemento', 'teja'] }
  ]
};
