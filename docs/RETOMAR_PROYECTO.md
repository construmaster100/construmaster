# ConstruMaster — guía completa para retomar el proyecto en otro equipo

Última actualización: **26/09/2026**. Estado verificado ese día con `node tools/probar_pagina.js`: 19 rutas correctas, sin errores de JavaScript ni archivos faltantes, navbar estable en todas las pestañas.

Documentos relacionados (leer en este orden):
1. **Este documento** — visión completa, reglas del usuario, instalación y estado.
2. `CLAUDE.md` (raíz) — resumen corto que Claude Code lee automáticamente al abrir el proyecto.
3. `docs/PLAN_PROVEEDORES_MARCAS.md` — línea de trabajo abierta: marcas, scraping y pilotos (sección 10 = bitácora para retomar).
4. `docs/INVENTARIO_REPOSITORIO.md` — historial de cambios y tabla "qué copiar dónde y qué comando correr".
5. `pages/PROVEEDORES/LEEME.md` — estructura del repositorio de marcas.

---

## 1. Qué es ConstruMaster

Sistema para **elaborar y consultar presupuestos de obra y materiales de construcción** (Colombia, Boyacá/Tunja). Es un sitio web estático de **una sola página** (`index.html`) que se abre con doble clic, sin servidor. Reúne:

- 144.325 productos (27/09/2026): inventarios originales + ferreterías de Boyacá y Bogotá + catálogos oficiales de marcas + casas prefabricadas (detalle en PLAN_PROVEEDORES_MARCAS.md, 10.12). Truper en captura.
- 1.245 actividades de obra con análisis de precios unitarios (APU) y 7.344 insumos.
- Proyectos por etapas de obra (plantilla de 10 etapas / 47 subetapas), con slide de imágenes y visor de precios.
- Presupuesto proyectado (modelo Boulevard, 17 capítulos) y seguimiento de obra con Excel de formato único.
- Cálculo del salario mínimo y costo laboral (proporcional al SMMLV y a la TRM).
- Catálogo de marcas (Proveedores) con ranking y repositorio de logos; scraping de marcas en fase piloto.

---

## 2. Reglas y preferencias del usuario (OBLIGATORIAS)

La memoria del asistente de Claude Code vive en el equipo donde se trabajó y **no se copia con el proyecto**. Estas son las reglas acumuladas; respetarlas desde el primer mensaje:

**Idioma y estilo**
- Español neutro (colombiano), **sin voseo** argentino (nada de "vos", "querés", "acá"): usar "puedes", "aquí", "dime".
- **Nombres de archivos y carpetas sin tildes ni ñ** ("Panetes", "Nivelacion"). En textos visibles de la página sí se usan tildes.
- **No mencionar commits ni git** a menos que el usuario pregunte. No hacer commits si no los pide.

**Forma de trabajar**
- **Procesos grandes** (scraping, reclasificar todo el inventario, cambios masivos): primero **documentar y planear** en un `.md`, **pedir confirmación**, luego **piloto al 10 %** con **auditoría del 5 %** (Excel de verificación, precisión, margen `e = z·√(p(1−p)/n)`), y solo después el 100 %.
- **No prometer una fuente o método sin probarlo antes** (reconocimiento rápido).
- **Cuando el pedido es ambiguo, preguntar** antes de construir la interpretación más grande. El usuario rechaza el trabajo no pedido.
- **Sin login ni contraseñas**: el acceso por rol (Cliente/Usuario) es de un clic; no agregar validaciones de acceso sin pedido explícito.
- No detener procesos en segundo plano sin que el usuario lo pida.
- Si hay límite de sesión, **documentar primero** el estado en el `.md` antes de seguir.

**Diseño de la página (reglas firmes)**
- **Una sola página**: `index.html` + `index.css` (única hoja de estilos) + `index.js`. Navegación por hash (`#materiales`, `#proyectos/san-esteban`…).
- **El navbar nunca se mueve** entre pestañas: la pestaña activa solo cambia de color (nunca de peso o tamaño); `html { overflow-y:scroll; scrollbar-gutter:stable }`. Nunca enlazar a páginas con otro navbar.
- **El sidebar sí cambia según la pestaña** (mismo marco y estilo): lista los datos de esa sección con conteos que siguen los filtros.
- Encabezado fijo: logo 250×250 + banner; navbar fijo; sidebar izquierdo fijo de 250 px; contenido máx. 1115 px.
- **Paleta verde / hueso / arena** (tokens `--tinta`, `--verde`, `--verde-oscuro`, `--hueso`, `--arena`, `--dorado`), aunque el logo y las cenefas sean negro/acero/dorado.
- **Sin fuentes web** (Google Fonts, etc.): solo `"Segoe UI", Arial, sans-serif` (evita saltos de diseño).
- **COMFER en naranja** (`--comfer #d9711c`) y **Homecenter en azul** (`--homecenter #2563b8`) en las tarjetas.
- Catálogos con **loop infinito hacia abajo** (sin paginación ni "Ver más").
- Gráficos: seguir la guía de visualización (paleta validada, etiquetas visibles, tooltip).

**Orden del navbar (definido por el usuario)**
Inicio · Proyectos · Servicios · Materiales · Herramientas · Presupuesto · Construcción · Diseño · Estadísticas · Proveedores. (27/09/2026: Obra Nueva y Remodelación fusionadas en Construcción; Remodelación = categoría, `#construccion/remodelacion`; los enlaces viejos redirigen.)

---

## 3. Instalación en un equipo nuevo

1. **Copiar la carpeta completa del proyecto** (incluye `assets/datos/*.js` ya generados, imágenes y Excel). La página funciona de inmediato con doble clic en `index.html`; no necesita instalar nada para *verla*.
   Tamaños medidos el 26/09/2026 (para planear la copia): `pages/ESTADISTICAS` **1,6 GB** (imágenes de catálogos: ~58.000 fotos), `pages/Cliente` 188 MB, `img` 19 MB, `pages/Servicios` 17 MB, `assets` 16 MB, `pages/PROVEEDORES` 3,6 MB. `tools/node_modules` no hace falta copiarlo (se reinstala). Conviene copiar comprimido o con un disco externo por la cantidad de archivos pequeños.
2. **Node.js** (se usó v24.20.0; sirve ≥ 20). Solo hace falta para regenerar datos o correr scripts.
3. En `tools/`: `npm install` (instala `xlsx`, `jszip`, `sharp`, `exceljs`). `node_modules` no se copia: se reinstala.
4. Para la prueba automática: `cd tools && npm install puppeteer-core@23 --no-save` y Chrome instalado (ruta por defecto `C:/Program Files/Google/Chrome/Application/chrome.exe`; otra ruta con la variable `CHROME`). Ojo: un `npm install --save <otro>` posterior borra los paquetes instalados con `--no-save`; reinstalar si pasa.
5. **Python no está disponible** en el equipo original y no se usa: todo es Node. Excel/LibreOffice tampoco estaban instalados (las fórmulas de Excel se verificaron con un evaluador propio).
6. Rutas: todos los scripts calculan las rutas desde la carpeta del proyecto (`path.resolve(__dirname, '..')`), así que funcionan en cualquier disco. El proyecto original estaba en `D:\Modelo de Presupuesto\Presupuesto de obra`.
7. Comprobar: `node tools/probar_pagina.js` → debe terminar en "RESULTADO: todo correcto".

