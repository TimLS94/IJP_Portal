# IJP Portal - Internationale Jobvermittlung

Ein Portal zur Vermittlung von internationalen Arbeitskräften an deutsche Unternehmen.

## Technologien

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Python FastAPI + SQLAlchemy
- **Datenbank**: MySQL

## Voraussetzungen

- Node.js 18+
- Python 3.10+
- MySQL 8.0+

## Installation

### 1. MySQL Datenbank einrichten

```sql
CREATE DATABASE ijp_portal;
CREATE USER 'ijp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ijp_portal.* TO 'ijp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend Setup

```bash
cd backend

# Virtual Environment erstellen
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder: venv\Scripts\activate  # Windows

# Dependencies installieren
pip install -r requirements.txt

# Environment-Datei erstellen
cp .env.example .env
# Datenbankverbindung in .env anpassen

# Server starten
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Die API-Dokumentation ist verfügbar unter: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Das Frontend ist verfügbar unter: http://localhost:5173

## Projektstruktur

```
IJP_Portal/
├── backend/
│   ├── app/
│   │   ├── api/           # API-Routen
│   │   ├── core/          # Config, Security, Database
│   │   ├── models/        # SQLAlchemy Models
│   │   ├── schemas/       # Pydantic Schemas
│   │   ├── services/      # Business Logic
│   │   └── main.py        # FastAPI App
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React Components
│   │   ├── context/       # Auth Context
│   │   ├── lib/           # API Client
│   │   ├── pages/         # Seiten
│   │   └── App.jsx
│   └── package.json
│
└── README.md
```

## Features

### Für Bewerber
- Registrierung und Profil-Verwaltung
- Stellensuche mit Filtern
- One-Click Bewerbung
- Bewerbungsstatus verfolgen

### Für Unternehmen
- Firmenprofil verwalten
- Stellenangebote erstellen/bearbeiten
- Bewerbungen verwalten
- Status-Updates für Bewerber

### Stellenarten
- Studentenferienjob
- Saisonjob
- Fachkräfte
- Ausbildung

## API Endpoints

### Authentifizierung
- `POST /api/v1/auth/register` - Registrierung
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Aktueller Benutzer

### Bewerber
- `GET /api/v1/applicants/me` - Eigenes Profil
- `PUT /api/v1/applicants/me` - Profil aktualisieren

### Firmen
- `GET /api/v1/companies/me` - Eigenes Firmenprofil
- `PUT /api/v1/companies/me` - Firmenprofil aktualisieren

### Stellenangebote
- `GET /api/v1/jobs` - Alle aktiven Stellen
- `GET /api/v1/jobs/{id}` - Stellendetails
- `POST /api/v1/jobs` - Neue Stelle (Firma)
- `PUT /api/v1/jobs/{id}` - Stelle bearbeiten (Firma)
- `DELETE /api/v1/jobs/{id}` - Stelle löschen (Firma)

### Bewerbungen
- `POST /api/v1/applications` - Neue Bewerbung
- `GET /api/v1/applications/my` - Eigene Bewerbungen (Bewerber)
- `GET /api/v1/applications/company` - Eingehende Bewerbungen (Firma)
- `PUT /api/v1/applications/{id}` - Status aktualisieren (Firma)

## Neue Features (Phase 2)

### Dokument-Upload
- Bewerber können Dokumente hochladen (PDF, DOC, JPG, PNG)
- Verschiedene Dokumenttypen: Lebenslauf, Zeugnis, Ausweisdokument, etc.
- Max. 10 MB pro Datei
- Download und Löschen möglich

### PDF-Generierung (Bundesagentur für Arbeit)
- **Antrag auf Arbeitserlaubnis**: Automatisch aus Profildaten generiert
- **Lebenslauf-PDF**: Basierend auf Profildaten
- **Stellenbescheinigung**: Mit Firmen- und Stellendaten für jede Bewerbung

### API Endpoints (Neu)

#### Dokumente
- `POST /api/v1/documents` - Dokument hochladen
- `GET /api/v1/documents` - Alle Dokumente auflisten
- `GET /api/v1/documents/{id}/download` - Dokument herunterladen
- `DELETE /api/v1/documents/{id}` - Dokument löschen

#### PDF-Generierung
- `GET /api/v1/generate/arbeitserlaubnis` - Antrag auf Arbeitserlaubnis
- `GET /api/v1/generate/lebenslauf` - Lebenslauf generieren
- `GET /api/v1/generate/stellenbescheinigung/{id}` - Stellenbescheinigung

## Phase 3: E-Mail, Admin & Profile

### E-Mail-Benachrichtigungen
Automatische E-Mails bei:
- **Registrierung**: Willkommens-E-Mail für Bewerber und Firmen
- **Neue Bewerbung**: Bestätigung an Bewerber + Benachrichtigung an Firma
- **Statusänderung**: Bewerber wird über Änderungen informiert

### Admin-Dashboard
Vollständige Verwaltungsoberfläche für Admins:
- **Dashboard**: Statistiken und Übersicht
- **Benutzer verwalten**: Aktivieren/Deaktivieren von Accounts
- **Stellen verwalten**: Übersicht und Löschen
- **Bewerbungen**: Alle Bewerbungen einsehen

### Admin erstellen
```bash
# Ersten Admin über API erstellen (nur einmalig möglich!)
curl -X POST "http://localhost:8000/api/v1/admin/create-admin?email=admin@example.com&password=adminpassword"
```

### Firmen-Profil
- Vollständige Profilbearbeitung für Unternehmen
- Branche und Unternehmensgröße
- Beschreibung für Stellenanzeigen

### Neue API Endpoints

#### Admin
- `GET /api/v1/admin/stats` - Dashboard-Statistiken
- `GET /api/v1/admin/users` - Benutzer auflisten
- `PUT /api/v1/admin/users/{id}/toggle-active` - Benutzer aktivieren/deaktivieren
- `GET /api/v1/admin/jobs` - Alle Stellen
- `DELETE /api/v1/admin/jobs/{id}` - Stelle löschen
- `GET /api/v1/admin/applications` - Alle Bewerbungen

## Phase 4: Mehrsprachigkeit

### Sprachunterstützung
Das Portal unterstützt jetzt **Deutsch** und **Russisch**:

- **Sprachschalter**: In der Navbar (🇩🇪/🇷🇺)
- **Automatische Erkennung**: Browser-Sprache wird erkannt
- **Speicherung**: Sprachauswahl wird im localStorage gespeichert

### Technische Umsetzung
- `i18next` für Übersetzungs-Management
- `react-i18next` für React-Integration
- `i18next-browser-languagedetector` für automatische Spracherkennung

### Übersetzungsdateien
```
frontend/src/i18n/
├── index.js          # i18n Konfiguration
└── locales/
    ├── de.json       # Deutsche Übersetzungen
    └── ru.json       # Russische Übersetzungen
```

### Neue Sprache hinzufügen
1. Neue Datei in `frontend/src/i18n/locales/` erstellen (z.B. `en.json`)
2. In `frontend/src/i18n/index.js` importieren
3. In `frontend/src/components/LanguageSwitcher.jsx` zur Liste hinzufügen

## Nächste Schritte

1. [x] Dokument-Upload für Bewerber
2. [x] PDF-Generierung für Bundesagentur für Arbeit
3. [x] E-Mail-Benachrichtigungen
4. [x] Admin-Dashboard
5. [x] Firmen-Profil Bearbeitung
6. [x] Mehrsprachigkeit (DE/RU)
7. [ ] Erweiterte Suchfilter
8. [ ] Passwort-Reset Funktion
9. [ ] Datei-Vorschau im Browser
