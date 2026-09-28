@echo off
rem Captura de empresas complementarias (ALFA, BAEZO) y actualizacion del inventario.
rem docs/PLAN_SCRAPING_EMPRESAS_FALTANTES.md. Registro: pages\PROVEEDORES\verificacion\registro_complementarias.log
cd /d "%~dp0..\..\.."
node tools\scraper\ferreterias\catalogo_tiendas.js ALFA BAEZO
echo [FIN SCRAPING]
node tools\generar_inventario.js
node tools\clasificar_marcas.js
echo [INVENTARIO ACTUALIZADO]
