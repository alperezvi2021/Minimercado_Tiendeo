@echo off
title TIENDEO HARDWARE BRIDGE - INSTALADOR
echo =========================================
echo INSTALANDO DEPENDENCIAS DE HARDWARE...
echo =========================================
call npm install
echo =========================================
echo ARRANCANDO AGENTE...
echo =========================================
node index.js
pause
