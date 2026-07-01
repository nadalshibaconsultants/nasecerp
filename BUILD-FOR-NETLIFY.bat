@echo off
REM ============================================================
REM  NASEC ERP - One-click build for Netlify
REM  Double-click this file to build the website locally.
REM  When it's done, drag the "dist\public" folder onto Netlify.
REM ============================================================

setlocal
cd /d "%~dp0"

REM --- Force npm to use ONLY this project's .npmrc ---
REM This prevents stale pnpm-style settings in your home folder from breaking the install
set "NPM_CONFIG_USERCONFIG=%~dp0.npmrc"
set "NPM_CONFIG_GLOBALCONFIG=%~dp0.npmrc"
set "NPM_CONFIG_AUTO_INSTALL_PEERS="
set "NPM_CONFIG_STRICT_PEER_DEPENDENCIES="

echo.
echo ============================================================
echo  NASEC ERP - Building the website
echo ============================================================
echo.

REM --- Check Node is installed ---
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is not installed.
  echo.
  echo Please install Node.js 20 LTS from:
  echo    https://nodejs.org/en/download
  echo.
  echo Then double-click this file again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js detected: %NODE_VER%
echo.

REM --- Clean any stale state from previous runs ---
if exist "dist" (
  echo Cleaning previous build output...
  rmdir /s /q "dist"
)
if exist "node_modules" (
  echo Removing old node_modules ^(this can take a moment^)...
  rmdir /s /q "node_modules"
)
if exist "package-lock.json" (
  echo Removing stale package-lock.json...
  del /q "package-lock.json"
)
echo.

REM --- Install dependencies (fresh, no cached overrides) ---
echo Step 1 of 2: Installing dependencies ^(this can take 1-2 minutes^)...
echo.
call npm install --legacy-peer-deps --no-audit --no-fund --ignore-scripts --no-package-lock
if errorlevel 1 (
  echo.
  echo ============================================================
  echo [X] npm install failed.
  echo ============================================================
  echo If you see EOVERRIDE:
  echo   Open package.json in Notepad. Make sure it does NOT have
  echo   an "overrides" block. If it does, delete that block and
  echo   re-run this script.
  echo.
  echo If you see "Unknown project config":
  echo   You have a stale .npmrc in your home folder.
  echo   Press Win+R, paste this and hit Enter:   %%USERPROFILE%%
  echo   Look for a file named ".npmrc" and either delete it OR
  echo   open it in Notepad and remove lines containing
  echo   "auto-install-peers" or "strict-peer-dependencies".
  echo ============================================================
  echo.
  pause
  exit /b 1
)

REM --- Build the website ---
echo.
echo Step 2 of 2: Building the website...
echo.
call npx vite build
if errorlevel 1 (
  echo.
  echo [X] Build failed. Check the error above.
  echo.
  pause
  exit /b 1
)

REM --- Done ---
echo.
echo ============================================================
echo  BUILD SUCCEEDED
echo ============================================================
echo.
echo Your website is in:    %CD%\dist\public
echo.
echo Next steps:
echo   1) Open https://app.netlify.com/drop in your browser
echo   2) Drag the "public" folder ^(inside "dist"^) onto the page
echo   3) That's it - Netlify will host it
echo.
echo Opening the output folder now...
echo.

start "" explorer "%CD%\dist"

pause
endlocal
