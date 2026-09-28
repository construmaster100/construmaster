# Plan: Biblioteca de proyectos (27/09/2026)

## Pedido del usuario
- Nueva carpeta **Biblioteca de proyectos**: allí se crean y modifican las carpetas de cada proyecto. **No se toca más `pages/Cliente`.**
- En el index (administrador), pestaña **Diseño**: botón **"Crear proyecto"** que abre un formulario:
  - Nombre del proyecto, nombre del propietario.
  - Tipo de proyecto: Vivienda · Remodelación · Licencia · Dibujo de planos.
  - Ubicación (departamento, municipio, urbano/rural), área, número de puertas, número de baños.
- Al confirmar, se crea la carpeta del proyecto dentro de la Biblioteca.
- Cada proyecto se asigna a un cliente como "Proyecto #". El cliente puede **visualizar, descargar, adjuntar y consultar** la información, con la misma estructura de la página del cliente: Proyecto (fotos) · Planos · Programación de obra · Presupuesto de obra.

## Estructura propuesta de cada proyecto
```
pages/Biblioteca de proyectos/
  PROYECTO 001 - <NOMBRE>/
    ficha.json                  datos del formulario (nombre, propietario, tipo, ubicacion, area, puertas, banos, cliente asignado)
    PRESUPUESTO/V1 Construmaster.xlsm   copia del modelo con la ficha INICIO diligenciada (tools/presupuesto_modelo_v1.js)
    FOTOS/
    PLANOS/ESTRUCTURALES · ARQUITECTONICOS · ELECTRICOS · HIDROSANITARIOS
    PROGRAMACION.txt
    ADJUNTOS/                   lo que sube el cliente
```

## Límite técnico (a decidir)
El sitio se abre con doble clic, sin servidor: **una página web no puede crear carpetas ni archivos en el disco por sí sola.** Opciones:
- **A. Servidor local pequeño (Node, recomendado):** `node tools/servidor.js` y el sitio se abre en `http://localhost:8080`. El formulario crea la carpeta, llena el V1 Construmaster y guarda los adjuntos del cliente. Funciona en este equipo; para clientes desde otros equipos haría falta publicarlo en internet.
- **B. Permiso de carpeta del navegador (Chrome):** la primera vez se elige la carpeta Biblioteca y la página escribe allí. Sin servidor, pero solo sirve en el mismo equipo y hay que dar el permiso en cada sesión.
- **C. Formulario + comando:** el formulario descarga un archivo con los datos y `node tools/crear_proyecto.js` crea la carpeta. Lo más simple, pero con un paso manual.

## Pasos (tras la confirmación)
1. Crear `pages/Biblioteca de proyectos` y la plantilla de carpetas.
2. Botón y formulario "Crear proyecto" en Diseño (index).
3. Creación de la carpeta + V1 Construmaster diligenciado (según la opción elegida).
4. Asignación de proyectos a clientes y vista del cliente con las 4 pestañas por proyecto.
5. Prueba con un proyecto de ejemplo (que luego se borra).

## Estado (27/09/2026): lógica montada, sin servidor
- El usuario pidió "lo más offline posible, solo la lógica". Recorrido: Diseño → "+ Crear proyecto" (`#diseno/crear`) → formulario → Crear → repositorio (`#diseno/proyecto-N`) → consultar (pestañas Proyecto · Planos · Programación · Presupuesto · Adjuntos) / agregar archivos / asignar cliente.
- `pages/Biblioteca de proyectos` es la copia del usuario del Catálogo de planos (PROYECTO 1–33); los nuevos siguen desde el 34. Plantilla: `_PLANTILLA/` (carpetas + `PRESUPUESTO/V1 Construmaster.xlsm`, movido desde pages/Cliente).
- Datos: `node tools/generar_biblioteca.js` → `assets/datos/biblioteca.js`. Lo creado en el formulario, las asignaciones y los archivos agregados quedan en el navegador (localStorage `construmaster_biblioteca`) con estado "Pendiente".
- Paso CREAR: en el repositorio, "Descargar ficha" → `node tools/crear_proyecto.js "PROYECTO N.json"` crea la carpeta y el V1 Construmaster con INICIO (L2 nombre, L3 id, L4 ubicación, L8 tipo, L15 área). Probado con un proyecto de prueba (borrado).
- Falta para que funcione del todo: servidor (crear carpeta y guardar adjuntos sin pasos manuales) y la vista del cliente con sus proyectos asignados.
