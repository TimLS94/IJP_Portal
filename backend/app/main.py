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

from app.api import auth, applicants, companies, jobs, applications, documents, generator, admin, blog, account, job_requests, contact, company_members, anabin, interviews, company_requests
logger.info("API routers loaded")

# Import Models für create_all
from app.models import user, applicant, company, company_member, job_posting, application, document, blog as blog_model, password_reset, job_request, interview, company_request
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
        expired_jobs = db.query(JobPosting).filter(
            JobPosting.is_archived == False,
            JobPosting.deadline != None,
            JobPosting.deadline < today
        ).all()
        
        for job in expired_jobs:
            job.is_active = False
            job.is_archived = True
            job.archived_at = datetime.utcnow()
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle-Handler für App-Start und -Stopp"""
    logger.info("=== Running startup cleanup ===")
    cleanup_jobs()
    
    # Starte periodischen Cleanup-Task
    cleanup_task = asyncio.create_task(periodic_cleanup(6))  # Alle 6 Stunden
    
    # Starte wöchentlichen Job-Digest Task
    digest_task = asyncio.create_task(weekly_job_digest())
    
    yield
    
    # Cleanup bei Shutdown
    cleanup_task.cancel()
    digest_task.cancel()
    try:
        await cleanup_task
        await digest_task
    except asyncio.CancelledError:
        pass


# FastAPI App erstellen
app = FastAPI(
    title=settings.APP_NAME,
    description="API für das IJP Portal - Jobvermittlung für internationale Arbeitskräfte",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

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

logger.info("=== APP STARTUP COMPLETE ===")
