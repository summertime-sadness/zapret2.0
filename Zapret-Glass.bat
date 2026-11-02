@echo off
cd /d "%~dp0"
if exist "%~dp0ZAPRET 2.0.vbs" (
    start "" wscript //nologo "%~dp0ZAPRET 2.0.vbs"
    exit /b
)
if exist "%~dp0dist\ZAPRET-2.0-Portable\ZAPRET-2.0.exe" (
    start "" "%~dp0dist\ZAPRET-2.0-Portable\ZAPRET-2.0.exe"
    exit /b
)
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm start' -WorkingDirectory '%~dp0.' -WindowStyle Hidden"
exit /b
