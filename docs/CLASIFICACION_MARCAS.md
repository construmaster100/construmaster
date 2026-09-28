# Clasificacion constructiva unificada de marcas (27/09/2026)

Pedido del usuario: en Proveedores, **empresas** (ferreterias y proveedores de productos) en el sidebar derecho y **marcas** en el sidebar izquierdo, por categoria constructiva unificada que cubra todas las marcas del inventario.

## Esquema: etapa de obra -> categoria -> marcas
| Etapa | Categorias |
|---|---|
| Obra negra | Estructura y obra gris · Cubiertas, drywall y techos |
| Instalaciones | Plomeria y tuberia · Electricidad e iluminacion |
| Obra blanca y acabados | Pisos y revestimientos · Banos y cocinas · Pinturas y acabados · Cerrajeria y ferreteria |
| Herramientas y equipos | Herramientas y maquinaria |
| Complementarios | Aseo y quimicos · Hogar, jardin y otros · Casas prefabricadas |
| Fuera de obra | Tecnologia y electronica · Automotor · Otros productos |

## Regla (tools/clasificar_marcas.js)
1. Cada producto recibe una categoria: por el nombre de su categoria en la tienda (Mascotas, Automotor, Pinturas, Plomeria...); si esa categoria es generica ("Construccion y Ferreteria", "Productos"), por la familia del inventario.
2. La marca queda en la categoria donde tiene mas productos (sin contar "Otros"); secundarias: las que pesan >= 15 %.
3. Marcas con todos sus productos en "Otros": por palabras de sus categorias (tecnologia, automotor, hogar, aseo) o "Otros productos".

## Resultado: 2.824 marcas
Obra negra 203 · Instalaciones 428 · Obra blanca y acabados 1.066 · Herramientas y equipos 606 · Complementarios 372 · Fuera de obra 157.

## Auditoria 5 % (142 marcas, semilla 20260927) — docs/auditoria_clasificacion_marcas.txt
- Primera version (solo familia del inventario): ~12 errores (91,5 %), p. ej. marcas de mascotas en "Estructura", automotor en "Cerrajeria". **No aprobada.**
- Version final (categoria de la tienda primero): 3-4 casos discutibles que siguen los datos publicados por la tienda (Radio Systems, Inmunizar, Tesa, Aceros & Arquitectura) -> **~97 %, aprobada**.

## Uso
`node tools/clasificar_marcas.js` (despues de `node tools/generar_inventario.js`) -> `assets/datos/clasificacion_marcas.js`. Con `--auditoria` escribe la muestra del 5 %.
En el index: sidebar izquierdo de Proveedores = arbol plegable etapa -> categoria -> marcas (se abre en la de la marca actual; el buscador muestra resultados); sidebar derecho = empresas por tipo. El directorio A-Z usa la misma categoria como "tipo de producto".
