# Plan — Proveedores: catálogo de marcas de la construcción

> Para retomar en otro equipo, empezar por `docs/RETOMAR_PROYECTO.md` (guía completa) y `CLAUDE.md` (raíz).

Estado (26/09/2026) — ver sección 10 para el estado más reciente y cómo retomar:
- **Asignación de marcas: aprobada por el usuario** y aplicada al inventario completo.
- **Pestaña Proveedores con su esqueleto: construida** para validar carpetas y ubicaciones.
- **Scraping: BORRADOR PARA CONFIRMAR.** No se captura nada hasta que el usuario valide el esqueleto y este plan.

Referencia metodológica: investigación KRAKEN (`C:\Users\USUARIO\Desktop\Investigaciónn de mercado`, `PROCESO.md` y `CLAUDE.md`). La escala aquí es mucho mayor: KRAKEN tenía 15.367 productos, 6 tiendas y 30 marcas; ConstruMaster tiene **65.791 productos, 14 inventarios y 1.911 marcas** del sector de la construcción. Del método de KRAKEN se toman la convención de carpetas, el ranking A/B/C, la deduplicación y la regla de no prometer una fuente sin probarla antes.

---

## 1. Lo que ya está hecho

| Pieza | Estado | Dónde |
|---|---|---|
| Asignación de marca | ✅ 60.333 de 65.791 productos (92 %) · 1.911 marcas | `tools/marcas_construccion.js`, llamado desde `tools/generar_inventario.js` |
| Pestaña Proveedores | ✅ Portada con ranking A/B/C, directorio A–Z de las 1.911 marcas, catálogo por marca (loop infinito), sidebar con buscador y todas las marcas | `index.js` (bloque Proveedores), `#proveedores` y `#proveedores/<marca>` |
| Esqueleto del repositorio | ✅ 30 carpetas (top 30) con `pagina web.txt` vacío e `img/` vacía; `LEEME.md` y `verificacion/` | `pages/PROVEEDORES/` |

Método de asignación: diccionario de marcas de Homecenter → marca en el nombre (palabras completas, coincidencia más larga) → descarte de marcas que son palabras comunes → marca del fabricante (Corona, Alfa, Pavco, Santafé, Ipecol, Solimpro). Detalle por tienda en la sección 6.

## 2. Esqueleto: dónde cae cada dato del scraping (validar)

```
pages/PROVEEDORES/
├── LEEME.md
├── verificacion/
│   ├── Piloto_scraping_10.xlsx      resultado del piloto
│   └── Auditoria_scraping_5.xlsx    muestra auditada contra el sitio oficial
└── Grupo A | B | C/                 ranking: A 1-10, B 11-20, C 21-30
    └── NN - Marca/
        ├── logo.*                   logo oficial
        ├── pagina web.txt           URL del sitio oficial (primera línea)
        ├── Inventario_<marca>.xlsx  catálogo capturado: NOMBRE DEL PRODUCTO | PRECIO | CATEGORIA | IMAGEN | URL
        ├── data.json                fuente de verdad del scraper (no se edita a mano)
        └── img/                     fotos de producto
```

- Código del scraper: `tools/scraper/` (un módulo por marca en `tools/scraper/marcas/<slug>.js`, utilidades comunes en `tools/scraper/lib/`).
- Integración: cuando exista un `Inventario_<marca>.xlsx`, `tools/generar_inventario.js` lo sumará al inventario general (hoy solo lee `pages/ESTADISTICAS`).
- La pestaña Proveedores muestra el estado de cada carpeta (logo, web, inventario, data.json, fotos) y se actualiza al regenerar.

## 3. Qué se captura (por fases, de menor a mayor esfuerzo)

| Nivel | Qué | Para cuántas marcas | Riesgo |
|---|---|---|---|
| N1 · Identidad | URL del sitio oficial + logo | Todas las que tengan sitio (objetivo: top 30, luego el resto) | Bajo: una página por marca |
| N2 · Catálogo oficial | Productos del sitio de la marca (nombre, precio si lo publica, categoría, imagen, URL) | Marcas con catálogo público | Medio: cada sitio es distinto; algunos no publican precios o bloquean tráfico automatizado |
| N3 · Nuevas tiendas | Tiendas o distribuidores adicionales del sector | Por definir | Alto: requiere reconocimiento previo por tienda |

Reglas (heredadas de KRAKEN):
1. Solo páginas públicas; sin iniciar sesión; respetar `robots.txt`; máximo 1 solicitud por segundo por sitio.
2. No prometer una fuente sin un reconocimiento rápido previo (¿el catálogo es HTML público, API tipo Shopify/VTEX o requiere navegador?).
3. Mercado Libre queda fuera (bloqueo confirmado en KRAKEN).
4. Nunca detener un proceso en segundo plano sin que el usuario lo pida.

## 4. Protocolo: piloto 10 % + auditoría 5 %

Con 1.911 marcas, el 10 % son **191 marcas**. Propuesta para que quepa en una sesión de 2 horas:

| Paso | Qué | Tamaño |
|---|---|---|
| Piloto N1 | Identidad (sitio + logo) del 10 % de las marcas, muestra estratificada por tamaño: 3 del top 30 y 188 del resto, semilla fija | 191 marcas |
| Piloto N2 | Catálogo oficial solo del 10 % del top 30 | 3 marcas (una de cada grupo A, B, C) |
| Auditoría | 5 % aleatorio de lo capturado, revisado contra el sitio oficial (nombre, precio, imagen, categoría; ¿correcto?) | ≈ 10 marcas de N1 + 5 % de los productos de N2 |
| Registro | `pages/PROVEEDORES/verificacion/` (Excel de piloto y de auditoría) | — |

Métricas: precisión (datos correctos ÷ auditados), cobertura (marcas con sitio/logo encontrado ÷ intentadas) y margen `e = z·√(p(1−p)/n)`, z = 1,96.
Criterio para ampliar al 100 %: precisión ≥ 95 %. Si no se cumple, se corrigen las reglas y se repite el piloto con otra semilla.

