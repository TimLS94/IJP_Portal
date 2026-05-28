# E2E Tests mit Playwright

## Voraussetzungen

- Node.js 18+
- Chromium Browser (wird automatisch installiert)

## Installation

```bash
npm install
npx playwright install chromium
```

## Tests ausführen

### Alle Tests (headless)
```bash
npm test
```

### Tests mit UI (interaktiv)
```bash
npm run test:ui
```

### Tests mit sichtbarem Browser
```bash
npm run test:headed
```

### Test-Report anzeigen
```bash
npm run test:report
```

## Test-Struktur

```
e2e/
├── auth.spec.ts        # Login, Registrierung, Authentifizierung
├── jobs.spec.ts        # Stellenangebote, Suche, Filter
├── navigation.spec.ts  # Navigation, Footer, Sprachumschalter
├── accessibility.spec.ts # Accessibility, Performance
└── fixtures/
    └── test-data.ts    # Test-Daten
```

## Wichtige Befehle

```bash
# Einzelnen Test ausführen
npx playwright test auth.spec.ts

# Test mit bestimmtem Namen
npx playwright test -g "Login-Seite"

# Debug-Modus
npx playwright test --debug

# Trace aufnehmen
npx playwright test --trace on
```

## CI/CD Integration

Die Tests können in GitHub Actions integriert werden. Beispiel-Workflow:

```yaml
- name: Run Playwright tests
  run: npx playwright test
  env:
    CI: true
```
