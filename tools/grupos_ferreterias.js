// Grupos de ferreterias (objeto unico que usan el scraper y el generador del inventario).
// - "proveedores": nombres de proveedor del inventario que pertenecen al grupo (carpetas que ya existen en pages/ESTADISTICAS).
// - "tiendas": ferreterias con pagina web verificada (reconocimiento del 26/09/2026). Las que tienen "adaptador" se capturan
//   con tools/scraper/ferreterias/catalogo_tiendas.js y su Excel queda en pages/ESTADISTICAS/<carpeta>/<Tienda>/.
// Criterio del grupo Bogota: las 5 ferreterias de Bogota con la pagina mas completa (productos publicados con precio y foto).

const GRUPOS = {
  'Ferreterias Boyaca': {
    carpeta: 'FERRETERIAS BOYACA',
    descripcion: 'COMFER (Tunja) y las 4 ferreterias de Boyaca con el catalogo web mas completo',
    // Orden: COMFER + las 4 con mas productos publicados; luego las demas verificadas.
    principales: ['COMFER', 'Soelco', 'G&J', 'Grupo Ferropaz', 'Ferropaz'],
    proveedores: ['COMFER', 'Soelco', 'G&J'],
    tiendas: [
      { nombre: 'COMFER', ciudad: 'Tunja', web: '', productosWeb: null, precios: true, adaptador: null, nota: 'Ya en el inventario (pages/ESTADISTICAS/COMFER); ferreteria de referencia del grupo' },
      { nombre: 'Soelco', ciudad: 'Tunja', web: 'https://soelco.co/', plataforma: 'WooCommerce', productosWeb: 16363, precios: true, adaptador: null, nota: 'Ya en el inventario (15.659 productos de una captura anterior); se puede actualizar con el adaptador woo' },
      { nombre: 'G&J', ciudad: 'Tunja', web: 'https://gyj.com.co/tunja/', plataforma: 'Magento', productosWeb: 58, precios: true, adaptador: null, nota: 'Ya en el inventario (53 productos, perfileria y tuberia)' },
      { nombre: 'Ferropaz', ciudad: 'Tunja', web: 'https://ferropaz.com/', plataforma: 'PrestaShop', productosWeb: 8, precios: true, adaptador: 'prestashop', ids: [1, 2, 3, 4, 5, 6, 7, 8] },
      { nombre: 'Grupo Ferropaz', ciudad: 'Tunja', web: 'https://grupoferropaz.com/', plataforma: 'WooCommerce', productosWeb: 14, precios: false, adaptador: 'mapa', mapa: 'https://grupoferropaz.com/product-sitemap.xml', nota: 'Vitrina (ladrillo, cemento); publica pocos precios' },
      { nombre: 'Ferremundo la 17', ciudad: 'Tunja', web: 'https://ferreteriatunja.com/', plataforma: 'WooCommerce', productosWeb: 4, precios: false, adaptador: 'woo', nota: 'Adicional (fuera de las 4 principales): 4 productos sin precio' },
      { nombre: 'Ferreteria Makro', ciudad: 'Tunja', web: 'https://ferremakrotunja.wixsite.com/makro', plataforma: 'Wix', productosWeb: 0, precios: false, adaptador: null, nota: 'Sitio informativo; pedidos por WhatsApp' },
    ],
    descartadas: [
      { nombre: 'Distrifer', web: 'https://ferreteriadistrifer.com/', motivo: 'El dominio no resuelve (26/09/2026)' },
      { nombre: 'SETMI Materiales', web: 'https://www.setmimateriales.com/', motivo: 'Responde 404' },
      { nombre: 'Almacenes Boyaca', web: 'https://www.boyaca.com/', motivo: 'Empresa de Ecuador, no de Boyaca' },
      { nombre: 'Ferresmart', web: 'https://ferresmart.com.co/', motivo: 'Tienda nacional; Tunja solo aparece en su lista de envios' },
    ],
  },
  'Ferreterias Bogota': {
    carpeta: 'FERRETERIAS BOGOTA',
    descripcion: 'Las 5 ferreterias de Bogota con la pagina web mas completa',
    proveedores: [],
    tiendas: [
      { nombre: 'Easy', ciudad: 'Bogota', web: 'https://www.easy.com.co/', plataforma: 'VTEX', productosWeb: 33348, precios: true, adaptador: 'vtex' },
      { nombre: 'Ferricentro', ciudad: 'Bogota', web: 'https://ferricentro.com/', plataforma: 'Magento (GraphQL)', productosWeb: 7068, precios: true, adaptador: 'magento', vistaMagento: 'ferricentro', nota: 'La vista por defecto de su GraphQL es Sumatec (22.982); la de Ferricentro tiene 7.068' },
      { nombre: 'Ferreco', ciudad: 'Bogota', web: 'https://ferreco.com/', plataforma: 'PrestaShop', productosWeb: 4700, precios: true, adaptador: 'mapa', mapa: 'https://ferreco.com/sitemap.xml', excluir: '/blog' },
      { nombre: 'Luis Penagos', ciudad: 'Bogota', web: 'https://ferreterialuispenagos.com/', plataforma: 'WooCommerce (API cerrada)', productosWeb: 4063, precios: true, adaptador: 'mapa', mapa: 'https://ferreterialuispenagos.com/sitemap_index.xml', filtroMapa: 'product-sitemap' },
      { nombre: 'Rhino', ciudad: 'Bogota', web: 'https://rhino.com.co/', plataforma: 'WooCommerce', productosWeb: 3589, precios: true, adaptador: 'woo' },
    ],
    descartadas: [
      { nombre: 'Homecenter', motivo: 'Ya esta en el inventario (catalogo nacional)' },
      { nombre: 'Wesco', web: 'https://www.wesco.com.co/', motivo: 'Pedida por el usuario (27/09/2026), pero su robots.txt prohibe todo rastreo automatico (User-agent: * / Disallow: /). No se captura sin autorizacion expresa del sitio' },
      { nombre: 'Ferragro', web: 'https://www.ferragro.com/', motivo: 'Es de Itagui (Antioquia)' },
      { nombre: 'Ferreteria Colombia', web: 'https://ferreteriacolombiafc.com/', motivo: 'Es de Manizales' },
      { nombre: 'Ferrecentro', web: 'https://www.ferreteriaferrecentro.com/', motivo: 'Es de Dosquebradas (Risaralda)' },
      { nombre: 'Paloquemao Online', web: 'https://paloquemaoonline.com/', motivo: 'Catalogo pequeno (317 productos)' },
      { nombre: 'Invercrisan', web: 'https://invercrisan.com/', motivo: 'Catalogo pequeno (228 productos)' },
      { nombre: 'Ferreteria GYG', web: 'https://ferreteriagyg.com/', motivo: 'Catalogo pequeno (23 productos, casi sin precios)' },
    ],
  },
  // Sitios oficiales de las marcas del top 30 (reconocimiento del 27/09/2026). Salida en su carpeta de pages/PROVEEDORES.
  'Marcas oficiales': {
    carpeta: '',
    descripcion: 'Catalogo completo en el sitio del dueno de la marca (top 30 y top por presencia)',
    proveedores: [],
    tiendas: [
      { nombre: 'Bosch', web: 'https://www.bosch-professional.com/co/es/', plataforma: 'Mapa del sitio + JSON-LD', productosWeb: 1075, adaptador: 'mapa', mapa: 'https://www.bosch-professional.com/co/es/sitemaps/products-sitemaps.xml', carpetaProveedor: 'Grupo B/12 - Bosch' },
      { nombre: 'Keltec Technolab', web: 'https://keltecinc.com/', plataforma: 'Shopify', productosWeb: 5409, adaptador: 'shopify', moneda: 'USD', nota: 'Tienda en dolares (EE. UU.): precio convertido a COP con la TRM del proyecto', carpetaProveedor: 'Grupo B/13 - Keltec Technolab' },
      { nombre: 'Uyustools', web: 'https://uyustools.com/', plataforma: 'WooCommerce (sin precios)', productosWeb: 303, adaptador: 'woo', carpetaProveedor: 'Grupo B/20 - Uyustools' },
      { nombre: 'Hikvision', web: 'https://hikvisioncolombia.com/', plataforma: 'WooCommerce (sin precios)', productosWeb: 3542, adaptador: 'woo', carpetaProveedor: 'Grupo A/10 - Hikvision', nota: 'Catalogo de Hikvision en Colombia (hikvisioncolombia.com); el sitio global hikvision.com/es-co queda para la fase 2' },
      { nombre: 'Makita', web: 'https://www.makita.com.mx/', plataforma: 'WooCommerce (sitio oficial Makita Mexico; sin precios)', productosWeb: 1508, adaptador: 'woo', carpetaProveedor: 'Grupo C/27 - Makita', nota: 'makita.com.co no publica fichas (categorias vacias, nodos con acceso denegado): se usa el catalogo oficial regional de Makita Mexico' },
      { nombre: 'Diablo', web: 'https://diablotools.com/', plataforma: 'API publica /api/v1/products/<SKU> + mapa del sitio', productosWeb: 1688, adaptador: 'diablo', carpetaProveedor: 'Grupo B/11 - Diablo', nota: 'Precio sugerido en USD convertido con la TRM del proyecto; incluye pais de origen' },
      { nombre: 'Toxement', web: 'https://www.toxement.com.co/productos/portafolio-productos/', plataforma: 'Rastreo por enlaces (sin mapa del sitio)', adaptador: 'rastreo', prefijo: '/productos/portafolio-productos/', patronProducto: 'prodId=', carpetaProveedor: 'Presencia/P01 - Toxement' },
      { nombre: 'Argos', web: 'https://colombia.argos.co/', plataforma: 'WordPress; fichas en el mapa de paginas (sin JSON-LD)', adaptador: 'rastreo', mapa: 'https://colombia.argos.co/page-sitemap.xml', filtroUrl: '/(cemento|microcemento|concreto|mortero|arena|grava|pegante|estuco|suelo-cemento)[^/]*/$', excluirUrl: 'certificaciones|portafolio|linea-de|sistemas-modulares|catalogo|concretos-verdes|concretos-para-acabados|soluciones|morteros-premezclados/$', carpetaProveedor: 'Presencia/P04 - Argos', nota: 'argos.co (corporativo) remite a colombia.argos.co; sin precios' },
    ],
    descartadas: [],
  },
  // Empresas agregadas despues cuya captura quedo incompleta (docs/PLAN_SCRAPING_EMPRESAS_FALTANTES.md, 27/09/2026).
  // Sin grupo propio en el inventario (proveedores vacio): el Excel nuevo reemplaza al anterior en su misma carpeta de
  // pages/ESTADISTICAS (carpetaEstadisticas). Respaldo de los archivos anteriores en respaldos/2026-09-27/.
  'Empresas complementarias': {
    carpeta: '',
    descripcion: 'Catalogos completos de empresas agregadas despues (ALFA, BAEZO)',
    proveedores: [],
    tiendas: [
      { nombre: 'ALFA', web: 'https://www.alfa.com.co/', plataforma: 'VTEX (mapa del sitio + JSON-LD)', productosWeb: 4692, precios: true, adaptador: 'mapa', mapa: 'https://www.alfa.com.co/sitemap.xml', filtroMapa: '/product-', carpetaEstadisticas: 'ALFA' },
      { nombre: 'Steelpro', web: 'https://steelpro.cl/', plataforma: 'Shopify (Chile, CLP)', productosWeb: 428, adaptador: 'shopify', moneda: 'CLP', nota: 'Sitio oficial de la marca en Chile (steelprosafety.com redirige a steelpro.cl): precio en CLP anotado en la descripcion, PRECIO vacio', carpetaProveedor: 'Grupo C/29 - Steelpro' },
      { nombre: 'BAEZO', web: 'https://baezo.com.co/', plataforma: 'Astro (mapa del sitio + JSON-LD)', productosWeb: 1177, precios: true, adaptador: 'mapa', mapa: 'https://baezo.com.co/sitemap-index.xml', incluir: '/producto/', carpetaEstadisticas: 'BAEZO' },
    ],
    descartadas: [],
  },
  // Casas prefabricadas (reconocimiento del 27/09/2026). Solo 3 empresas publican precio por modelo; el extractor es
  // tools/scraper/prefabricadas/casas_prefabricadas.js y cada modelo entra a Materiales (familia "Casas prefabricadas").
  'Casas prefabricadas': {
    carpeta: 'CASAS PREFABRICADAS',
    descripcion: 'Las 10 principales empresas de casas prefabricadas en Colombia con pagina web (prioridad: catalogo con precio)',
    proveedores: [],
    tiendas: [
      { nombre: 'Concasaya', ciudad: 'Bogota / Cundinamarca / Boyaca', web: 'https://www.concasaya.com/modelos', precios: true, nota: '5 modelos con precio (obra negra); tarifas desde $600.000/m2' },
      { nombre: 'Woodpecker', ciudad: 'Bogota', web: 'https://woodpecker.com.co/productos/casas-kit/', precios: true, nota: '15 casas kit con precio desde (placa y palafitos), vigencia dic/2026' },
      { nombre: 'Modular Colombia', ciudad: 'Bogota / Medellin / Cali', web: 'https://modularcolombia.com.co/', precios: true, nota: 'Catalogo de ofertas con precio en obra gris; obra blanca y full calculadas con la tarifa publicada por m2' },
      { nombre: 'Custom Home Colombia', ciudad: 'Colombia', web: 'https://customhomecolombia.com/catalogo/', precios: false, nota: '30 modelos sin precio (cotizacion)' },
      { nombre: 'Casas Prefabricadas Colombia', ciudad: 'Bogota', web: 'https://www.casasprefabricadascolombia.com/modelos-casas-prefabricadas.html', precios: false, nota: 'Modelos de 1 y 2 plantas sin precio' },
      { nombre: 'Prefabricadas DYM', ciudad: 'Medellin', web: 'https://prefabricadasdym.com/proyectos/', precios: false, nota: '8 proyectos con area; rangos publicados $20-100 millones' },
      { nombre: 'Vivienda Prefabricada LTDA', ciudad: 'Medellin', web: 'https://viviendaprefabricadaltda.com/modelos-precios-casas-prefabricadas/', precios: false, nota: 'Solo rangos: basica 30-50 m2 $25-60 M; estandar 60-100 m2 $70-150 M; premium 100+ m2 $160-300 M' },
      { nombre: 'Casas Prefabricadas MOD', ciudad: 'Bogota / Medellin', web: 'https://casasprefabricadasmod.com/', precios: false, nota: 'Tabla orientativa $20-35 M (basicas) a $300 M+ (a medida); cotizacion' },
      { nombre: 'ABCasalista', ciudad: 'Bogota', web: 'https://abcasalista.com/', precios: false, nota: 'Cotizacion personalizada' },
      { nombre: 'Colcasas', ciudad: 'Cali', web: 'https://colcasas.com/', precios: false, nota: 'Mas de 30 anos; cotizacion personalizada' },
    ],
    descartadas: [
      { nombre: 'Moduly Homes', web: 'https://modulyhomes.com/', motivo: 'Comparador de Espana, no de Colombia' },
      { nombre: 'Planeta Prefabricado', web: 'https://planetaprefabricado.co/', motivo: 'Directorio; cuenta de hosting suspendida' },
      { nombre: 'Elite Prefabricadas / Prefabricasa', motivo: 'Sin catalogo ni precios publicados (cotizacion)' },
    ],
  },
};

