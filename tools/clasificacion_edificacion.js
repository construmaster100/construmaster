// Clasificacion INTERNA de las actividades de Edificacion (ambito AM01 = capitulos 1.xx del APU).
// Cuatro niveles por actividad:
//   1. Capitulo del documento (1.01 Preliminares ... 1.23 Fachadas).
//   2. Grupo de trabajo dentro del capitulo (reglas por palabras clave del nombre, en orden; la ultima regla recoge el resto).
//   3. Tipo de trabajo (que se hace): demolicion, suministro e instalacion, construccion en sitio, salida o punto...
//   4. Material principal.
// Codigo interno: ED-CC-GG-NNN (ED = edificacion, CC = capitulo, GG = grupo, NNN = consecutivo dentro del grupo, en el orden del APU).
// Lo usan tools/generar_apu.js (dato "interna" de cada actividad) y tools/generar_clasificacion_edificacion.js (Excel).

const n = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Capitulo -> [ [grupo, nombre, regla], ... ]  (la regla se evalua sobre el nombre sin tildes y en mayusculas)
const GRUPOS = {
  '1.01': { nombre: 'Preliminares', grupos: [
    ['01', 'Localización, replanteo y adecuación del terreno', /LOCALIZACI|REPLANTEO|CONFIGURACI|NIVELACI|CONFORMACI|DESCAPOTE|SUBRASANTE/],
    ['02', 'Obras e instalaciones provisionales', /PROVISIONAL|CERRAMIENTO/],
    ['03', 'Tala y retiro de vegetación', /ARBOL|ARBUSTO|RAIZ/],
    ['04', 'Demolición de estructura y cimientos', /DEMOLICI.*(CICLOPEO|CIMIENTO|COLUMNA|VIGA|PLACA|ESCALERA|MURO CONCRETO|EDIFICACION)/],
    ['05', 'Demolición de muros, pisos y acabados', /DEMOLICI/],
    ['06', 'Desmonte de cubiertas y estructuras livianas', /DESMONTE.*(CUBIERTA|TEJA|CORREA|ESTRUCTURA|CANALES|CIELO)/],
    ['07', 'Desmonte de carpintería, cerramientos y otros', /DESMONTE/],
    ['08', 'Retiro de redes, regatas y aberturas', /RETIRO|REGATA|ABERTURA|ROTURA/],
    ['09', 'Transporte y alquiler de equipos', /ACARREO|ALQUILER|TRANSPORTE/],
    ['99', 'Otros preliminares', /./]] },
  '1.02': { nombre: 'Cimentación y desagües', grupos: [
    ['01', 'Excavaciones y rellenos', /EXCAVACI|RELLENO/],
    ['02', 'Solados y bases', /SOLADO|BASE EN CONCRETO/],
    ['03', 'Concreto ciclópeo', /CICLOPEO/],
    ['04', 'Zapatas, pedestales y vigas de amarre', /ZAPATA|PEDESTAL|VIGA DE AMARRE/],
    ['05', 'Losas de cimentación', /LOSA/],
    ['06', 'Muros de contención y gaviones', /CONTENCI|GAVION/],
    ['07', 'Acero de refuerzo y mallas', /ACERO|MALLA/],
    ['08', 'Cajas de inspección', /CAJA/],
    ['09', 'Tubería de desagüe y drenaje', /TUBERI/],
    ['99', 'Otros de cimentación', /./]] },
  '1.03': { nombre: 'Estructuras', grupos: [
    ['01', 'Columnas', /COLUMNA/],
    ['02', 'Vigas', /VIGA/],
    ['03', 'Placas de entrepiso y cubierta', /PLACA|LOSA/],
    ['04', 'Escaleras', /ESCALERA/],
    ['05', 'Muros y elementos de concreto', /MURO|TANQUE|CONSTRUCCION/],
    ['06', 'Refuerzos y mallas', /REFUERZO|MALLA|ACERO/],
    ['99', 'Otros estructurales', /./]] },
  '1.04': { nombre: 'Mampostería', grupos: [
    // El orden del arreglo es el orden de evaluacion (los codigos de grupo no cambian).
    ['05', 'Muros en drywall y paneles', /DRY ?WALL|SUPERBOARD|TERMOAC|PANEL/],
    ['01', 'Muros en bloque', /MURO.*BLOQUE/],
    ['02', 'Muros en ladrillo y sistemas tradicionales', /MURO/],
    ['06', 'Sobrecimientos', /SOBRE?R?CIMIENTO/],
    ['03', 'Dinteles, alfajías y remates', /DINTEL|ALFAGIA|ALFAJIA|REMATE|PASAMANO/],
    ['04', 'Mesones y elementos en ladrillo', /MESON|ENCHAPE|LAVADA/],
    ['99', 'Otros de mampostería', /./]] },
  '1.05': { nombre: 'Pañetes', grupos: [
    ['01', 'Pañetes sobre muro', /PANETE (LISO|RUSTICO|IMPERMEAB)/],
    ['02', 'Pañetes bajo placa y cielos', /BAJO|ENTRAMADO|GUADUA|MALLA/],
    ['03', 'Filos, dilataciones y goteras', /FILO|GOTERA|DILATA/],
    ['99', 'Otros pañetes', /./]] },
  '1.06': { nombre: 'Instalaciones hidráulicas y sanitarias', grupos: [
    ['01', 'Acometidas y conexiones', /ACOMETIDA|CONEXION/],
    ['02', 'Redes de suministro (agua fría y caliente)', /RED SUMINISTRO|RED DE SUMINISTRO/],
    ['03', 'Puntos hidráulicos', /PUNTO/],
    ['04', 'Registros, cheques y válvulas', /REGISTRO|CHEQUE|VALVULA/],
    ['05', 'Tanques de almacenamiento', /TANQUE/],
    ['06', 'Bajantes y canales', /BAJANTE|CANAL/],
    ['07', 'Desagües sanitarios y ventilación', /SANITARI|SIFON|CODO|REVENTILA|DRENAJE|TUBERIA/],
    ['08', 'Instalación de aparatos', /LAVAMANOS|SANITARIO/],
    ['99', 'Otros hidrosanitarios', /./]] },
  '1.07': { nombre: 'Instalaciones eléctricas y alumbrado', grupos: [
    ['01', 'Acometidas, contadores y tableros', /ACOMETIDA|CONTADOR|TABLERO|TIERRA/],
    ['02', 'Salidas de iluminación e interruptores', /SALIDA.*(LAMPARA|LUMINARIA|INTERRUPTOR)/],
    ['03', 'Salidas de tomas y fuerza', /SALIDA.*(TOMA|BIFASICA|TRIFASICA)/],
    ['04', 'Salidas de comunicaciones (voz, datos, TV, timbre)', /SALIDA|STRIP|CAJA EMPALME/],
    ['05', 'Luminarias interiores', /PANEL LED|HERMETICA|FLUORESCENTE|LAMPARA|ROSETA|SOCKET|RIEL/],
    ['06', 'Alumbrado exterior y reflectores', /LUMINARIA|REFLECTOR|PROYECTOR/],
    ['07', 'Tubería y canalización', /TUBERIA|CONDUIT/],
    ['99', 'Otros eléctricos', /./]] },
  '1.08': { nombre: 'Instalaciones de gas', grupos: [
    ['01', 'Tubería de gas', /TUBERIA/],
    ['02', 'Accesorios y válvulas de gas', /./]] },
  '1.09': { nombre: 'Pintura', grupos: [
    // Fachadas y vinilos antes que estuco ("VINILO ... SOBRE ESTUCO" es pintura, no estuco).
    ['03', 'Pintura de fachadas', /FACHADA|MARMOPLAST/],
    ['02', 'Pintura de muros y cielos (vinilo, carburo)', /VINILO|CARBURO|MARMOLINA/],
    ['01', 'Estucos y preparación', /ESTUCO|ADHERENTE|FILOS/],
    ['04', 'Esmaltes y pintura de carpintería', /ESMALTE|TINTILLA|LACA|BARNIZ/],
    ['99', 'Otras pinturas', /./]] },
  '1.10': { nombre: 'Enchapes', grupos: [
    ['01', 'Enchapes en porcelana y cerámica', /PORCELANA|CERAMIC/],
    ['02', 'Enchapes en piedra', /PIEDRA|TRAVERTINO|ESPACATO/],
    ['03', 'Incrustaciones y accesorios de baño', /INCRUSTACI|CORTINA/],
    ['04', 'Rejillas y tragantes', /REJILLA/],
    ['05', 'Remates y muretes', /REMATE|MURETE|BOCEL/],
    ['99', 'Otros enchapes', /./]] },
  '1.11': { nombre: 'Pisos, bases y acabados', grupos: [
    ['07', 'Escaleras, pirlanes y bocapuertas', /ESCALERA|PIRLAN|BOCA PUERTA/],
    ['06', 'Guardaescobas', /GUARDAESCOBA/],
    ['08', 'Pulida y mantenimiento de pisos', /^PULID/],
    ['01', 'Bases, alistados y placas de piso', /ALISTADO|BASE|PLACA BASE|POYO/],
    ['02', 'Pisos en granito y mármol', /GRANITO|MARMOL|GRAVILLA/],
    ['03', 'Pisos cerámicos y de gres', /CERAMICA|GRES|BALDOSIN DE CEMENTO/],
    ['04', 'Pisos en madera, vinilo y alfombra', /MADERA|LISTON|VINILO|ALFOMBRA/],
    ['05', 'Adoquines y pisos exteriores', /ADOQUIN|GRAMA|POLVO DE LADRILLO|CANUELA/],
    ['99', 'Otros pisos', /./]] },
  '1.12': { nombre: 'Cubiertas', grupos: [
    // Solo si el nombre ES la estructura ("TEJA ... NO INCLUYE ENTRAMADO" es la teja).
    ['01', 'Estructura y entramado de cubierta', /^(SUMINISTRO E INSTALACION (DE )?)?(ESTRUCTURA|ENTRAMADO|PERFILERIA)/],
    ['02', 'Cubiertas en fibrocemento', /FIBROCEMENTO|ETERNIT|CALIFORNIA/],
    ['03', 'Cubiertas metálicas y termoacústicas', /GALVANIZADA|METALIC|ALUZINC|DURALUM|THERMO|TERMO|HUNTER|TECHOLINE|ACESCO/],
    ['04', 'Cubiertas en teja de barro', /BARRO/],
    ['05', 'Cubiertas traslúcidas (policarbonato, alveolar)', /POLICARBONATO|ALVEOLAR|TRANSPARENTE/],
    ['06', 'Impermeabilización y afinados', /IMPERM|MANTO|AFINADO|ALISTADO|SHINGLE/],
    ['07', 'Canales, bajantes, flanches y caballetes', /CANAL|BAJANTE|FLANCHE|CABALLETE|TRAGANTE/],
    ['99', 'Otras cubiertas', /./]] },
  '1.13': { nombre: 'Cielos rasos', grupos: [
    ['01', 'Cielos en drywall y fibrocemento', /DRYWALL|SUPERBOARD|DURACUST|LAMINA PLANA|SUPERCELL/],
    ['02', 'Cielos en madera', /MADERA|MACHI|LISTON|TABLEX/],
    ['03', 'Cielos metálicos y en PVC', /METALIC|PANEL|LUXACELL|ICOPOR/],
    ['04', 'Armaduras y mallas para pañete', /ARMADURA|MALLA/],
    ['05', 'Cornisas y apliques en yeso', /CORNISA|APLIQUE/],
    ['99', 'Otros cielos', /./]] },
  '1.14': { nombre: 'Carpintería en madera', grupos: [
    // Closets y gabinetes antes que puertas ("CLOSET ... puerta entablerada").
    ['03', 'Clósets', /CLOSET/],
    ['04', 'Gabinetes y muebles de cocina y baño', /GABINETE|MUEBLE/],
    ['01', 'Puertas y marcos', /PUERTA/],
    ['02', 'Ventanería', /VENTAN/],
    ['05', 'Pasamanos, barandas y pirlanes', /PASA ?MANO|BARANDA|PIRLAN/],
    ['99', 'Otra carpintería en madera', /./]] },
  '1.15': { nombre: 'Carpintería metálica', grupos: [
    ['01', 'Puertas y marcos metálicos', /PUERTA|MARCO/],
    ['02', 'Ventanas', /VENTANA/],
    ['03', 'Rejas y protecciones', /REJA/],
    ['04', 'Divisiones de baño', /DIVISI/],
    ['05', 'Estructura liviana (correas, templetes, escaleras de gato)', /CORREA|TEMPLETE|ESCALERA/],
    ['06', 'Barras de seguridad', /BARRA/],
    ['99', 'Otra carpintería metálica', /./]] },
  '1.16': { nombre: 'Aparatos sanitarios', grupos: [
    ['01', 'Combos y sanitarios', /COMBO|SANITARIO|APARATOS/],
    ['02', 'Lavamanos', /LAVAMANOS/],
    ['03', 'Duchas y orinales', /DUCHA|ORINAL/],
    ['04', 'Barras de seguridad', /BARRA/],
    ['05', 'Accesorios de baño (dispensadores, secadores)', /./]] },
  '1.17': { nombre: 'Vidrios y cerraduras', grupos: [
    ['01', 'Vidrios y espejos', /VIDRIO|ESPEJO/],
    ['02', 'Cerraduras', /./]] },
  '1.18': { nombre: 'Obras exteriores', grupos: [
    ['01', 'Andenes, adoquines y sardineles', /ANDEN|ADOQUIN|SARDINEL|ESTRIADO|PISO/],
    ['02', 'Fachadas y muros exteriores', /FACHADA|MURO|ESTUCO/],
    ['03', 'Zonas verdes', /PRADIZACI|PASTO|GRAMA/],
    ['04', 'Aseo y entrega', /ASEO/],
    ['99', 'Otras obras exteriores', /./]] },
  '1.19': { nombre: 'Instalaciones deportivas', grupos: [
    ['01', 'Canchas', /CANCHA/],
    ['02', 'Dotación y demarcación deportiva', /./]] },
  '1.20': { nombre: 'Otros', grupos: [
    ['01', 'Mesones', /MESON/],
    ['02', 'Cercas y cerramientos', /CERCA|CERRAMIENTO/],
    ['03', 'Mobiliario, señalización y paisajismo', /./]] },
  '1.21': { nombre: 'Sistema telefónico', grupos: [
    ['01', 'Acometidas y cableado telefónico', /ACOM|CABLE|INTERCONEXI/],
    ['02', 'Salidas y tomas telefónicas', /SALIDA|TOMA/],
    ['03', 'Strips y citófonos', /./]] },
  '1.22': { nombre: 'Cableado estructurado', grupos: [
    ['01', 'Canalizaciones (canaletas, ductos, bandejas)', /CANALETA|DUCTO|BANDEJA|CORAZA|CAJA/],
    ['02', 'Cableado', /CABLE|CORD/],
    ['03', 'Racks, patch panels y cuartos de control', /RACK|PATCH PANEL|CUARTO|PROTECTOR/],
    ['04', 'Módulos, marcos y salidas', /MODULO|MARCO|SALIDA|CORTACIRCUITO/],
    ['99', 'Otros de cableado estructurado', /./]] },
  '1.23': { nombre: 'Fachadas y revestimientos', grupos: [['01', 'Revestimientos de fachada', /./]] },
};

