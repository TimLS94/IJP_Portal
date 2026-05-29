"""
Admin-Endpunkte für den Bundesagentur für Arbeit Job-Scraper.
Nur für Admins zugänglich.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.job_posting import JobPosting
from app.services.settings_service import get_setting, set_setting
from app.services.ba_scraper_service import scrape_ba_jobs, check_configuration, backfill_descriptions
from app.services.google_indexing_service import google_indexing_service

router = APIRouter(prefix="/admin/ba-scraper", tags=["Admin BA-Scraper"])

DEFAULT_CONFIG = {
    "keywords": [],
    "location": "",
    "radius": 50,
    "max_jobs": 100,
    "angebotsart": 1,
    "ai_provider": "none",
}


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin-Rechte erforderlich")
    return current_user


class BaScraperConfig(BaseModel):
    keywords: List[str] = []
    location: str = ""
    radius: int = 50
    max_jobs: int = 100
    angebotsart: int = 1
    ai_provider: str = "none"  # "none" | "openai" | "anthropic"


class BackfillRequest(BaseModel):
    ai_provider: str = "none"


@router.get("/config")
def get_config(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Aktuelle Scraper-Konfiguration abrufen."""
    config = get_setting(db, "ba_scraper_config", DEFAULT_CONFIG)
    if not isinstance(config, dict):
        config = DEFAULT_CONFIG
    return {**DEFAULT_CONFIG, **config}


@router.put("/config")
def update_config(
    data: BaScraperConfig,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Scraper-Konfiguration speichern."""
    config = data.model_dump()
    set_setting(db, "ba_scraper_config", config, user_id=current_user.id)
    return config


@router.post("/run")
async def run_scraper(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Scraper manuell ausführen."""
    import asyncio
    config = get_setting(db, "ba_scraper_config", DEFAULT_CONFIG)
    if not isinstance(config, dict):
        config = DEFAULT_CONFIG

    try:
        result = scrape_ba_jobs(db, config)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scraper-Fehler: {str(exc)}")

    # Neue Jobs sofort bei Google zur Indexierung anmelden
    new_job_refs = result.get("new_job_refs", [])
    if new_job_refs:
        if google_indexing_service.is_configured():
            for slug, job_id in new_job_refs:
                asyncio.create_task(google_indexing_service.index_job(slug, job_id))
        else:
            # Fallback: Sitemap-Ping damit Google die neuen BA-Jobs findet
            asyncio.create_task(google_indexing_service.ping_sitemap())

    result_clean = {k: v for k, v in result.items() if k != "new_job_refs"}
    return result_clean


@router.get("/check")
def get_config_check(current_user: User = Depends(require_admin)):
    """Prüft ob BA-API und OpenAI konfiguriert sind."""
    return check_configuration()


@router.get("/stats")
def get_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Statistiken über externe Jobs und letzten Lauf."""
    total_external = db.query(JobPosting).filter(
        JobPosting.external_source == "bundesagentur",
        JobPosting.is_archived == False,
    ).count()

    return {
        "total_external_jobs": total_external,
        "last_run": get_setting(db, "ba_scraper_last_run", None),
        "last_imported": get_setting(db, "ba_scraper_last_imported", 0),
        "last_skipped": get_setting(db, "ba_scraper_last_skipped", 0),
        "last_errors": get_setting(db, "ba_scraper_last_errors", 0),
    }


@router.delete("/jobs")
def delete_all_external_jobs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Alle externen BA-Jobs löschen (zum Zurücksetzen)."""
    deleted = db.query(JobPosting).filter(
        JobPosting.external_source == "bundesagentur"
    ).delete()
    db.commit()
    return {"deleted": deleted}


@router.post("/backfill-urls")
def backfill_missing_urls(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fehlende BA-URLs aus refnr nachträglich befüllen."""
    jobs = db.query(JobPosting).filter(
        JobPosting.external_source == "bundesagentur",
        JobPosting.external_url == "",
        JobPosting.external_id.isnot(None),
    ).all()
    updated = 0
    for job in jobs:
        if job.external_id:
            job.external_url = f"https://www.arbeitsagentur.de/jobsuche/jobdetail/{job.external_id}"
            updated += 1
    db.commit()
    return {"updated": updated}


@router.post("/backfill-descriptions")
def backfill_missing_descriptions(
    body: BackfillRequest = BackfillRequest(),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Beschreibungen für bestehende BA-Jobs neu laden und strukturieren (optional mit KI)."""
    return backfill_descriptions(db, ai_provider=body.ai_provider)


# ==================== Review-Workflow (Entwürfe prüfen & freigeben) ====================

@router.get("/pending")
def get_pending_jobs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Alle BA-Jobs die als Entwurf warten und noch nicht veröffentlicht wurden."""
    jobs = db.query(JobPosting).filter(
        JobPosting.external_source == "bundesagentur",
        JobPosting.is_draft == True,
        JobPosting.is_archived == False,
    ).order_by(JobPosting.created_at.desc()).all()

    return [
        {
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "employer": j.external_employer_name,
            "position_type": j.position_type,
            "employment_type": j.employment_type,
            "salary_min": j.salary_min,
            "salary_max": j.salary_max,
            "salary_type": j.salary_type,
            "external_url": j.external_url,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]


@router.post("/approve/{job_id}")
async def approve_job(
    job_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Einzelnen BA-Job freigeben (Entwurf → aktiv)."""
    import asyncio
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.external_source == "bundesagentur",
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")

    job.is_draft = False
    job.is_active = True
    db.commit()
    db.refresh(job)

    # Google Indexing
    if google_indexing_service.is_configured():
        asyncio.create_task(google_indexing_service.index_job(job.slug, job.id))
    else:
        asyncio.create_task(google_indexing_service.ping_sitemap())

    # Bewerber benachrichtigen
    try:
        from app.services.job_notification_service import notify_applicants_about_new_job
        notify_applicants_about_new_job(job, db)
    except Exception as exc:
        logger.warning(f"Bewerber-Benachrichtigung fehlgeschlagen: {exc}")

    return {"id": job.id, "title": job.title, "approved": True}


@router.post("/approve-all")
async def approve_all_jobs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Alle wartenden BA-Jobs auf einmal freigeben."""
    import asyncio
    jobs = db.query(JobPosting).filter(
        JobPosting.external_source == "bundesagentur",
        JobPosting.is_draft == True,
        JobPosting.is_archived == False,
    ).all()

    count = 0
    for job in jobs:
        job.is_draft = False
        job.is_active = True
        count += 1
    db.commit()

    for job in jobs:
        if google_indexing_service.is_configured():
            asyncio.create_task(google_indexing_service.index_job(job.slug, job.id))
        try:
            from app.services.job_notification_service import notify_applicants_about_new_job
            notify_applicants_about_new_job(job, db)
        except Exception:
            pass

    if not google_indexing_service.is_configured() and count:
        asyncio.create_task(google_indexing_service.ping_sitemap())

    return {"approved": count}


@router.delete("/pending/{job_id}")
def delete_pending_job(
    job_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Einzelnen wartenden BA-Job löschen."""
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.external_source == "bundesagentur",
        JobPosting.is_draft == True,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden oder bereits freigegeben")
    db.delete(job)
    db.commit()
    return {"deleted": True}
