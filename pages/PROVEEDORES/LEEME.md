# pages/PROVEEDORES — repositorio del catalogo de marcas de la construccion

Estructura (misma convencion de la investigacion KRAKEN):

```
pages/PROVEEDORES/
├── LEEME.md                         este archivo
├── verificacion/                    piloto 10 % y auditoria 5 % del scraping (Excel de auditoria)
└── Grupo A|B|C/                     ranking: A = puestos 1-10, B = 11-20, C = 21-30
    └── NN - Marca/                  una carpeta por marca del top 30
        ├── logo.png|jpg|svg|webp    logo oficial de la marca (lo pone el usuario o el scraping)
        ├── pagina web.txt           primera linea: URL del sitio oficial
        ├── Inventario_<marca>.xlsx  catalogo capturado del sitio oficial (NOMBRE DEL PRODUCTO | PRECIO | CATEGORIA | IMAGEN | URL)
        ├── data.json                fuente de verdad del scraper (se genera, no se edita a mano)
        └── img/                     fotos de producto descargadas
```

- El ranking y las carpetas se actualizan con `node tools/generar_inventario.js` (solo crea lo que falta; nunca mueve ni borra).
- El scraping NO se ejecuta hasta aprobar `docs/PLAN_PROVEEDORES_MARCAS.md`.