---

## 4. Mapa de carpetas

```
Presupuesto de obra/
├── index.html / index.css / index.js     PÁGINA ÚNICA (todo el sitio)
├── CLAUDE.md                             resumen para el asistente (se lee solo)
├── assets/
│   ├── motor/                            código compartido del navegador
│   │   ├── motor.js                      render del presupuesto (capítulos, tablas)
│   │   ├── formato_etapas.js             Excel "Formato único de etapas" (Node y navegador)
│   │   ├── salario_minimo.js             matemática del salario mínimo (Node y navegador)
│   │   ├── calendario.js                 reloj y calendario bajo el logo
│   │   ├── banner_carrusel.js            carrusel del banner
│   │   ├── exceljs.min.js, xlsx.full.min.js, jszip.min.js   librerías (sin CDN)
│   │   └── estilos_modelo.css, identidad_navbar.css           heredados (páginas viejas)
│   ├── datos/                            DATOS GENERADOS (no editar a mano)
│   │   ├── inventario.js                 65.791 productos + marcas + ranking (≈10 MB, carga diferida)
│   │   ├── apu.js                        1.245 actividades APU + clasificación
│   │   └── contenido.js                  proyectos, etapas, imágenes, diseño
│   └── contenido/                        imágenes WebP optimizadas (generadas)
├── img/corporativo/                      logo, banner (sec1..10), cenefas transparentes
├── pages/
│   ├── ESTADISTICAS/                     TODOS los inventarios en Excel (fuente del inventario)
│   │   ├── COMFER/ (catalogo_comfer.xlsx, V1 Construmaster.xlsm, imagenes/)
│   │   ├── HOMECENTER/ (docs/catalogo HOMECENTER.xlsx, img/)
│   │   └── ALFA, BAEZO, corona, G&J, IPECOL, PAVCO, PinturasYYesos, SANTAFE, Soelco, Solimpro
│   │       (cada una: inventario_*.xlsx, data.json, img/, scrape.js viejo, index.html viejo)
│   ├── PROVEEDORES/                      repositorio de marcas (ver LEEME.md)
│   │   ├── Grupo A|B|C/NN - Marca/       top 30 por productos: logo.*, pagina web.txt, img/, logo.json
│   │   ├── Presencia/Pnn - Marca/        top 10 por presencia fuera del top 30 (Toxement, Pintuco)
│   │   └── verificacion/                 Piloto_scraping_10.xlsx, Auditoria_scraping_5.xlsx
│   ├── PROYECTOS/
│   │   ├── Plantilla Modelo/ETAPAS OBRA/ plantilla de etapas (10 etapas, subcarpetas), datos.js,
│   │   │                                 Formato_Unico_Etapas.xlsx; Excel/ (maestro viejo, reporte de inventario)
│   │   ├── SAN ESTEBAN/                  info.txt, img/slide secuencial/ (renders), ETAPAS OBRA/ (copias)
│   │   └── CABAÑA ANDINA, CASA 70 M2, VILLA KAREN   (estructura de etapas vacía)
│   ├── Servicios/                        ANEXO-2 (docx fuente), apu.json, Analisis_Precios_Unitarios.xlsx,
│   │                                     Calculo_Salario_Minimo.xlsx, iconos/ (28 SVG), servicios.xlsx (viejo)
│   ├── administrador/Matriz/Modelo Boulevard/   datos.js del presupuesto MP (usado por la página)
│   └── administrador/, materiales/       páginas viejas sin enlazar (rutas rotas; no usar)
├── docs/                                 documentación (este archivo y los demás .md)
└── tools/                                scripts Node (ver sección 6)
```

---

## 5. La página: pestañas y rutas

| Pestaña | Ruta | Qué muestra | Sidebar |
|---|---|---|---|
| Inicio | `#inicio` | Portada, accesos | Enlaces a secciones |
| Proyectos | `#proyectos`, `#proyectos/<id>`, `#proyectos/<id>/<NN_ETAPA>[/<NN_Sub>]` | Proyectos por etapas: ficha, slide vertical (marco "Estructura"), visor de APU por etapa | Etapas del proyecto con conteo de imágenes |
| Servicios | `#servicios` (índice), `/catalogo`, `/c/<CODIGO>`, `/<codigo APU>`, `/salario` | Clasificación en 4 ejes con códigos, catálogo de 1.245 actividades con ícono, calculadora de salario mínimo | Índice de códigos con color, ícono y conteo |
| Materiales | `#materiales` | Inventario completo, loop infinito, filtros | Familias, categorías, proveedores, archivos Excel |
| Herramientas | `#herramientas` | Familia herramientas | Categorías, proveedores, archivos |
| Presupuesto | `#presupuesto` (vivienda ALC), `/v1-N` (capítulo 1–14), `/programacion` (PERT), `/etapas`, `/etapa-N`, `/mp` y `/cap-N` (Caralis) | Presupuesto con el modelo V1 y el motor de vivienda ALC; programación PERT con mano de obra y alquiler; seguimiento por etapas; modelo Caralis (antes Boulevard). Ver sección 15 | Izquierdo: vivienda, programación y capítulos con su valor. Derecho: valor acumulado, mano de obra, alquiler, Excel |
| Obra Nueva | `#obra-nueva` | Servicios de edificación en secuencia (AM01 sin demolición ni mantenimiento) | Índice de códigos |
| Remodelación | `#remodelacion` | Servicios sobre construcción existente | Índice de códigos |
| Diseño | `#diseno` | Referencias de diseño | — |
| Estadísticas | `#estadisticas` | Inventarios en Excel: indicadores, gráficos, precios por proveedor, descargas | Proveedores |
| Proveedores | `#proveedores`, `#proveedores/<marca>` | Top 10 por presencia, ranking A/B/C, directorio A–Z (1.911 marcas), esqueleto del repositorio, catálogo por marca | Buscador + todas las marcas |

Bajo el logo, en todas las pestañas: **reloj** (hora al segundo y fecha) → ficha del mes → "Calendario <año>".

Notas de seguimiento de obra: se guardan en el navegador (`localStorage`, clave `cm_admin_notas_etapas`) y salen en el Excel descargable. No viajan entre equipos: exportarlas con el botón "Descargar formato único de etapas (con notas)".

---

## 6. Scripts y orden de regeneración

Correr desde la raíz del proyecto (`node tools/<script>`).

