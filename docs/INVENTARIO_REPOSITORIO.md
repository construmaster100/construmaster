# Inventario inicial del repositorio

Fecha del inventario: 2026-09-24

## Estructura observada

- 43 archivos HTML: la portada raíz, páginas internas de administración/materiales y páginas de catálogos de proveedores.
- 16 libros XLSX. Hay inventarios de proveedores, catálogos, etapas de obra, servicios y un presupuesto de proyecto.
- 14 hojas CSS: estilos de la portada, estilos compartidos del motor y hojas particulares de proveedores.
- `img/` existe y está vacía al momento del inventario. Queda destinada a `logo.png` y `banner.png`.
- `assets/motor/identidad_navbar.css` y `assets/motor/estilos_modelo.css` ya contienen reglas de identidad y navegación; varios catálogos conservan su propio CSS y otros HTML son capturas de sitios externos.

## Hallazgos y conclusiones

1. Los 43 HTML no forman una sola aplicación homogénea. Las páginas de marca incluyen muestras/capturas externas y layouts específicos; imponerles el mismo CSS global podría dañarlas. Conviene unificar por grupos propios del proyecto (portada, administrador y presupuesto) y mantener aislado el estilo de cada proveedor.
2. Hay una base visual ConstruMaster existente (verde, tinta, hueso y arena), pero reglas de encabezado repetidas en `index.css`, `assets/motor/estilos_modelo.css` e `identidad_navbar.css`. Se recomienda convertir `identidad_navbar.css` en la única fuente de encabezado compartido y reutilizar tokens de color/espaciado.
3. Los XLSX están repartidos entre `docs/`, catálogos y carpetas de proveedores. Se creó un maestro consolidado en `docs/Excel/Maestro_ConstruMaster.xlsx`; incluye los 16 libros encontrados y 19 hojas con datos, con un índice de procedencia. Cada hoja muestra ahora la página de origen en la primera fila y los datos comienzan debajo. Los originales siguen en su ubicación para no alterar las rutas usadas por scripts y catálogos. El catálogo web de Materiales toma los productos de este maestro.
4. La portada ya tiene contenedores para logo y banner. Se prepararon para consumir `img/logo.png` y `img/banner.png`; se conserva un fondo de color como respaldo si los archivos todavía no están presentes.

## Primer cambio de estilo

La portada (`index.html` + `index.css`) usa el logo y las diez franjas de banner de `img/corporativo/`. El maestro se puede regenerar con `node tools/crear_excel_maestro.js` y el catálogo para la navegación con `node tools/generar_catalogo_maestro.js`. Próxima fase sugerida: migrar páginas internas propias a encabezado/tabs compartidos y actualizar rutas de generación antes de centralizar los originales.

## Pagina unica y flujo para agregar contenido (2026-09-26)

Todo el sitio vive en `index.html` + `index.css` + `index.js`. El encabezado y el navbar son fijos y nunca cambian; el sidebar conserva su marco y estilo pero su menu cambia segun la pestaña (familias, categorias, archivos Excel, etapas del proyecto...) y sus conteos siguen los filtros; el contenido cambia en `<main>` (rutas por hash: `#materiales`, `#proyectos/san-esteban`, `#presupuesto/etapas`, `#obra/4`...). Las paginas sueltas de `pages/administrador` y `pages/materiales` quedan como respaldo, sin enlazar.

| Para agregar... | Copiar en... | Luego ejecutar |
|---|---|---|
| Un inventario (Excel con columnas NOMBRE/PRECIO y opcional CATEGORIA, SUBCATEGORIA, IMAGEN) | cualquier carpeta dentro de `pages/ESTADISTICAS/` | `node tools/generar_inventario.js` |
| Recorrido general de un proyecto (slide vertical) | `pages/Cliente/<Proyecto>/img/slide secuencial/` (orden = nombre de archivo) | `node tools/generar_contenido.js` |
| Galeria de un proyecto | `pages/Cliente/<Proyecto>/img/<otra carpeta>/` | `node tools/generar_contenido.js` |
| Ficha de un proyecto | `pages/Cliente/<Proyecto>/info.txt` (lineas `clave: valor`) | `node tools/generar_contenido.js` |
| Carpetas de etapas en un proyecto nuevo (copia la estructura de la plantilla) | crear `pages/Cliente/<Proyecto>/` | `node tools/crear_estructura_proyecto.js` |
| Imagenes de una etapa o subetapa de un proyecto (slide vertical de esa etapa) | `pages/Cliente/<Proyecto>/ETAPAS OBRA/<NN_ETAPA>/[<NN_Subetapa>/]` | `node tools/generar_contenido.js` |
| Imagenes de referencia de una etapa (pestaña Presupuesto) | `pages/Cliente/Plantilla Modelo/ETAPAS OBRA/<NN_ETAPA>/` | `node tools/generar_contenido.js` |
| Referencias de diseno | `img/contenido/diseno/` | `node tools/generar_contenido.js` |
| Una cenefa o marco nuevo con fondo verde | `img/` y agregarla a la lista de `tools/procesar_cenefas.js` | `node tools/procesar_cenefas.js` |

Los scripts se corren desde la raiz del repositorio (una sola vez antes: `npm install` dentro de `tools/`). El resultado de la verificacion del inventario queda en `pages/Cliente/Plantilla Modelo/Excel/verificacion_inventario.md`.

