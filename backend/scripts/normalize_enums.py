"""
Migration-Skript: Normalisiert alle Enum-Werte auf lowercase in der PostgreSQL-Datenbank.

Ausführen in der Render Shell:
    python scripts/normalize_enums.py

WICHTIG: Erstelle vorher ein Backup!
"""
import os
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL nicht gesetzt!")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("=== ENUM-NORMALISIERUNG AUF LOWERCASE ===\n")

# 1. Neue lowercase Enum-Werte hinzufügen (falls nicht vorhanden)
enum_additions = {
    'positiontype': ['studentenferienjob', 'saisonjob', 'workandholiday', 'fachkraft', 'ausbildung'],
    'gender': ['male', 'female', 'diverse'],
    'companyrole': ['owner', 'admin', 'member'],
    'interviewstatus': ['proposed', 'confirmed', 'declined', 'cancelled', 'completed', 'needs_new_dates'],
}

print("1. Füge fehlende lowercase Enum-Werte hinzu...")
for enum_name, values in enum_additions.items():
    for value in values:
        try:
            cur.execute(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{value}'")
            conn.commit()
        except Exception as e:
            conn.rollback()
            # Wert existiert bereits - OK
            pass

print("   ✓ Enum-Werte hinzugefügt\n")

# 2. Daten in Tabellen auf lowercase aktualisieren
print("2. Aktualisiere Tabellendaten auf lowercase...")

updates = [
    # PositionType
    ("UPDATE applicants SET position_type = 'studentenferienjob' WHERE position_type = 'STUDENTENFERIENJOB'", "applicants.position_type"),
    ("UPDATE applicants SET position_type = 'saisonjob' WHERE position_type = 'SAISONJOB'", "applicants.position_type"),
    ("UPDATE applicants SET position_type = 'workandholiday' WHERE position_type = 'WORK_AND_HOLIDAY'", "applicants.position_type"),
    ("UPDATE applicants SET position_type = 'fachkraft' WHERE position_type = 'FACHKRAFT'", "applicants.position_type"),
    ("UPDATE applicants SET position_type = 'ausbildung' WHERE position_type = 'AUSBILDUNG'", "applicants.position_type"),
    
    ("UPDATE job_postings SET position_type = 'studentenferienjob' WHERE position_type = 'STUDENTENFERIENJOB'", "job_postings.position_type"),
    ("UPDATE job_postings SET position_type = 'saisonjob' WHERE position_type = 'SAISONJOB'", "job_postings.position_type"),
    ("UPDATE job_postings SET position_type = 'workandholiday' WHERE position_type = 'WORK_AND_HOLIDAY'", "job_postings.position_type"),
    ("UPDATE job_postings SET position_type = 'fachkraft' WHERE position_type = 'FACHKRAFT'", "job_postings.position_type"),
    ("UPDATE job_postings SET position_type = 'ausbildung' WHERE position_type = 'AUSBILDUNG'", "job_postings.position_type"),
    
    ("UPDATE job_requests SET position_type = 'studentenferienjob' WHERE position_type = 'STUDENTENFERIENJOB'", "job_requests.position_type"),
    ("UPDATE job_requests SET position_type = 'saisonjob' WHERE position_type = 'SAISONJOB'", "job_requests.position_type"),
    ("UPDATE job_requests SET position_type = 'workandholiday' WHERE position_type = 'WORK_AND_HOLIDAY'", "job_requests.position_type"),
    ("UPDATE job_requests SET position_type = 'fachkraft' WHERE position_type = 'FACHKRAFT'", "job_requests.position_type"),
    ("UPDATE job_requests SET position_type = 'ausbildung' WHERE position_type = 'AUSBILDUNG'", "job_requests.position_type"),
    
    # Gender
    ("UPDATE applicants SET gender = 'male' WHERE gender = 'MALE'", "applicants.gender"),
    ("UPDATE applicants SET gender = 'female' WHERE gender = 'FEMALE'", "applicants.gender"),
    ("UPDATE applicants SET gender = 'diverse' WHERE gender = 'DIVERSE'", "applicants.gender"),
    
    # CompanyRole
    ("UPDATE company_members SET role = 'owner' WHERE role = 'OWNER'", "company_members.role"),
    ("UPDATE company_members SET role = 'admin' WHERE role = 'ADMIN'", "company_members.role"),
    ("UPDATE company_members SET role = 'member' WHERE role = 'MEMBER'", "company_members.role"),
    
    # InterviewStatus
    ("UPDATE interviews SET status = 'proposed' WHERE status = 'PROPOSED'", "interviews.status"),
    ("UPDATE interviews SET status = 'confirmed' WHERE status = 'CONFIRMED'", "interviews.status"),
    ("UPDATE interviews SET status = 'declined' WHERE status = 'DECLINED'", "interviews.status"),
    ("UPDATE interviews SET status = 'cancelled' WHERE status = 'CANCELLED'", "interviews.status"),
    ("UPDATE interviews SET status = 'completed' WHERE status = 'COMPLETED'", "interviews.status"),
    ("UPDATE interviews SET status = 'needs_new_dates' WHERE status = 'NEEDS_NEW_DATES'", "interviews.status"),
]

total_updated = 0
for sql, desc in updates:
    try:
        cur.execute(sql)
        rows = cur.rowcount
        if rows > 0:
            print(f"   ✓ {desc}: {rows} Zeilen aktualisiert")
            total_updated += rows
    except Exception as e:
        print(f"   ⚠ {desc}: {e}")
        conn.rollback()
        continue

conn.commit()
print(f"\n   Gesamt: {total_updated} Zeilen aktualisiert\n")

# 3. Verifizierung
print("3. Verifiziere Ergebnis...")
cur.execute("""
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('positiontype', 'gender', 'companyrole', 'interviewstatus')
    ORDER BY t.typname, e.enumsortorder
""")

current_enum = None
for row in cur.fetchall():
    if row[0] != current_enum:
        current_enum = row[0]
        print(f"\n   {current_enum}:")
    # Markiere Großbuchstaben-Werte
    marker = " ⚠️ (UPPERCASE)" if row[1] != row[1].lower() else ""
    print(f"     - {row[1]}{marker}")

cur.close()
conn.close()

print("\n=== MIGRATION ABGESCHLOSSEN ===")
print("\nHinweis: Die alten UPPERCASE Enum-Werte bleiben im Schema,")
print("werden aber nicht mehr verwendet. Das ist OK für PostgreSQL.")