// Tipo de trabajo (primera regla que cumple)
// Ojo: las reglas de demolicion van ancladas al inicio del nombre ("INSTALACION" contiene "TALA"; "(INCLUYE RETIRO)" aparece en excavaciones).
const TIPOS = [
  ['Movimiento de tierras', /^(EXCAVACI|RELLENO)/],
  ['Demolición y retiro', /^(DEMOLICI|DESMONTE|RETIRO|ROTURA|REGATA|ABERTURA|CORTE)/],
  ['Obra provisional y adecuación', /PROVISIONAL|^CERRAMIENTO EN TABLA|^CERRAMIENTO ALAMBRE|^LOCALIZACI|^DESCAPOTE|^CONFIGURACI|^CONFORMACI/],
  ['Transporte y alquiler', /^(ACARREO|ALQUILER)|TRANSPORTE/],
  ['Salida o punto de instalación', /^SALIDA|^PUNTO|SALIDA (PARA|DE|SANITARIA)/],
  // Anclado al inicio: "SOBRECIMIENTO ... INCLUYE PANETE" es construccion, no acabado.
  ['Aplicación de acabado', /^(PINTURA|VINILO|ESMALTE|ESTUCO|CARBURO|TINTILLA|MARMOLINA|MARMOPLAST|PANETE|ALISTADO|AFINADO|PULID|LAVADA|ADHERENTE|FILOS|IMPERMEABILIZACION AUTO)/],
  ['Suministro e instalación', /SUM[IN]*S?T?RO|INSTALACI|^CABLE|^CANALETA|^DUCTO|^MODULO|^PATCH|^RACK|^GABINETE|^LINE CORD|^MARCO|^PROTECTOR|^CORTACIRCUITO|^BANDEJA|^CORAZA|APARATOS|DUCHA|CERRADURA|VIDRIO|ESPEJO|HOJA PUERTA|VENTAN|CLOSET|PUERTA|PASA ?MANO|BARANDA|MUEBLE|PIRLAN|DIVISI|REJA|TEMPLETE|BARRA|CORREA|ESCALERA DE GATO|STRIP|TOMA|TELEFONO|CITOFONO|ACOM|INTERCONEXI|LAMINA|CIELO|CORNISA|APLIQUE|ARMADURA|TABLEX|LISTON|LUXACELL|MALLA CON VENA|SOCKET|SOPORTE|TIERRA|REMATE|BOCA PUERTA|PISO|GUARDAESCOBA|ADOQUIN|TABLETA|TABLON|MESON|CERCA|CERRAMIENTO|DEMARCACI|PORTERIA|TABLERO|CORTASOL|TRAGANTE/],
  ['Construcción en sitio', /./],
];