## 5. Agenda de 2 horas (si se aprueba)

| Tiempo | Actividad |
|---|---|
| 0:00 – 0:15 | Reconocimiento: probar 3 marcas del top 30 (tipo de sitio, robots.txt, si publica catálogo y precios). Sin capturar |
| 0:15 – 0:25 | Informe del reconocimiento y confirmación del usuario |
| 0:25 – 1:05 | Piloto N1 (191 marcas) y N2 (3 marcas) → carpetas del esqueleto + Excel de piloto |
| 1:05 – 1:30 | Auditoría del 5 % y métricas |
| 1:30 – 1:50 | Regenerar inventario y pestaña; revisar en Chrome |
| 1:50 – 2:00 | Informe final y decisión de ampliar o no |

## 6. Anexo: asignación de marca por tienda

| Fuente | Marca del Excel | Por nombre | Por fabricante | Sin marca |
|---|---|---|---|---|
| Homecenter | 42.775 | 13 | — | 182 |
| Soelco | — | 13.056 | — | 2.603 |
| COMFER | — | 1.371 | — | 1.121 |
| Corona | — | 452 | 1.892 | — |
| Pinturas y Yesos | — | 289 | — | 685 |
| BAEZO | — | 21 | — | 814 |
| ALFA, PAVCO, Santafé, IPECOL, Solimpro | — | 9 | 455 | — |
| G&J | — | — | — | 53 |

Observaciones conocidas: algunas marcas reales quedaron fuera del diccionario al confundirse con palabras comunes (Milwaukee, Metabo, Cat…) y "Superior" puede ser la palabra y no la marca. Se pueden ajustar con una lista de marcas protegidas si el usuario lo pide.

## 7. Foco del piloto: las 10 marcas con más presencia en los catálogos (definido por el usuario)

Presencia = número de catálogos (tiendas e inventarios) en que aparece la marca; empate por número de productos. Se muestran en Proveedores junto con la marca con más productos (Truper, 5.432) y el valor promedio del producto ($ 423.168 en todo el catálogo; $ 224.445 en estas 10 marcas).

| # | Marca | Catálogos | Productos | Precio promedio |
|---|---|---|---|---|
| 1 | Toxement | 5 | 121 | $ 929.511 |
| 2 | Corona | 4 | 3.935 | $ 307.068 |
| 3 | Pintuco | 4 | 293 | $ 137.186 |
| 4 | Truper | 3 | 5.432 | $ 167.766 |
| 5 | Pretul | 3 | 1.201 | $ 99.727 |
| 6 | Dewalt | 3 | 1.199 | $ 563.766 |
| 7 | Stanley | 3 | 1.189 | $ 106.310 |
| 8 | Grival | 3 | 578 | $ 69.002 |
| 9 | Gricol | 3 | 450 | $ 110.771 |
| 10 | Stretto | 3 | 435 | $ 202.467 |

Corrección hecha al calcular este top (verificada con muestras): "Superior" y "Orbit" se detectaban como marca dentro de nombres donde son palabras descriptivas ("Válvula … Entrada Superior", "Porcelanato Orbit"). Se agregó una lista de palabras que no cuentan como marca cuando se detectan en el nombre (`NO_MARCA_EN_NOMBRE` en `tools/marcas_construccion.js`); la marca que viene en la columna del Excel se respeta. Resultado: Superior queda solo en Homecenter (donde sí es marca) y Stanley, Bosch y Truper conservan todos sus productos. Productos con marca: 60.319 de 65.791.

## 8. Reconocimiento hecho (26/09/2026, sin capturar productos)

| Marca | Sitio oficial | Plataforma | robots.txt | Catálogo público | Precios | Viabilidad |
|---|---|---|---|---|---|---|
| Truper | truper.com | Magento detrás de Cloudflare | Bloquea /api/, cuenta y carrito; permite productos | Sí, >15.000 productos; el mapa del sitio devuelve el reto de Cloudflare a clientes automatizados | No en COP (catálogo México; Colombia vía distribuidor colombia9524.com) | Media-baja: requiere navegador real (Playwright) y ritmo lento |
| Grival (Corona) | grival.com | WordPress (Yoast) | Permite todo | 362 entradas en el mapa del sitio, sin tienda | No (se venden en corona.co, ya en el inventario de Corona) | Alta para identidad y fichas; precios ya disponibles vía Corona |
| Stretto | strettocolombia.com | Wix | Permite todo | 425 URL de producto en `store-products-sitemap.xml` | Por verificar en ficha | Alta |

Logos: Stretto publica `og:image`; Truper y Grival requieren tomarlo del encabezado del sitio.
Pendientes de reconocimiento dentro del top 10: Toxement, Corona (ya capturada como catálogo), Pintuco, Pretul (marca de Grupo Truper), Dewalt, Stanley, Gricol.

## 9. Decisiones pendientes del usuario

1. **Validar el esqueleto** (sección 2 y pestaña Proveedores → "Esqueleto del repositorio"): 30 carpetas `Grupo A|B|C/NN - Marca/` alineadas con el ranking actual. Las carpetas que solo tienen el esqueleto vacío se reubican solas si el ranking cambia; las que ya tengan archivos del usuario no se tocan.
2. **Carpetas para el top 10 por presencia:** Toxement, Pintuco y Gricol no están en el top 30 por productos y hoy no tienen carpeta. ¿Crearlas también?
3. **Piloto:** N1 (sitio oficial + logo) para las 10 marcas por presencia y N2 (catálogo oficial) para 1 de ellas (propuesta: Stretto, la más viable), con auditoría del 5 % de lo capturado.
4. **Arrancar** el reconocimiento de las 7 marcas pendientes y luego el piloto.

---

## 10. BITÁCORA Y ESTADO PARA RETOMAR (actualizado 26/09/2026, sesión interrumpida por límite)