| Script | Entrada | Salida | Cuándo |
|---|---|---|---|
| `generar_inventario.js` | Todos los Excel de `pages/ESTADISTICAS` + `Inventario_*.xlsx` de `pages/PROVEEDORES` | `assets/datos/inventario.js`, reporte en `pages/Cliente/Plantilla Modelo/Excel/verificacion_inventario.md`, carpetas de `pages/PROVEEDORES` | Al agregar/cambiar un inventario, un logo o una carpeta de marca |
| `marcas_construccion.js` (módulo) | — | Asignación de marca, ranking, carpetas, estado | Lo llama el anterior |
| `extraer_apu.js` | `pages/Servicios/ANEXO-2…docx` | `pages/Servicios/apu.json` | Si cambia el documento de precios unitarios |
| `generar_apu.js` | `apu.json` + `etapas_apu.js` + `iconos_servicios.js` + `clasificacion_servicios.js` | `Analisis_Precios_Unitarios.xlsx`, `assets/datos/apu.js`, `pages/Servicios/iconos/*.svg` | Tras extraer o al cambiar reglas de etapa/ícono/clasificación |
| `generar_formato_etapas.js` | `datos.js` de la plantilla, MP, `apu.js` | `Formato_Unico_Etapas.xlsx` | Si cambian etapas, MP o APU |
| `generar_excel_salario.js` | `assets/motor/salario_minimo.js` | `pages/Servicios/Calculo_Salario_Minimo.xlsx` (fórmulas vivas) | Cada año o si cambian SMMLV/TRM |
| `generar_contenido.js` | `pages/Cliente/**`, `img/contenido/diseno` | `assets/datos/contenido.js`, `assets/contenido/` | Al agregar imágenes a proyectos/etapas |
| `crear_estructura_proyecto.js` | Plantilla de etapas | Carpetas de etapas en cada proyecto | Al crear un proyecto nuevo |
| `procesar_cenefas.js` | `img/*.png` con fondo verde | Cenefas transparentes en `img/corporativo/` | Al agregar una cenefa |
| `scraper/identidad.js` | Top 10 por presencia | logo + `pagina web.txt` + hoja *Identidad* del piloto | Piloto N1 (ya hecho) |
| `scraper/marcas/stretto.js` | Sitio de Stretto | `data.json`, `Inventario_stretto.xlsx`, `img/`, auditoría | Piloto hecho; `--todo` = catálogo completo (pendiente de aprobación); `--solo-auditoria` |
| `generar_modelo_v1.js` | `V1 Construmaster.xlsm` | `assets/datos/modelo_v1.js` (14 capítulos; agrega el 4 "Instalaciones eléctricas") | Si cambia el modelo V1 |
| `scraper/alquiler/alquiler.js` | 30 sitios de alquiler (`--solo-principales`, `--desde-json`) | `assets/datos/alquiler.js`, `pages/ALQUILER/`, `alquiler_herramientas.xlsx` | Para actualizar tarifas de alquiler |
| `probar_pagina.js` | `index.html` | Informe en consola | Después de cualquier cambio |

Orden completo si se regenera todo: `extraer_apu` → `generar_apu` → `generar_inventario` → `generar_formato_etapas` → `generar_excel_salario` → `generar_contenido` → `probar_pagina`.

Scripts **heredados** (rutas posiblemente desactualizadas tras reorganizar carpetas; revisar antes de usar): `crear_excel_maestro.js`, `generar_catalogo_maestro.js`, `generar_servicios.js`, `generar_catalogo_comfer.js`, `generar_catalogo_homecenter.js`, `generar_datos_boulevard.js`, `generar_datos_construmaster.js`, `auditar_imagenes_catalogo.js`, `unificar_marcas.js`, `crear_columnas_homecenter.js`.

---

## 7. Datos verificados y sus fuentes

| Dato | Valor | Fuente | Dónde se usa |
|---|---|---|---|
| Salario mínimo 2026 | $ 1.750.905 | Decreto 1469 de 2025 | `assets/motor/salario_minimo.js` |
| Auxilio de transporte legal 2026 | $ 249.095 | Decreto 1470 de 2025 | Nota de la calculadora |
| TRM | $ 3.306,86 (26–28/09/2026) | Superintendencia Financiera (datos.gov.co, serie 32sa-8pi3) | Calculadora de salario |
| Jornada máxima | 42 h/semana desde 15/07/2026 → divisor 210 h | Ley 2101 de 2021 | Calculadora |
| ARL | Clase V 6,96 % (I 0,522 % … V 6,96 %) | Decreto 1772 de 1994 | Calculadora |
| Salud empleador | 8,5 % | Ley 1122 de 2007 | Calculadora |
| Transporte por día | $ 5.000 | Definido por el usuario | Calculadora |
| Costo del día trabajado | $ 82.754 | (SMMLV + salud + ARL + transporte) ÷ 26 días | Programación (mano de obra) |
| Retroexcavadora | $ 130.000 / hora | Definido por el usuario | Presupuesto V1 (capítulo 1) |
| Vidrio transparente (vidriero artesanal) | $ 25.000 / m² | Definido por el usuario | Capítulo 8 y motor ALC |
| Bloque No 5 (arcilla 12 × 20 × 30) | 15,5 u/m² | Homecenter / Ceranova | Motor ALC (mampostería) |
| Concreto ≈ 3.000 psi | 7 bultos + 0,56 m³ arena + 0,84 m³ gravilla por m³ | Argos (mezcla 1:2:3) | Compuesto del concreto |
| Tomas | 1 por cada 3,6 m de perímetro; GFCI en baños | NTC 2050 210-52 / 210-8 | Motor ALC (capítulo 4) |

**Actualizar cada año** (y siempre verificando en línea, nunca de memoria): SMMLV y TRM en `PARAMETROS` de `salario_minimo.js`, luego `node tools/generar_excel_salario.js`.

---

## 8. Estado por línea de trabajo

| Línea | Estado | Pendiente |
|---|---|---|
| Página única y navegación | ✅ Completa y probada | — |
| Inventario (65.791 productos, 14 Excel) | ✅ | COMFER: algunas categorías solo tienen la página 1 (ver historial) |
| Marcas (1.911, 92 % de productos con marca) | ✅ Aprobada por el usuario | Marcas reales descartadas como palabra común (Milwaukee, Metabo, Cat…): lista de marcas protegidas si se pide |
| Servicios / APU (1.245 actividades, 4 ejes de clasificación) | ✅ | 7 actividades marcadas "revisar" (total del documento ≠ suma de insumos); 257 sin subetapa |
| Obra Nueva / Remodelación | ✅ | — |
| Presupuesto + Obra (una pestaña) + Formato único de etapas | ✅ | Cubierta figura como obra negra en los datos originales (confirmar con el usuario si debe ser gris) |
| Salario mínimo (matemática + Excel con fórmulas) | ✅ | Actualizar SMMLV/TRM cada año |
| Proyectos por etapas + slide + visor APU | ✅ | Proyectos sin imágenes: Cabaña Andina, Casa 70 m2, Villa Karen; cantidades de obra por proyecto (no existen aún) |
| Proveedores (pestaña, ranking, esqueleto, top 10 por presencia) | ✅ | — |
| Scraping N1 identidad (10 marcas) | ✅ 10/10 sitios, 9/10 logos | Pretul sin logo propio |
| Scraping N2 catálogos oficiales (Corona, Stanley, Stretto, Pintuco, Gricol, Dewalt) | ✅ Completos: 5.510 productos, 3.889 fotos; auditoría 5 % = 280/280 (ver `PLAN_PROVEEDORES_MARCAS.md` 10.2) | Integrados al inventario (26/09/2026): +5.232 productos, total 71.023. Pendiente: logos faltantes en 21 carpetas del top 30 |
| Grupo "Local" (ferreterías de Tunja y Boyacá) | ⏳ Solo planeado | Reconocimiento → plan → piloto (ver `PLAN_PROVEEDORES_MARCAS.md` 10.3) |
| Etiqueta de origen (importado/nacional, país) | ⏳ Solo planeado | Tabla curada por marca, verificada en sitios oficiales (10.3) |
| Reloj y calendario | ✅ | — |
| Presupuesto V1 + motor ALC + programación PERT + Excel (28/09/2026) | ✅ Probado (sección 15) | Estructura NSR-10, placa de entrepiso, puertas por tipo, circulaciones (decisión del usuario) |
| Herramientas de alquiler (30 empresas, 677 equipos) | ✅ | Testero sin tarifa publicada; cortadora de cerámica sin tarifa propia |