## Estadisticas y analisis de precios unitarios (2026-09-26)

- `pages/ESTADISTICAS/` reune todos los inventarios en Excel: `COMFER`, `HOMECENTER` y las marcas (ALFA, BAEZO, corona, G&J, IPECOL, PAVCO, PinturasYYesos, SANTAFE, Soelco, Solimpro). La pestaña **Estadisticas** los resume (productos, precios, familias) y permite descargar cada Excel. En Materiales, COMFER se muestra en naranja y Homecenter en azul.
- `pages/Servicios/Analisis_Precios_Unitarios.xlsx` se genera del documento ANEXO-2 (analisis unitario detallado): hoja `Actividades` (NOMBRE DE LA TAREA, UNIDAD, PRECIO, DESCRIPCION, etapa de obra), una hoja por capitulo con una tabla de Excel por actividad (insumos con cantidad y precio) y la hoja `Insumos`.
  Regenerar: `node tools/extraer_apu.js` y luego `node tools/generar_apu.js`. La relacion actividad -> etapa/subetapa de obra esta en `tools/etapas_apu.js`.
- En cada proyecto, cada etapa muestra su slide de imagenes y el visor de actividades con sus precios unitarios e insumos.

## Presupuesto y obra: una sola pestaña y formato unico de etapas (2026-09-26)

- La pestaña **Presupuesto** reune lo que antes eran Presupuesto y Obra: etapas agrupadas en OBRA NEGRA / GRIS / BLANCA, capitulos del presupuesto MP de cada etapa, notas de seguimiento por subetapa e imagenes. El modelo proyectado completo esta en `#presupuesto/mp`. Los enlaces antiguos `#obra` llevan aqui.
- Un solo Excel: `pages/Cliente/Plantilla Modelo/ETAPAS OBRA/Formato_Unico_Etapas.xlsx` (reemplaza a `etapas_de_obra.xlsx`). Hojas: `Formato unico` (secuencia, tipo de obra, etapa, subetapa, carpeta, capitulo MP, actividades APU, estado, avance, fechas, responsable, notas), `Presupuesto MP` y `Resumen` por tipo de obra.
  Regenerar el formato vacio: `node tools/generar_formato_etapas.js`. El boton de la pagina descarga el mismo formato con las notas escritas.

## Servicios: catalogo de actividades (2026-09-26)

- La pestaña **Servicios** muestra como catalogo (mismo loop infinito que Materiales) las 1.245 actividades de `pages/Servicios`: icono del tipo de trabajo, unidad escrita completa (metro cuadrado, metro lineal, metro cubico, unidad, hora, mes...), precio y enlace al analisis con sus insumos (`#servicios/<codigo>`).
- Iconos: 28 SVG minimalistas propios en `pages/Servicios/iconos/`, uno por tipo de trabajo; la regla que asigna el tipo a cada actividad esta en `tools/iconos_servicios.js`. El Excel del analisis incluye ahora las columnas NOMBRE UNIDAD y TIPO DE SERVICIO.

## Clasificacion de servicios y navbar (2026-09-26)

- Navbar: Inicio · Proyectos · Servicios · Materiales · Herramientas · Presupuesto · Obra Nueva · Remodelacion · Diseno · Estadisticas.
- Las actividades del analisis de precios se clasifican en cuatro ejes con codigo de dos letras y dos numeros (definidos en `tools/clasificacion_servicios.js`): AM ambito, ON/OG/OB secuencia constructiva (TR00 transversal), ES especialidad y NP naturaleza del precio. Codigo compuesto, p. ej. `AM01 · ON04 · ES04 · NP01`. El Excel incluye las columnas de clasificacion y la hoja `Clasificacion`.
- Servicios, Obra Nueva y Remodelacion son la misma vista con distinto filtro: cada una abre con un indice (explicacion + codigos con color, icono y cantidad), el sidebar muestra ese indice y cada codigo abre el catalogo filtrado.

## Salario minimo y costo laboral (2026-09-26)

- La matematica esta en `assets/motor/salario_minimo.js`: todo es proporcion del salario minimo (SMMLV) y de la TRM (periodos = fraccion del mes; dolares = pesos ÷ TRM; divisor de horas = horas semanales × 5). La usan la pagina (Servicios → Salario minimo y costo laboral) y el Excel.
- `pages/Servicios/Calculo_Salario_Minimo.xlsx` (`node tools/generar_excel_salario.js`): hoja Parametros con celdas con nombre (SMMLV, TRM, SALUD_PCT, ARL_PCT, TRANSPORTE_DIA, DIAS_TRABAJADOS, DIAS_MES, HORAS_SEMANA) y hojas con formulas de Excel reales. Para actualizar el año siguiente basta con cambiar SMMLV o TRM en Parametros (o en `PARAMETROS` del modulo y regenerar).

## Reloj y calendario (2026-09-26)

- Bajo el logo, en la parte superior del sidebar (fijo en todas las pestañas): hora al segundo y fecha de hoy (hora local del equipo). Codigo: `assets/motor/calendario.js`, estilos al final de `index.css`, marcado en `index.html` (`#reloj`, `#calendario-mes`, `#calendario-anio`).
- Al pulsar el reloj se abre la ficha del mes en curso (flechas para cambiar de mes, "Hoy" para volver). Abajo, el enlace "Calendario <año>" despliega el calendario completo del año en curso (12 meses, hoy marcado). Escape o clic fuera cierran.
