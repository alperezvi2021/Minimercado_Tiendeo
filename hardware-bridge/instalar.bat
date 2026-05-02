@echo off
title TIENDEO HARDWARE BRIDGE - INSTALADOR
echo =========================================
echo INSTALANDO DEPENDENCIAS DE HARDWARE...
echo =========================================
call npm install
echo =========================================
echo ARRANCANDO AGENTE...
echo (Tip: Si quieres que corra oculto, usa silencioso.vbs)
echo =========================================
node index.js
pause
