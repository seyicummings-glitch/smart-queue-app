@echo off
setlocal
title SQMS — Starting...

set "APP_DIR=C:\Users\hp\Downloads\Queue Management System (Copy)\SmartQueueApp"
set "READY_FLAG=%APP_DIR%\.sqms_ready"
set "BASH_PATH="

if exist "C:\Program Files\Git\bin\bash.exe"       set "BASH_PATH=C:\Program Files\Git\bin\bash.exe"
if exist "C:\Program Files (x86)\Git\bin\bash.exe" set "BASH_PATH=C:\Program Files (x86)\Git\bin\bash.exe"

if "%BASH_PATH%"=="" (
    echo.
    echo  ERROR: Git Bash not found. Please install Git from https://git-scm.com/
    echo.
    pause
    exit /b 1
)

REM Remove old ready flag so we don't use a stale one
if exist "%READY_FLAG%" del "%READY_FLAG%"

echo.
echo  ================================================
echo     SQMS - Starting All Services
echo  ================================================
echo.
echo  Step 1: Starting Django + Cloudflare Tunnel...
echo  (This window will update when everything is ready)
echo.

start "SQMS Backend" "%BASH_PATH%" --login -c "cd '/c/Users/hp/Downloads/Queue Management System (Copy)/SmartQueueApp' && bash start-dev.sh; exec bash"

echo  Step 2: Waiting for backend to be fully ready...
echo.

REM Wait for ready flag — checks every second, up to 90 seconds
set /a WAITED=0
:WAIT_LOOP
if exist "%READY_FLAG%" goto READY
if %WAITED% GEQ 90 goto TIMEOUT
timeout /t 1 /nobreak > nul
set /a WAITED+=1
goto WAIT_LOOP

:TIMEOUT
echo  WARNING: Backend is taking longer than expected.
echo  Starting Expo anyway — you may need to wait a moment.
goto START_EXPO

:READY
echo  Backend is ready!
echo.

:START_EXPO
echo  Step 3: Starting Expo...
start "SQMS Expo" cmd /k "cd /d "%APP_DIR%" && npx expo start --tunnel --clear"

echo.
echo  ================================================
echo.
echo    All services are running!
echo.
echo    - "SQMS Backend" window = Django + Tunnel
echo    - "SQMS Expo" window    = Scan QR with iPhone
echo.
echo  ================================================
echo.
echo  You can close this window.
timeout /t 5 /nobreak > nul
