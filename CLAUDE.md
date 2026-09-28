# ConstruMaster — contexto para el asistente (leer antes de hacer nada)

Sistema de presupuestos de obra y materiales de construcción (Colombia, Tunja/Boyacá). Sitio estático de **una sola página**: `index.html` + `index.css` + `index.js` (se abre con doble clic, sin servidor). Datos generados en `assets/datos/` por scripts Node de `tools/`.

**Guía completa para retomar: `docs/RETOMAR_PROYECTO.md`.** Línea de trabajo abierta (marcas/scraping): `docs/PLAN_PROVEEDORES_MARCAS.md`, sección 10. Historial y "qué copiar dónde": `docs/INVENTARIO_REPOSITORIO.md`.

## Reglas del usuario (obligatorias)
- Responder en **español neutro**, sin voseo ("puedes", "aquí"). Nombres de archivos/carpetas **sin tildes ni ñ**.
- **No mencionar commits ni git** salvo que el usuario pregunte; no hacer commits sin pedido.
- **Procesos grandes**: documentar y planear en un `.md` → confirmación del usuario → **piloto 10 %** con **auditoría 5 %** → recién entonces el 100 %. No prometer una fuente sin probarla.
- Si el pedido es ambiguo, **preguntar** antes de construir de más. Nada de login/contraseñas sin pedido explícito.
- Si aparece un límite de sesión, **documentar primero** el estado en el `.md`.

## Página del cliente (usuario.html)
- Generada desde `index.html` por `tools/generar_pagina_usuario.js` (no editar a mano; regenerar tras cambiar index.html). Mismo `index.css`/`index.js`: cada página usa solo las vistas que existen en su HTML.
- Navbar: Casas Prefabricadas · Construcción · Remodelación · Presupuesto · Ingresar (sin Inicio ni Diseño; arranca siempre en Casas). Construcción, Remodelación y Presupuesto llevan el mismo formulario (`formularioSolicitud`). Ingresar = "Tengo usuario y contraseña" / "Deseo registrarme" (pedido explícito del usuario, 27/09/2026); sin servidor no crea cuentas ni guarda datos.
- Formato celular vertical (600 px centrado en computador, ancho completo en teléfono), **sin sidebar**; arriba una franja corta con el título CONSTRUMASTER (sin logo ni banner) y debajo el navbar siempre visible, en una sola fila ("Casas Prefabricadas" en una línea; en teléfonos angostos se desliza de lado). Casas prefabricadas con planos de Concasaya.
- En index.html, la pestaña "Usuario" (al final del navbar) abre usuario.html: excepción pedida por el usuario a la regla de no enlazar páginas con otro navbar.

## Reglas de diseño
- **El contenido de cada página empieza arriba** (sin eyebrow, título ni párrafo de introducción). La descripción de la página y el origen de sus datos van al final en `<aside class="nota-pagina">` (pedido del usuario, 27/09/2026). En Catálogo, sin filtros se muestra la estructura (familias → categorías) en vez de todos los productos.
- **La página del cliente (pages/Cliente) no se bloquea**: el ingreso con usuario y contraseña está en usuario.html; sin sesión, la página del cliente muestra San Esteban.
- index.html tiene además un **sidebar derecho** (resumen de datos, accesos rápidos, descargas), mismo estilo que el izquierdo; se oculta en pantallas de menos de 1200 px.
- Una sola página; navegación por hash. **El navbar nunca se mueve** entre pestañas (activo = solo color; `scrollbar-gutter:stable`). El **sidebar sí cambia** según la pestaña, con el mismo estilo.
- Paleta verde/hueso/arena; sin fuentes web ("Segoe UI", Arial). COMFER naranja, Homecenter azul. Catálogos con loop infinito hacia abajo.
- Presupuesto (28/09/2026): pestañas Presupuesto (modelo V1, 14 capítulos; el 4 "Instalaciones eléctricas" no está en el Excel) · Programación (PERT: constante de tiempo por categoría = N meses, cuadrilla 2–5 personas, 1,25 m²/día por espacio, mano de obra con salario mínimo, herramientas de alquiler por tarea) · Seguimiento por etapas · **Caralis** (antes "Modelo de referencia (Boulevard)"). Sidebar derecho: descargar Excel con fórmulas vivas / cargar Excel (actualiza por ID). Motor de vivienda ALC: `pages/administrador/ALC/ALC.json` + `alc.py` (misma lógica que index.js; mantener sincronizados). Revisión: `docs/REVISION_MODELO_ALC.md`.
- Navbar (27/09/2026): Inicio · Proyectos · Herramientas · **Catálogo ▾** (Materiales · Marcas · Ferreterías · Casas prefabricadas · Estadísticas) · Presupuesto · Construcción · Diseño · Usuario. Servicios se fusionó con Construcción (registro de actividades y cantidades por etapa: `#construccion/e-N`; catálogo de actividades en `#construccion/actividades`; `#servicios` sigue existiendo). En Catálogo, el sidebar izquierdo navega por familia/categoría de lo que se ve y el derecho muestra sus estadísticas (rango de precios, tipos de producto).

## Comandos
```
cd tools && npm install                              # xlsx, jszip, sharp, exceljs
node tools/generar_inventario.js                     # inventario + marcas + ranking + carpetas de marcas
node tools/generar_apu.js                            # servicios / APU (tras node tools/extraer_apu.js)
node tools/generar_contenido.js                      # imágenes de proyectos y etapas
node tools/generar_excel_salario.js                  # Excel del salario mínimo (fórmulas vivas)
cd tools && npm install puppeteer-core@23 --no-save  # solo para probar
node tools/probar_pagina.js                          # prueba de todas las rutas (debe decir "todo correcto")
node tools/generar_pagina_usuario.js                 # regenera usuario.html (pagina del cliente) desde index.html
node tools/generar_modelo_v1.js                      # Presupuesto: capitulos, actividades y materiales del modelo V1 Construmaster
node tools/clasificar_marcas.js                      # clasificacion constructiva unificada de marcas (tras generar_inventario)
node tools/generar_biblioteca.js                     # Biblioteca de proyectos (pestaña Diseño) -> assets/datos/biblioteca.js
node tools/crear_proyecto.js "PROYECTO N.json"       # crea la carpeta de un proyecto del formulario "Crear proyecto"
```
Sin Python en el equipo original: todo es Node.
