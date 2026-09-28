# Plan: Herramientas de alquiler (27/09/2026)

Pedido del usuario: nueva opción en **Catálogo → "Herramientas de alquiler"**, con la investigación en internet de empresas que alquilan herramientas y equipos de construcción, **escaneando 10 empresas o páginas web**. Relacionado: en el presupuesto, los equipos que se alquilan van por tiempo de uso (retroexcavadora: $130.000/hora, ya aplicado).

Protocolo: plan → confirmación → piloto 10 % con auditoría 5 % → 100 % si precisión ≥ 95 %.

## 1. Reconocimiento (hecho hoy; robots.txt permite en todas)
| # | Empresa | Ciudad | Sitio | Qué publica | Método |
|---|---|---|---|---|---|
| 1 | **Homecenter – Alquiler de herramientas** | Nacional (42 tiendas) | homecenter.com.co (categoría cat2540003) | ~250 herramientas con **precio de alquiler por día** (178 precios en la página) | Página de categoría (mismo sitio ya capturado en el inventario) |
| 2 | **Renty Herramientas** | Bogotá | rentyherramientas.com | **89 equipos con precio** (p. ej. martillo demoledor $150.000, hidrolavadora $80.000) | API pública WooCommerce |
| 3 | **Consicon** | Bogotá | consicon.com | 59 productos (formaletas, armado estructural, andamios) con precio; mezcla alquiler y venta | API pública WooCommerce (solo categorías de alquiler) |
| 4 | **Dimacro** | Bogotá | dimacro.com.co | 187 productos (maquinaria nueva/usada); sección de alquiler | API WooCommerce (filtrar alquiler) |
| 5 | **Ferretería Donda** | Medellín | ferreteriadonda.com | Tabla de alquiler con **precio por día** (≈15: taladro percutor $10.000/día, rotomartillo, pulidora…) | Lectura de la página de servicio |
| 6 | **ESCO** | Bogotá | esco.com.co | **Lista de precios de alquiler en PDF** (equipos de pisos industriales y construcción) | Lectura del PDF |
| 7 | **Proconstructores** | Bogotá | proconstructores.com.co | Catálogo de maquinaria (compactadoras, trompos) **sin precio** (cotización) | Lectura de la página |
| 8 | **Arrendaequipos** | Medellín | arrendaequipos.com | Catálogo de equipos (47 años) **sin precio** | Lectura de la página (VTEX, sin API pública de catálogo) |
| 9 | **ALNASAN S.A.S** | **Tunja** | alnasan.com.co | Maquinaria liviana (ranas, canguros, mezcladoras, cortadora de ladrillo, plumas, andamios, demoledores) **sin precio** | Lectura de la página |
| 10 | **Equipos Azul y Blanco** | **Tunja** | ficha en misamarillas.com.co | Formaletas, parales, cerchas, mezcladoras, vibrocompactador, containers **sin precio** + teléfono | Lectura de la ficha |
| (reserva) | Construimos Tunja | Tunja | ficha en misamarillas.com.co | Camillas, parales, cerchas, mezcladora, vibro, rana, andamios, formaletas, sin precio | Lectura de la ficha |
| (descartada) | Homs Rentals | España | homsrentals.com | Precios en euros de otro país | — |

Resultado esperado: **~400 equipos con precio de alquiler** (Homecenter, Renty, Consicon, Dimacro, Donda, ESCO) y **fichas de empresa sin precio** (con equipos y contacto) para Proconstructores, Arrendaequipos, ALNASAN y Equipos Azul y Blanco.

## 2. Datos de cada equipo
Nombre, empresa, ciudad, **precio de alquiler**, **unidad de tiempo** (día, hora, semana, mes; la que publique la empresa), categoría (demolición, compactación, mezcla, andamios y formaletas, corte, generación, limpieza, elevación…), foto y enlace. Salida: `pages/ESTADISTICAS/ALQUILER/<Empresa>/alquiler_<empresa>.xlsx` → `assets/datos/alquiler.js`.

