@echo off
rem Herramientas de alquiler: 10 empresas del plan + ampliacion (buscadores). Registro: pages\ALQUILER\registro.log
cd /d "%~dp0..\..\.."
node tools\scraper\alquiler\alquiler.js
echo [ALQUILER TERMINADO]
