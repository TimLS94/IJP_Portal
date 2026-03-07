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
from app.services.google_indexing_service import google_indexing_service

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
        JobPosting.is_archived == False,
        JobPosting.is_draft == False  # Entwürfe ausblenden
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


@router.get("/sitemap.xml")
async def get_sitemap_xml(db: Session = Depends(get_db)):
    """
    Generiert eine vollständige Sitemap.xml mit allen aktiven Jobs.
    """
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_archived == False,
        JobPosting.is_draft == False  # Entwürfe ausblenden
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
    ).filter(
        JobPosting.is_active == True,
        JobPosting.is_draft == False  # Entwürfe ausblenden
    )
    
    if position_type:
        query = query.filter(JobPosting.position_type == position_type)
    
    if location:
        query = query.filter(JobPosting.location.ilike(f"%{location}%"))
    
    if search:
        query = query.filter(
            (JobPosting.title.ilike(f"%{search}%")) |
            (JobPosting.description.ilike(f"%{search}%"))
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
    
    # View Count erhöhen (persistent in DB)
    job.view_count = (job.view_count or 0) + 1
    db.commit()
    
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
        "admin_translated": job.admin_translated or False,
        "admin_translated_at": job.admin_translated_at,
        "admin_translated_languages": job.admin_translated_languages or [],
        "company_name": job.company.company_name if job.company else None,
        "company_logo": job.company.logo if job.company else None,
        # Statistiken
        "view_count": job.view_count or 0,
        # SEO-spezifische Felder
        "canonical_url": canonical_url,
        "url_slug": canonical_slug,
        "needs_redirect": needs_redirect,
    }
    
    return job_data


# ========== JOB TEMPLATES (muss vor /{job_id} stehen!) ==========