### 10.1 Hecho y verificado
- **Carpetas:** top 30 por productos en `pages/PROVEEDORES/Grupo A|B|C/NN - Marca/` y las marcas del top 10 por presencia que no estaban en el top 30 en `pages/PROVEEDORES/Presencia/Pnn - Marca/` (Toxement P01, Pintuco P03). Las carpetas que solo tienen esqueleto vacío se reubican solas si cambia el ranking (`tools/marcas_construccion.js`, función `rankingMarcas`).
- **Piloto N1 (identidad) de las 10 marcas por presencia — COMPLETO.** Registro: `pages/PROVEEDORES/verificacion/Piloto_scraping_10.xlsx`, hoja *Identidad*. Auditoría visual del 100 % de los logos (más que el 5 % pedido):

| Marca | Sitio oficial | Logo | Observación |
|---|---|---|---|
| Toxement | https://www.toxement.com.co/ | logo.svg ✓ | Euclid Chemical Toxement |
| Corona | https://corona.co/ | logo.png ✓ | Recortado a mano de su og:image (la descarga automática falló por conexión desde Node; curl sí funciona) — `logo.json` documenta el origen |
| Pintuco | https://www.pintuco.com.co/ | logo.png ✓ | |
| Truper | https://www.truper.com/ | logo.svg ✓ | Logo "Grupo Truper" |
| Pretul | https://www.truper.com/ | — (sin logo) | No tiene sitio propio; es marca de Grupo Truper. Se retiró el logo de Truper que se había guardado por error |
| Dewalt | https://www.dewalt.com.co/es-co | logo.webp ✓ | |
| Stanley | https://co.stanleytools.global/ | logo.png ✓ | Tomado del ícono del sitio |
| Grival | https://www.grival.com/ | logo.png ✓ | |
| Gricol | https://www.gricol.com/ | logo.jpg ✓ | |
| Stretto | https://www.strettocolombia.com/ | logo.png ✓ | Logo blanco: `logo.json` con `"fondo": "oscuro"`, la página lo muestra sobre fondo oscuro |

Resultado: 10/10 sitios, 9/10 logos (Pretul sin logo propio a propósito). Precisión tras correcciones: 9/9.

- **Errores encontrados y corregidos durante el piloto:**
  1. Lectura de `robots.txt`: una regla con comodín (`Disallow: *?lightbox=` de Stretto) se volvía regla vacía y bloqueaba todo. Corregido en `tools/scraper/lib/http.js` (`reglaARegex`: `*` = cualquier texto, `$` = fin). Verificado: portadas permitidas, `?lightbox=` y `/api/` de Truper siguen bloqueados.
  2. Pretul tomaba el logo de Truper → se excluye (`identidad.js`).
  3. Logos blancos invisibles → `logo.json` con `fondo` leído por el generador (`estado.logoFondo`) y aplicado en la página (clase `fondo-oscuro`).

### 10.2 Estado real de los catálogos oficiales (verificado el 26/09/2026, 8:15 p. m.)
Las 6 marcas escaneadas están **completas** y su auditoría del 5 % dio **100 %** en todas (detalle en 10.6 y 10.8):

| Marca | Capturadas / fichas del sitio | Fallas | Fotos | Auditoría 5 % |
|---|---|---|---|---|
| Corona | 3.293 / 3.315 | 22 (404 del propio sitio) | 2.577 | 166/166 |
| Stanley | 894 / 894 | 0 | 0 (el sitio no publica fotos) | 45/45 |
| Stretto | 421 / 425 | 4 | 417 | 22/22 |
| Pintuco | 368 / 368 | 0 | 368 | 19/19 |
| Gricol | 353 / 353 | 0 | 346 | 18/18 |
| Dewalt | 181 / 181 | 0 | 181 | 10/10 |
| **Total** | **5.510** | 26 | 3.889 | **280/280** |

- **Integración al inventario general: HECHA (26/09/2026).** `tools/generar_inventario.js` lee también los `Inventario_*.xlsx` de `pages/PROVEEDORES`. Cada catálogo entra como proveedor "<Marca> (oficial)" con la marca de la carpeta; **no cuenta en el ranking** (ranking, grupos y carpetas quedaron idénticos). Se descartan las fichas repetidas del mismo catálogo y, en Corona, las copias sin precio de productos que sí tienen precio. Resultado: +5.232 productos (Corona 3.050, Stanley 870, Stretto 420, Pintuco 366, Gricol 353, Dewalt 173); inventario total 71.023. Muestra del 5 % (262 productos, semilla 20260927) contra el Excel de origen: 262/262 (nombre, precio, foto local existente, marca). La primera muestra detectó y se corrigieron dos errores: marca con el número de carpeta ("02 - Corona") y copias sin precio de Corona.
- Logos: 11 de las 32 carpetas tienen logo (top 10 por presencia salvo Pretul, más Grival). Las otras 21 del top 30 solo tienen `pagina web.txt`.

### 10.3 Pedidos nuevos del usuario (26/09/2026), pendientes de plan y confirmación
1. **Grupo "Local":** buscar ferreterías similares a COMFER en **Tunja y el departamento de Boyacá**, como un grupo aparte ("Local"). Debe ofrecer el **precio promedio** y su **cercanía con los precios oficiales de las marcas** (comparar el precio de la ferretería contra el precio del sitio oficial o de los catálogos nacionales para el mismo producto).
   - Paso siguiente: reconocimiento (buscar ferreterías de Tunja/Boyacá con catálogo o precios publicados en línea; verificar cada una antes de prometerla, regla 2 de KRAKEN). Destino propuesto: `pages/ESTADISTICAS/LOCAL/<Ferreteria>/` con su Excel, para que entre al inventario con la marca `Local`.
   - Comparativo propuesto: por producto emparejado (misma marca + nombre/SKU similar): diferencia % = (precio local − precio oficial) ÷ precio oficial; resumen por ferretería y por marca.
