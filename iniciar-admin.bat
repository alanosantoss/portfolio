@echo off
title Painel Admin - Alan Oliveira
cd /d "%~dp0"
echo ========================================================
echo    Iniciando Painel Admin - Alan Oliveira
echo    Ao clicar em Salvar, ele envia direto para o GitHub!
echo ========================================================
echo.
node scripts/server.js
pause
