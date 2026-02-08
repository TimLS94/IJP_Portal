from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta, date

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.applicant import PositionType
from app.schemas.job_posting import JobPostingCreate, JobPostingUpdate, JobPostingResponse, JobPostingListResponse
from app.services.settings_service import get_setting
from app.services.slug_service import generate_job_slug, extract_id_from_slug
from app.services.job_notification_service import notify_matching_applicants

# Standard-Wert falls Setting nicht existiert (wird aus DB überschrieben)
DEFAULT_MAX_DEADLINE_DAYS = 90

router = APIRouter(prefix="/jobs", tags=["Stellenangebote"])


def get_max_deadline_days(db: Session) -> int:
    """Liest die maximale Deadline aus den Admin-Settings"""
    return get_setting(db, "max_job_deadline_days", DEFAULT_MAX_DEADLINE_DAYS)


@router.get("/settings/public")
async def get_public_job_settings(db: Session = Depends(get_db)):
    """Gibt öffentliche Job-Einstellungen zurück (für Formulare)"""
    max_days = get_max_deadline_days(db)
    archive_days = get_setting(db, "archive_deletion_days", 90)
    return {
        "max_job_deadline_days": max_days,
        "archive_deletion_days": archive_days
    }


@router.get("/sitemap/urls")
async def get_sitemap_urls(db: Session = Depends(get_db)):
    """
    Gibt alle aktiven Job-URLs für die Sitemap zurück.
    Format: [{url: "/jobs/slug-id", lastmod: "2026-01-15", title: "..."}]
    """
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_archived == False
    ).all()
    
    urls = []
    for job in jobs:
        # Slug generieren falls nicht vorhanden
        if not job.slug:
            job.slug = generate_job_slug(job.title, job.location, job.accommodation_provided)
            db.commit()
        
        url_slug = f"{job.slug}-{job.id}"
        urls.append({
            "url": f"/jobs/{url_slug}",
            "lastmod": job.updated_at.strftime("%Y-%m-%d") if job.updated_at else job.created_at.strftime("%Y-%m-%d"),
            "title": job.title,
            "location": job.location,
            "id": job.id
        })
    
    return {"urls": urls, "count": len(urls)}