2. **Etiqueta de origen en los materiales:** importado / nacional, y **dónde fabrica o tiene presencia** cada empresa (país de origen de la marca y presencia en Colombia).
   - Propuesta: tabla curada `tools/origen_marcas.js` (o Excel `pages/PROVEEDORES/Origen_marcas.xlsx`) con marca → país de origen, ¿fabrica en Colombia?, presencia; empezar por el top 10 por presencia y el top 30, verificando cada dato en el sitio oficial. Ejemplos a verificar: Corona, Grival, Gricol, Pintuco, Toxement (Colombia); Truper, Pretul, Urrea, Surtek (México); Dewalt, Stanley, Black+Decker (EE. UU., Stanley Black & Decker); Bosch (Alemania); Stretto (verificar: su correo de servicio es stretto.cl, posible origen Chile).
   - En la página: etiqueta en cada tarjeta de producto ("Nacional" / "Importado · México") y filtro por origen.

### 10.4 Cómo retomar en una sesión nueva
1. Leer este documento completo y `pages/PROVEEDORES/LEEME.md`.
2. Catálogos oficiales ya integrados (10.2). Siguientes líneas: logos faltantes del top 30, grupo Local, etiqueta de origen.
3. Para regenerar datos y página tras cualquier cambio: `node tools/generar_inventario.js` (inventario + marcas + ranking + estado de carpetas).
4. Pedidos nuevos (10.3): primero plan y reconocimiento, luego piloto 10 % con auditoría 5 %, siempre con confirmación del usuario antes de capturar.

### 10.5 Archivos de esta línea de trabajo
| Archivo | Qué hace |
|---|---|
| `tools/marcas_construccion.js` | Asigna marca (Excel → nombre → fabricante), lista `NO_MARCA_EN_NOMBRE`, ranking, carpetas y estado (logo, web, inventario, data.json, fotos, `logoFondo`) |
| `tools/generar_inventario.js` | Inventario general + llamada a marcas; escribe `assets/datos/inventario.js` (campo `ranking`) |
| `tools/scraper/lib/http.js` | Cliente cortés: robots.txt, 1 solicitud/s por sitio, reintentos |
| `tools/scraper/identidad.js` | Piloto N1: sitio oficial + logo de las 10 marcas por presencia |
| `tools/scraper/marcas/stretto.js` | Piloto N2: catálogo de Stretto (10 %) + auditoría 5 % |
| `tools/scraper/marcas/catalogos.js` | Piloto + catálogo completo de Gricol, Corona, Pintuco, Dewalt y Stanley (sección 10.8) |
| `tools/scraper/progreso.js` | Barra de progreso en texto del scraping |
| `index.js` (bloque Proveedores) / `index.css` | Pestaña Proveedores: top 10 por presencia, ranking A/B/C, directorio A–Z de 1.911 marcas, catálogo por marca, esqueleto |
| `pages/PROVEEDORES/verificacion/Piloto_scraping_10.xlsx` | Registro del piloto (hojas Identidad, Stretto, Gricol, Pintuco, Dewalt, Stanley, Corona) |

### 10.6 Piloto N2 de Stretto — EJECUTADO (26/09/2026)
Comando: `PAUSA_MS=2000 node tools/scraper/marcas/stretto.js` (captura) y `--solo-auditoria` (auditoría sobre lo capturado, sin volver a descargar).

| Indicador | Valor |
|---|---|
| Fichas en el mapa del sitio | 425 |
| Muestra del piloto (10 %, semilla 20260926) | 43 |
| Capturadas | 42 (1 falla: 429 del sitio) |
| Auditadas (5 % del catálogo) | 22 |
| Correctas (nombre + precio + imagen) | **22 / 22 (100 %)** |
| Cota honesta del error con n = 22 y 0 errores | ≤ 13,6 % (regla del 3, 95 %) — la fórmula `z·√(p(1−p)/n)` da 0 cuando p = 1 |

Salidas: `pages/PROVEEDORES/Grupo C/22 - Stretto/data.json`, `Inventario_stretto.xlsx`, `img/` (fotos); verificación en `pages/PROVEEDORES/verificacion/Piloto_scraping_10.xlsx` (hoja Stretto) y `Auditoria_scraping_5.xlsx` (hoja Stretto).

**Lo que el piloto descubrió y se corrigió (para eso es el piloto):**
1. *Método de auditoría:* `og:title` es un título para buscadores redactado distinto al nombre del producto → la auditoría usa el título visible `<h1 data-hook="product-title">`. Los productos con variantes muestran "Desde $…" → se lee también `formattedPrice`.
2. *Error real de captura:* los nombres traían entidades HTML (`8&quot;` en vez de `8"`) porque el sitio las escribe dentro del JSON-LD → se decodifican en `leerFicha`.
3. *Límite del sitio:* tras 3 pasadas seguidas (~300 fichas de ~2 MB) el sitio respondió **429 Too Many Requests** → `tools/scraper/lib/http.js` ahora espera lo que indique `Retry-After` (o 30 s) y reintenta; para Stretto se usa `PAUSA_MS=2000`.

**Siguiente paso (requiere confirmación):** catálogo completo de Stretto (`PAUSA_MS=2000 node tools/scraper/marcas/stretto.js --todo`): ~425 fichas × ~2 MB ≈ 0,9 GB, unos 15–20 minutos, y después integrar `Inventario_*.xlsx` de `pages/PROVEEDORES` al inventario general.

### 10.7 Otros cambios de la sesión (26/09/2026)
- Fotos huérfanas de Stretto retiradas (13 de la primera pasada con `&quot;` en el nombre); quedan 42 fotos para 42 productos.
- Reloj y calendario bajo el logo (ver `docs/INVENTARIO_REPOSITORIO.md`, sección "Reloj y calendario").

### 10.8 Escaneo de catálogos oficiales — sesión de 3 horas (26/09/2026, desde las 3:40 p. m.)
Autorizado por el usuario: escanear sin detenerse durante 3 horas. Cada marca sigue el protocolo automáticamente: piloto 10 % → auditoría 5 % por método independiente → 100 % solo si precisión ≥ 95 %.

**Reconocimiento (robots.txt + mapa del sitio, sin capturar):**