// Grupo al que pertenece un proveedor del inventario (o '' si no pertenece a ninguno).
function grupoDeProveedor(proveedor) {
  for (const [nombre, g] of Object.entries(GRUPOS)) {
    if (g.proveedores.includes(proveedor) || g.tiendas.some((t) => t.nombre === proveedor)) return nombre;
  }
  return '';
}

// Tipo de proveedor del inventario:
// - "Proveedores de productos": fabricantes o duenos de marca (catalogos oficiales "(oficial)" e inventarios de fabricante).
// - "Empresas de ferreteria": tiendas que revenden muchas marcas (COMFER, Homecenter, Easy, Ferricentro...).
const TIPOS = ['Empresas de ferreteria', 'Proveedores de productos'];
const FABRICANTES = ['Corona', 'ALFA', 'PAVCO', 'Santafé', 'IPECOL', 'Solimpro'];
function tipoDeProveedor(proveedor) {
  const prefabricadas = GRUPOS['Casas prefabricadas'].tiendas.some((t) => t.nombre === proveedor);
  return / \(oficial\)$/.test(proveedor) || FABRICANTES.includes(proveedor) || prefabricadas ? TIPOS[1] : TIPOS[0];
}

module.exports = { GRUPOS, grupoDeProveedor, TIPOS, tipoDeProveedor };
