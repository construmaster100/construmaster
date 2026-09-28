# Revisión superficial del modelo ALC 1.0 (28/09/2026)

Pedido del usuario: revisar o corregir el modelo de vivienda por reglas (ALC, `respaldos/2026-09-27/ALC.docx`) con estándares y con información de internet, de forma superficial. El código está en `index.js` (`motorVivienda`, `renderViviendaReglas`).

## 1. Correcciones aplicadas

| # | Tema | Antes | Ahora | Referencia |
|---|---|---|---|---|
| 1 | **Muros compartidos** | Cada espacio sumaba su perímetro completo, así que cada muro interior se contaba dos veces en los bloques | Longitud de muro = (suma de perímetros + perímetro exterior) / 2. El pañete, el estuco y la pintura siguen por cara de cada espacio | Geometría: un muro interior sirve a dos espacios |
| 2 | **Bloques por m²** | 14 | **15,5** (bloque No 5 de arcilla, 12 × 20 × 30 cm, con junta de 1 cm), editable | Homecenter / Ceranova: "Bloque N5 12x20x30 · 15,5 u/m²". El 12,5 u/m² que se cita es del bloque de concreto de 40 cm |
| 3 | **Desperdicio** | No había | 5 % (editable) en bloques, pisos y enchape de baños | Práctica usual: 5 % por cortes y roturas |
| 4 | **Fachada** | No había | Pañete y pintura de fachada = perímetro exterior × altura − ventanas − puerta principal | Faltaba la cara exterior de los muros de fachada |
| 5 | **Cubierta (R004)** | Área total construida | **Huella** (área por piso) × factor de pendiente y aleros (**1,15**, editable). Con 1 piso, la huella es el área total | La cubierta cubre la planta del último piso. El área inclinada es mayor que la planta: 1/cos(pendiente), más los aleros |
| 6 | **Tomas** | 1 por espacio (3 en la cocina) | 1 por cada 3,6 m de perímetro (mínimo 1; cocina 3; ropas 1) | NTC 2050, 210-52: ningún punto del muro a más de 1,8 m de una toma |
| 7 | **Baño** | Toma común | **Toma GFCI** junto al lavamanos | NTC 2050, 210-8 y 210-52 |
| 8 | **Baño sin ventana** | Sin aviso | Aviso y **extractor** (ventilación mecánica) | Los baños requieren ventilación natural o mecánica |
| 9 | **Puesta a tierra** | No había | Varilla de cobre en el capítulo 4 | RETIE: toda instalación lleva sistema de puesta a tierra |
| 10 | **Cajas eléctricas** | Tomas + interruptores + luminarias | Se suman también las tomas GFCI y los extractores | Una caja por salida |

## 2. Verificado sin cambios

- **Concreto:** 7 bultos de cemento, 0,56 m³ de arena y 0,84 m³ de gravilla por m³ (mezcla 1:2:3, unos 3.000 psi). Coincide con Argos y con las tablas de dosificación.
- **Drywall:** lámina de 1,22 × 2,44 m = 2,98 m².
- **Baño mínimo de 2,5 m²** (1,15 × 2,30 m). Es razonable: en VIS el baño promedio es de unos 3 m² (MinVivienda).
- **Placa de contrapiso** de 0,10 m: dentro del rango usual (0,08 a 0,10 m).

## 3. Observaciones sin aplicar (para decidir)

1. **Estructura (NSR-10, Título E, casas de uno y dos pisos).** El motor no genera cimentación, vigas de amarre ni columnetas: sigue usando las del Excel V1 en el capítulo 2. Título E pide, entre otras cosas, vigas de cimentación a 0,50 m o más bajo el piso terminado, columnetas de al menos 200 cm² y vigas de amarre. Se podrían calcular a partir de la longitud de muro.
2. **Placa de entrepiso.** Con 2 pisos haría falta una placa de entrepiso de área por piso × (pisos − 1). No está en las reglas.
3. **Alcoba de 9 m² mínimo.** Es más exigente que muchas VIS (7 a 8 m²). Se deja como regla del usuario.
4. **Puertas.** Hay una sola área de puerta. Lo usual es 0,90 × 2,00 m en la principal, 0,80 m en las interiores y 0,70 m en el baño.
5. **Circulaciones.** La diferencia entre el área total y la suma de los espacios (pasillos, escaleras, muros) no genera piso ni acabados.
6. **Circuitos eléctricos.** NTC 2050 / RETIE piden circuitos de 20 A para la cocina y el baño. El número de breakers y los metros de tubería y cable quedan para diligenciar.
7. **Espacios cuadrados.** El perímetro se calcula como 4 × √área. Un espacio rectangular tiene más perímetro. Con el largo y el ancho reales la cantidad sería exacta.

## 4. Fuentes
- Bloque No 5, 15,5 u/m²: https://www.homecenter.com.co/homecenter-co/product/116435/bloque-n5-estandar-12-x-20-x-30-cm-155u-m2-ceranova/116435/
- Bloques por m² (concreto, 12,5 u/m²): https://www.tectonico.co/blog/cuantos-bloques-por-m2
- Dosificación de concreto: https://colombia.argos.co/autoconstructores/aprende-a-dosificar-el-concreto-para-tus-proyectos-de-construccion-o-remodelacion/ · https://ingenieriareal.com/calcular-cantidad-agregados-concreto/
- NTC 2050, tomas y GFCI: https://ntc2050.com/blog/instalaciones-electricas-residenciales-ntc-2050 · https://electricaplicada.com/ubicacion-tomacorriente-receptaculo-gfci-nec/
- RETIE, artículo 28 (vivienda): https://www.portalelectricos.com/retie/cap8art28_0.php
- Áreas VIS (MinVivienda): https://www.minvivienda.gov.co/sites/default/files/2020-07/guia_asis_tec_vis_3.pdf
- NSR-10, Título E: https://www.idrd.gov.co/sites/default/files/documentos/Construcciones/5titulo-e-nsr-100.pdf
- Factor de pendiente de cubierta: https://www.omnicalculator.com/es/construccion/pendiente-de-tejado