| Marca | Fichas | Plataforma / fuente | Precio | Resultado |
|---|---|---|---|---|
| Stretto | 425 | Wix, JSON-LD | Sí (COP) | Completo: 421 capturadas, 4 fallas; auditoría final 22/22 |
| Gricol | 353 | Shopify, API pública `products.json` | Sí (COP) | Completo: 353/353; auditoría 18/18 |
| Dewalt | 181 | JSON-LD | No publica | Completo: 181/181, 181 fotos; auditoría final 10/10 |
| Pintuco | 368 | WordPress (Yoast) | No publica | Completo: 368/368, 368 fotos; auditoría final 19/19 |
| Stanley | 894 | Drupal, sin JSON-LD (marcado de la ficha) | No publica | Completo: 894/894 (sin fotos: el sitio no las publica); auditoría final 45/45 |
| Corona | 3.315 | SAP Commerce, JSON-LD; **descarga con curl** (Node falla con ese sitio) | Sí (COP), por caja y por m² | Completo: 3.293/3.315 (22 fallas = 404 del sitio), 2.577 fotos; piloto 4 aprobado 166/166 tras corregir reglas (hallazgos 9–11) |
| Truper / Pretul | — | Cloudflare | — | Descartado: requiere navegador real |
| Grival | — | WordPress solo con blog | — | Sin catálogo (sus productos están en Corona) |
| Toxement | — | Sin robots.txt ni mapa del sitio | — | Pendiente: requiere rastreo por enlaces |
| Resto del top 30 | — | — | — | Sin URL oficial registrada todavía |

**Comandos:**
- `node tools/scraper/marcas/catalogos.js gricol corona pintuco dewalt stanley` — todas en paralelo (1 solicitud/s por sitio). Retoma desde `data.json` si se interrumpe (no repite fichas). Una marca con piloto no aprobado repite solo la auditoría al volver a correrla.
- `node tools/scraper/marcas/catalogos.js dewalt --reparar-fotos` — vuelve a leer solo las fichas sin foto.
- `node tools/scraper/progreso.js` — barra de progreso en texto de todas las marcas (no hace solicitudes).
- Salidas por marca: `data.json`, `Inventario_<marca>.xlsx`, `img/`; hojas por marca en `verificacion/Piloto_scraping_10.xlsx` y `Auditoria_scraping_5.xlsx`.

**Hallazgos y correcciones (todos del método de auditoría o de fotos; los datos capturados eran correctos):**
1. Stretto, auditoría final 19/22 → 22/22: productos con descuento (el precio de venta es `discountedPrice`; el visible `formattedPrice` es el anterior al descuento) y precios con decimales que el sitio muestra redondeados.
2. Gricol, piloto 0/18 → 18/18: comparación de fotos por nombre de archivo (el CDN de Shopify cambia la ruta); precio de productos con variantes leído de `og:price:amount` (el JSON-LD es un `ProductGroup` sin `offers`); productos sin foto muestran el logo como `og:image`.
3. Dewalt, piloto 5/10 → 10/10: "DEWALT ®" en el `<h1>` (espacio antes de ®) y fotos de kits cuyo nombre no lleva el código.
4. Dewalt, fotos: la imagen del JSON-LD (`.jpg`) responde 404; la ficha muestra la misma foto como `_1280.webp` → corregido con `--reparar-fotos` (181/181 fotos). La auditoría compara el nombre base de la foto sin el sufijo de tamaño (`DWE4557_1.jpg` = `DWE4557_1_1280.webp`).
5. Stanley: el sitio de Colombia no publica fotos de producto (muestra la imagen genérica "fallback"); se capturan nombre, código y categoría sin foto.
6. Corona: 58 de 331 productos del piloto no tienen foto en el sitio.
7. Nombres de foto únicos (dos productos con el mismo nombre chocaban al descargar en paralelo) y una foto fallida ya no detiene el proceso.
8. **La unidad F: se desconectó a las 3:59 p. m.** y detuvo el proceso; al reconectar se retomó sin pérdida. El proceso principal se lanza en un ciclo que espera a la unidad y reintenta (hasta 30 veces).

9. Corona, piloto 1 en 64,5 %: en revestimientos el precio del JSON-LD es **por caja** y la ficha muestra en grande el precio **por m²** (Piso Prato 60x60: $ 82.800 la caja de 1,8 m² = $ 46.000 el m²). La captura era correcta pero incompleta → ahora se guardan ambos (`PRECIO` por caja y `PRECIO POR UNIDAD DE MEDIDA` + `UNIDAD DE MEDIDA`) y la auditoría compara el precio visible con el de m² cuando existe. Además: productos sin foto en la captura ni en la ficha cuentan como coincidentes, y el código de la foto se compara sin distinguir mayúsculas (`pp1403` = `PP1403`). El piloto 1 quedó en `data_piloto_v1.json`.
10. Corona, piloto 2 (semilla 20260927) en 88,0 % (146/166): (a) en productos por unidad (cemento, pintura, selladores) el sitio también publica un precio por ml/kg, que no es el visible; (b) **productos con descuento**: el JSON-LD trae el precio de lista y la ficha muestra el rebajado (`discountedPrice`) — este sí era un error de captura. Reglas finales: `PRECIO` = precio de venta con descuento (`PRECIO DE LISTA` aparte si difiere); precio por m² solo si el producto se vende por área (`areaCovered` numérico = m² por caja; `"areaUnit":"M2"` aparece en todas las fichas y no sirve). Verificado en los 7 casos que fallaban. Piloto 2 en `data_piloto_v2.json`; piloto 3 con semilla 20260928.
11. Corona, piloto 3 en 94,6 % (157/166) — **error real de captura detectado**: cuando el producto no tiene descuento (`"discountedPrice":"$undefined"`), la búsqueda en toda la página tomaba el descuento de un producto recomendado (Lavamanos Citrino: $ 204.210 capturado vs $ 612.900 real; Portarrollos Draa, griferías Tanta y Draa). Corrección: los precios se leen solo del bloque del producto principal (el que tiene `price` igual al del JSON-LD). Además, "vendido por m²" se detecta con `"conversionPriceIndicator":true` (Piso Soria lo tiene con `areaCovered` vacío). Verificado en 15 casos. Piloto 3 en `data_piloto_v3.json`; piloto 4 con semilla 20260929: **166/166 (100 %) — aprobado** a las 5:25 p. m.; el catálogo completo (3.315 fichas) sigue en el mismo proceso.
12. Corona, fallas del catálogo completo: son fichas del mapa del sitio que responden **404** y cuyo código lleva tildes o espacios (`Dispensador-de-Jab%C3%B3n-Koral`, `base%20decorada-milano`, esmaltes "Metal Master"). Probadas con otras codificaciones: siguen en 404 → enlaces rotos del propio sitio, no error del scraper.

