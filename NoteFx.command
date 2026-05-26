#!/bin/bash

# Move to the directory where this script is located
cd "$(dirname "$0")"

clear
echo "------------------------------------------------"
echo "🚀 NoteFx: Starting Your Academic AI Workspace..."
echo "------------------------------------------------"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Error: Node.js is not installed."
    echo "Please download and install it from: https://nodejs.org/"
    read -p "Press enter to exit..."
    exit
fi

# 1. Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Initializing workspace: Installing libraries..."
    npm install
fi

# 2. Build for production (only if .next doesn't exist)
if [ ! -d ".next" ]; then
    echo "🏗️  Optimizing NoteFx for high speed..."
    npm run build
fi

# 3. Start the server
echo "🌐 Launching local server at http://localhost:3000"
echo "✅ NoteFx is now active. Your browser will open in a few seconds."
echo "------------------------------------------------"
echo "🛑 DO NOT CLOSE THIS WINDOW while using NoteFx."
echo "------------------------------------------------"

# Start server in background
npm start &

# 4. Wait and open browser
sleep 4
open "http://localhost:3000"

# Keep the window open to show logs
wait
