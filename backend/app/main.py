from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("=== APP STARTUP: Importing modules ===")

from app.core.config import settings
logger.info("Config loaded")

from app.core.database import engine, Base, SessionLocal
logger.info("Database module loaded")

from app.api import auth, applicants, companies, jobs, applications, documents, generator, admin, blog, account, job_requests, contact, company_members
logger.info("API routers loaded")

# Import Models für create_all
from app.models import user, applicant, company, company_member, job_posting, application, document, blog as blog_model, password_reset, job_request
logger.info("Models loaded")

from app.core.seed_data import seed_database
logger.info("Seed data module loaded")

# Datenbank-Tabellen erstellen
logger.info("Creating database tables...")
Base.metadata.create_all(bind=engine)
logger.info("Database tables created")

# Testdaten einfügen (nur in Entwicklung)
if settings.DEBUG:
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

# FastAPI App erstellen
app = FastAPI(
    title=settings.APP_NAME,
    description="API für das IJP Portal - Jobvermittlung für internationale Arbeitskräfte",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
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