**Estado:** Corona y Stanley terminados e integración al inventario hecha (ver 10.2).


### 10.9 Megacatálogo de ferreterías: grupos Boyacá y Bogotá (26–27/09/2026)
**Pedido del usuario:** grupo "Ferreterias Boyaca" (COMFER, que es de Tunja, y las 4 ferreterías de Boyacá con el catálogo web más completo), grupo con las 5 ferreterías de Bogotá con la página más completa, e inclusión de todo en el inventario. Autorizado para correr en segundo plano sin detenerse.

**Objeto de grupos:** `tools/grupos_ferreterias.js` (tiendas, ciudad, sitio, plataforma, productos en la web, adaptador y descartadas con motivo). Lo usan el scraper y `generar_inventario.js` (cada archivo del inventario lleva su `grupo`).

**Reconocimiento (verificado sitio por sitio):**

| Grupo | Tienda | Ciudad | Plataforma | Productos en la web | Estado |
|---|---|---|---|---|---|
| Boyacá | COMFER | Tunja | — | (ya en el inventario) | Referencia del grupo |
| Boyacá | Soelco | Tunja | WooCommerce | 16.363 con precio | Ya en el inventario (15.659, captura anterior) |
| Boyacá | G&J | Tunja | Magento | 58 | Ya en el inventario (53) |
| Boyacá | Grupo Ferropaz | Tunja | WooCommerce | 14 | Se captura |
| Boyacá | Ferropaz | Tunja | PrestaShop 1.6 | 8 | Se captura |
| Boyacá (adicional) | Ferremundo la 17 | Tunja | WooCommerce | 4 sin precio | Capturado |
| Bogotá | Easy | Bogotá | VTEX | 33.348 | Se captura (búsqueda por ruta de categoría; robots prohíbe `?fq=`) |
| Bogotá | Ferricentro | Bogotá | Magento GraphQL | 22.982 | Se captura |
| Bogotá | Ferreco | Bogotá | PrestaShop (mapa del sitio) | ≈ 4.700 | Se captura |
| Bogotá | Luis Penagos | Bogotá (Paloquemao) | WooCommerce, API cerrada (mapa del sitio) | 4.063 | Se captura |
| Bogotá | Rhino | Bogotá (Paloquemao) | WooCommerce | 3.589 | Se captura |

Descartadas: Distrifer (dominio no resuelve), SETMI (404), Almacenes Boyacá (es de Ecuador), Ferresmart (nacional), Ferragro (Itagüí), Ferretería Colombia (Manizales), Ferrecentro (Dosquebradas), Paloquemao Online / Invercrisan / GYG (catálogos pequeños), Grupo Makro Tunja (sin tienda). **Wesco** (pedida por el usuario): su `robots.txt` prohíbe todo rastreo (`User-agent: *` / `Disallow: /`) → no se captura sin autorización del sitio.

**Scraper:** `node tools/scraper/ferreterias/catalogo_tiendas.js [tiendas] [--solo-piloto]`. Por tienda: piloto 10 % (semilla 20260927) → auditoría del 5 % del catálogo contra la ficha publicada → 100 % solo si precisión ≥ 95 %. Adaptadores: `woo`, `vtex`, `magento`, `mapa`/`prestashop`. Salidas: `pages/ESTADISTICAS/FERRETERIAS BOYACA|FERRETERIAS BOGOTA/<Tienda>/inventario_<tienda>.xlsx` + `data.json` (fotos como URL remota); verificación en `pages/PROVEEDORES/verificacion/Ferreterias_piloto_auditoria.xlsx`.

**Hallazgos del piloto:**
1. Easy: el `robots.txt` prohíbe `?fq=` → se usa la búsqueda por ruta de categoría (permitida).
2. Ferropaz: fichas sin JSON-LD → lectura por microdatos (`h1 itemprop=name`, `itemprop=price`).
3. Grupo Ferropaz: **el precio del JSON-LD no siempre es el visible** (cemento Alion: 28.000 estructurado, 27.500 visible) → se captura el precio visible y la auditoría lo contrasta con los precios estructurados (canal distinto).

**Integración:** al terminar, `node tools/generar_inventario.js` (el proveedor es la subcarpeta de la tienda dentro de la carpeta del grupo) y `node tools/probar_pagina.js`.

**Estado (27/09/2026, 11:33 p. m.):**
- Boyacá: Ferropaz 8, Grupo Ferropaz 14 y Ferremundo la 17 (4 productos) capturados, revisados e integrados al inventario (71.049 productos; prueba de la página correcta).
- Bogotá: corre como proceso independiente de Windows (sigue aunque se cierre VS Code; se detiene si el equipo se apaga o suspende). Registro: `pages/ESTADISTICAS/FERRETERIAS BOGOTA/registro_scraping.log`.
- 4.º hallazgo: el GraphQL de Ferricentro responde por defecto con la tienda de Sumatec (22.982 productos); con la cabecera `Store: ferricentro` salen los 7.068 reales (`vistaMagento` en el objeto de grupos).
- Si se interrumpe: volver a correr solo las tiendas sin `inventario_*.xlsx` en su carpeta, p. ej. `node tools/scraper/ferreterias/catalogo_tiendas.js Easy Ferreco`. Al terminar: `node tools/generar_inventario.js` y `node tools/probar_pagina.js`.