---

## 9. Problemas conocidos y lecciones

- **Ediciones por script en la terminal**: los reemplazos con tildes o barras invertidas fallan al pasar por bash (se pierden escapes o la tilde). Usar la herramienta de edición directa o archivos intermedios.
- **Scraping**: `robots.txt` con comodines se interpreta con `reglaARegex`; el sitio puede responder 429 → hay espera automática (`Retry-After`) y `PAUSA_MS` configurable. Stretto: `PAUSA_MS=2000`.
- **Datos estructurados de sitios Wix** traen entidades HTML (`&quot;`) dentro del JSON-LD: decodificar.
- **`og:title` no es el nombre del producto** (es un título para buscadores): auditar contra el `<h1>` visible.
- **Carpetas de marcas**: las que solo tienen el esqueleto vacío se reubican solas si cambia el ranking; las que tienen archivos del usuario nunca se tocan.
- **Logos blancos**: `logo.json` con `{"fondo":"oscuro"}` en la carpeta de la marca.
- **Páginas viejas** (`pages/administrador/index.html`, `pages/materiales/`, páginas `index.html` de cada marca en `pages/ESTADISTICAS`): tienen rutas rotas y otro navbar; no enlazarlas.
- **Inventario pesado**: `inventario.js` ≈ 10 MB se carga solo al entrar a Materiales/Herramientas/Estadísticas/Proveedores.

---

## 10. Cómo retomar (lista de verificación)

1. Copiar la carpeta, instalar Node, `cd tools && npm install`.
2. Abrir `index.html` con doble clic y revisar que todo se vea.
3. `npm install puppeteer-core@23 --no-save` en `tools/` y `node tools/probar_pagina.js` → "todo correcto".
4. Leer `docs/PLAN_PROVEEDORES_MARCAS.md` sección 10 (bitácora) y preguntar al usuario con cuál pendiente seguir:
   - grupo Local (Tunja/Boyacá),
   - etiqueta de origen de las marcas.
5. Antes de cualquier proceso grande: plan en `.md` → confirmación → piloto 10 % + auditoría 5 %.

---

## 11. Verificación completa del proyecto (26/09/2026, 8:15 p. m.)

**Correcto**
- `node tools/probar_pagina.js`: 19 rutas correctas, navbar estable, sin errores de JavaScript ni archivos faltantes.
- `index.html`, `index.js`, `index.css`: 0 referencias locales rotas.
- Todos los scripts de `tools/` pasan la revisión de sintaxis (`node --check`) y sus `require` existen.
- La copia de `inventario_gyj.xlsx` dentro de `pages/ESTADISTICAS/PAVCO/inventario-gyj/` es idéntica a la de G&J; el generador ya la detecta y **no** la cuenta dos veces.
- Catálogos oficiales de 6 marcas completos y auditados al 100 % (ver sección 8).

**Pendiente de decisión del usuario (no se tocó)**
1. ~~Integrar los 6 catálogos oficiales~~ HECHO: +5.232 productos como proveedores "<Marca> (oficial)", fuera del ranking; muestra 5 % = 262/262.
2. Carpeta `pages/Cliente/CABAÑA ANDINA` tiene ñ (regla de nombres). Renombrarla cambia el enlace `#proyectos/...` del proyecto.
3. Carpetas vacías sin uso: `img/Nueva carpeta`, `img/corporativo/Nueva carpeta`, `pages/ESTADISTICAS/IPECOL ltda`, `pages/ESTADISTICAS/PINTURAS Y YESOS` (duplicados vacíos de `IPECOL` y `PinturasYYesos`), `img/etapas y objetos de la obra`, `recursos_classroom/*`, `.claude`.
4. Proyectos sin imágenes ni cantidades: Cabaña Andina, Casa 70 m2, Villa Karen (solo tienen la estructura de 58 carpetas). Necesitan material del usuario.
5. Logos faltantes en 21 carpetas del top 30 de `pages/PROVEEDORES` (Urrea, Surtek, Fixser, Toolcraft, Hikvision, Diablo, Bosch, Keltec, Bauker, Vulcan, Ranger, Discover, Halux, Uyustools, Mp Tools, Superior, Ccol, Irwin, Makita, Ubermann, Inkorporar, Foy). Es un proceso de scraping: plan + piloto.
6. Scripts heredados con rutas que ya no existen: `crear_excel_maestro.js` y `generar_catalogo_maestro.js` (`docs/Excel/Maestro_ConstruMaster.xlsx`), `generar_servicios.js` (`docs/Servicios/servicios.xlsx`), `unificar_marcas.js` (`pages/Paginas especializadas`). No los usa la página; corregir rutas o retirarlos.
7. Nombres con tildes en archivos fuente (se dejaron así por ser originales): `Anexo 2-3 BOULEVARD - ... programación VF.xlsx`, `VC Varillas Cimentación.xml`, `VC1 Varillas Cimentación 1.xml`.
8. Rutas desactualizadas en documentos: `docs/INVENTARIO_REPOSITORIO.md` menciona `img/logo.png`, `img/banner.png` y `docs/Excel/Maestro_ConstruMaster.xlsx` (hoy en `img/corporativo/` o retirados); `recursos_classroom/README.md` menciona `docs/ETAPAS OBRA` (retirada).

## 12. Cambios de la página (27/09/2026, mañana)
- **Inicio**: índice de toda la página (11 pestañas con su propósito) centrado en el main (`index.html`, sección `.indice-pagina`).
- **Proyectos**: catálogo en cards de 72 casas prefabricadas con precio, área, foto, empresa, precio total y precio por m² (Concasaya 4, Modular Colombia 42, Woodpecker 26); estadísticas de casas prefabricadas por área y precio con costo por m² (88 modelos con precio de Concasaya, Woodpecker y Modular Colombia). Datos: `node tools/generar_prefabricadas.js` → `assets/datos/prefabricadas.js`.
- **Servicios**: `#servicios/edificacion`, clasificación interna de las 631 actividades de Edificación (AM01) en capítulo → grupo (113 grupos), tipo de trabajo y material principal, código `ED-CC-GG-NNN`. Reglas: `tools/clasificacion_edificacion.js`; se genera con `node tools/generar_apu.js` (también escribe `pages/Servicios/Clasificacion_Edificacion.xlsx`). Revisión manual del 5 % (32 actividades): 96,9 % en la quinta muestra, tras corregir reglas en cuatro rondas.
- **Diseño**: solo los tres servicios en cards con portada y el botón "Ver proyectos".
- **Proveedores**: directorio A–Z con "NOMBRE (tipo de producto)" (familia con más productos) y listado de empresas (ferreterías y proveedores de productos) con catálogo por empresa (`#proveedores/empresa-N`).
- **Materiales/Herramientas**: filtro "Tipo de proveedor" y enlace "Ver en la tienda" por producto.

