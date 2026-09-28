// Clasificacion de las actividades del analisis de precios unitarios en cuatro ejes independientes,
// cada categoria con un codigo de dos letras y dos numeros:
//   AMxx  Ambito: que tipo de proyecto es (edificacion, redes, vias, gas, administracion, basicos).
//   ONxx / OGxx / OBxx  Secuencia constructiva: obra negra, gris o blanca + numero de etapa. TR00 = transversal.
//   ESxx  Especialidad: quien la ejecuta (oficio o cuadrilla).
//   NPxx  Naturaleza del precio: que incluye el precio (construccion, suministro, instalacion...).
// Codigo compuesto de cada actividad: "AM01 · ON04 · ES04 · NP01".
// Colores de ambito validados con la guia dataviz (paleta categorica de referencia, claro y oscuro).

const EJES = [
  {
    clave: 'am', letras: 'AM', titulo: 'Ámbito', pregunta: '¿Qué tipo de proyecto es?',
    explicacion: 'El documento es un listado de obra pública, no solo de vivienda. Separar el ámbito evita mezclar una casa con redes de acueducto o vías: un proyecto de vivienda usa sobre todo Edificación.',
    categorias: [
      { codigo: 'AM01', nombre: 'Edificación', icono: 'mamposteria', color: '#2a78d6', colorOscuro: '#3987e5', capitulos: /^1\./, descripcion: 'Vivienda y edificios: capítulos 1.xx.' },
      { codigo: 'AM02', nombre: 'Redes de acueducto y alcantarillado', icono: 'tuberia', color: '#eb6834', colorOscuro: '#d95926', capitulos: /^2\./, descripcion: 'Tuberías, accesorios, pozos y conexiones: capítulos 2.xx.' },
      { codigo: 'AM03', nombre: 'Vías y urbanismo', icono: 'vias', color: '#1baf7a', colorOscuro: '#199e70', capitulos: /^3\./, descripcion: 'Explanaciones, pavimentos, andenes, drenaje y señalización: capítulos 3.xx.' },
      { codigo: 'AM04', nombre: 'Gas', icono: 'gas', color: '#eda100', colorOscuro: '#c98500', capitulos: /^4\./, descripcion: 'Gasoductos y conexiones: capítulo 4.01.' },
      { codigo: 'AM05', nombre: 'Administración y personal', icono: 'personal', color: '#e87ba4', colorOscuro: '#d55181', capitulos: /^5\./, descripcion: 'Sueldos y salarios: costos indirectos, no actividades de obra.' },
      { codigo: 'AM06', nombre: 'Análisis básicos', icono: 'concreto', color: '#4a3aa7', colorOscuro: '#9085e9', capitulos: /^6\./, descripcion: 'Morteros, concretos, hierro y mampostería base: insumos compuestos.' },
    ],
  },
  {
    clave: 'sec', letras: 'ON · OG · OB', titulo: 'Secuencia constructiva', pregunta: '¿Cuándo se ejecuta?',
    explicacion: 'La etapa de obra en su orden constructivo, agrupada en obra negra (ON), gris (OG) y blanca (OB). Es el eje principal de Presupuesto y Proyectos; lo que no es una etapa física queda como transversal (TR00).',
    categorias: [
      { codigo: 'ON01', nombre: 'Preliminares', etapa: '01_PRELIMINARES', tipo: 'negra', icono: 'topografia' },
      { codigo: 'ON02', nombre: 'Excavaciones', etapa: '02_EXCAVACIONES', tipo: 'negra', icono: 'excavacion' },
      { codigo: 'ON03', nombre: 'Cimentación', etapa: '03_CIMENTACION', tipo: 'negra', icono: 'concreto' },
      { codigo: 'ON04', nombre: 'Estructura', etapa: '04_ESTRUCTURA', tipo: 'negra', icono: 'acero' },
      { codigo: 'ON07', nombre: 'Cubierta', etapa: '07_CUBIERTA', tipo: 'negra', icono: 'cubierta' },
      { codigo: 'OG05', nombre: 'Mampostería', etapa: '05_MAMPOSTERIA', tipo: 'gris', icono: 'mamposteria' },
      { codigo: 'OG06', nombre: 'Instalaciones', etapa: '06_INSTALACIONES', tipo: 'gris', icono: 'tuberia' },
      { codigo: 'OB08', nombre: 'Acabados', etapa: '08_ACABADOS', tipo: 'blanca', icono: 'pintura' },
      { codigo: 'OB09', nombre: 'Exteriores', etapa: '09_EXTERIORES', tipo: 'blanca', icono: 'jardin' },
      { codigo: 'OB10', nombre: 'Entrega', etapa: '10_ENTREGA', tipo: 'blanca', icono: 'limpieza' },
      { codigo: 'TR00', nombre: 'Transversal', etapa: 'TRANSVERSAL', tipo: 'transversal', icono: 'general' },
    ],
  },
  {
    clave: 'es', letras: 'ES', titulo: 'Especialidad', pregunta: '¿Quién la ejecuta?',
    explicacion: 'El oficio o la cuadrilla que hace el trabajo. Sirve para contratar por especialidad o subcontratista y es el filtro natural del catálogo.',
    categorias: [
      { codigo: 'ES01', nombre: 'Preliminares y topografía', iconos: ['topografia', 'cerramiento', 'limpieza'], icono: 'topografia' },
      { codigo: 'ES02', nombre: 'Demolición y retiro', iconos: ['demolicion'], icono: 'demolicion' },
      { codigo: 'ES03', nombre: 'Movimiento de tierras', iconos: ['excavacion'], icono: 'excavacion' },
      { codigo: 'ES04', nombre: 'Concreto', iconos: ['concreto'], icono: 'concreto' },
      { codigo: 'ES05', nombre: 'Acero de refuerzo', iconos: ['acero'], icono: 'acero' },
      { codigo: 'ES06', nombre: 'Mampostería', iconos: ['mamposteria'], icono: 'mamposteria' },
      { codigo: 'ES07', nombre: 'Pañetes y estucos', iconos: ['panete'], icono: 'panete' },
      { codigo: 'ES08', nombre: 'Pisos y enchapes', iconos: ['pisos'], icono: 'pisos' },
      { codigo: 'ES09', nombre: 'Pintura', iconos: ['pintura'], icono: 'pintura' },
      { codigo: 'ES10', nombre: 'Cubiertas e impermeabilización', iconos: ['cubierta'], icono: 'cubierta' },
      { codigo: 'ES11', nombre: 'Cielos y drywall', iconos: ['cielo'], icono: 'cielo' },
      { codigo: 'ES12', nombre: 'Carpintería, herrería y cerraduras', iconos: ['carpinteria', 'cerraduras'], icono: 'carpinteria' },
      { codigo: 'ES13', nombre: 'Hidrosanitarias', iconos: ['agua', 'tuberia', 'aparatos'], icono: 'agua' },
      { codigo: 'ES14', nombre: 'Eléctricas y comunicaciones', iconos: ['electrica', 'iluminacion', 'datos'], icono: 'electrica' },
      { codigo: 'ES15', nombre: 'Gas', iconos: ['gas'], icono: 'gas' },
      { codigo: 'ES16', nombre: 'Vías, urbanismo y zonas verdes', iconos: ['vias', 'deportivo', 'jardin'], icono: 'vias' },
      { codigo: 'ES17', nombre: 'Transporte y equipos', iconos: ['transporte'], icono: 'transporte' },
      { codigo: 'ES18', nombre: 'Personal y generales', iconos: ['personal', 'general'], icono: 'personal' },
    ],
  },
  {
    clave: 'np', letras: 'NP', titulo: 'Naturaleza del precio', pregunta: '¿Qué incluye el precio?',
    explicacion: 'Indica si el precio trae solo material, solo mano de obra o ambos. Importa al comparar con Materiales: un ítem de solo suministro se cotiza contra COMFER u Homecenter; uno de suministro e instalación ya incluye la mano de obra.',
    categorias: [
      { codigo: 'NP01', nombre: 'Construcción (mano de obra y materiales)', icono: 'concreto' },
      { codigo: 'NP02', nombre: 'Suministro e instalación', icono: 'tuberia', patron: /^SUM\w*\s+(E|Y)\s+INST/ },
      { codigo: 'NP03', nombre: 'Solo suministro', icono: 'transporte', patron: /^SUM\w*\b/ },
      { codigo: 'NP04', nombre: 'Solo instalación', icono: 'carpinteria', patron: /^INSTAL/ },
      { codigo: 'NP05', nombre: 'Demolición y retiro', icono: 'demolicion', patron: /DEMOLICI|DESMONTE|RETIRO/ },
      { codigo: 'NP06', nombre: 'Mantenimiento', icono: 'jardin', patron: /MANTENIMIENTO/ },
      { codigo: 'NP07', nombre: 'Alquiler', icono: 'transporte', patron: /ALQUILER/ },
    ],
  },
];

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Devuelve { am, sec, es, np } (codigos) para una actividad ya enriquecida con etapa e icono.
function clasificar(actividad) {
  const [ejeAm, ejeSec, ejeEs, ejeNp] = EJES;
  const am = (ejeAm.categorias.find((c) => c.capitulos.test(actividad.capitulo)) || ejeAm.categorias[0]).codigo;
  const sec = (ejeSec.categorias.find((c) => c.etapa === actividad.etapa) || ejeSec.categorias[ejeSec.categorias.length - 1]).codigo;
  const es = (ejeEs.categorias.find((c) => c.iconos.includes(actividad.icono)) || ejeEs.categorias[ejeEs.categorias.length - 1]).codigo;
  const nombre = normalizar(actividad.nombre);
  // Orden de prioridad: alquiler, mantenimiento, demolicion, suministro e instalacion, solo suministro, solo instalacion.
  const orden = ['NP07', 'NP06', 'NP05', 'NP02', 'NP03', 'NP04'];
  const np = (orden.map((c) => ejeNp.categorias.find((x) => x.codigo === c)).find((c) => c.patron.test(nombre)) || ejeNp.categorias[0]).codigo;
  return { am, sec, es, np };
}

// Version para la pagina: sin expresiones regulares.
function ejesParaPagina() {
  return EJES.map((e) => ({
    clave: e.clave, letras: e.letras, titulo: e.titulo, pregunta: e.pregunta, explicacion: e.explicacion,
    categorias: e.categorias.map((c) => ({ codigo: c.codigo, nombre: c.nombre, icono: c.icono, color: c.color || null, colorOscuro: c.colorOscuro || null, tipo: c.tipo || null, descripcion: c.descripcion || '' })),
  }));
}

module.exports = { EJES, clasificar, ejesParaPagina };