### 10.10 Plan de ejecución desatendida: catálogo del dueño de cada marca del top 30 (27/09/2026)
**Pedido:** además de las ferreterías, capturar la totalidad de productos en el sitio oficial de cada marca del top 30 (y top por presencia), con marca y URL (página) de cada producto.

**Clasificación de las 33 marcas (reconocimiento verificado sitio por sitio):**

| Situación | Marcas | Acción |
|---|---|---|
| Ya capturadas (catálogo completo, auditoría 100 %) | Corona, Dewalt, Stanley, Gricol, Stretto, Pintuco | Integradas como "<Marca> (oficial)" |
| **Fase 1 — corriendo** (ruta verificada) | Bosch (1.075, mapa del sitio + JSON-LD), Keltec Technolab (5.409, Shopify), Hikvision (3.542, hikvisioncolombia.com), Uyustools (303) | \`node tools/scraper/ferreterias/catalogo_tiendas.js --marcas\` |
| Fase 2 — requiere adaptador a la medida | Makita (Drupal, sin JSON-LD, 58.000 nodos), Toolcraft, Irwin, Toxement (sin mapa del sitio: rastreo por enlaces), Diablo (mapa vacío), Argos (sin mapa de productos), Hikvision global (hikvision.com/es-co) | Reconocimiento de la ficha y adaptador por sitio |
| Bloqueadas por protección anti-bots | Truper, Pretul (Cloudflare); Urrea, Surtek, Foy — Grupo Urrea (Incapsula) | Solo con navegador real: **decisión del usuario** |
| Sin sitio propio con catálogo (marca propia/importada de Homecenter) | Fixser, Bauker, Ubermann, Halux, Discover, Ranger, Superior, Vulcan, Mp Tools, Inkorporar, Ccol | Catálogo completo = Homecenter (ya en el inventario) |
| Sin catálogo | Grival (sus productos están en Corona) | — |

\`pagina web.txt\` de cada carpeta quedó con el sitio oficial o el motivo (esto además evita que el generador mueva la carpeta).

**Marca y página de cada producto:** todas las salidas guardan \`URL\` (página del producto) y \`MARCA\`: Easy (VTEX \`brand\`), Rhino (\`brands\`), Ferricentro (\`attr_marca\` de GraphQL, se repitió la captura para incluirla), fichas por mapa (JSON-LD \`brand\` o tabla "Marca"), WooCommerce (\`brands\` o atributo "Marca"). Donde la tienda no publica marca, \`generar_inventario.js\` la deduce del nombre (diccionario de marcas).

**Procesos independientes de Windows (siguen aunque se cierre VS Code; se detienen si el equipo se apaga o suspende):**
1. Bogotá: Easy, Ferreco, Luis Penagos (Ferricentro 7.068 y Rhino 3.589 ya completos, auditoría 100 %) → \`pages/ESTADISTICAS/FERRETERIAS BOGOTA/registro_scraping.log\`
2. Ferricentro + Boyacá con marca → \`pages/ESTADISTICAS/FERRETERIAS BOGOTA/registro_marcas_ferricentro.log\`
3. Marcas fase 1 → \`pages/PROVEEDORES/verificacion/registro_scraping_marcas.log\`
4. Vigilante \`tools/scraper/ferreterias/integrar_al_terminar.js\`: cuando las 3 terminan, corre \`generar_inventario.js\` y \`probar_pagina.js\` → \`pages/PROVEEDORES/verificacion/registro_integracion.log\`

**Si se interrumpe:** volver a correr solo lo que no tenga Excel (\`catalogo_tiendas.js <tiendas>\` o \`--marcas\`) y luego \`node tools/generar_inventario.js\` + \`node tools/probar_pagina.js\`.

### 10.11 Sesión autónoma del 27/09/2026 (madrugada): navegador real, casas prefabricadas y clasificación
**Autorización del usuario:** usar cualquier recurso técnico necesario (navegador real para sitios con protección anti-bots) y trabajar sin pausa hasta terminar todas las marcas.

**Clasificación nueva en el inventario — "Tipo de proveedor"** (filtro en Materiales y Herramientas, barra lateral y selector):
- *Empresas de ferretería*: tiendas multimarca (COMFER, Homecenter, Soelco, BAEZO, G&J, Pinturas y Yesos, grupos Boyacá y Bogotá).
- *Proveedores de productos*: fabricantes o dueños de marca (Corona, ALFA, PAVCO, Santafé, Ipecol, Solimpro, todos los catálogos "(oficial)" y las casas prefabricadas).
- Definido en \`tools/grupos_ferreterias.js\` (\`TIPOS\`, \`tipoDeProveedor\`); el generador escribe \`tipos\` y \`tipoProveedor\` en \`inventario.js\`.

**Marcas con navegador real (puppeteer-core + Chrome, consultas hechas desde la página):**
| Marca | Script | Resultado |
|---|---|---|
| Grupo Urrea Colombia (Urrea, Surtek, Lock…) | \`tools/scraper/marcas/urrea_navegador.js\` (GraphQL, vista \`urrea_co\`, precios COP) | **6.918 productos** (Urrea 4.607, Surtek 2.311); auditoría 346/346. Foy no está en el catálogo de Colombia |
| Grupo Truper (Truper, Pretul, Truper Expert, Volteck, Foset, Fiero, Hermex, Klintek) | \`tools/scraper/marcas/truper_navegador.js\` (módulos página×100+n → códigos → ficha técnica; auditoría con el buscador /xearch) | ~15.000 códigos en 693 páginas; el sitio limita el ritmo → 2,5 s por solicitud y esperas de 60 s; retoma desde \`data.json\`. Sin precio (el catálogo publica pesos mexicanos en imágenes) |

**Marcas fase 2 (sin navegador):** Makita (sitio oficial de México, WooCommerce, 1.508; makita.com.co no publica fichas), Diablo (API \`/api/v1/products/<SKU>\`, 1.688, USD × TRM, país de origen), Toxement (rastreo del portafolio, fichas \`?prodId=\`), Argos (colombia.argos.co, fichas del mapa de páginas), Bosch ampliado con **variantes** (accesorios con ItemList), Keltec (USD × TRM, auditoría con \`<producto>.js\`). Sin catálogo propio: Toolcraft (sitio institucional), Irwin (Colombia y México solo páginas de presentación).

**Casas prefabricadas** (grupo nuevo "Casas prefabricadas", familia nueva en Materiales): \`tools/scraper/prefabricadas/casas_prefabricadas.js\` → \`pages/ESTADISTICAS/CASAS PREFABRICADAS/<Empresa>/\`. 10 empresas investigadas; solo 3 publican precio por modelo:
| Empresa | Modelos | Con precio | Auditoría (precio visible en la página) |
|---|---|---|---|
| Concasaya (Bogotá/Cundinamarca/Boyacá) | 5 | 5 | 5/5 |
| Woodpecker (Bogotá) | 26 (15 casas kit; placa y palafitos) | 26 | 26/26 |
| Modular Colombia | 82 (44 ofertas; obra gris publicada, obra blanca y full = área × tarifa publicada) | 57 | 57/57 |
| Custom Home Colombia | 30 | 0 (cotización) | — |
| Casas Prefabricadas Colombia | 18 | 0 | — |
| Prefabricadas DYM | 8 proyectos | 0 (rangos) | — |
| Vivienda Prefabricada LTDA, Casas Prefabricadas MOD, ABCasalista, Colcasas | — | solo rangos o cotización (anotados en el objeto de grupos) | — |
Verificación cruzada: los precios de Concasaya, Woodpecker y Modular coinciden con una lectura independiente (herramienta de lectura web).

**Corrección en \`tools/marcas_construccion.js\`:** las carpetas \`Pnn - Marca\` (Presencia) no se reconocían como existentes (el patrón solo quitaba \`NN - \`) y el generador creaba duplicados vacíos (P05 - Pintuco, P06 - Toxement, ya retirados). Ahora se reconoce \`P?NN - \` y, si hay dos carpetas de una marca, gana la que tiene contenido.

**Registros de esta sesión** (\`pages/PROVEEDORES/verificacion/\`): \`registro_truper.log\`, \`registro_urrea.log\`, \`registro_scraping_marcas.log\` (Bosch, Keltec), \`registro_marcas_fase2.log\` (Makita, Diablo, Toxement), \`registro_marcas_argos.log\`; Bogotá en \`pages/ESTADISTICAS/FERRETERIAS BOGOTA/registro_scraping.log\`. Hojas de auditoría: \`Ferreterias_piloto_auditoria.xlsx\` (una por tienda o marca) y \`Casas_prefabricadas_auditoria.xlsx\`.

**Para retomar si algo se corta:** cada script retoma o se puede volver a correr solo para lo que no tenga Excel: \`node tools/scraper/marcas/truper_navegador.js\` (retoma desde data.json), \`node tools/scraper/ferreterias/catalogo_tiendas.js <tiendas>\` o \`--marcas <marcas>\`; al final \`node tools/generar_inventario.js\` y \`node tools/probar_pagina.js\`.

### 10.12 Resultados (27/09/2026, 1:45 a. m.) — inventario integrado: 144.325 productos
| Grupo | Fuente | Productos | Auditoría 5 % |
|---|---|---|---|
| Ferreterías Bogotá | Easy | 32.186 | 1.614/1.668 (96,8 %) — dirección sin tildes + reintentos por páginas vacías del servidor |
| | Ferricentro | 7.068 (con marca, `attr_marca`) | 354/354 |
| | Ferreco | 4.629 | 238/238 |
| | Luis Penagos | 4.062 | 204/204 |
| | Rhino | 3.589 | 180/180 |
| Ferreterías Boyacá | Ferropaz 8, Grupo Ferropaz 14, Ferremundo 4 (+ COMFER, Soelco, G&J ya existentes) | | 100 % |
| Marcas oficiales | Urrea 4.607 + Surtek 2.311 (COP) | 6.918 | 346/346 |
| | Keltec Technolab (USD × TRM) | 5.409 | 271/271 |
| | Hikvision | 3.542 | 178/178 |
| | Bosch (con variantes de accesorios) | 2.758 | 54/54 |
| | Diablo (USD × TRM, país de origen) | 1.687 | 85/85 (buscador `query=` + título de la ficha) |
| | Makita (sitio oficial México) | 1.508 | 76/76 |
| | Uyustools | 303 | 16/16 |
| | Toxement | 134 | 7/7 (parámetro `productname`) |
| | Argos | 54 | 3/3 |
| Casas prefabricadas | 6 empresas con catálogo | 169 | 88/88 precios |
| | **Grupo Truper** (navegador real) | 10.981 (Pretul 830) | terminado 27/09/2026 11:41 a. m.; 4.212 fichas sin leer de 15.193 códigos; integrado |

Totales del inventario: 114.410 de empresas de ferretería y 29.915 de proveedores de productos; 132.680 con precio; 78.534 con enlace a la página del producto ("Ver en la tienda" en cada tarjeta). `inventario.js` pesa 26,6 MB (carga diferida).
Al terminar Truper: `node tools/generar_inventario.js` y `node tools/probar_pagina.js`.
- **Foy (27/09/2026, 2:47 a. m.):** no está en el catálogo de Urrea Colombia; se tomó del catálogo oficial de Urrea México con navegador (\`TIENDA=urrea_mx BASE=https://urrea.com SOLO_MARCA=Foy node tools/scraper/marcas/urrea_navegador.js\`), marca leída del atributo \`marca\`. **462 productos**; precio en MXN anotado en la descripción (campo PRECIO vacío para no mezclar monedas). Inventario: 144.783 productos. Solo falta Truper.
- **Truper (27/09/2026, 11:41 a. m.):** catálogo completo terminado: 10.981 productos (Pretul 830); 4.212 de 15.193 fichas no se pudieron leer (límites del sitio). Integrado con `node tools/generar_inventario.js`: **inventario total 155.758 productos**, 2.839 marcas, 45 empresas. Prueba de rutas: todo correcto. Con esto quedan capturadas todas las marcas del plan.
