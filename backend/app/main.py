from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging
import asyncio
from datetime import datetime, timedelta, date

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("=== APP STARTUP: Importing modules ===")

from app.core.config import settings
logger.info("Config loaded")

from app.core.database import engine, Base, SessionLocal
logger.info("Database module loaded")

from app.api import auth, applicants, companies, jobs, applications, documents, generator, admin, blog, account, job_requests, contact, company_members, anabin, interviews, company_requests, sales, facebook, google_auth, files, notifications, ba_scraper, ijp, partner
logger.info("API routers loaded")

# Import Models für create_all
from app.models import user, applicant, company, company_member, job_posting, application, document, blog as blog_model, password_reset, job_request, interview, company_request, facebook_post, ijp as ijp_model  # noqa: F401 (needed for create_all)
logger.info("Models loaded")

from app.core.seed_data import seed_database
logger.info("Seed data module loaded")

# Datenbank-Tabellen erstellen
logger.info("Creating database tables...")
Base.metadata.create_all(bind=engine)
logger.info("Database tables created")

# SEO: Slug-Spalte hinzufügen falls nicht vorhanden
def ensure_slug_column():
    """Fügt die slug Spalte zur job_postings Tabelle hinzu falls nicht vorhanden"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Prüfen ob Spalte existiert
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_postings' AND column_name = 'slug'
        """))
        if not result.fetchone():
            logger.info("Adding 'slug' column to job_postings table...")
            db.execute(text("ALTER TABLE job_postings ADD COLUMN slug VARCHAR(255)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_job_postings_slug ON job_postings (slug)"))
            db.commit()
            logger.info("'slug' column added successfully")
        else:
            logger.info("'slug' column already exists")
    except Exception as e:
        logger.error(f"Error adding slug column: {e}")
        db.rollback()
    finally:
        db.close()

ensure_slug_column()

# Google OAuth: google_id Spalte hinzufügen falls nicht vorhanden
def ensure_google_id_column():
    """Fügt die google_id Spalte zur users Tabelle hinzu falls nicht vorhanden"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Prüfen ob Spalte existiert
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'google_id'
        """))
        if not result.fetchone():
            logger.info("Adding 'google_id' column to users table...")
            db.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"))
            db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"))
            # password_hash nullable machen für OAuth-User
            db.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
            db.commit()
            logger.info("'google_id' column added successfully")
        else:
            logger.info("'google_id' column already exists")
    except Exception as e:
        logger.error(f"Error adding google_id column: {e}")
        db.rollback()
    finally:
        db.close()

ensure_google_id_column()


