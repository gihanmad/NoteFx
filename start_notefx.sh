#!/bin/bash

# NoteFx Portable Setup & Startup Script
echo "------------------------------------------------"
echo "🚀 NoteFx: Multi-Model AI Lecture Hub (Expert Scribe)"
echo "------------------------------------------------"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Error: Node.js is not installed. Please install it from https://nodejs.org/"
    exit
fi

# 1. Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 First time setup: Installing libraries..."
    npm install
fi

# 2. Build the application for production mode (faster and more stable)
if [ ! -d ".next" ]; then
    echo "🏗️  Building your academic workspace..."
    npm run build
fi

# 3. Start the application in the background
echo "🌐 Starting NoteFx at http://localhost:3000"
echo "------------------------------------------------"
echo "✅ Everything is ready! Your browser will open shortly."

# Start server
npm start &

# 4. Wait a few seconds then open the browser
sleep 5
open "http://localhost:3000"

echo "💡 Use Ctrl+C in this terminal to stop the server when you are done."
wait