- **Página del cliente `usuario.html`** (27/09/2026): mismo diseño que index, navbar Inicio · Casas Prefabricadas · Construcción · Remodelación (servicios de cada una) · Presupuesto · Diseño · Ingresar ("Tengo usuario y contraseña" / "Deseo registrarme"; sin servidor: formularios informativos, no guardan datos). Se genera con `node tools/generar_pagina_usuario.js`. Acceso desde la pestaña "Usuario" del index.
- [Plan del catálogo de prefabricados (administración, clics y visitas)](PLAN_CATALOGO_PREFABRICADOS.md) — documentado, sin implementar

## 13. Página del cliente y Catálogo de planos (27/09/2026, mañana)
- **usuario.html (formato celular, estilo WhatsApp):** franja con CONSTRUMASTER, buscador "¿Qué deseas construir?" (casas y servicios; Enter abre Construcción filtrado), pestañas tipo WhatsApp.
  - **Casas Prefabricadas:** cards con tira de fotos pequeñas deslizable, calificación por estrellas (valor de ejemplo "aleatorio" 3,5–5,0, fijo por modelo), precio 110 % tachado + precio real en negrilla; al tocar una foto se abre un slide con zoom (flechas, puntos, deslizar) y abajo solo el precio. Galerías: `FOTOS` en los Excel de `pages/ESTADISTICAS/CASAS PREFABRICADAS` (Woodpecker 4–14 fotos, Modular 3: foto, plano y memoria estructural; Concasaya foto y plano).
  - **Presupuesto:** formulario en blanco (departamento y municipio DANE con coordenadas, "Activar ubicación" = municipio más cercano al GPS, zona urbano/rural, área, habitaciones, baños, cocinas, garaje). Sin servidor: muestra el resumen, no envía. Datos: `node tools/generar_municipios.js` → `assets/datos/municipios.js`.
  - **Remodelación:** el mismo formulario + fotografías (cámara o galería, miniaturas locales) y debajo el listado de servicios de remodelación.
- **Catálogo de planos** (`pages/Catalogo de planos/`): 33 carpetas `PROYECTO N` (una por casa del inventario con precio, área y foto; variantes de precio juntas) con `FACHADA`, `PLANO` (20 casas; el de Woodpecker Vivienda 40 m² era un 3D de estructura y se excluyó), `FICHA.txt` y `PRESUPUESTO.xlsm` = copia exacta de `V1 Construmaster.xlsm` con la ficha INICIO de la casa (L2 nombre, L3 id, L4 ubicación, L8 sistema, L10 valor m², L15 área; L9 = L15*L10 = precio). Índice: `INDICE_CATALOGO.xlsx`. Comando: `node tools/generar_catalogo_planos.js` (usa `tools/presupuesto_modelo_v1.js`). Ninguna empresa publica imágenes interiores rotuladas: no hay `INTERIOR`. Tamaño: 199 MB (cada Excel conserva los esquemas del modelo).
- **Plan documentado sin implementar:** `docs/PLAN_CATALOGO_PREFABRICADOS.md` (pestaña de administración en el index, visibilidad de casas, clics y visitas; requiere servidor).

## 14. Pagina del cliente y "Nuevo proyecto" (pendiente)
- `pages/Cliente/index.html` (+ `cliente.js`, `planos.js` generado por `node tools/generar_planos_cliente.js`): Proyecto (carrusel automatico), Planos (PDF por categoria), Programacion de obra (`<OBRA>/PROGRAMACION.txt`), Presupuesto de obra (`<OBRA>/PRESUPUESTO`). Pendones izquierdo/derecho: `pages/Cliente/pendon.jpg` y `pendon-derecho.jpg`.
- Modelo de presupuesto para proyectos nuevos: `pages/Cliente/Plantilla Modelo/V1 Construmaster.xlsm` (copia del modelo completo de `pages/administrador/Matriz/Modelo Construmaster`, 5,9 MB). La copia de `pages/ESTADISTICAS/COMFER` (88 KB) es otro archivo distinto.
- Pedido del usuario (27/09/2026), por hacer: en la pestana Diseno del index (administrador) un boton "Nuevo proyecto" que abre un formulario de proyecto; con sus datos se diligencia el V1 Construmaster (ficha INICIO, ver `tools/presupuesto_modelo_v1.js`).

## 15. Presupuesto, motor ALC, programación PERT y alquiler (27–28/09/2026)

Todo está en `index.js` (sin servidor; lo diligenciado se guarda en el navegador, `localStorage` clave `construmaster_presupuesto_v1`, versión `v: 2`). Prueba: `node tools/probar_pagina.js` → "todo correcto" (incluye `#presupuesto/v1-4` y `#presupuesto/programacion`).

### 15.1 Pestañas de Presupuesto (index.html)
| Pestaña | Ruta | Contenido |
|---|---|---|
| Presupuesto (modelo V1) | `#presupuesto`, `#presupuesto/v1-N` | Arriba el formulario de la vivienda (motor ALC); cada capítulo con actividades, materiales, selector de producto del catálogo, cantidades editables y navegación anterior/siguiente |
| Programación (PERT) | `#presupuesto/programacion` | Constante de tiempo por categoría, cuadrilla, tareas PERT, diagrama por semanas, mano de obra y herramientas de alquiler |
| Seguimiento por etapas | `#presupuesto/etapas`, `/etapa-N` | Etapas de obra con notas; la etapa 6 (Instalaciones) = capítulos 3 y 4 |
| **Caralis (modelo xlsx)** | `#presupuesto/mp`, `/cap-N` | Antes "Modelo de referencia (Boulevard)" (pedido del usuario, 28/09/2026). Datos: `pages/administrador/Matriz/Modelo Boulevard/js/datos.js` |

- **Sidebar izquierdo:** "Vivienda: espacios y reglas", "Programación (PERT)" y los 14 capítulos por etapa con su valor.
- **Sidebar derecho:**
  - valor acumulado, por etapa y por capítulo;
  - materiales enlazados;
  - mano de obra estimada, alquiler de herramientas y total;
  - botones **Descargar Excel (con fórmulas)**, **Cargar Excel**, **Descargar presupuesto (CSV)** y **Volver a los valores del modelo**.

### 15.2 Modelo V1 (capítulos)
- `node tools/generar_modelo_v1.js` lee `pages/administrador/Matriz/Modelo Construmaster/V1 Construmaster.xlsm` → `assets/datos/modelo_v1.js`.
- El Excel trae 13 capítulos. **Se agrega el capítulo 4 "Instalaciones eléctricas"**, que el Excel no tiene, y los del Excel desde el 4 pasan a 5–14. Etapas: obra negra 1–4, gris 5–6, blanca 7–14.
  - El capítulo 4 en modo modelo usa una plantilla para diligenciar: acometida, tablero, breakers, tubería conduit, cable THHN, cajas, tomas, interruptores y luminarias.
  - `pv1Migrar` movió lo guardado de los capítulos 4–13 a 5–14.