def ensure_new_application_columns():
    """Fügt neue Spalten zur applications Tabelle hinzu falls nicht vorhanden"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # is_filtered: Score-Filter Flag (Boolean, default False)
        try:
            db.execute(text("ALTER TABLE applications ADD COLUMN is_filtered BOOLEAN DEFAULT FALSE"))
            db.commit()
            logger.info("'is_filtered' column added to applications table")
        except Exception:
            db.rollback()  # Spalte existiert bereits oder anderer Fehler - OK

    except Exception as e:
        logger.error(f"Error in ensure_new_application_columns: {e}")
        db.rollback()
    finally:
        db.close()


ensure_new_application_columns()


def ensure_external_job_columns():
    """Fügt Spalten für externe Jobs (BA-Scraper) hinzu, falls noch nicht vorhanden."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db_url = str(engine.url)
        is_sqlite = db_url.startswith("sqlite")

        new_columns = [
            ("job_postings", "is_external", "BOOLEAN DEFAULT FALSE"),
            ("job_postings", "external_source", "VARCHAR(50)"),
            ("job_postings", "external_url", "VARCHAR(500)"),
            ("job_postings", "external_id", "VARCHAR(100)"),
            ("job_postings", "external_employer_name", "VARCHAR(255)"),
            ("companies", "is_scraped", "BOOLEAN DEFAULT FALSE"),
        ]
        allowed_tables = {t for t, _, _ in new_columns}
        allowed_cols = {c for _, c, _ in new_columns}

        for table, col, col_def in new_columns:
            assert table in allowed_tables and col in allowed_cols
            try:
                if is_sqlite:
                    result = db.execute(text(f"PRAGMA table_info({table})"))
                    existing = {row[1] for row in result.fetchall()}
                    if col not in existing:
                        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                        db.commit()
                        logger.info(f"Spalte '{col}' zu '{table}' hinzugefügt")
                else:
                    # PostgreSQL: parametrisierte SELECT-Query
                    result = db.execute(text("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = :table AND column_name = :col
                    """), {"table": table, "col": col})
                    if not result.fetchone():
                        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                        db.commit()
                        logger.info(f"Spalte '{col}' zu '{table}' hinzugefügt (PostgreSQL)")
            except Exception as e:
                db.rollback()
                logger.debug(f"Spalte '{col}' existiert bereits oder Fehler: {e}")

        # Index für externe Job-Deduplizierung (funktioniert für beide DBs)
        try:
            db.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_job_postings_external_id ON job_postings (external_id)"
            ))
            db.commit()
        except Exception:
            db.rollback()

    except Exception as exc:
        logger.error(f"Fehler in ensure_external_job_columns: {exc}")
        db.rollback()
    finally:
        db.close()


ensure_external_job_columns()


def ensure_applicant_invite_columns():
    """Fügt Spalten für Bewerber-Einladungs-Tracking hinzu, falls noch nicht vorhanden."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db_url = str(engine.url)
        is_sqlite = db_url.startswith("sqlite")

        new_columns = [
            ("applicants", "invite_source", "VARCHAR(255)"),
            ("applicants", "invite_source_country", "VARCHAR(100)"),
            ("applicants", "invite_token_id", "INTEGER"),
        ]
        allowed_tables = {t for t, _, _ in new_columns}
        allowed_cols = {c for _, c, _ in new_columns}

        for table, col, col_def in new_columns:
            assert table in allowed_tables and col in allowed_cols
            try:
                if is_sqlite:
                    result = db.execute(text(f"PRAGMA table_info({table})"))
                    existing = {row[1] for row in result.fetchall()}
                    if col not in existing:
                        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                        db.commit()
                        logger.info(f"Spalte '{col}' zu '{table}' hinzugefügt")
                else:
                    # PostgreSQL: parametrisierte SELECT-Query
                    result = db.execute(text("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = :table AND column_name = :col
                    """), {"table": table, "col": col})
                    if not result.fetchone():
                        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                        db.commit()
                        logger.info(f"Spalte '{col}' zu '{table}' hinzugefügt (PostgreSQL)")
            except Exception as e:
                db.rollback()
                logger.debug(f"Spalte '{col}' existiert bereits oder Fehler: {e}")

    except Exception as exc:
        logger.error(f"Fehler in ensure_applicant_invite_columns: {exc}")
        db.rollback()
    finally:
        db.close()


ensure_applicant_invite_columns()


def ensure_published_at_column():
    """Fügt published_at Spalte zu job_postings hinzu und befüllt sie für aktive Stellen"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'job_postings' AND column_name = 'published_at'
        """))
        if not result.fetchone():
            logger.info("Adding 'published_at' column to job_postings table...")
            db.execute(text("ALTER TABLE job_postings ADD COLUMN published_at TIMESTAMP WITH TIME ZONE"))
            db.execute(text("""
                UPDATE job_postings
                SET published_at = created_at
                WHERE is_active = TRUE AND published_at IS NULL
            """))
            db.commit()
            logger.info("'published_at' column added and backfilled successfully")
        else:
            logger.info("'published_at' column already exists")
    except Exception as e:
        logger.error(f"Error adding published_at column: {e}")
        db.rollback()
    finally:
        db.close()

ensure_published_at_column()


def ensure_external_click_count_column():
    """Fügt external_click_count Spalte zu job_postings hinzu"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'job_postings' AND column_name = 'external_click_count'
        """))
        if not result.fetchone():
            logger.info("Adding 'external_click_count' column to job_postings table...")
            db.execute(text("ALTER TABLE job_postings ADD COLUMN external_click_count INTEGER DEFAULT 0"))
            db.commit()
            logger.info("'external_click_count' column added successfully")
        else:
            logger.info("'external_click_count' column already exists")
    except Exception as e:
        logger.error(f"Error adding external_click_count column: {e}")
        db.rollback()
    finally:
        db.close()

ensure_external_click_count_column()


def ensure_notification_key_columns():
    """Fügt notification_key und notification_params Spalten zur notifications Tabelle hinzu"""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'notification_key'
        """))
        if not result.fetchone():
            logger.info("Adding 'notification_key' and 'notification_params' columns to notifications table...")
            db.execute(text("ALTER TABLE notifications ADD COLUMN notification_key VARCHAR(100)"))
            db.execute(text("ALTER TABLE notifications ADD COLUMN notification_params TEXT"))
            db.commit()
            logger.info("notification_key columns added successfully")
        else:
            logger.info("'notification_key' column already exists")
    except Exception as e:
        logger.error(f"Error adding notification_key columns: {e}")
        db.rollback()
    finally:
        db.close()

ensure_notification_key_columns()


def fix_active_draft_jobs():
    """Setzt is_draft=False für Jobs die aktiviert wurden aber noch als Draft markiert sind."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        result = db.execute(text(
            "UPDATE job_postings SET is_draft = FALSE, "
            "published_at = COALESCE(published_at, updated_at, created_at) "
            "WHERE is_active = TRUE AND is_draft = TRUE AND is_archived = FALSE"
        ))
        if result.rowcount > 0:
            db.commit()
            import logging
            logging.getLogger(__name__).info(f"fix_active_draft_jobs: {result.rowcount} Jobs korrigiert")
    except Exception:
        db.rollback()
    finally:
        db.close()

fix_active_draft_jobs()


def ensure_blog_language_column():
    """Fügt language-Spalte zu blog_posts hinzu falls noch nicht vorhanden."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text(
            "ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'de'"
        ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

ensure_blog_language_column()


def seed_ijp_templates_on_startup():
    """Schreibt fehlende IJP-Vorlagen in die DB (nur beim allerersten Start)."""
    db = SessionLocal()
    try:
        from app.api.ijp import seed_ijp_templates
        seed_ijp_templates(db)
    except Exception as e:
        logger.error(f"Fehler beim Seeden der IJP-Vorlagen: {e}")
    finally:
        db.close()


seed_ijp_templates_on_startup()


def ensure_crm_columns():
    """Fügt CRM-Spalten zu ijp_betriebe hinzu und erstellt crm_contacts Tabelle."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        new_cols = [
            ("ijp_betriebe", "website", "VARCHAR(500)"),
            ("ijp_betriebe", "industry", "VARCHAR(100)"),
            ("ijp_betriebe", "status", "VARCHAR(50)"),
            ("ijp_betriebe", "country", "VARCHAR(100)"),
            ("ijp_betriebe", "notes", "TEXT"),
        ]
        allowed_tables = {t for t, _, _ in new_cols}
        allowed_cols = {c for _, c, _ in new_cols}
        for table, col, col_def in new_cols:
            assert table in allowed_tables and col in allowed_cols
            try:
                result = db.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = :table AND column_name = :col
                """), {"table": table, "col": col})
                if not result.fetchone():
                    db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                    db.commit()
                    logger.info(f"CRM: Spalte '{col}' zu '{table}' hinzugefügt")
            except Exception as e:
                db.rollback()
                logger.debug(f"CRM: Spalte '{col}' — {e}")

        # Nullable constraints für bestehende Pflichtfelder
        for col in ("contact_person", "street", "postal_code", "city"):
            try:
                db.execute(text(f"ALTER TABLE ijp_betriebe ALTER COLUMN {col} DROP NOT NULL"))
                db.commit()
            except Exception:
                db.rollback()

        # crm_contacts Tabelle
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS crm_contacts (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES ijp_betriebe(id) ON DELETE CASCADE,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                salutation VARCHAR(20),
                title VARCHAR(100),
                department VARCHAR(100),
                email VARCHAR(255),
                phone VARCHAR(50),
                mobile VARCHAR(50),
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        db.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_crm_contacts_company_id ON crm_contacts (company_id)"
        ))
        db.commit()
        logger.info("CRM: crm_contacts Tabelle bereit")
    except Exception as e:
        logger.error(f"Fehler in ensure_crm_columns: {e}")
        db.rollback()
    finally:
        db.close()


