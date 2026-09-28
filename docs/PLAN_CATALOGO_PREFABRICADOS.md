# Plan: pestaña "Catálogo prefabricados" en el index (administración de lo que ve el cliente)

Estado: **documentado, no implementado** (pedido del usuario, 27/09/2026: "documenta esto sin que funcione estrictamente").

## Qué pidió el usuario
1. En el navbar del index, una pestaña **Catálogo prefabricados**.
2. Allí **visualizar** todas las casas prefabricadas del inventario (hoy 72 con precio, área y foto; ver `assets/datos/prefabricadas.js`).
3. **Activar / desactivar** qué casas se muestran en la página del cliente (`usuario.html`, pestaña Casas Prefabricadas).
4. **Consultar el número de clics** que hacen los clientes en cada imagen (cada vez que abren el slide de una casa).
5. La página del cliente tendrá un **contador de visitas**.
6. Esos datos (visitas y clics) aparecerán **en la parte más alta del sidebar del index**.

## Diseño propuesto
| Pieza | Dónde | Cómo |
|---|---|---|
| Pestaña "Catálogo prefabricados" | index.html (navbar, después de Proyectos) | Rejilla de las 72 cards con un interruptor "Visible para el cliente" y el número de clics de cada una |
| Lista de casas visibles | Dato compartido entre index y usuario | `visibles: [ids]` (id = empresa + modelo) |
| Clic en imagen | usuario.html, al abrir el slide (`abrirSlideCasa`) | Registrar `{casa, fecha}` |
| Visitas | usuario.html, al cargar la página | Registrar `{fecha, pestaña}` |
| Resumen | Sidebar del index, primera sección | "Visitas hoy / total" y "Casa más vista" con su número de clics |

## Limitación técnica (importante)
El sitio es **estático y local** (se abre con doble clic, sin servidor). Por eso:
- Con **almacenamiento del navegador** (`localStorage`) funcionaría solo si el cliente y el administrador usan **el mismo navegador del mismo equipo**. Sirve para una demostración, no para medir clientes reales.
- Para contar visitas y clics **de clientes reales** y que el administrador los vea desde otro equipo hace falta un **servidor con base de datos** (o un servicio externo de analítica). Opciones:
  1. Servidor propio pequeño (Node + SQLite): endpoints `POST /visita`, `POST /clic`, `GET /resumen`, `PUT /visibles`.
  2. Servicio de analítica (p. ej. un contador de eventos): más rápido, pero los datos quedan en un tercero.
  3. Hoja de cálculo en la nube como base de datos (Google Sheets/Apps Script): sin servidor propio.
- Cualquiera de estas opciones requiere publicar el sitio en internet (hoy es local).

## Pasos cuando se decida implementar
1. Elegir la opción de almacenamiento (1, 2 o 3) — decisión del usuario.
2. Crear la pestaña en index.html y su vista en index.js (reutilizar `prefabricadasHtml` con interruptores).
3. En usuario.html: filtrar las cards por `visibles`, registrar visitas al cargar y clics en `abrirSlideCasa`.
4. Sidebar del index: sección "Clientes" arriba de todo con visitas y clics.
5. Probar con `node tools/probar_pagina.js` y regenerar `usuario.html` (`node tools/generar_pagina_usuario.js`).

## Estado (2026-09-27): contador local implementado
- usuario.html cuenta cada visita (total y por día) y cada casa abierta (`#casa/<n>`) en `localStorage` (clave `construmaster_contador`; funciones `registrarVisita`, `registrarClicCasa` en index.js).
- index.html lo muestra arriba del sidebar derecho: "Clientes · página usuario" (visitas hoy, visitas en total, clics en casas y las 3 casas más vistas). Se actualiza solo si ambas páginas están abiertas en el mismo navegador.
- Límite: solo cuenta lo que pasa en ese navegador y equipo. Para contar clientes reales sigue haciendo falta el servidor descrito arriba.
- Pendiente (sin hacer): la pestaña "Catálogo prefabricados" del index con los interruptores de visibilidad.
