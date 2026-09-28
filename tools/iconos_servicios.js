// Iconos minimalistas (SVG de trazo) para las actividades del analisis de precios unitarios.
// Cada actividad recibe el icono de su tipo de trabajo segun su nombre y capitulo.
// Los SVG se escriben en pages/Servicios/iconos/ (los usa la pestaña Servicios).
const fs = require('fs');
const path = require('path');

const TRAZO = 'fill="none" stroke="#354b3e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
const svg = (cuerpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" ${TRAZO}>${cuerpo}</svg>\n`;

// [clave, nombre visible, patron sobre "CAPITULO NOMBRE" normalizado, dibujo]
const ICONOS = [
  ['personal', 'Personal de obra', /^5\.|SUELDO|SALARIO/,
    '<circle cx="32" cy="20" r="9"/><path d="M14 54c0-10 8-17 18-17s18 7 18 17"/>'],
  ['demolicion', 'Demolición y retiro', /DEMOLICI|ROTURA|REGATA|ABERTURA|DESMONTE (?!Y LIMPIEZA)|RETIRO/,
    '<path d="M10 44l18-18"/><path d="M22 14l14 14"/><path d="M26 18l10-8 10 10-8 10"/><path d="M38 44h16M42 50h12M46 38h8"/>'],
  ['transporte', 'Transporte y acarreo', /TRANSPORTE|ACARREO|CARGUE|VOLQUETA|BOTADERO|ESCOMBRERA|ALQUILER DE CAMION/,
    '<path d="M6 42V22h30v20"/><path d="M36 28h12l8 8v6h-20"/><circle cx="18" cy="46" r="5"/><circle cx="46" cy="46" r="5"/>'],
  ['limpieza', 'Limpieza y aseo', /LIMPIEZA|ASEO|BARRIDO|LAVADA DE FACHADA/,
    '<path d="M40 8L28 34"/><path d="M20 32l16 6-4 18H12z"/><path d="M18 44l-2 10M24 46l-2 8"/>'],
  ['topografia', 'Replanteo y topografía', /REPLANTEO|LOCALIZACI|TOPOGRAF|NIVELACI|CONFIGURACI/,
    '<path d="M32 30L18 56M32 30l14 26M32 30v26"/><rect x="24" y="12" width="16" height="12" rx="2"/><path d="M40 18h8"/>'],
  ['cerramiento', 'Cerramiento', /CERRAMIENTO|AISLAMIENTO|ALAMBRE DE PUAS|MALLA ESLABONADA|PORTON/,
    '<path d="M12 14v40M28 14v40M44 14v40M58 14v40"/><path d="M6 24h54M6 42h54"/>'],
  ['excavacion', 'Excavación y movimiento de tierra', /EXCAVACI|DESCAPOTE|RELLENO|ZANJA|TERRAPLEN|PEDRAPLEN|EXPLANACI|CORTES|ENTIBADO|BOMBEO|SUBRASANTE|COMPACTACI/,
    '<path d="M44 8L28 24"/><path d="M24 20l12 12-10 10c-4 4-12 2-14-4-2-4 0-8 2-10z"/><path d="M8 56h48"/><path d="M40 50c4-6 10-6 14 0"/>'],
  ['acero', 'Acero de refuerzo', /ACERO|HIERRO|MALLA ELECTRO|REFUERZO|FIGURADA|FLEJE|PREESFUERZO|ANCLAJE/,
    '<path d="M10 48L48 10M18 54L56 16M8 38L38 8"/><path d="M20 36l4 4M28 28l4 4M36 20l4 4"/>'],
  ['electrica', 'Instalaciones eléctricas', /ELECTRIC|SALIDA (BIF|MONOF|TRIF|TOMA|ELECT|TV)|TOMACORR|TABLERO(?! PARA)|ACOMETIDA(?!.*(GAS|TELEF|ACUEDUCTO|AGUA))|BREAKER|CONDUIT|CABLE (AWG|THW|#|DE COBRE)|EMT|INTERRUPTOR|CODENSA|TRANSFORMADOR|ENERGIA|CONTADOR|MEDIDOR DE ENERGIA/,
    '<path d="M36 6L16 36h14l-4 22 22-32H34z"/>'],
  ['iluminacion', 'Iluminación', /LAMPARA|LUMINARIA|APLIQUE|REFLECTOR|BOMBILLO|ALUMBRADO|SOCKET|BALASTO/,
    '<path d="M24 40c-4-4-8-8-8-16a16 16 0 0 1 32 0c0 8-4 12-8 16"/><path d="M24 46h16M26 52h12"/>'],
  ['datos', 'Voz, datos y telefonía', /TELEF|VOZ|DATOS|UTP|CABLEADO|BANDEJA|CITOFON|FIBRA|STRIP/,
    '<rect x="12" y="34" width="40" height="18" rx="2"/><path d="M20 43h4M30 43h4M40 43h4"/><path d="M32 34V22"/><path d="M22 18a14 14 0 0 1 20 0M16 12a22 22 0 0 1 32 0"/>'],
  ['gas', 'Instalaciones de gas', /^4\.|\bGAS\b/,
    '<path d="M32 8c6 10 16 16 16 30a16 16 0 0 1-32 0c0-8 4-12 8-16 0 6 2 10 6 10 0-10-2-16 2-24z"/>'],
  ['aparatos', 'Aparatos sanitarios', /SANITARIO|LAVAMANOS|DUCHA|GRIFER|ORINAL|LAVAPLATOS|COMBO|INCRUSTACI|MESON|LAVADERO|TINA\b|ACCESORIOS? (DE|PARA) BAN/,
    '<path d="M16 10h14v18H16z"/><path d="M12 28h36c0 10-6 16-14 16h-8v10h16"/><path d="M18 54h20"/>'],
  ['agua', 'Instalaciones hidráulicas', /AGUA|ACUEDUCTO|HIDRAUL|PRESI|CPVC|VALVULA|REGISTRO|TANQUE|HIDRANTE|MEDIDOR|FILTRO|LECHO|PUNTO|GALVANIZ|H\.G\./,
    '<path d="M32 8C24 20 16 28 16 38a16 16 0 0 0 32 0c0-10-8-18-16-30z"/><path d="M24 40a8 8 0 0 0 8 8"/>'],
  ['tuberia', 'Tubería y redes sanitarias', /TUBERI|TUBO|PVC|CODO|TEE\b|UNION|ALCANTARILL|DESAG|POZO|CAMARA|SIFON|INSPECCI|SEPTICO|NIPLE|ADAPTADOR|REDUCCI|TAPON|ACCESORIO|DOMICILIARIA|CANUELA|BAJANTE|SALIDA SANITARIA/,
    '<path d="M8 20h24a10 10 0 0 1 10 10v26"/><path d="M8 32h20a4 4 0 0 1 4 4v20"/><path d="M8 16v20M28 52h18"/>'],
  ['vias', 'Vías, andenes y pavimentos', /PAVIMENT|ASFALT|CARPETA|SARDINEL|ANDEN|BOLARDO|AFIRMADO|SUBBASE|BASE GRANULAR|CUNETA|GAVION|PUENTE|SENAL|ESTOPEROL|CAPTAFARO|BORDILLO|RAMPA|^3\./,
    '<path d="M22 8L10 56M42 8l12 48"/><path d="M32 12v8M32 28v8M32 44v8"/>'],
  ['concreto', 'Concreto y estructura', /CONCRETO|PLACA|LOSA|COLUMNA|VIGA|ZAPATA|CICLOPEO|MORTERO|PEDESTAL|DADO|ESCALERA|MURO DE CONTENCI|LECHADA|^6\.0[12]/,
    '<rect x="10" y="10" width="44" height="10" rx="1"/><path d="M16 20v34M48 20v34"/><path d="M10 54h44"/><path d="M24 30h16v24H24z"/>'],
  ['mamposteria', 'Mampostería', /MURO|MAMPOSTER|BLOQUE|LADRILLO|TOLETE|DINTEL|ALFAGIA|SOBRECIMIENTO|SOBRERCIMIENTO|BAHAREQUE|ANTEPECHO|COLUMNETA|CELOSIA/,
    '<rect x="8" y="12" width="48" height="40" rx="1"/><path d="M8 25h48M8 38h48M24 12v13M40 12v13M16 25v13M32 25v13M48 25v13M24 38v14M40 38v14"/>'],
  ['panete', 'Pañetes y estucos', /PANETE|FILOS|DILATACI|REPELLO|ESTUCO|GOTERA/,
    '<path d="M10 40h34l6-6H16z"/><path d="M30 34V22c0-4 4-6 8-6h6"/><path d="M50 12v12"/>'],
  ['pintura', 'Pintura', /PINTURA|VINILO|ESMALTE|CARBURO|TINTILLA|LACA|EPOXIC|MARMOPLAST|DEMARCACI|MARCAS VIALES|BARNIZ|KORAZA/,
    '<rect x="10" y="10" width="36" height="14" rx="3"/><path d="M46 17h6v12H30v8"/><rect x="26" y="37" width="8" height="18" rx="2"/>'],
  ['pisos', 'Pisos y enchapes', /PISO|ENCHAPE|CERAMIC|PORCELANAT|TABLETA|BALDOSA|ADOQUIN|GRANITO|GUARDAESCOBA|LISTON|ALISTADO|AFINADO|ZOCALO|\bGRES\b/,
    '<rect x="10" y="10" width="44" height="44" rx="2"/><path d="M32 10v44M10 32h44"/>'],
  ['cubierta', 'Cubierta e impermeabilización', /TEJA|CUBIERTA|CANAL|CABALLETE|IMPERMEAB|MANTO|CERCHA|CORREA|TRAGANTE|FLANCHE/,
    '<path d="M6 32L32 12l26 20"/><path d="M14 26v26h36V26"/><path d="M26 52V38h12v14"/>'],
  ['cielo', 'Cielo rasos y drywall', /CIELO|DRYWALL|YESO|SUPERBOARD|ENTRAMADO|MOLDURA|BOVEDA/,
    '<path d="M6 14h52"/><path d="M10 14v8h44v-8"/><path d="M18 22v6M32 22v6M46 22v6"/><path d="M14 50h36"/>'],
  ['cerraduras', 'Cerraduras y vidrios', /CERRADURA|VIDRIO|ESPEJO/,
    '<circle cx="22" cy="32" r="10"/><path d="M32 32h24M48 32v8M54 32v6"/>'],
  ['carpinteria', 'Carpintería y herrería', /PUERTA|VENTANA|MARCO|CLOSET|CARPINTER|BARANDA|MADERA|REJA|DIVISI|PASAMANO|GUADUA|ESTANTE|CORTASOL|LAMINA/,
    '<rect x="16" y="8" width="32" height="48" rx="1"/><path d="M22 14h20v18H22z"/><circle cx="40" cy="40" r="2"/>'],
  ['jardin', 'Zonas verdes y reforestación', /JARDIN|ARBOL|ARBUSTO|PRADIZ|PRADO|REFORESTACI|SETO|GRAMA|EMPRADIZ|RAIZ|SIEMBRA|MANTENIMIENTO/,
    '<path d="M32 56V28"/><path d="M32 36c-10 0-16-6-16-16 10 0 16 6 16 16zM32 30c0-10 6-16 16-16 0 10-6 16-16 16z"/><path d="M20 56h24"/>'],
  ['deportivo', 'Instalaciones deportivas', /CANCHA|BALONCESTO|FUTBOL|DEPORTIV|TABLERO PARA|PORTERIA/,
    '<circle cx="32" cy="32" r="22"/><path d="M10 32h44M32 10c-8 8-8 36 0 44M32 10c8 8 8 36 0 44"/>'],
  ['general', 'Obra general', /./,
    '<path d="M12 42V36a20 20 0 0 1 40 0v6"/><path d="M6 42h52l-4 8H10z"/><path d="M26 18v14M38 18v14"/><path d="M26 18a14 14 0 0 1 12 0"/>'],
];

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

function iconoDe(actividad) {
  // Se evalua sobre "CAPITULO NOMBRE": los patrones con ^ (p. ej. ^5. sueldos, ^3. vias) miran el codigo de capitulo.
  // "(NO) INCLUYE REFUERZO" describe el alcance, no el oficio; y lo que empieza por "CONCRETO" es concreto.
  const base = normalizar(actividad.capitulo + ' ' + actividad.nombre).replace(/\(?(NO )?INCLUYE (EL )?REFUERZO\)?/g, '');
  if (/^CONCRETO/.test(normalizar(actividad.nombre).trim())) return 'concreto';
  for (const [clave, , patron] of ICONOS) if (patron.test(base)) return clave;
  return 'general';
}

function escribirIconos(carpeta) {
  fs.mkdirSync(carpeta, { recursive: true });
  for (const [clave, , , dibujo] of ICONOS) fs.writeFileSync(path.join(carpeta, clave + '.svg'), svg(dibujo), 'utf8');
  return ICONOS.map(([clave, nombre]) => ({ clave, nombre }));
}

module.exports = { iconoDe, escribirIconos, ICONOS };