- **Reglas del presupuesto:**
  - **Concreto:** es compuesto: cemento (bulto de 50 kg), arena y gravilla, cada uno con su producto (`PV1_COMPUESTOS`).
  - **Retroexcavadora:** se cobra por horas a $130.000 (`PV1_TARIFAS`).
  - **Vidrio transparente:** $25.000/m², de vidriero artesanal.
  - **Materiales y catálogo:** `PV1_REGLAS` relaciona cada material con sus términos de búsqueda; `PV1_SERVICIO` marca las líneas de mano de obra o servicio, que no llevan producto.
- **Identificadores estables de cada línea:**

  | Formato | Qué es |
  |---|---|
  | `c{cap}-a{i}` | Actividad del modelo |
  | `-g{i}` | Actividad generada por el motor ALC |
  | `-x{i}` | Actividad agregada a mano |
  | `-m{j}` | Material del modelo |
  | `-n{j}` | Material agregado a mano |
  | `-k{i}` | Componente de un compuesto |

  El Excel se carga de vuelta por estos ID.

### 15.3 Motor de vivienda ALC 1.1 (`motorVivienda`, `renderViviendaReglas`)
- **Fuente:** ALC 1.0 del usuario (`respaldos/2026-09-27/ALC.docx`; `code.docx` es una variante). Especificación completa: `pages/administrador/ALC/ALC.json`, con la misma lógica en `pages/administrador/ALC/alc.py`. En este equipo no hay Python: el .py no se ha ejecutado. **Mantener sincronizados JSON, .py e index.js.**
- **Formulario:**
  - Datos generales: área total, pisos, altura de muro, área de puerta, bloques por m² (15,5), desperdicio (5 %), factor de cubierta (1,15), tipología 1–6, cubierta, hidrosanitario (cajas, excavación, tubería).
  - Espacios: salón, sala, comedor, sala-comedor, cocina, cuarto de ropas, cocina-ropas, alcoba, baño, garaje. Cada uno con cantidad, área, puertas, ventanas y ancho × alto de ventana.
  - Opcionales: los del salón y el falso techo de la alcoba. El baño elige 1, 2 o 3 puntos.
- **Tipologías:**

  | Tipología | Área (m²) | Espacios |
  |---|---|---|
  | 1 Campamento | 15 o más | salón 9 + baño 2,5 |
  | 2 Vivienda Básica | 30 o más | alcoba, sala, cocina, baño |
  | 3 Vivienda Familiar | 50 o más | 2 alcobas, sala, comedor, cocina, 2 baños, ropas |
  | 4 Vivienda Completa | 70 a 90 | 3 alcobas, sala-comedor 20, cocina-ropas 11, 2 baños |
  | 5 Casa Cómoda | 90 a 150 | sin espacios fijos |
  | 6 Residencia de Lujo | 151 o más | sin espacios fijos |

  El botón "Llenar los espacios de la tipología" carga los espacios de las tipologías 1 a 4.
- **Reglas:**
  - **R001:** la vivienda tiene área total.
  - **R002:** área por piso = área total / pisos.
  - **R003:** un espacio con cantidad y sin área no genera componentes.
  - **R004:** cubierta = huella (área por piso) × factor de cubierta, con perfil metálico.
  - **R005:** mampostería con longitud = (suma de perímetros + perímetro exterior) / 2; los muros comunes se cuentan una vez.
  - **Validaciones:** suma de espacios ≤ área total, al menos una puerta, ventana obligatoria en alcoba y salón, áreas mínimas, baño sin ventana → extractor.
- **Qué genera, por capítulo:**
  - **2:** cubierta, placa del salón y piso de garaje.
  - **3:** puntos de agua fría, agua caliente y desagüe, y el sistema séptico opcional.
  - **4:** tomas (1 cada 3,6 m de perímetro, cocina 3), toma GFCI por baño, extractores, interruptores y luminarias (1 por espacio), cajas, acometida, tablero, puesta a tierra, y breakers/tubería/cable para diligenciar.
  - **5:** bloques.
  - **6:** pañete interior y de fachada.
  - **7:** puertas, cerraduras, portón y ventanas.
  - **8:** vidrio = ancho × alto.
  - **9:** estuco y pintura (sin baños ni garaje), pintura de fachada y techos de baño.
  - **10:** drywall.
  - **11:** pisos y enchape de baños, con desperdicio.
  - **12:** aparatos y accesorios de baño, lavaplatos y lavadero.
  - **13:** mesón y clósets.
- **"Aplicar al presupuesto"** reemplaza esos capítulos del modelo. En el capítulo 2 se conserva la estructura del Excel.
- **Revisión con normas e internet:** `docs/REVISION_MODELO_ALC.md`. Corrigió los muros compartidos, los bloques por m², el desperdicio, la fachada, la cubierta, las tomas NTC 2050, la GFCI, el extractor y la puesta a tierra (RETIE).
  - Pendiente de decisión: estructura NSR-10 Título E (cimentación, vigas, columnetas), placa de entrepiso con 2 pisos, puertas por tipo (0,90 / 0,80 / 0,70 m) y circulaciones.

### 15.4 Programación PERT, mano de obra y alquiler (`calcularProgramacion`, `renderProgramacion`, `herramientasProgramacion`)
- **Constante de tiempo:** K = meses de la categoría × semanas por mes (4,33) × días hábiles por semana (6). La categoría N dura N meses como mínimo; por ejemplo, la categoría 4 da K = 104 días hábiles. La categoría sale de la tipología elegida o, si no hay, del área; en la pestaña se puede cambiar.
- **Rendimiento:** 1,25 m² por día por espacio con la cuadrilla mínima. Días por rendimiento = suma de áreas de los espacios / 1,25.
- **Cuadrilla:** entre 2 y 5 personas. Personas = mín(5, máx(2, ⌈2 × días por rendimiento / K⌉)); duración = máx(K, días por rendimiento × 2 / personas). Si ni con 5 personas se cumple el plazo, sale un aviso.
- **PERT:**
  - Las tareas son los capítulos con cantidades; el 1 y el 14 van siempre.
  - Pesos en el tiempo (`PROG_PESOS`): 1: 4, 2: 22, 3: 6, 4: 6, 5: 14, 6: 9, 7: 5, 8: 2, 9: 8, 10: 3, 11: 10, 12: 4, 13: 4, 14: 3.
  - Precedencias (`PROG_PREC`): 2←1; 3, 4, 5←2; 6←3, 4, 5; 7, 9, 10, 11←6; 8←7; 12←11; 13←9, 11; 14←8, 10, 12, 13. Si un capítulo no está, se heredan sus precedentes.
  - O = 0,75 M, P = 1,5 M, te = (O + 4M + P) / 6 y σ = (P − O) / 6. M se escala para que la ruta crítica sea igual a la duración.
  - Se calculan holguras, ruta crítica, σ de la ruta y fechas al 50, 84 y 98 %.
  - Calendario en días hábiles desde la fecha de inicio: domingo libre, y sábado también si se trabajan 5 días. No descuenta festivos.