@router.get("/templates")
async def get_job_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle Vorlagen der Firma"""
    from app.models.job_template import JobTemplate
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmen-Profil nicht gefunden")
    
    templates = db.query(JobTemplate).filter(
        JobTemplate.company_id == company.id
    ).order_by(JobTemplate.updated_at.desc()).all()
    
    return templates


@router.post("/templates")
async def create_job_template(
    template_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt eine neue Vorlage"""
    from app.models.job_template import JobTemplate
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmen-Profil nicht gefunden")
    
    # Name ist Pflicht
    if not template_data.get('name'):
        raise HTTPException(status_code=400, detail="Vorlagenname ist erforderlich")
    
    # Hilfsfunktion: Leere Strings zu None konvertieren
    def clean_value(val, is_int=False):
        if val == '' or val is None:
            return None
        if is_int:
            try:
                return int(val)
            except (ValueError, TypeError):
                return None
        return val
    
    template = JobTemplate(
        company_id=company.id,
        name=template_data.get('name'),
        title=clean_value(template_data.get('title')),
        position_type=clean_value(template_data.get('position_type')) or 'general',
        position_types=template_data.get('position_types', []),
        employment_type=clean_value(template_data.get('employment_type')),
        description=clean_value(template_data.get('description')),
        tasks=clean_value(template_data.get('tasks')),
        requirements=clean_value(template_data.get('requirements')),
        benefits=clean_value(template_data.get('benefits')),
        location=clean_value(template_data.get('location')),
        address=clean_value(template_data.get('address')),
        postal_code=clean_value(template_data.get('postal_code')),
        remote_possible=template_data.get('remote_possible', False),
        accommodation_provided=template_data.get('accommodation_provided', False),
        contact_person=clean_value(template_data.get('contact_person')),
        contact_phone=clean_value(template_data.get('contact_phone')),
        contact_email=clean_value(template_data.get('contact_email')),
        salary_min=clean_value(template_data.get('salary_min'), is_int=True),
        salary_max=clean_value(template_data.get('salary_max'), is_int=True),
        salary_type=clean_value(template_data.get('salary_type')),
        german_required=clean_value(template_data.get('german_required')),
        english_required=clean_value(template_data.get('english_required')),
        other_languages_required=template_data.get('other_languages_required', []),
        additional_requirements=template_data.get('additional_requirements', {}),
        translations=template_data.get('translations', {}),
        available_languages=template_data.get('available_languages', ['de'])
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


@router.get("/templates/{template_id}")
async def get_job_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt eine einzelne Vorlage zurück"""
    from app.models.job_template import JobTemplate
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    template = db.query(JobTemplate).filter(
        JobTemplate.id == template_id,
        JobTemplate.company_id == company.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    return template


@router.put("/templates/{template_id}")
async def update_job_template(
    template_id: int,
    template_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert eine Vorlage"""
    from app.models.job_template import JobTemplate
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    template = db.query(JobTemplate).filter(
        JobTemplate.id == template_id,
        JobTemplate.company_id == company.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    # Felder aktualisieren
    for key, value in template_data.items():
        if hasattr(template, key) and key not in ['id', 'company_id', 'created_at']:
            setattr(template, key, value)
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/templates/{template_id}")
async def delete_job_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht eine Vorlage"""
    from app.models.job_template import JobTemplate
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    template = db.query(JobTemplate).filter(
        JobTemplate.id == template_id,
        JobTemplate.company_id == company.id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    db.delete(template)
    db.commit()
    
    return {"success": True, "message": "Vorlage gelöscht"}


# ========== SITEMAP ==========

@router.get("/sitemap/urls")
async def get_sitemap_urls(db: Session = Depends(get_db)):
    """Liefert alle aktiven Job-URLs für die Sitemap"""
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_draft == False
    ).all()
    
    base_url = "https://www.jobon.work"
    urls = []
    
    for job in jobs:
        slug = generate_job_slug(job.title, job.location, job.id)
        urls.append({
            "loc": f"{base_url}/jobs/{slug}",
            "lastmod": job.updated_at.strftime("%Y-%m-%d") if job.updated_at else job.created_at.strftime("%Y-%m-%d"),
            "changefreq": "weekly",
            "priority": "0.8"
        })
    
    return {"urls": urls, "count": len(urls)}


@router.get("/sitemap.xml")
async def get_sitemap_xml(db: Session = Depends(get_db)):
    """Generiert eine vollständige Sitemap als XML"""
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_draft == False
    ).all()
    
    base_url = "https://www.jobon.work"
    
    # XML Header
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Statische Seiten
    static_pages = [
        {"loc": "/", "changefreq": "weekly", "priority": "1.0"},
        {"loc": "/jobs", "changefreq": "daily", "priority": "0.9"},
        {"loc": "/stellenarten", "changefreq": "weekly", "priority": "0.8"},
        {"loc": "/blog", "changefreq": "weekly", "priority": "0.7"},
        {"loc": "/about", "changefreq": "monthly", "priority": "0.5"},
        {"loc": "/contact", "changefreq": "monthly", "priority": "0.5"},
        {"loc": "/faq", "changefreq": "monthly", "priority": "0.6"},
    ]
    
    for page in static_pages:
        xml += f'  <url>\n'
        xml += f'    <loc>{base_url}{page["loc"]}</loc>\n'
        xml += f'    <changefreq>{page["changefreq"]}</changefreq>\n'
        xml += f'    <priority>{page["priority"]}</priority>\n'
        xml += f'  </url>\n'
    
    # Dynamische Job-URLs
    for job in jobs:
        slug = generate_job_slug(job.title, job.location, job.id)
        lastmod = job.updated_at.strftime("%Y-%m-%d") if job.updated_at else job.created_at.strftime("%Y-%m-%d")
        xml += f'  <url>\n'
        xml += f'    <loc>{base_url}/jobs/{slug}</loc>\n'
        xml += f'    <lastmod>{lastmod}</lastmod>\n'
        xml += f'    <changefreq>weekly</changefreq>\n'
        xml += f'    <priority>0.8</priority>\n'
        xml += f'  </url>\n'
    
    xml += '</urlset>'
    
    return Response(content=xml, media_type="application/xml")


# ========== JOB CRUD ==========

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
    
    # Notify matching applicants about new job (if active and not draft)
    if job.is_active and not job.is_draft:
        try:
            from app.services.job_notification_service import notify_applicants_about_new_job
            notify_applicants_about_new_job(job, db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Job notification failed: {e}")
        
        # Google Indexing: Neue Stelle zur Indexierung anmelden
        try:
            slug = generate_job_slug(job.title, job.location, job.id)
            import asyncio
            asyncio.create_task(google_indexing_service.request_indexing(
                f"https://www.jobon.work/jobs/{slug}",
                "URL_UPDATED"
            ))
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Google Indexing request failed: {e}")
    
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
        
        # Google Indexing: URL aus Index entfernen
        try:
            slug = generate_job_slug(job.title, job.location, job.id)
            import asyncio
            asyncio.create_task(google_indexing_service.request_indexing(
                f"https://www.jobon.work/jobs/{slug}",
                "URL_DELETED"
            ))
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Google Indexing removal failed: {e}")
        
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
        
        # Google Indexing: URL aus Index entfernen
        try:
            slug = generate_job_slug(job.title, job.location, job.id)
            import asyncio
            asyncio.create_task(google_indexing_service.request_indexing(
                f"https://www.jobon.work/jobs/{slug}",
                "URL_DELETED"
            ))
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Google Indexing removal failed: {e}")
        
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
    
    # Google Indexing: Reaktivierte Stelle zur Indexierung anmelden
    try:
        slug = generate_job_slug(job.title, job.location, job.id)
        import asyncio
        asyncio.create_task(google_indexing_service.request_indexing(
            f"https://www.jobon.work/jobs/{slug}",
            "URL_UPDATED"
        ))
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Google Indexing request failed: {e}")
    
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
        (JobPosting.is_archived == False) | (JobPosting.is_archived == None)  # Archivierte ausblenden, NULL als nicht-archiviert behandeln
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
    
    # Archivierte Stellen: entweder keep_archived=True ODER nicht älter als 30 Tage
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    from sqlalchemy import or_
    jobs = db.query(JobPosting).filter(
        JobPosting.company_id == company.id,
        JobPosting.is_archived == True,
        # Stellen mit keep_archived=True werden immer angezeigt, sonst nur wenn nicht zu alt
        or_(
            JobPosting.keep_archived == True,
        JobPosting.archived_at >= thirty_days_ago
        )
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
