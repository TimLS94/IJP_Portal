#!/bin/bash
# JobOn Facebook Bot - Startet Server und öffnet App

cd "$(dirname "$0")"

echo "🤖 JobOn Facebook Bot wird gestartet..."
echo ""

# Prüfen ob node_modules existiert
if [ ! -d "node_modules" ]; then
    echo "📦 Installiere Abhängigkeiten..."
    npm install
fi

# Server im Hintergrund starten
echo "🚀 Starte Bot-Server..."
npm run server &
SERVER_PID=$!

# Warten bis Server läuft
sleep 2

# App im Browser öffnen
echo "🌐 Öffne Bot-App..."
open "$(pwd)/app.html"

echo ""
echo "✅ Bot-App geöffnet!"
echo "📋 Server läuft auf http://localhost:3847"
echo ""
echo "Drücke Ctrl+C zum Beenden"

# Warten auf Server
wait $SERVER_PID
