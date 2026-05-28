# 🚀 Deployment Checklist - Mai 2026

## Änderungen in diesem Release
- ✅ Neues Next.js Frontend (ersetzt altes React Frontend)
- ✅ Anabin-Scraper und Verifizierung
- ✅ Partner-Tracking (Invite Source)
- ✅ SEO-Verbesserungen (SSR, JSON-LD, Sitemap)
- ✅ Übersetzungs-Fixes

---

## ⚠️ WICHTIG: Deployment-Reihenfolge

### 1️⃣ Datenbank-Migrationen (ZUERST!)

```bash
# Verbindung zur Produktions-DB
# Option A: Direkt auf dem Server
psql -U your_user -d your_database

# Option B: Über Render Dashboard -> Database -> PSQL
```

**Migrationen in dieser Reihenfolge ausführen:**

```sql
-- 1. Invite Tokens Tabelle (falls nicht existiert)
\i migrations/add_applicant_invite_tokens.sql

-- 2. Anabin und Invite Source Felder
\i migrations/add_anabin_and_invite_source_fields.sql
```

**Oder als einzelne Befehle:**

```sql
-- Invite Tokens Tabelle
CREATE TABLE IF NOT EXISTS applicant_invite_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    source_name VARCHAR(255) NOT NULL,
    source_country VARCHAR(100),
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Anabin Felder
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_verified VARCHAR(50) DEFAULT 'not_checked';
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_match_score INTEGER;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_institution_name VARCHAR(500);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_institution_id VARCHAR(100);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_status VARCHAR(50);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_notes TEXT;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_checked_at DATE;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS anabin_checked_by INTEGER REFERENCES users(id);

-- Invite Source Felder
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS invite_source VARCHAR(255);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS invite_source_country VARCHAR(100);
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS invite_token_id INTEGER REFERENCES applicant_invite_tokens(id);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_applicant_invite_tokens_token ON applicant_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_applicants_invite_source ON applicants(invite_source);
CREATE INDEX IF NOT EXISTS idx_applicants_anabin_verified ON applicants(anabin_verified);
```

### 2️⃣ Backend deployen

```bash
git add .
git commit -m "feat: Anabin scraper, Partner tracking, SEO improvements"
git push origin main
```

Render wird automatisch neu deployen.

**Nach dem Deploy prüfen:**
- [ ] Backend startet ohne Fehler
- [ ] API erreichbar: `https://ijp-portal.onrender.com/api/v1/health`

### 3️⃣ Frontend deployen

Das neue Next.js Frontend muss separat deployed werden (z.B. auf Vercel).

```bash
cd frontend-next
npm run build  # Lokal testen
```

**Vercel Deployment:**
1. Vercel Dashboard -> New Project
2. Import `frontend-next` Ordner
3. Environment Variables setzen:
   - `NEXT_PUBLIC_API_URL=https://ijp-portal.onrender.com/api/v1`

---

## 🔍 Nach dem Deployment prüfen

### Funktionalität
- [ ] Login funktioniert
- [ ] Jobs werden angezeigt
- [ ] Bewerbungen funktionieren
- [ ] Admin-Dashboard erreichbar
- [ ] Anabin-Seite funktioniert (Admin)
- [ ] Partner-Einladungen funktionieren (Admin)

### SEO
- [ ] `/sitemap.xml` erreichbar
- [ ] `/robots.txt` korrekt
- [ ] Job-Seiten haben JSON-LD Schema (View Source prüfen)

---

## 🔄 Rollback-Plan

Falls etwas schiefgeht:

### Frontend
- Altes Frontend wieder aktivieren (DNS/Vercel zurücksetzen)

### Backend
- Render: "Rollback to previous deploy" im Dashboard

### Datenbank
- Neue Spalten sind optional (nullable) - kein Rollback nötig
- Falls doch: `ALTER TABLE applicants DROP COLUMN IF EXISTS anabin_verified;` etc.

---

## ✅ Risiko-Bewertung

| Bereich | Risiko | Grund |
|---------|--------|-------|
| Datenbank | 🟢 Niedrig | `IF NOT EXISTS` verhindert Fehler |
| Backend | 🟢 Niedrig | Neue Features sind additiv |
| Frontend | 🟡 Mittel | Komplett neues System - gut testen! |
| Bestehende Daten | 🟢 Kein Risiko | Keine Daten werden gelöscht/geändert |