- **Mano de obra:** personas × duración × costo del día trabajado, tomado de `assets/motor/salario_minimo.js`: (SMMLV + salud 8,5 % + ARL 6,96 % + transporte $5.000/día × 26) ÷ 26 = $82.754. Se reparte por tarea según su te.
- **Alquiler de herramientas** (`PROG_HERRAMIENTAS`): cada capítulo tiene sus equipos.
  - Cada equipo se define con: nombre, términos de búsqueda, cantidad, fracción de uso y precio mínimo (descarta accesorios sueltos).
  - Días de alquiler = máx(1, ⌈te de la tarea × fracción de uso⌉).
  - Tarifa por día = mediana de las tarifas por día del catálogo `assets/datos/alquiler.js` que coinciden.
  - Costo = cantidad × días × tarifa.
- **Ejemplo** (tipología 4, 63 m² de espacios):

  | Concepto | Resultado |
  |---|---|
  | Constante K | 104 días hábiles |
  | Cuadrilla | 2 personas |
  | Duración | 104 días (18 semanas) |
  | Mano de obra | $17,2 millones |
  | Alquiler | $17,6 millones (24 equipos) |

### 15.5 Excel del presupuesto (`descargarExcelV1`, `cargarExcelV1`)
- **Librería:** `assets/motor/exceljs.min.js`, cargada solo cuando se usa (sin conexión). Archivo: `presupuesto_v1_construmaster.xlsx`, con recálculo al abrir.
- **Hojas relacionadas:**
  - **Parametros:** datos de la vivienda, categoría, cuadrilla y salario. Tiene fórmulas para la constante K, los días por rendimiento, las personas, la duración, el costo del día y la escala PERT.
  - **Presupuesto:** ID, etapa, capítulo, actividad, material, producto, unidad, cantidad y valor unitario. VALOR = cantidad × valor unitario. Un compuesto vale la suma de sus componentes si alguno tiene precio. La columna NIVEL distingue material de componente.
  - **Resumen:** por capítulo, materiales (SUMIFS), mano de obra (de Programacion), alquiler (SUMIFS de Herramientas) y total.
  - **Programacion:** peso, M, O, P, te, σ, inicio = MAX(fin de las precedentes), fin y mano de obra (fórmulas).
  - **Herramientas:** cantidad, fracción, te de la tarea (enlazado), días = MAX(1, ROUNDUP(te × fracción, 0)), tarifa y costo.
- **Cargar Excel:** lee la hoja Presupuesto y actualiza por ID la cantidad y el valor unitario. Si el valor unitario cambia, se quita el producto elegido.

### 15.6 Herramientas de alquiler (Catálogo)
- `node tools/scraper/alquiler/alquiler.js` genera `assets/datos/alquiler.js`, `pages/ALQUILER/<empresa>/alquiler.json` y el Excel `pages/ESTADISTICAS/Alquiler de herramientas/alquiler_herramientas.xlsx`. Opciones: `--solo-principales` (las 10 del plan) y `--desde-json` (reprocesa sin descargar).
- Resultado (28/09/2026): **30 empresas, 677 equipos, 301 con precio.** `depurar()` descarta, en las capturas automáticas, entidades HTML, fragmentos de texto, artículos de venta y de recreación. Detalle: `docs/PLAN_HERRAMIENTAS_ALQUILER.md`.
- Página: Catálogo → Herramientas de alquiler (`#proveedores/alquiler`, `/c-N`, `/e-N`).

### 15.7 Otros cambios
- **Logo del encabezado:** texto "CM" y debajo "CONSTRUMASTER" (clase `.logo-texto`), en lugar de la imagen.
- **usuario.html:** se regenera con `node tools/generar_pagina_usuario.js` (no tiene las vistas del presupuesto V1).
- **Pendientes del usuario:**
  - número de Nequi;
  - fechas de la programación de San Esteban;
  - archivos de presupuesto y control para la página del cliente (los planos estructurales ya están, ver 16.1);
  - servidor para "Crear proyecto" y para subir archivos.

## 16. Página del cliente de San Esteban: etiquetas, materiales y fichas (28–29/09/2026)
Todo está en `pages/Cliente/index.html` + `cliente.js` (vista **Proyecto**, `#proyecto`). Orden de la vista: carrusel de fotos → imágenes con etiquetas → Materiales de la obra → Avance por etapas. Cada sección se arma con un archivo de datos de la obra; si la obra no lo tiene, la sección no aparece.

### 16.1 Qué se hizo
- **Planos estructurales** (`San Esteban/PLANOS/ESTRUCTURALES/E1-4 … E4-4.pdf`): no aparecían porque `planos.js` era anterior a los PDF. Se regeneró con `node tools/generar_planos_cliente.js`. E1-4 pesa 7 MB y tarda en abrir en el lector.
- **Imágenes con etiquetas** (`renderEtiquetas` → `seccionEtiquetas`): puntos con código sobre una imagen; al tocar uno se abre su ficha (cantidad, etiqueta constructiva, datos de la tabla e imagen del recuadro original). Una obra puede tener varias; cada archivo de datos agrega la suya a `window.ETIQUETAS_OBRA['<OBRA>']` (lista).
  - **Flejes y varillas** — `San Esteban/img/Flejes y varillas/etiquetas.js`. Base: `estructura.jpg`, recorte de `img/slide secuencial/Modelado/qflejes_4 - Photo.jpg` (el render de `imagen completa.png` tiene las flechas pintadas). Tablas: `FC1.png … VV3.png`, `fc.png` (flejes de cubierta, código propio **FCUB**), `VCUB.png`, `VCIM.png`. Totales: **2.516 flejes**, **244 varillas**.
  - **Cantidades de obra** — `San Esteban/Etapas Obra/etiquetas/etiquetas.js`. Base: `09_EXTERIORES/01_Fachadas/Fachada isometrica.png`. Recuadros: `M Muros.png` (40 muros, 156,25 m² de superficie, 81,48 m al eje), `P Puertas.png` (7, 44,73 m²), `V Ventanas.png` (6, 33,71 m²), `CUB Cubierta.png` (29,29 m²).
  - Cada punto se ubica con `x`/`y` en % del ancho y alto de la imagen base: para corregir un punto se cambian esos dos números.
  - Colores por grupo: `color-0` verde, `color-1` dorado, `color-2` azul, `color-3` terracota (`index.css`, bloque "Cliente · imagen dinámica con etiquetas").
