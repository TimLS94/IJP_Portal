"""
Skript zum Erstellen eines Admin-Benutzers.
Ausführen: python create_admin.py
"""
import sys
sys.path.insert(0, '.')

from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

# Tabellen erstellen falls nicht vorhanden
Base.metadata.create_all(bind=engine)

# Admin-Daten
ADMIN_EMAIL = "admin@ijp-portal.de"
ADMIN_PASSWORD = "admin123"  # Bitte nach erstem Login ändern!

def create_admin():
    db = SessionLocal()
    try:
        # Prüfen ob Admin bereits existiert
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"⚠️  Admin mit E-Mail {ADMIN_EMAIL} existiert bereits!")
            print(f"   Rolle: {existing.role.value}")
            return
        
        # Admin erstellen
        admin = User(
            email=ADMIN_EMAIL,
            password_hash=get_password_hash(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        
        print("✅ Admin-Benutzer erfolgreich erstellt!")
        print(f"   E-Mail: {ADMIN_EMAIL}")
        print(f"   Passwort: {ADMIN_PASSWORD}")
        print("")
        print("🔐 Bitte ändere das Passwort nach dem ersten Login!")
        
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