ensure_crm_columns()


def ensure_job_request_public_status_column():
    """Fügt public_status Spalte zu job_requests hinzu."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'job_requests' AND column_name = 'public_status'
        """))
        if not result.fetchone():
            db.execute(text("ALTER TABLE job_requests ADD COLUMN public_status VARCHAR(100) DEFAULT NULL"))
            db.commit()
            logger.info("job_requests: Spalte 'public_status' hinzugefügt")
    except Exception as e:
        db.rollback()
        logger.debug(f"job_requests public_status: {e}")
    finally:
        db.close()


ensure_job_request_public_status_column()


def ensure_partner_links_table():
    """Erstellt die partner_links Tabelle falls sie noch nicht existiert."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS partner_links (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                partner_source VARCHAR(255) NOT NULL,
                token VARCHAR(64) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                notes VARCHAR(500),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_accessed_at TIMESTAMP WITH TIME ZONE
            )
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_partner_links_token ON partner_links (token)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_partner_links_partner_source ON partner_links (partner_source)"))
        db.commit()
        logger.info("partner_links: Tabelle sichergestellt")
    except Exception as e:
        db.rollback()
        logger.debug(f"partner_links: {e}")
    finally:
        db.close()


ensure_partner_links_table()


def ensure_company_premium_column():
    """Fügt is_premium zu companies hinzu. Bestehende Firmen werden einmalig
    auf Premium gesetzt (Bestandskunden), neue Firmen sind standardmäßig False."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'companies' AND column_name = 'is_premium'
        """))
        if not result.fetchone():
            db.execute(text("ALTER TABLE companies ADD COLUMN is_premium BOOLEAN DEFAULT FALSE"))
            # Bestandskunden: alle bisher existierenden Firmen auf Premium
            db.execute(text("UPDATE companies SET is_premium = TRUE"))
            db.commit()
            logger.info("companies: Spalte 'is_premium' hinzugefügt, Bestandsfirmen auf Premium gesetzt")
    except Exception as e:
        db.rollback()
        logger.debug(f"companies is_premium: {e}")
    finally:
        db.close()


ensure_company_premium_column()


def ensure_job_promotions_table():
    """Erstellt die job_promotions Tabelle und last_boosted_at auf job_postings."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS job_promotions (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
                kind VARCHAR(20) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_job_promotions_company ON job_promotions (company_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_job_promotions_created ON job_promotions (created_at)"))
        res = db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'job_postings' AND column_name = 'last_boosted_at'
        """))
        if not res.fetchone():
            db.execute(text("ALTER TABLE job_postings ADD COLUMN last_boosted_at TIMESTAMP WITH TIME ZONE"))
        db.commit()
        logger.info("job_promotions: Tabelle + last_boosted_at sichergestellt")
    except Exception as e:
        db.rollback()
        logger.debug(f"job_promotions: {e}")
    finally:
        db.close()


ensure_job_promotions_table()


def backfill_is_filtered():
    """
    Setzt is_filtered korrekt für bestehende Bewerbungen:
    - Hat die Firma auto_reject aktiviert und der Score liegt unter dem Schwellenwert → is_filtered=True
    - Für Bewerbungen ohne gespeicherten Score wird der Score live berechnet und gespeichert.
    """
    db = SessionLocal()
    try:
        from app.models.company import Company
        from app.models.job_posting import JobPosting
        from app.models.application import Application
        from app.services.matching_service import calculate_match_score
        from app.services.settings_service import is_company_matching_enabled

        if not is_company_matching_enabled(db):
            return

        companies = db.query(Company).filter(Company.auto_reject_enabled == True).all()
        total_updated = 0

        for company in companies:
            threshold = company.auto_reject_threshold or 50

            # Alle nicht-gefilterten Bewerbungen dieser Firma
            apps = db.query(Application).join(
                JobPosting, Application.job_posting_id == JobPosting.id
            ).filter(
                JobPosting.company_id == company.id,
                Application.is_filtered == False
            ).all()

            for app in apps:
                score = app.match_score

                # Score fehlt → live berechnen und persistieren
                if score is None and app.applicant and app.job_posting:
                    try:
                        result = calculate_match_score(app.applicant, app.job_posting)
                        score = int(round(result.get('total_score', 0)))
                        app.match_score = score
                    except Exception:
                        continue

                if score is not None and score < threshold:
                    app.is_filtered = True
                    total_updated += 1

        if total_updated > 0:
            db.commit()
            logger.info(f"Backfill: {total_updated} Bewerbung(en) als gefiltert markiert")

    except Exception as e:
        logger.error(f"Error in backfill_is_filtered: {e}")
        db.rollback()
    finally:
        db.close()


backfill_is_filtered()


# Testdaten einfügen (nur in Entwicklung)
if settings.DEBUG:
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


def cleanup_jobs():
    """
    Cleanup-Funktion für Jobs:
    1. Archiviert Stellen, deren Deadline abgelaufen ist
    2. Löscht Stellen endgültig, die seit mehr als X Tagen archiviert sind (konfigurierbar, Standard: 90 Tage)
    """
    db = SessionLocal()
    try:
        from app.models.job_posting import JobPosting
        from app.models.application import Application
        from app.services.settings_service import get_setting
        
        today = date.today()
        
        # Archiv-Löschfrist aus Einstellungen laden (Standard: 90 Tage = 3 Monate)
        archive_deletion_days = get_setting(db, "archive_deletion_days", 90)
        deletion_cutoff = datetime.utcnow() - timedelta(days=archive_deletion_days)
        
        logger.info(f"Job-Cleanup: Archiv-Löschfrist ist {archive_deletion_days} Tage")
        
        # 1. Abgelaufene Stellen archivieren
        from app.models.job_posting import JobDeletionReason
        
        expired_jobs = db.query(JobPosting).filter(
            JobPosting.is_archived == False,
            JobPosting.deadline != None,
            JobPosting.deadline < today
        ).all()
        
        for job in expired_jobs:
            job.is_active = False
            job.is_archived = True
            job.archived_at = datetime.utcnow()
            job.deletion_reason = JobDeletionReason.EXPIRED
            job.deleted_at = datetime.utcnow()
            logger.info(f"Job {job.id} '{job.title}' archiviert (Deadline abgelaufen)")
        
        if expired_jobs:
            db.commit()
            logger.info(f"{len(expired_jobs)} Jobs wegen abgelaufener Deadline archiviert")
        
        # 2. Alte Archive endgültig löschen (nach konfigurierbarer Frist)
        old_archived_jobs = db.query(JobPosting).filter(
            JobPosting.is_archived == True,
            JobPosting.archived_at != None,
            JobPosting.archived_at < deletion_cutoff
        ).all()
        
        deleted_count = 0
        for job in old_archived_jobs:
            # Bewerbungen löschen
            db.query(Application).filter(Application.job_posting_id == job.id).delete()
            db.delete(job)
            deleted_count += 1
            logger.info(f"Job {job.id} '{job.title}' endgültig gelöscht ({archive_deletion_days} Tage im Archiv)")
        
        if deleted_count > 0:
            db.commit()
            logger.info(f"{deleted_count} alte archivierte Jobs endgültig gelöscht")
            
    except Exception as e:
        logger.error(f"Fehler beim Job-Cleanup: {e}")
        db.rollback()
    finally:
        db.close()


async def periodic_cleanup(interval_hours: int = 6):
    """Background-Task für regelmäßiges Cleanup"""
    while True:
        await asyncio.sleep(interval_hours * 60 * 60)  # Warte interval_hours Stunden
        logger.info("Starte periodisches Job-Cleanup...")
        cleanup_jobs()


async def weekly_job_digest():
    """Background-Task für wöchentliche Job-Digest E-Mails (konfigurierbare Wochentage und Uhrzeit)"""
    from datetime import datetime, timedelta
    from app.core.database import SessionLocal
    from app.services.settings_service import get_setting
    
    while True:
        # Hole aktuelle Einstellungen
        db = SessionLocal()
        try:
            digest_days = get_setting(db, "weekly_digest_days", [1])  # Default: Montag
            digest_hour = get_setting(db, "weekly_digest_hour", 9)    # Default: 9:00 UTC
            digest_enabled = get_setting(db, "weekly_digest_enabled", True)
        finally:
            db.close()
        
        if not digest_enabled or not digest_days:
            # Wenn deaktiviert, warte 1 Stunde und prüfe erneut
            await asyncio.sleep(3600)
            continue
        
        # Berechne Zeit bis zum nächsten Versand-Zeitpunkt
        now = datetime.utcnow()
        current_weekday = now.weekday()  # 0=Montag, 6=Sonntag
        # Konvertiere zu JS-Format (0=Sonntag) für Vergleich
        current_weekday_js = (current_weekday + 1) % 7
        
        # Finde nächsten passenden Tag
        days_to_wait = None
        for i in range(8):  # Max 7 Tage + heute
            check_day = (current_weekday_js + i) % 7
            if check_day in digest_days:
                if i == 0 and now.hour >= digest_hour:
                    continue  # Heute schon vorbei
                days_to_wait = i
                break
        
        if days_to_wait is None:
            days_to_wait = 1  # Fallback
        
        next_send = now.replace(hour=digest_hour, minute=0, second=0, microsecond=0) + timedelta(days=days_to_wait)
        wait_seconds = max(0, (next_send - now).total_seconds())
        
        day_names = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
        logger.info(f"Weekly digest scheduled for {next_send} (in {wait_seconds/3600:.1f} hours)")
        await asyncio.sleep(wait_seconds)
        
        logger.info("Starte wöchentlichen Job-Digest...")
        try:
            from app.services.job_notification_service import send_weekly_job_digest
            db = SessionLocal()
            try:
                emails_sent = send_weekly_job_digest(db)
                logger.info(f"Weekly digest: {emails_sent} E-Mails gesendet")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Fehler beim Weekly Digest: {e}")


async def company_applicant_digest():
    """Background-Task für tägliche Bewerber-Digest E-Mails an Firmen"""
    from datetime import datetime, timedelta
    from app.core.database import SessionLocal
    from app.models.company import Company
    from app.models.application import Application
    from app.models.job_posting import JobPosting
    from app.models.applicant import Applicant
    from app.services.email_service import email_service
    from app.services.matching_service import calculate_match_score
    
    while True:
        now = datetime.utcnow()
        current_weekday = now.weekday()  # 0=Mo, 6=So
        current_hour = now.hour
        
        db = SessionLocal()
        try:
            # Alle Firmen mit aktiviertem Digest laden
            companies = db.query(Company).filter(
                Company.applicant_digest_enabled == True,
                Company.is_scraped == False,
            ).all()
            
            for company in companies:
                # Prüfe ob heute ein Digest-Tag ist
                digest_days = company.applicant_digest_days or "1,2,3,4,5"
                digest_days_list = [int(d) for d in digest_days.split(",") if d.strip()]
                
                # Konvertiere Python-Wochentag (0=Mo) zu unserem Format (1=Mo)
                current_day_num = current_weekday + 1  # 1=Mo, 7=So
                if current_day_num == 7:
                    current_day_num = 0  # Sonntag = 0
                
                if current_day_num not in digest_days_list:
                    continue
                
                # Prüfe ob es die richtige Stunde ist
                digest_hour = company.applicant_digest_hour or 8
                if current_hour != digest_hour:
                    continue
                
                # Hole neue Bewerbungen der letzten 24h
                yesterday = now - timedelta(hours=24)
                
                new_applications = db.query(Application).join(
                    JobPosting, Application.job_posting_id == JobPosting.id
                ).filter(
                    JobPosting.company_id == company.id,
                    Application.applied_at >= yesterday
                ).all()
                
                if not new_applications:
                    continue
                
                # Bewerber-Daten mit Matching Score sammeln
                applicants_data = []
                for app in new_applications:
                    applicant = app.applicant
                    job = app.job_posting
                    
                    if not applicant:
                        continue
                    
                    # Matching Score berechnen
                    try:
                        match_result = calculate_match_score(applicant, job)
                        matching_score = match_result.get('total_score', 0)
                    except:
                        matching_score = 0
                    
                    applicants_data.append({
                        'name': f"{applicant.first_name} {applicant.last_name}",
                        'job_title': job.title if job else '-',
                        'matching_score': matching_score,
                        'applied_at': app.applied_at.strftime('%d.%m.%Y') if app.applied_at else '-',
                        'application_id': app.id
                    })
                
                if applicants_data:
                    # E-Mail senden
                    email_service.send_company_applicant_digest(
                        to_email=company.user.email,
                        company_name=company.company_name,
                        applicants_data=applicants_data
                    )
                    logger.info(f"Bewerber-Digest an {company.company_name} gesendet ({len(applicants_data)} Bewerber)")
        
        except Exception as e:
            logger.error(f"Fehler beim Company Applicant Digest: {e}")
        finally:
            db.close()
        
        # Warte 1 Stunde bis zur nächsten Prüfung
        await asyncio.sleep(3600)


async def weekly_blog_writer():
    """Background-Task: Generiert automatisch Blog-Posts mit Claude (Intervall und Modus konfigurierbar).
    Restart-sicher: speichert Datum des letzten Laufs in der DB, damit ein Neustart nach dem
    geplanten Zeitpunkt keinen Run überspringt."""
    from datetime import datetime, timedelta, date
    from app.core.database import SessionLocal
    from app.services.settings_service import get_setting, set_setting

    while True:
        db = SessionLocal()
        try:
            enabled = get_setting(db, "blog_writer_enabled", True)
            interval_days = int(get_setting(db, "blog_writer_interval_days", 7))
            auto_publish = get_setting(db, "blog_writer_auto_publish", False)
            run_hour = int(get_setting(db, "blog_writer_hour", 8))
            weekdays = get_setting(db, "blog_writer_weekdays", [0])  # 0=Montag
            last_run_str = get_setting(db, "blog_writer_last_run_date", "")  # "YYYY-MM-DD"
        finally:
            db.close()

        if not enabled:
            await asyncio.sleep(3600)
            continue

        now = datetime.utcnow()
        today_str = now.date().isoformat()
        already_ran_today = last_run_str == today_str

        if interval_days in (7, 14) and weekdays:
            current_wd = now.weekday()  # 0=Montag
            days_to_wait = None
            for i in range(interval_days + 1):
                check_wd = (current_wd + i) % 7
                if check_wd in weekdays:
                    if i == 0:
                        if already_ran_today:
                            # Heute bereits gelaufen → nächsten passenden Tag suchen
                            continue
                        if now.hour < run_hour:
                            # Heute noch nicht an der Reihe (vor Uhrzeit)
                            days_to_wait = 0
                            break
                        # Heute ist der richtige Tag, Uhrzeit ist schon vorbei,
                        # aber noch nicht gelaufen (z.B. nach Deployment) → sofort ausführen
                        days_to_wait = 0
                        break
                    days_to_wait = i
                    break
            if days_to_wait is None:
                days_to_wait = interval_days
        else:
            # Tagesintervall-Modus
            if already_ran_today:
                days_to_wait = interval_days
            else:
                last_run_date = date.fromisoformat(last_run_str) if last_run_str else date.min
                days_since = (now.date() - last_run_date).days
                days_to_wait = max(0, interval_days - days_since)

        if days_to_wait == 0 and now.hour >= run_hour and not already_ran_today:
            # Sofort ausführen (catch-up nach Neustart)
            wait_seconds = 0
        elif days_to_wait == 0:
            # Heute, aber noch vor run_hour warten
            next_run = now.replace(hour=run_hour, minute=0, second=0, microsecond=0)
            wait_seconds = max(60, (next_run - now).total_seconds())
        else:
            next_run = (now + timedelta(days=days_to_wait)).replace(hour=run_hour, minute=0, second=0, microsecond=0)
            wait_seconds = max(60, (next_run - now).total_seconds())

        if wait_seconds > 0:
            logger.info(f"Blog-Writer: nächster Lauf in {wait_seconds/3600:.1f}h (Intervall: {interval_days}d, Auto-Publish: {auto_publish})")
            await asyncio.sleep(wait_seconds)
        else:
            logger.info("Blog-Writer: catch-up nach Neustart, starte sofort")

        logger.info("Starte automatischen Blog-Writer...")
        try:
            from app.services.blog_writer_service import generate_and_publish_blog_post
            db = SessionLocal()
            try:
                result = await generate_and_publish_blog_post(db, auto_publish=auto_publish)
                if result:
                    mode = "veröffentlicht" if auto_publish else "als Entwurf gespeichert"
                    logger.info(f"✅ Blog-Writer: '{result['title']}' {mode}")
                    set_setting(db, "blog_writer_last_run_date", datetime.utcnow().date().isoformat())
                    db.commit()
                else:
                    logger.warning("Blog-Writer: kein Post generiert (API-Key fehlt?)")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Fehler im Blog-Writer: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle-Handler für App-Start und -Stopp"""
    logger.info("=== Running startup cleanup ===")
    cleanup_jobs()

    # Starte periodischen Cleanup-Task
    cleanup_task = asyncio.create_task(periodic_cleanup(6))  # Alle 6 Stunden

    # Starte wöchentlichen Job-Digest Task
    digest_task = asyncio.create_task(weekly_job_digest())

    # Starte Firmen-Bewerber-Digest Task
    company_digest_task = asyncio.create_task(company_applicant_digest())

    # Starte wöchentlichen Blog-Writer (jeden Montag 08:00 UTC)
    blog_writer_task = asyncio.create_task(weekly_blog_writer())

    yield

    # Cleanup bei Shutdown
    cleanup_task.cancel()
    digest_task.cancel()
    company_digest_task.cancel()
    blog_writer_task.cancel()
    try:
        await cleanup_task
        await digest_task
        await company_digest_task
        await blog_writer_task
    except asyncio.CancelledError:
        pass


# FastAPI App erstellen
app = FastAPI(
    title=settings.APP_NAME,
    description="API für das IJP Portal - Jobvermittlung für internationale Arbeitskräfte",
    version="1.0.0",
    # API-Dokumentation nur im Debug-Modus sichtbar
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Security-Header-Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware - Eingeschränkte Methods für bessere Sicherheit
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Disposition"],  # Für Datei-Downloads
)

# Upload-Verzeichnis erstellen
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Static files für Uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API Router einbinden
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(applicants.router, prefix=settings.API_V1_PREFIX)
app.include_router(companies.router, prefix=settings.API_V1_PREFIX)
app.include_router(jobs.router, prefix=settings.API_V1_PREFIX)
app.include_router(applications.router, prefix=settings.API_V1_PREFIX)
app.include_router(documents.router, prefix=settings.API_V1_PREFIX)
app.include_router(generator.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(blog.router, prefix=settings.API_V1_PREFIX)
app.include_router(account.router, prefix=settings.API_V1_PREFIX)
app.include_router(job_requests.router, prefix=settings.API_V1_PREFIX)
app.include_router(contact.router, prefix=settings.API_V1_PREFIX)
app.include_router(company_members.router, prefix=settings.API_V1_PREFIX)
app.include_router(anabin.router, prefix=settings.API_V1_PREFIX)
app.include_router(interviews.router, prefix=settings.API_V1_PREFIX)
app.include_router(company_requests.router, prefix=settings.API_V1_PREFIX)
app.include_router(sales.router, prefix=settings.API_V1_PREFIX)
app.include_router(facebook.router, prefix=settings.API_V1_PREFIX)
app.include_router(google_auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(files.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)
app.include_router(ba_scraper.router, prefix=settings.API_V1_PREFIX)
app.include_router(ijp.router, prefix=settings.API_V1_PREFIX)
app.include_router(partner.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "message": "Willkommen beim IJP Portal API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ============ FEEDBACK ENDPOINT ============
from pydantic import BaseModel
from typing import Optional

class FeedbackRequest(BaseModel):
    type: str  # bug, idea, question
    message: str
    page_url: Optional[str] = None
    user_email: Optional[str] = None
    user_agent: Optional[str] = None

@app.post(f"{settings.API_V1_PREFIX}/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """Empfängt Feedback von Nutzern und sendet es per E-Mail"""
    from app.services.email_service import email_service
    
    type_labels = {
        "bug": "🐛 Fehler",
        "idea": "💡 Verbesserungsvorschlag", 
        "question": "❓ Frage"
    }
    
    subject = f"{type_labels.get(feedback.type, feedback.type)} - JobOn Feedback"
    
    html_content = f"""
    <h2>{type_labels.get(feedback.type, feedback.type)}</h2>
    <p><strong>Nachricht:</strong></p>
    <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">{feedback.message}</p>
    <hr>
    <p><strong>Seite:</strong> {feedback.page_url or 'Nicht angegeben'}</p>
    <p><strong>User:</strong> {feedback.user_email or 'Anonym'}</p>
    <p><strong>Browser:</strong> {feedback.user_agent[:100] if feedback.user_agent else 'Nicht angegeben'}...</p>
    """
    
    try:
        await email_service.send_email(
            to_email="business@jobon.work",
            subject=subject,
            html_content=html_content
        )
        return {"success": True, "message": "Feedback erhalten"}
    except Exception as e:
        logger.error(f"Feedback email failed: {e}")
        # Trotzdem OK zurückgeben - Frontend hat Fallback
        return {"success": True, "message": "Feedback erhalten (Email-Versand fehlgeschlagen)"}


logger.info("=== APP STARTUP COMPLETE ===")