// Material principal (primera regla que cumple). El orden importa: muchos nombres traen "PSI", "MPa" o "BAJO PLACA"
// sin ser de concreto (tuberias CPVC 100 PSI, acero 37000 PSI, pintura bajo placa), por eso esas reglas van antes.
const MATERIALES = [
  ['Acero inoxidable', /INOXIDABLE/],
  ['Aparatos sanitarios y grifería', /LAVAMANOS|SANITARIO|ORINAL|COMBO|DUCHA|GRIFERIA/],
  ['Policarbonato y plásticos', /PF ?\+ ?UAD|POLIETILENO/],
  ['Bronce y accesorios hidráulicos', /^(?!.*PVC).*(BRONCE|RED-? ?W ?HITE|CHEQUE|REGISTRO|VALVULA)/],
  ['Madera', /^ARMADURA MADERA|VIROLA|(CORREA|VIGA|COLUMNA|ESTRUCTURA)[^,]*MADERA|INSTALACION (DE )?ENTRAMADO PARA TEJA DE BARRO/],
  ['Policarbonato y plásticos', /TERMOACUSTIC|THERMOACUSTIC/],
  ['Aluminio', /DURALUM|HUNTER DOUGLAS/],
  ['Tierra y bahareque', /BAHAREQUE|ADOBE|TAPIA/],
  ['Drywall y yeso', /DRY ?WALL/],
  ['Fibrocemento', /ETEBOARD|ETERNIT/],
  // Acabados por el inicio del nombre ("ESTUCO Y VINILO ... BAJO PLACA" es pintura)
  ['Pinturas y estucos', /^(ESTUCO|VINILO|PINTURA|ESMALTE|CARBURO|TINTILLA|MARMOLINA|MARMOPLAST|ADHERENTE)|GRANIPLAS/],
  ['Mortero y pañete', /^(PANETE|ALISTADO|AFINADO|FILOS)/],
  // Equipos electricos antes que concreto ("LAMPARA ... BAJO PLACA") y que PVC (la salida electrica lleva tubo PVC).
  ['Cableado y equipos eléctricos', /LAMPARA|LUMINARIA|\bLED\b|REFLECTOR|FLUORESCENTE|SOCKET|ROSETA|TABLERO (PARCIAL|GENERAL)|TIERRA TABLERO|CONTADOR|CABLE|UTP|PATCH|RACK|MODULO|INTERRUPTOR|TELEF|STRIP|LINE CORD|CORTACIRCUITO|PROTECTOR DE ESTADO|CUARTOS DE CONTROL|SALIDA (PARA|LAMPARA|TOMA|BIFASICA|TRIFASICA|T\.V|TIMBRE|DE VOZ|DE DATOS|ELECTRICA)/],
  ['Acero de refuerzo', /ACERO \d|FIGURADA|MALLA ELECTROSOLDADA|REFUERZO/],
  ['CPVC', /CPVC/],
  ['PVC', /PVC|CONDUIT|PAVCO|AMAZONA|RAINGO|\bDLP\b|DUCTOS? VERTICAL/],
  ['Policarbonato y plásticos', /POLICARBONATO|ALVEOLAR|ACRILICO|POLIPROPILENO|TRANSPARENTE|THERMOACUSTICA|TECHOLINE/],
  ['Concreto', /CONCRETO|CICLOPEO|PLACA|LOSA|ZAPATA|PEDESTAL|COLUMNA|VIGA|SOLADO|ESCALERA(S)? MACIZA|SARDINEL|CUNETA|ANDEN|\bMPA\b|\d ?MPA|PSI|GAVION|CANUELA|POYO|BALDOSIN DE CEMENTO|SOBRE?R?CIMIENTO|PAVIMENTO|LAVADERO/],
  ['Ladrillo y bloque', /LADRILLO|BLOQUE|TOLETE|PRENSADO|MAMPOSTER/],
  ['Acero galvanizado', /GALVANIZ|GALV\.|\bZINC\b|COLD ROLLED|LAMINA CAL|LAMINA 12|CAL\. ?18|CAL 18|ALUZINC|ACESCO|FLANCHE/],
  ['Perfilería y elementos metálicos', /METALIC|TEMPLETE|ANTICORR|^MALLA|ESLABONADA|PUAS|ALAMBRE|DESMONTE DE CUBIERTA LAMINA|REJA|CANECA|PERFILERIA|CELOSCREEN|CORTASOL|\bACERO\b|TUBO (A\.N\.|AGUA NEGRA)|AGUA NEGRA|CANCHA|PORTERIA|TRAGANTE|BANDEJA|SOPORTE/],
  ['Cobre', /COBRE|COOPER/],
  ['Aluminio', /ALUMINIO/],
  ['Madera', /MADERA|PINO|ABARCO|GUAYACAN|CEDRO|AMARILLO|MACHI|LISTON|TABLEX|TRIPLEX|FORTEC|TABLA BURRA|GUADUA/],
  ['Porcelana y cerámica', /PORCELANA|CERAMIC|INCRUSTACI|BALDOSIN(?! DE GRANITO)/],
  ['Granito, mármol y piedra', /GRANITO|GRANO PULIDO|MARMOL|PIEDRA|TRAVERTINO|ESPACATO|GRAVILLA/],
  ['Gres', /GRES/],
  ['Fibrocemento', /FIBROCEMENTO|ASBESTO|SUPERBOARD|SUPERCELL|LAMINA PLANA/],
  ['Drywall y yeso', /DRYWALL|YESO|DURACUST/],
  ['Policarbonato y plásticos', /PLASTIC|VINISOL|ICOPOR|PVC-FOIL/],
  ['Alfombras y textiles', /ALFOMBRA/],
  ['Herrajes y cerraduras', /CERRADURA|DISPENSADOR|PROTECTOR DE PAPEL/],
  ['Teja de barro', /BARRO/],
  ['Impermeabilizantes y asfalto', /IMPERM|MANTO|ASFALT|SHINGLE|FIBERGLASS/],
  ['Pinturas y estucos', /PINTURA|VINILO|ESMALTE|ESTUCO|CARBURO|TINTILLA|MARMOLINA|MARMOPLAST|EPOXICO|ACIDO/],
  ['Mortero y pañete', /PANETE|MORTERO|ALISTADO|AFINADO|GOTERA/],
  ['Vidrio', /VIDRIO|ESPEJO/],
  ['Cableado y equipos eléctricos', /TOMA|SALIDA|EMT|RIEL|ENERGIA|RED ELECTRICA|PROYECTOR/],
  ['Material térreo y vegetal', /TIERRA|PETREO|AFIRMADO|SUBRASANTE|DESCAPOTE|EXCAVACI|RELLENO|GRAMA|PASTO|ARBOL|ARBUSTO|RAIZ|NIVELACI|RAICES/],
  ['Varios', /./],
];

