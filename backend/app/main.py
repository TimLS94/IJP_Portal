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

from app.api import auth, applicants, companies, jobs, applications, documents, generator, admin, blog, account, job_requests, contact, company_members, anabin, interviews, company_requests, sales, facebook
logger.info("API routers loaded")

# Import Models für create_all
from app.models import user, applicant, company, company_member, job_posting, application, document, blog as blog_model, password_reset, job_request, interview, company_request, facebook_post
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
                Company.applicant_digest_enabled == True
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
    
    yield
    
    # Cleanup bei Shutdown
    cleanup_task.cancel()
    digest_task.cancel()
    company_digest_task.cancel()
    try:
        await cleanup_task
        await digest_task
        await company_digest_task
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
app.include_router(sales.router, prefix=settings.API_V1_PREFIX)
app.include_router(facebook.router, prefix=settings.API_V1_PREFIX)


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
