// Fichas de avance de San Esteban (pagina del cliente, vista Proyecto, debajo de la imagen de Flejes y varillas).
// Cada ficha interpreta una imagen de Etapas Obra: que muestra, cantidades leidas en la imagen y notas.
// Agregar una ficha = copiar un bloque y cambiar la imagen (ruta desde la carpeta Etapas Obra) y los textos.
window.FICHAS_OBRA = window.FICHAS_OBRA || {};
window.FICHAS_OBRA['San Esteban'] = {
  titulo: 'Avance por etapas',
  carpeta: 'pages/Cliente/San Esteban/Etapas Obra/',
  fichas: [
    {
      etapa: 'Etapa 04 · Estructura',
      titulo: 'Entrepisos en bloquelón',
      imagen: '04_ESTRUCTURA/Bloquelon/Entrepisos.png',
      descripcion: 'Despiece de las placas de entrepiso aligeradas con bloquelón. Hay dos entrepisos (sobre el primer y el segundo piso): el bloquelón se apoya sobre perfiles metálicos que van de viga a viga, entre las columnas y vigas de concreto reforzado ya armadas.',
      cantidades: [
        { codigo: 'BLQ', nombre: 'Bloquelón · entrepiso 1', cantidad: 160, unidad: 'und' },
        { codigo: 'PB', nombre: 'Perfil bloquelón · entrepiso 1', cantidad: 17, unidad: 'und' },
        { codigo: 'BLQ', nombre: 'Bloquelón · entrepiso 2', cantidad: 160, unidad: 'und' },
        { codigo: 'PB', nombre: 'Perfil bloquelón · entrepiso 2', cantidad: 17, unidad: 'und' }
      ],
      totales: [
        { nombre: 'Bloquelón', cantidad: 320, unidad: 'und' },
        { nombre: 'Perfil bloquelón', cantidad: 34, unidad: 'und' }
      ]
    },
    {
      etapa: 'Etapa 05 · Mampostería',
      titulo: 'Muros exteriores',
      imagen: '05_MAMPOSTERIA/01_Muros_Exteriores/Muros.png',
      descripcion: 'Fachada con los muros exteriores en ladrillo levantados en los tres pisos, confinados entre columnas y vigas. En el segundo y tercer piso quedan dos vanos altos por piso para puertas o ventanas; en el primer piso queda el vano de acceso a la izquierda. La estructura de cubierta todavía no lleva muros.',
      cantidades: [
        { codigo: 'M', nombre: 'Muros', cantidad: 40, unidad: 'und' },
        { codigo: 'M', nombre: 'Área de superficie', cantidad: 156.25, unidad: 'm²' },
        { codigo: 'M', nombre: 'Longitud al eje', cantidad: 81.48, unidad: 'm' }
      ],
      nota: 'Cantidades del recuadro "Muros" (Etapas Obra/etiquetas/M Muros.png). Faltan las unidades de ladrillo.'
    }
  ]
};