const primera = (lista, nombre) => (lista.find(([, re]) => re.test(nombre)) || lista[lista.length - 1]);

// Clasifica todas las actividades de edificacion (codigo 1.xx.yy) en el orden del APU.
function clasificarEdificacion(actividades) {
  const consecutivo = {};
  return actividades.filter((a) => /^1\.\d+\.\d+/.test(a.codigo)).map((a) => {
    const cap = a.codigo.split('.').slice(0, 2).join('.');
    const def = GRUPOS[cap] || { nombre: cap, grupos: [['99', 'Sin grupo', /./]] };
    const nombre = n(a.nombre);
    const [g, grupo] = def.grupos.find(([, , re]) => re.test(nombre)) || def.grupos[def.grupos.length - 1];
    const cc = cap.split('.')[1];
    const clave = cc + '-' + g; consecutivo[clave] = (consecutivo[clave] || 0) + 1;
    return {
      codigoApu: a.codigo, nombre: a.nombre, unidad: a.unidad, costo: a.costoTotal,
      capitulo: cap, nombreCapitulo: def.nombre, grupo: g, nombreGrupo: grupo,
      tipo: primera(TIPOS, nombre)[0], material: primera(MATERIALES, nombre)[0],
      codigo: `ED-${cc}-${g}-${String(consecutivo[clave]).padStart(3, '0')}`,
    };
  });
}

module.exports = { GRUPOS, TIPOS, MATERIALES, clasificarEdificacion };
