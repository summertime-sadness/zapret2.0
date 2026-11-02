@echo off
chcp 65001 >nul
title Публикация ZAPRET 2.0 на GitHub
cls
echo ========================================================
echo   ⚡ Публикация проекта ZAPRET 2.0 на ваш GitHub
echo ========================================================
echo.
echo Перед публикацией создайте пустой репозиторий на github.com
echo.
node scripts\push-github.js
echo.
pause
