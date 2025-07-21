#!/bin/bash

# PDF Editor Pro - Demo Server Script
# This script starts a local web server to run the PDF Editor Pro application

echo "🚀 Starting PDF Editor Pro..."
echo "=================================="

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found - Starting server on port 8000"
    echo "🌐 Open your browser and navigate to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python 2 found - Starting server on port 8000"
    echo "🌐 Open your browser and navigate to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    python -m SimpleHTTPServer 8000
elif command -v node &> /dev/null; then
    echo "✅ Node.js found - Installing http-server if needed"
    if ! command -v http-server &> /dev/null; then
        echo "📦 Installing http-server..."
        npm install -g http-server
    fi
    echo "🌐 Open your browser and navigate to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    http-server -p 8000
elif command -v php &> /dev/null; then
    echo "✅ PHP found - Starting server on port 8000"
    echo "🌐 Open your browser and navigate to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    php -S localhost:8000
else
    echo "❌ No suitable server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  • Python 3: https://www.python.org/downloads/"
    echo "  • Node.js: https://nodejs.org/en/download/"
    echo "  • PHP: https://www.php.net/downloads.php"
    echo ""
    echo "Or open index.html directly in your browser (limited functionality)"
    exit 1
fi
