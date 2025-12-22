from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api import auth, applicants, companies, jobs, applications, documents, generator, admin, blog, account, job_requests
# Import Models für create_all
from app.models import user, applicant, company, job_posting, application, document, blog as blog_model, password_reset, job_request
from app.core.seed_data import seed_database

# Datenbank-Tabellen erstellen
Base.metadata.create_all(bind=engine)

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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
