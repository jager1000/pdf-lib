@echo off
REM PDF Editor Pro - Demo Server Script for Windows
REM This script starts a local web server to run the PDF Editor Pro application

echo 🚀 Starting PDF Editor Pro...
echo ==================================

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python found - Starting server on port 8000
    echo 🌐 Open your browser and navigate to: http://localhost:8000
    echo ⏹️  Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
    goto :eof
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js found - Installing http-server if needed
    
    REM Check if http-server is installed
    http-server --version >nul 2>&1
    if not %errorlevel% == 0 (
        echo 📦 Installing http-server...
        npm install -g http-server
    )
    
    echo 🌐 Open your browser and navigate to: http://localhost:8000
    echo ⏹️  Press Ctrl+C to stop the server
    echo.
    http-server -p 8000
    goto :eof
)

REM Check if PHP is available
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ PHP found - Starting server on port 8000
    echo 🌐 Open your browser and navigate to: http://localhost:8000
    echo ⏹️  Press Ctrl+C to stop the server
    echo.
    php -S localhost:8000
    goto :eof
)

echo ❌ No suitable server found!
echo.
echo Please install one of the following:
echo   • Python 3: https://www.python.org/downloads/
echo   • Node.js: https://nodejs.org/en/download/
echo   • PHP: https://www.php.net/downloads.php
echo.
echo Or open index.html directly in your browser (limited functionality)
pause
