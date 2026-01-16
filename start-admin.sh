#!/bin/bash
# Quick start script for Trick List Admin System

echo "🚀 Starting Trick List Admin System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Starting Admin API Server on port 3001..."
node admin-server.js &
ADMIN_PID=$!

echo "✅ Starting Web Server on port 8000..."
# Try Python first, then fall back to http-server
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000 &
else
    npx http-server -p 8000 &
fi
WEB_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Trick List is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Web App:     http://localhost:8000"
echo "🔧 Admin API:   http://localhost:3001"
echo ""
echo "👤 Login as owner:"
echo "   Email: Zenon.beckson.miah@gmail.com"
echo "   Password: Fluffball7891523!"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Keep scripts running
wait