## 3. En la página
- **Catálogo → Herramientas de alquiler** (`#alquiler`): sin filtros, la estructura por categoría de equipo (como Materiales); con filtros, las cards con precio por día/hora.
- Sidebar izquierdo: categorías y empresas (Tunja, Bogotá, Medellín, nacional). Sidebar derecho: estadísticas (equipos, rango de precio por día, precio mediano por categoría).
- **Presupuesto:** los equipos de alquiler del modelo (retroexcavadora, mezcladora, vibrador…) podrán elegir tarifa del catálogo de alquiler, con la cantidad en horas/días.

## 4. Pendiente de confirmación
- Arrancar el piloto (10 %) con auditoría (5 %) en las 6 empresas con precio y leer las 4 fichas sin precio.

## 5. Resultado (27/09/2026, 10:57 p. m.)
- `node tools/scraper/alquiler/alquiler.js` → **10 empresas, 350 equipos (281 con precio)**; auditoría 5 % (mínimo 3) aprobada en todas.
  - Renty Herramientas 89 (88 con precio por día) · Ferretería Donda 12 (precio por día + depósito) · ESCO 181 (lista 2019 legible, antes de IVA, referencia) · Consicon 43 · Proconstructores 12 · Equipos Azul y Blanco 7 · ALNASAN 4 · Arrendaequipos 2 (por cotización) · Homecenter y Dimacro sin listado de precios en línea (ficha de empresa).
  - Homecenter: sus fichas de alquiler no traen precio en línea (se reserva en tienda). ESCO 2022/2025: PDF con fuentes codificadas (ilegibles).
- **Valores estimados** para los equipos pedidos por el usuario (`pages/ESTADISTICAS/Alquiler de herramientas/herramientas.docx`: formaletas, testeros, camillas, mezcladora, apisonador, andamios) tomados de las páginas y de resultados de buscador, con su fuente. Testero: sin valor de alquiler publicado.
- Salidas: `assets/datos/alquiler.js`, `pages/ALQUILER/<empresa>/alquiler.json`, informe `pages/ALQUILER/informe_piloto_auditoria.json` y Excel **`pages/ESTADISTICAS/Alquiler de herramientas/alquiler_herramientas.xlsx`** (hojas Equipos, Empresas, Valores estimados). `generar_inventario.js` no lee esa carpeta (no se mezcla con el inventario de venta).
- **Ampliación en segundo plano (27/09/2026, 11:16 p. m.)**: 20 empresas más (método `auto`) → **30 empresas, 677 equipos (301 con precio)** tras la depuración.
  - Con equipos: CentralQuipos 82, Equinorte 96, García Vega 55, Ranas y Canguros 46, Akirento 27 (con precio por día), Distriandamios 20, Beca Andamios 5. Estas empresas publican el catálogo pero cotizan el precio, salvo Akirento.
  - Sin listado legible (quedan como ficha de empresa): TuMaquinaYa (solo texto de preguntas frecuentes), Ingeniería y Alquiler, ACG, AFB, GCM, AFEC, Conalquipo, Piraján, Formavillas, Gaviequipos, Andamios Colora, Maquiequipos Rionegro, Destapes y Plomería.
  - Depuración (`depurar()` en alquiler.js, solo para capturas `auto`): decodifica entidades HTML, descarta fragmentos de texto, preguntas frecuentes, artículos de venta/usados y de recreación (Akirento alquila también juegos y máquinas de eventos: 48 descartados).
  - `node tools/scraper/alquiler/alquiler.js --desde-json` reprocesa la última captura guardada sin descargar de nuevo.
- Página: Catálogo → **Herramientas de alquiler** (`#proveedores/alquiler`): valores estimados, estructura por categoría, empresas; `/c-N` categoría y `/e-N` empresa. Sidebar izquierdo: categorías y empresas por ciudad; derecho: equipos, con precio, rango de precio por día.