- **Carpeta `Etapas Obra/etiquetas`**: aquí van los recuadros blancos con cantidades de obra. Como no empieza con número, `generar_contenido.js` no la mete en el carrusel.
- **Materiales de la obra** (`renderMateriales`, `abrirSelectorMaterial`) — `San Esteban/materiales.js`. Suma lo listado en las etiquetas y en la ficha de entrepisos:

  | Grupo | Material | Cantidad | Equivalencias (búsqueda en el inventario) |
  |---|---|---|---|
  | Acero de refuerzo | Flejes (estribos) | 2.516 und | fleje, estribo |
  | Acero de refuerzo | Varillas | 244 und | varilla corrugada, varilla |
  | Entrepisos | Bloquelón | 320 und | bloquelon |
  | Entrepisos | Perfil para bloquelón | 34 und | perfil bloquelon, perfil c, perfil |
  | Mampostería | Ladrillo | 156,25 m² × 13 = 2.032 | ladrillo, bloque |
  | Puertas y ventanas | Puertas | 7 und | puerta interior, puerta seguridad, puerta madera, puerta |
  | Puertas y ventanas | Ventanas | 6 und | ventana aluminio, ventana, vidrio |
  | Cubierta | Teja | 29,29 m² × 0,7 = 21 | teja fibrocemento, teja |

  - Funciona como el selector de Presupuesto en index (`abrirSelectorProducto`): equivalencias en botones, buscador, resumen para comparar (cantidad de productos, precio mínimo, máximo y promedio) y lista de menor a mayor precio con proveedor y marca. El precio del producto elegido pasa a ser el valor unitario; sin producto, el valor se escribe a mano.
  - La búsqueda (`buscarInventario`) es la misma lógica que `buscarEnCatalogo` de index.js: todas las palabras del término (si no hay resultados, la primera); primero los que empiezan por la palabra, luego los que tienen precio, de menor a mayor. Excluye la familia "Herramientas y maquinaria".
  - `factor` = unidades del producto por unidad de obra, editable en la página. **Supuestos por confirmar:** ladrillo 13/m² (bloque No. 5) y teja 0,7/m² (teja No. 6). Si se elige otro producto hay que ajustarlo (p. ej. ladrillo macizo = 50/m²).
  - El inventario (`assets/datos/inventario.js`, ~30 MB) se carga solo al abrir el selector.
  - La elección se guarda en el navegador: `localStorage` `construmaster_materiales_<OBRA>`.
  - Prueba del 29/09/2026 (coincidencias en el inventario): flejes 22, varillas 10, bloquelón 26, perfil 17, ladrillo 133, puertas 951 con "puerta" (traía muebles; por eso "puerta interior" va primero: 23), ventanas 22, tejas 13.
- **Avance por etapas** (`renderFichas`) — `San Esteban/Etapas Obra/fichas.js`: una ficha por imagen interpretada (imagen completa sin recorte, descripción y cantidades).
  - Entrepisos en bloquelón (`04_ESTRUCTURA/Bloquelon/Entrepisos.png`): 2 entrepisos × (160 bloquelones + 17 perfiles).
  - Muros exteriores (`05_MAMPOSTERIA/01_Muros_Exteriores/Muros.png`): con las cantidades de `M Muros.png`.

### 16.2 Clasificación de imágenes en `San Esteban/Etapas Obra` (29/09/2026)
| Archivo original | Contenido | Quedó en |
|---|---|---|
| Captura 162101 | Isométrico posterior con muros y escalera | `05_MAMPOSTERIA/01_Muros_Exteriores/Isometrico posterior.png` |
| Capturas 162227 y 162321 | Isométricos en corte (muros interiores, escalera) | `05_MAMPOSTERIA/02_Muros_Interiores/Isometrico interior escalera 1 y 2.png` |
| `DESPIECE/1er, 2do, 3er pisoaxon.png` | Axonometría de cada piso | `05_MAMPOSTERIA/02_Muros_Interiores/Piso 1, 2, 3 axonometria.png` |
| `corte long.png` | Corte longitudinal | `05_MAMPOSTERIA/Corte longitudinal.png` |
| Captura 162414 | Puertas y ventanas vistas por dentro | `08_ACABADOS/05_Carpinteria_y_Herreria/Puertas y ventanas interior.png` |
| Captura 162606 | Fachada frontal | `09_EXTERIORES/01_Fachadas/Fachada frontal.png` |
| Captura 162808 | Fachada en 3D con cubierta | `09_EXTERIORES/01_Fachadas/Fachada isometrica.png` |
| Capturas 163210, 163331, 163454, 163659 | Recuadros de cantidades | `etiquetas/M Muros.png`, `P Puertas.png`, `V Ventanas.png`, `CUB Cubierta.png` |
| Captura 14:35 de Bloquelón | Despiece de bloquelón | renombrada por el usuario a `04_ESTRUCTURA/Bloquelon/Entrepisos.png` |

Tras mover o agregar imágenes: `node tools/generar_contenido.js` (el carrusel quedó con 57 fotos).

### 16.3 Versiones de archivos en `pages/Cliente/index.html`
Los `<script>` y el CSS llevan `?v=…` para que el navegador no use copias viejas. **Al cambiar un archivo de datos o `cliente.js`, subir su versión** (o recargar con Ctrl + F5). Scripts de la obra que carga la página: `San Esteban/img/Flejes y varillas/etiquetas.js`, `San Esteban/Etapas Obra/etiquetas/etiquetas.js`, `San Esteban/Etapas Obra/fichas.js`, `San Esteban/materiales.js`. Para otra obra hay que agregar sus propios `<script>` (hoy la página solo carga los de San Esteban).

### 16.4 Git en este equipo (29/09/2026)
- Git 2.55 instalado con `winget install Git.Git` en `%LOCALAPPDATA%\Programs\Git`. Si una terminal dice que no reconoce `git`: cerrar y abrir VS Code, o correr `$env:Path += ";$env:LOCALAPPDATA\Programs\Git\cmd"`.
- El disco F: viene de otro equipo: se agregó `git config --global --add safe.directory 'F:/Modelo de Presupuesto/Presupuesto de obra'`.
- Los comandos se corren desde la carpeta principal (`F:\Modelo de Presupuesto\Presupuesto de obra`), no desde `pages\Cliente`.
- Subir cambios de la página del cliente: `git add pages/Cliente index.css assets/datos/contenido.js assets/contenido/proyectos/san-esteban` → `git commit -m "…"` → `git push`. Sin `index.css`, `contenido.js` y las miniaturas, la versión en GitHub queda sin estilos y sin las fotos nuevas.
- Envíos a `main`: `16527083` (etiquetas, fichas, planos estructurales e imágenes clasificadas) y `ff129896` (materiales de la obra).

### 16.5 Pendientes y dudas para el usuario
- Confirmar el tipo de ladrillo y de teja (factores 13/m² y 0,7/m²).
- "Area of the Wall 10,19" del recuadro de muros: se mostró como "Área del muro 10,19 m²"; confirmar qué es.
- Cubierta 29,29 m²: parece poco para la planta; revisar en el modelo.
- Ventanas: el inventario las vende por unidad en tamaños pequeños (60 × 40 cm); las 6 ventanas suman 33,71 m², así que el precio real puede ser mayor.
- Etiqueta "Fleje Entrepiso 3" repetida en Flejes de cubierta y en FE3 (probable error de la tabla original).
- Confirmar la interpretación de las fichas: entrepisos sobre el 1.er y 2.º piso; vano de acceso del primer piso.
- Carpeta vacía `Etapas Obra/DESPIECE`: borrarla a mano.
- `San Esteban/img/Captura de pantalla 2026-09-29 161201.png` es igual a `04_ESTRUCTURA/completa.png` y sale repetida en la galería.
- `San Esteban/docs/edicion de tablas e imagenes.pptx` se subió a GitHub; decidir si se deja.
