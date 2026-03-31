# Facebook Gruppen Auto-Poster 🤖

Automatisches Posten in mehrere Facebook Gruppen mit Playwright.

## ⚠️ Wichtiger Hinweis

Dieses Tool verstößt gegen die Facebook-Nutzungsbedingungen. Nutze es auf eigenes Risiko.
- Poste nicht zu häufig (max. 1x pro Tag pro Gruppe)
- Variiere deine Posts
- Nutze es primär für deine eigenen Gruppen

## Installation

```bash
cd tools/facebook-bot
npm install
npx playwright install chromium
```

## Konfiguration

### 1. Gruppen hinzufügen

Bearbeite `bot.js` und füge deine Gruppen in die `GROUPS` Liste ein:

```javascript
const GROUPS = [
  // Eigene Gruppen
  { url: 'https://www.facebook.com/groups/123456789', name: 'Meine Gruppe 1', own: true },
  { url: 'https://www.facebook.com/groups/987654321', name: 'Meine Gruppe 2', own: true },
  
  // Externe Gruppen
  { url: 'https://www.facebook.com/groups/jobs-berlin', name: 'Jobs Berlin', own: false },
  // ... weitere Gruppen
];
```

### 2. Post-Text erstellen

Erstelle/bearbeite `post.txt` mit deinem Post-Text:

```
🔥 JOBCHANCE: Servicekraft (m/w/d)

📍 Standort: Bayern
💼 Vollzeit

Jetzt bewerben: https://www.jobon.work

#Job #Arbeit #JobOn
```

### 3. Kommentare hinzufügen (optional)

Erstelle `comments.txt` mit Kommentaren, die unter deinen Post geschrieben werden.
Trenne mehrere Kommentare mit `---`:

```
👉 Mehr Infos: https://www.jobon.work
---
🏨 Unterkunft wird gestellt!
💰 Faire Bezahlung!
---
Fragen? Schreibt mir gerne! 💬
```

Der Bot postet erst den Hauptpost und fügt dann automatisch die Kommentare hinzu.

## Nutzung

### Erster Start (Login)

```bash
npm run test
```

Beim ersten Start öffnet sich ein Browser-Fenster. Logge dich bei Facebook ein.
Der Login wird gespeichert (im `browser-data` Ordner).

### Posten testen (Dry Run)

```bash
node bot.js --post --dry
```

Simuliert das Posten ohne tatsächlich zu posten. Gut zum Testen.

### Wirklich posten

```bash
npm run post
# oder
node bot.js --post
```

## Tipps für sicheres Posten

1. **Verzögerungen:** Der Bot wartet 30-60 Sekunden zwischen Gruppen
2. **Nicht übertreiben:** Max. 1x pro Tag in jede Gruppe posten
3. **Posts variieren:** Nutze verschiedene Texte
4. **Eigene Gruppen zuerst:** Teste mit deinen eigenen Gruppen
5. **Beobachten:** Beim ersten Mal den Bot beobachten

## Fehlerbehebung

### "Post-Box nicht gefunden"
Facebook ändert regelmäßig das UI. Die Selektoren in `bot.js` müssen ggf. angepasst werden.

### "Nicht eingeloggt"
Lösche den `browser-data` Ordner und starte neu:
```bash
rm -rf browser-data
npm run test
```

### Captcha erscheint
Löse es manuell im Browser-Fenster und drücke Enter im Terminal.

## Logs

Alle Posting-Ergebnisse werden in `logs/` gespeichert:
```
logs/2026-03-30.json
```

## Integration mit JobOn Portal

Du kannst Posts aus dem Portal exportieren:
1. Gehe zu Admin → Vertrieb → Facebook Gruppen
2. Erstelle/speichere einen Post
3. Kopiere den Text in `post.txt`
4. Führe den Bot aus