@router.get("/og/{slug_with_id}")
async def get_job_og_preview(slug_with_id: str, db: Session = Depends(get_db)):
    """
    Gibt eine HTML-Seite mit Open Graph Meta-Tags für Social Media Crawler zurück.
    Diese Seite leitet dann per JavaScript zur echten Job-Seite weiter.
    """
    from fastapi.responses import HTMLResponse
    
    # ID aus Slug extrahieren
    job_id = extract_id_from_slug(slug_with_id)
    if not job_id:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    
    job = db.query(JobPosting).options(
        joinedload(JobPosting.company)
    ).filter(JobPosting.id == job_id).first()
    
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Stellenangebot nicht gefunden")
    
    # Position Type Labels
    position_labels = {
        "studentenferienjob": "Studentenferienjob",
        "saisonjob": "Saisonjob",
        "fachkraft": "Fachkräfte",
        "ausbildung": "Ausbildung",
        "general": "Arbeit (Allgemein)"
    }
    
    position_type = job.position_type.value if job.position_type else "general"
    position_label = position_labels.get(position_type, "Stellenangebot")
    
    # URL und Beschreibung
    base_url = "https://www.jobon.work"
    job_url = f"{base_url}/jobs/{slug_with_id}"
    company_name = job.company.company_name if job.company else "JobOn Partner"
    
    # Kurze Beschreibung für OG
    description = job.description[:200] + "..." if job.description and len(job.description) > 200 else (job.description or "")
    description = description.replace('"', '&quot;').replace('\n', ' ')
    
    # OG Image - Firmenlogo oder Standard
    og_image = f"{base_url}/og-image.png"
    if job.company and job.company.logo and job.company.logo.startswith('http'):
        og_image = job.company.logo
    
    # Titel
    title = f"{job.title} | {position_label} in {job.location}"
    
    html_content = f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | JobOn</title>
    <meta name="description" content="{description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{job_url}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{og_image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="JobOn">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{job_url}">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{og_image}">
    
    <!-- Redirect für normale Browser -->
    <meta http-equiv="refresh" content="0; url={job_url}">
    <link rel="canonical" href="{job_url}">
    
    <style>
        body {{ font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f3f4f6; }}
        .container {{ text-align: center; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }}
        h1 {{ color: #1f2937; margin-bottom: 10px; }}
        p {{ color: #6b7280; }}
        a {{ color: #2563eb; text-decoration: none; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Weiterleitung...</h1>
        <p>Sie werden zu <strong>{job.title}</strong> weitergeleitet.</p>
        <p><a href="{job_url}">Hier klicken falls die Weiterleitung nicht funktioniert</a></p>
    </div>
    <script>window.location.href = "{job_url}";</script>
</body>
</html>"""
    
    return HTMLResponse(content=html_content, status_code=200)


@router.get("/sitemap.xml")
async def get_sitemap_xml(db: Session = Depends(get_db)):
    """
    Generiert eine vollständige Sitemap.xml mit allen aktiven Jobs.
    """
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_archived == False
    ).all()
    
    base_url = "https://www.jobon.work"
    
    # XML Header
    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        # Statische Seiten
        f'  <url><loc>{base_url}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>',
        f'  <url><loc>{base_url}/jobs</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        f'  <url><loc>{base_url}/stellenarten</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        f'  <url><loc>{base_url}/blog</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>',
        f'  <url><loc>{base_url}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>',
        f'  <url><loc>{base_url}/contact</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>',
        f'  <url><loc>{base_url}/faq</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>',
    ]
    
    # Dynamische Job-URLs
    for job in jobs:
        if not job.slug:
            job.slug = generate_job_slug(job.title, job.location, job.accommodation_provided)
            db.commit()
        
        url_slug = f"{job.slug}-{job.id}"
        lastmod = job.updated_at.strftime("%Y-%m-%d") if job.updated_at else job.created_at.strftime("%Y-%m-%d")
        xml_parts.append(f'  <url><loc>{base_url}/jobs/{url_slug}</loc><lastmod>{lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    
    xml_parts.append('</urlset>')
    
    xml_content = '\n'.join(xml_parts)
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Type": "application/xml; charset=utf-8"}
    )


@router.get("", response_model=List[JobPostingResponse])
async def list_jobs(
    position_type: Optional[PositionType] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Listet alle aktiven Stellenangebote (öffentlich)"""
    query = db.query(JobPosting).options(
        joinedload(JobPosting.company)
    ).filter(JobPosting.is_active == True)
    
    if position_type:
        query = query.filter(JobPosting.position_type == position_type)
    
    if location:
        query = query.filter(JobPosting.location.ilike(f"%{location}%"))
    
    if search:
        # Suche in Titel, Beschreibung, Ort UND Firmenname
        from app.models.company import Company
        query = query.join(JobPosting.company).filter(
            (JobPosting.title.ilike(f"%{search}%")) |
            (JobPosting.description.ilike(f"%{search}%")) |
            (JobPosting.location.ilike(f"%{search}%")) |
            (Company.company_name.ilike(f"%{search}%"))
        )
    
    jobs = query.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit).all()
    return jobs


def update_job_slug(job: JobPosting, db: Session) -> str:
    """Generiert und speichert den Slug für einen Job"""
    slug = generate_job_slug(
        title=job.title,
        location=job.location,
        accommodation=job.accommodation_provided
    )
    job.slug = slug
    db.commit()
    return slug


def get_job_url_slug(job: JobPosting) -> str:
    """Gibt den vollständigen URL-Slug zurück (slug-id)"""
    slug = job.slug or generate_job_slug(job.title, job.location, job.accommodation_provided)
    return f"{slug}-{job.id}"


@router.get("/by-slug/{slug_with_id}")
async def get_job_by_slug(slug_with_id: str, db: Session = Depends(get_db)):
    """
    SEO-freundlicher Endpoint für Jobdetails.
    URL-Format: /jobs/by-slug/housekeeping-hallenberg-unterkunft-12
    
    - Extrahiert die ID aus dem Slug
    - Prüft ob der Slug korrekt ist (canonical redirect)
    - Gibt Job-Daten + canonical_url zurück
    """
    slug_part, job_id = extract_id_from_slug(slug_with_id)
    
    if job_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden"
        )
    
    job = db.query(JobPosting).options(
        joinedload(JobPosting.company)
    ).filter(JobPosting.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden"
        )
    
    # Slug generieren falls nicht vorhanden
    if not job.slug:
        update_job_slug(job, db)
    
    # Canonical URL berechnen
    canonical_slug = get_job_url_slug(job)
    canonical_url = f"/jobs/{canonical_slug}"
    
    # Prüfen ob Redirect nötig (falscher Slug)
    needs_redirect = slug_with_id != canonical_slug
    
    # Job-Daten als Dict für erweiterte Response
    job_data = {
        "id": job.id,
        "company_id": job.company_id,
        "slug": job.slug,
        "title": job.title,
        "position_type": job.position_type.value if job.position_type else None,
        "employment_type": job.employment_type.value if job.employment_type else None,
        "description": job.description,
        "tasks": job.tasks,
        "requirements": job.requirements,
        "benefits": job.benefits,
        "location": job.location,
        "address": job.address,
        "postal_code": job.postal_code,
        "remote_possible": job.remote_possible,
        "accommodation_provided": job.accommodation_provided,
        "start_date": job.start_date,
        "end_date": job.end_date,
        "contact_person": job.contact_person,
        "contact_phone": job.contact_phone,
        "contact_email": job.contact_email,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_type": job.salary_type,
        "german_required": job.german_required.value if job.german_required else None,
        "english_required": job.english_required.value if job.english_required else None,
        "other_languages_required": job.other_languages_required,
        "additional_requirements": job.additional_requirements,
        "is_active": job.is_active,
        "is_archived": job.is_archived,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "deadline": job.deadline,
        "translations": job.translations,
        "available_languages": job.available_languages,
        "company_name": job.company.company_name if job.company else None,
        "company_logo": job.company.logo if job.company else None,
        # SEO-spezifische Felder
        "canonical_url": canonical_url,
        "url_slug": canonical_slug,
        "needs_redirect": needs_redirect,
    }
    
    return job_data


@router.post("/{job_id}/view")
async def track_job_view(job_id: int, db: Session = Depends(get_db)):
    """Zählt einen View für eine Stellenanzeige (anonym, nur Zähler)"""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden"
        )
    
    # View-Counter erhöhen
    job.view_count = (job.view_count or 0) + 1
    db.commit()
    
    return {"success": True, "view_count": job.view_count}


@router.get("/{job_id}", response_model=JobPostingResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Gibt ein Stellenangebot zurück (öffentlich) - Legacy-Endpoint für Rückwärtskompatibilität"""
    job = db.query(JobPosting).options(
        joinedload(JobPosting.company)
    ).filter(JobPosting.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden"
        )
    
    # Slug generieren falls nicht vorhanden
    if not job.slug:
        update_job_slug(job, db)
    
    return job


@router.post("", response_model=JobPostingResponse)
async def create_job(
    job_data: JobPostingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt ein neues Stellenangebot (nur Firmen)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Stellenangebote erstellen"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmen-Profil nicht gefunden"
        )
    
    job_dict = job_data.model_dump()
    
    # Deadline-Validierung: Max aus Admin-Settings
    max_deadline_days = get_max_deadline_days(db)
    if job_dict.get('deadline'):
        max_deadline = date.today() + timedelta(days=max_deadline_days)
        if job_dict['deadline'] > max_deadline:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Die Deadline darf maximal {max_deadline_days} Tage in der Zukunft liegen"
            )
        if job_dict['deadline'] < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Die Deadline darf nicht in der Vergangenheit liegen"
            )
    
    job = JobPosting(
        company_id=company.id,
        **job_dict
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # SEO: Slug generieren
    update_job_slug(job, db)
    db.refresh(job)
    
    # Job-Benachrichtigungen an passende Bewerber senden (wenn Stelle aktiv)
    if job.is_active:
        try:
            notify_matching_applicants(db, job)
        except Exception as e:
            # Fehler beim Benachrichtigen soll Job-Erstellung nicht blockieren
            import logging
            logging.getLogger(__name__).error(f"Fehler bei Job-Benachrichtigungen: {e}")
    
    return job


@router.put("/{job_id}", response_model=JobPostingResponse)
async def update_job(
    job_id: int,
    job_data: JobPostingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert ein Stellenangebot (nur eigene)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Stellenangebote bearbeiten"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden oder keine Berechtigung"
        )
    
    update_data = job_data.model_dump(exclude_unset=True)
    
    # Prüfen ob Stelle gerade aktiviert wird (war inaktiv, wird aktiv)
    was_inactive = not job.is_active
    will_be_active = update_data.get('is_active', job.is_active)
    is_being_activated = was_inactive and will_be_active
    
    # Prüfen ob Slug-relevante Felder geändert werden
    slug_fields_changed = any(
        field in update_data and getattr(job, field) != update_data[field]
        for field in ['title', 'location', 'accommodation_provided']
    )
    
    for field, value in update_data.items():
        setattr(job, field, value)
    
    db.commit()
    
    # SEO: Slug aktualisieren wenn relevante Felder geändert wurden
    if slug_fields_changed:
        update_job_slug(job, db)
    
    db.refresh(job)
    
    # Job-Benachrichtigungen senden wenn Stelle gerade aktiviert wurde
    if is_being_activated:
        try:
            notify_matching_applicants(db, job)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Fehler bei Job-Benachrichtigungen: {e}")
    
    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    permanent: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Archiviert oder löscht ein Stellenangebot (nur eigene).
    Mit permanent=true wird die Stelle endgültig gelöscht, sonst nur archiviert."""
    from app.models.application import Application
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Stellenangebote löschen"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden oder keine Berechtigung"
        )
    
    if permanent:
        # Endgültig löschen
        applications_count = db.query(Application).filter(Application.job_posting_id == job_id).count()
        db.query(Application).filter(Application.job_posting_id == job_id).delete()
        db.delete(job)
        db.commit()
        return {
            "message": "Stellenangebot endgültig gelöscht",
            "deleted_applications": applications_count
        }
    else:
        # Archivieren (soft delete)
        job.is_active = False
        job.is_archived = True
        job.archived_at = datetime.utcnow()
        db.commit()
        return {
            "message": "Stellenangebot archiviert",
            "can_be_reactivated": True
        }


@router.post("/{job_id}/reactivate", response_model=JobPostingResponse)
async def reactivate_job(
    job_id: int,
    new_deadline: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reaktiviert ein archiviertes Stellenangebot (nur eigene).
    Optional kann eine neue Deadline gesetzt werden (max 1 Monat)."""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Stellenangebote reaktivieren"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden oder keine Berechtigung"
        )
    
    if not job.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Diese Stelle ist nicht archiviert"
        )
    
    # Deadline-Validierung (aus Admin-Settings)
    max_deadline_days = get_max_deadline_days(db)
    if new_deadline:
        max_deadline = date.today() + timedelta(days=max_deadline_days)
        if new_deadline > max_deadline:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Die Deadline darf maximal {max_deadline_days} Tage in der Zukunft liegen"
            )
        if new_deadline < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Die Deadline darf nicht in der Vergangenheit liegen"
            )
        job.deadline = new_deadline
    else:
        # Standard: Max Tage ab heute
        job.deadline = date.today() + timedelta(days=max_deadline_days)
    
    job.is_active = True
    job.is_archived = False
    job.archived_at = None
    job.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(job)
    return job


@router.get("/my/jobs", response_model=List[JobPostingResponse])
async def get_my_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle eigenen Stellenangebote (nur Firmen)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können auf diesen Endpunkt zugreifen"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmen-Profil nicht gefunden"
        )
    
    jobs = db.query(JobPosting).filter(
        JobPosting.company_id == company.id,
        JobPosting.is_archived == False  # Archivierte ausblenden
    ).order_by(JobPosting.created_at.desc()).all()
    
    return jobs


@router.get("/my/jobs/archived", response_model=List[JobPostingResponse])
async def get_archived_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle archivierten Stellenangebote der Firma"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können auf diesen Endpunkt zugreifen"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmen-Profil nicht gefunden"
        )
    
    # Nur archivierte Stellen, die nicht älter als 30 Tage sind
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    jobs = db.query(JobPosting).filter(
        JobPosting.company_id == company.id,
        JobPosting.is_archived == True,
        # Nur Stellen anzeigen, die nicht zu alt zum Reaktivieren sind
        JobPosting.archived_at >= thirty_days_ago
    ).order_by(JobPosting.archived_at.desc()).all()
    
    return jobs


@router.delete("/{job_id}/permanent")
async def delete_job_permanent(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht ein archiviertes Stellenangebot endgültig (nur eigene)"""
    from app.models.application import Application
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Stellenangebote löschen"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden oder keine Berechtigung"
        )
    
    # Endgültig löschen
    applications_count = db.query(Application).filter(Application.job_posting_id == job_id).count()
    db.query(Application).filter(Application.job_posting_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {
        "message": "Stellenangebot endgültig gelöscht",
        "deleted_applications": applications_count
    }


@router.get("/{job_id}/match")
async def get_job_match_score(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Berechnet den Matching-Score zwischen Bewerber und Stelle (nur für eingeloggte Bewerber)"""
    from app.models.applicant import Applicant
    from app.services.matching_service import calculate_match_score
    from app.services.settings_service import is_applicant_matching_enabled
    
    # Feature Flag prüfen
    if not is_applicant_matching_enabled(db):
        return {"enabled": False, "message": "Matching ist derzeit deaktiviert"}
    
    # Nur für Bewerber
    if current_user.role != UserRole.APPLICANT:
        return {"enabled": False, "message": "Matching nur für Bewerber verfügbar"}
    
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return {"enabled": True, "message": "Profil unvollständig", "total_score": 0}
    
    match = calculate_match_score(applicant, job)
    return {
        "enabled": True,
        "job_id": job_id,
        **match
    }


# ========== ÜBERSETZUNG ==========

from pydantic import BaseModel

class TranslationRequest(BaseModel):
    title: str
    description: str
    tasks: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    target_lang: str  # en, es, ru
    source_lang: str = 'de'


@router.post("/translate")
async def translate_job_content(
    request: TranslationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Übersetzt Stelleninhalte mit DeepL Free API.
    Nur für Firmen verfügbar.
    """
    from app.services.translation_service import translate_job_fields, get_deepl_status
    
    # Nur für Firmen
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Übersetzungen anfordern"
        )
    
    # Prüfen ob DeepL konfiguriert ist
    deepl_status = get_deepl_status()
    if not deepl_status['configured']:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Übersetzungsservice nicht konfiguriert. Bitte DEEPL_API_KEY setzen."
        )
    
    # Übersetzen
    translated = await translate_job_fields(
        title=request.title,
        description=request.description,
        tasks=request.tasks,
        requirements=request.requirements,
        benefits=request.benefits,
        target_lang=request.target_lang,
        source_lang=request.source_lang
    )
    
    return {
        "success": True,
        "target_lang": request.target_lang,
        "translations": translated
    }


@router.get("/translate/status")
async def get_translation_status(
    current_user: User = Depends(get_current_user)
):
    """Prüft ob Übersetzungsservice verfügbar ist"""
    from app.services.translation_service import get_deepl_status
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    return get_deepl_status()
