"""
Datenbank-Migration: Fügt die 'slug' Spalte zur job_postings Tabelle hinzu
und generiert Slugs für alle bestehenden Jobs.

Ausführung auf Render Shell:
cd /app && python -c "exec(open('scripts/add_slug_column.py').read())"
"""
import os
import sys
import re
import unicodedata

# Pfad zum App-Verzeichnis hinzufügen
sys.path.insert(0, '/app')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Datenbank-URL aus Environment
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL nicht gesetzt!")
    sys.exit(1)

# PostgreSQL URL-Fix für SQLAlchemy
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def slugify(text):
    """Konvertiert Text in einen URL-freundlichen Slug."""
    if not text:
        return ""
    
    # Deutsche Umlaute ersetzen
    replacements = {
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        'Ä': 'ae', 'Ö': 'oe', 'Ü': 'ue',
        'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u',
        'ñ': 'n', 'ç': 'c',
    }
    
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    
    # Unicode normalisieren
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # Lowercase
    text = text.lower()
    
    # Nur alphanumerische Zeichen und Bindestriche behalten
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    
    # Mehrfache Leerzeichen/Bindestriche zu einem Bindestrich
    text = re.sub(r'[-\s]+', '-', text)
    
    # Führende/trailing Bindestriche entfernen
    text = text.strip('-')
    
    return text


def generate_job_slug(title, location=None, accommodation=False):
    """Generiert einen SEO-freundlichen Slug aus Jobtitel und Ort."""
    parts = []
    
    if title:
        # Entferne (m/w/d), (h/m/d), etc.
        clean_title = re.sub(r'\([mwdhfx/]+\)', '', title, flags=re.IGNORECASE)
        clean_title = re.sub(r'[^\w\s-]', ' ', clean_title)
        parts.append(clean_title)
    
    if location:
        parts.append(location)
    
    if accommodation:
        parts.append("unterkunft")
    
    text = ' '.join(parts)
    slug = slugify(text)
    
    # Maximal 80 Zeichen
    if len(slug) > 80:
        slug = slug[:80].rsplit('-', 1)[0]
    
    return slug


def main():
    print("=" * 60)
    print("SEO Migration: Slug-Spalte für Jobs")
    print("=" * 60)
    
    session = Session()
    
    try:
        # 1. Prüfen ob Spalte bereits existiert
        print("\n1. Prüfe ob 'slug' Spalte existiert...")
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_postings' AND column_name = 'slug'
        """))
        
        if result.fetchone():
            print("   ✓ Spalte 'slug' existiert bereits")
        else:
            print("   → Füge Spalte 'slug' hinzu...")
            session.execute(text("""
                ALTER TABLE job_postings 
                ADD COLUMN slug VARCHAR(255)
            """))
            session.commit()
            print("   ✓ Spalte 'slug' hinzugefügt")
        
        # 2. Index erstellen falls nicht vorhanden
        print("\n2. Prüfe Index auf 'slug'...")
        result = session.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'job_postings' AND indexname = 'ix_job_postings_slug'
        """))
        
        if result.fetchone():
            print("   ✓ Index existiert bereits")
        else:
            print("   → Erstelle Index...")
            session.execute(text("""
                CREATE INDEX ix_job_postings_slug ON job_postings (slug)
            """))
            session.commit()
            print("   ✓ Index erstellt")
        
        # 3. Slugs für alle Jobs generieren
        print("\n3. Generiere Slugs für bestehende Jobs...")
        result = session.execute(text("""
            SELECT id, title, location, accommodation_provided, slug
            FROM job_postings
        """))
        jobs = result.fetchall()
        
        updated = 0
        skipped = 0
        
        for job in jobs:
            job_id, title, location, accommodation, existing_slug = job
            
            if existing_slug:
                skipped += 1
                continue
            
            slug = generate_job_slug(title, location, accommodation)
            
            session.execute(text("""
                UPDATE job_postings 
                SET slug = :slug 
                WHERE id = :id
            """), {"slug": slug, "id": job_id})
            
            updated += 1
            print(f"   → Job {job_id}: {slug}")
        
        session.commit()
        
        print(f"\n   ✓ {updated} Jobs aktualisiert, {skipped} übersprungen")
        
        # 4. Zusammenfassung
        print("\n" + "=" * 60)
        print("✅ Migration erfolgreich abgeschlossen!")
        print("=" * 60)
        print("\nNeue Job-URLs haben das Format:")
        print("  /jobs/<slug>-<id>")
        print("  Beispiel: /jobs/housekeeping-hallenberg-unterkunft-12")
        print("\nAlte URLs (/jobs/<id>) werden automatisch weitergeleitet.")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Fehler: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
