#!/bin/bash
# Facebook Bot Server starten
# Doppelklick auf diese Datei um den Bot-Server zu starten

cd "$(dirname "$0")"

echo "🤖 Facebook Bot Server wird gestartet..."
echo ""

# Prüfen ob node_modules existiert
if [ ! -d "node_modules" ]; then
    echo "📦 Installiere Abhängigkeiten..."
    npm install
    echo ""
fi

# Server starten
npm run server
