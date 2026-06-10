from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import uuid
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company, DEFAULT_REJECTION_SUBJECT, DEFAULT_REJECTION_TEXT
from app.models.company_member import CompanyMember
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse

router = APIRouter(prefix="/companies", tags=["Firmen"])


def get_company_or_404(user: User, db: Session) -> Company:
    """Holt das Firmen-Profil oder wirft 404 - funktioniert für Owner UND Teammitglieder"""
    # 1. Erst prüfen ob User direkt eine Company hat (Owner)
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if company:
        return company
    
    # 2. Prüfen ob User Teammitglied einer Company ist
    membership = db.query(CompanyMember).filter(
        CompanyMember.user_id == user.id,
        CompanyMember.is_active == True
    ).first()
    
    if membership:
        return membership.company
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Firmen-Profil nicht gefunden"
    )


@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt das eigene Firmen-Profil zurück"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können auf diesen Endpunkt zugreifen"
        )
    return get_company_or_404(current_user, db)


@router.post("/me", response_model=CompanyResponse)
async def create_my_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt das eigene Firmen-Profil"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können auf diesen Endpunkt zugreifen"
        )
    
    # Prüfen ob bereits ein Profil existiert
    existing = db.query(Company).filter(Company.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firmen-Profil existiert bereits"
        )
    
    company = Company(
        user_id=current_user.id,
        **company_data.model_dump()
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    company_data: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert das eigene Firmen-Profil"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können auf diesen Endpunkt zugreifen"
        )
    
    company = get_company_or_404(current_user, db)
    
    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    """Gibt ein Firmen-Profil zurück (öffentlich)"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firma nicht gefunden"
        )
    return company


@router.get("/{company_id}/jobs")
async def get_company_jobs(
    company_id: int,
    db: Session = Depends(get_db)
):
    """Gibt alle aktiven Stellenangebote einer Firma zurück (öffentlich)"""
    from app.models.job_posting import JobPosting
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firma nicht gefunden"
        )
    
    jobs = db.query(JobPosting).filter(
        JobPosting.company_id == company_id,
        JobPosting.is_active == True,
        JobPosting.is_archived == False,
        JobPosting.is_draft == False
    ).order_by(JobPosting.created_at.desc()).all()
    
    return [
        {
            "id": job.id,
            "slug": job.slug,
            "title": job.title,
            "location": job.location,
            "position_type": job.position_type.value if job.position_type else None,
            "employment_type": job.employment_type.value if job.employment_type else None,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "created_at": job.created_at,
            "is_active": job.is_active,
        }
        for job in jobs
    ]


# ========== ABSAGE-E-MAIL EINSTELLUNGEN ==========

class RejectionEmailSettings(BaseModel):
    rejection_email_enabled: bool
    rejection_email_subject: str
    rejection_email_text: str


class RejectionEmailSettingsUpdate(BaseModel):
    rejection_email_enabled: Optional[bool] = None
    rejection_email_subject: Optional[str] = None
    rejection_email_text: Optional[str] = None


@router.get("/me/rejection-settings")
async def get_rejection_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt die Absage-E-Mail Einstellungen der Firma zurück"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    return {
        "rejection_email_enabled": company.rejection_email_enabled if company.rejection_email_enabled is not None else True,
        "rejection_email_subject": company.rejection_email_subject or DEFAULT_REJECTION_SUBJECT,
        "rejection_email_text": company.rejection_email_text or DEFAULT_REJECTION_TEXT,
        "default_subject": DEFAULT_REJECTION_SUBJECT,
        "default_text": DEFAULT_REJECTION_TEXT,
        "placeholders": [
            {"key": "{salutation}", "description": "Anrede (z.B. 'Sehr geehrter Herr Müller')"},
            {"key": "{company_name}", "description": "Name Ihrer Firma"},
            {"key": "{applicant_name}", "description": "Vollständiger Name des Bewerbers"},
            {"key": "{job_title}", "description": "Titel der Stelle"},
        ]
    }


@router.put("/me/rejection-settings")
async def update_rejection_settings(
    settings: RejectionEmailSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert die Absage-E-Mail Einstellungen der Firma"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    if settings.rejection_email_enabled is not None:
        company.rejection_email_enabled = settings.rejection_email_enabled
    if settings.rejection_email_subject is not None:
        company.rejection_email_subject = settings.rejection_email_subject
    if settings.rejection_email_text is not None:
        company.rejection_email_text = settings.rejection_email_text
    
    db.commit()
    db.refresh(company)
    
    return {
        "message": "Einstellungen gespeichert",
        "rejection_email_enabled": company.rejection_email_enabled,
        "rejection_email_subject": company.rejection_email_subject,
        "rejection_email_text": company.rejection_email_text
    }


@router.post("/me/rejection-settings/reset")
async def reset_rejection_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setzt die Absage-E-Mail Einstellungen auf Standard zurück"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    company.rejection_email_enabled = True
    company.rejection_email_subject = DEFAULT_REJECTION_SUBJECT
    company.rejection_email_text = DEFAULT_REJECTION_TEXT
    
    db.commit()
    
    return {
        "message": "Einstellungen zurückgesetzt",
        "rejection_email_enabled": True,
        "rejection_email_subject": DEFAULT_REJECTION_SUBJECT,
        "rejection_email_text": DEFAULT_REJECTION_TEXT
    }


# ============ Bewerber-Digest Einstellungen ============

class DigestSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    days: Optional[str] = None  # z.B. "1,2,3,4,5" für Mo-Fr
    hour: Optional[int] = None  # 0-23 UTC


@router.get("/me/digest-settings")
async def get_digest_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt die Bewerber-Digest E-Mail Einstellungen zurück"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    return {
        "enabled": company.applicant_digest_enabled if company.applicant_digest_enabled is not None else True,
        "days": company.applicant_digest_days or "1,2,3,4,5",
        "hour": company.applicant_digest_hour if company.applicant_digest_hour is not None else 8
    }


@router.put("/me/digest-settings")
async def update_digest_settings(
    settings: DigestSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert die Bewerber-Digest E-Mail Einstellungen"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    if settings.enabled is not None:
        company.applicant_digest_enabled = settings.enabled
    
    if settings.days is not None:
        # Validiere Tage (0-6)
        try:
            days_list = [int(d.strip()) for d in settings.days.split(",") if d.strip()]
            if all(0 <= d <= 6 for d in days_list):
                company.applicant_digest_days = settings.days
            else:
                raise HTTPException(status_code=400, detail="Ungültige Tage (0-6 erlaubt)")
        except ValueError:
            raise HTTPException(status_code=400, detail="Ungültiges Format für Tage")
    
    if settings.hour is not None:
        if 0 <= settings.hour <= 23:
            company.applicant_digest_hour = settings.hour
        else:
            raise HTTPException(status_code=400, detail="Ungültige Stunde (0-23 erlaubt)")
    
    db.commit()
    db.refresh(company)
    
    return {
        "message": "Einstellungen gespeichert",
        "enabled": company.applicant_digest_enabled,
        "days": company.applicant_digest_days,
        "hour": company.applicant_digest_hour
    }


# ============ Score-Filter Einstellungen ============
# Bewerbungen unter dem Schwellenwert werden gefiltert (in separatem Tab angezeigt)
# und keine E-Mail-Benachrichtigung an die Firma gesendet

class ScoreFilterSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    threshold: Optional[int] = None  # 0-100


@router.get("/me/score-filter-settings")
async def get_score_filter_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt die Score-Filter Einstellungen zurück"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    return {
        "enabled": company.auto_reject_enabled if company.auto_reject_enabled is not None else False,
        "threshold": company.auto_reject_threshold if company.auto_reject_threshold is not None else 50
    }


# Legacy endpoint für Abwärtskompatibilität
@router.get("/me/auto-reject-settings")
async def get_auto_reject_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """LEGACY: Gibt die Score-Filter Einstellungen zurück (alter Endpunkt)"""
    return await get_score_filter_settings(current_user, db)


@router.put("/me/score-filter-settings")
async def update_score_filter_settings(
    settings: ScoreFilterSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert die Score-Filter Einstellungen"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")

    company = get_company_or_404(current_user, db)

    # Premium-Gate: Auto-Ablehnung / Score-Filter nur für Premium
    if not getattr(company, "is_premium", False):
        raise HTTPException(status_code=403, detail="Diese Funktion ist nur für Premium-Accounts verfügbar.")

    if settings.enabled is not None:
        company.auto_reject_enabled = settings.enabled
    
    if settings.threshold is not None:
        if 0 <= settings.threshold <= 100:
            company.auto_reject_threshold = settings.threshold
        else:
            raise HTTPException(status_code=400, detail="Schwellenwert muss zwischen 0 und 100 liegen")
    
    db.commit()
    db.refresh(company)
    
    return {
        "message": "Einstellungen gespeichert",
        "enabled": company.auto_reject_enabled,
        "threshold": company.auto_reject_threshold
    }


# Legacy endpoint für Abwärtskompatibilität
@router.put("/me/auto-reject-settings")
async def update_auto_reject_settings(
    settings: ScoreFilterSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """LEGACY: Aktualisiert die Score-Filter Einstellungen (alter Endpunkt)"""
    return await update_score_filter_settings(settings, current_user, db)


# ========== LOGO UPLOAD ==========

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
MAX_LOGO_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/me/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lädt ein Firmenlogo hoch"""
    from app.services.storage_service import storage_service
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    # Validierung
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Nur Bilder erlaubt (JPG, PNG, GIF, WebP, SVG)")
    
    content = await file.read()
    if len(content) > MAX_LOGO_SIZE:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 5 MB)")
    
    # Altes Logo löschen falls vorhanden (nur den Pfad, nicht die URL)
    if company.logo and not company.logo.startswith("http"):
        try:
            await storage_service.delete_file(company.logo)
        except:
            pass
    
    # Neues Logo hochladen
    file_ext = os.path.splitext(file.filename or "logo.png")[1] or ".png"
    storage_path = f"company-logos/{company.id}/{uuid.uuid4()}{file_ext}"
    
    success, saved_path, error = await storage_service.upload_generic(
        file_content=content,
        storage_path=storage_path,
        content_type=file.content_type
    )
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Upload fehlgeschlagen: {error}")
    
    # URL generieren
    logo_url = storage_service.get_public_url(saved_path)
    
    # In DB speichern
    company.logo = logo_url
    db.commit()
    
    return {"logo_url": logo_url, "message": "Logo hochgeladen"}


@router.delete("/me/logo")
async def delete_logo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht das Firmenlogo"""
    from app.services.storage_service import storage_service
    
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = get_company_or_404(current_user, db)
    
    if company.logo:
        try:
            await storage_service.delete_file(company.logo)
        except:
            pass
        company.logo = None
        db.commit()
    
    return {"message": "Logo gelöscht"}


class PremiumInterestRequest(BaseModel):
    message: Optional[str] = None


@router.post("/me/premium-interest")
async def request_premium_interest(
    data: PremiumInterestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eine Firma bekundet Interesse an Premium – benachrichtigt die Admins per E-Mail."""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")

    company = get_company_or_404(current_user, db)
    from app.services.email_service import email_service

    note = (data.message or "").strip()
    note_html = f"<p style='margin:16px 0;padding:12px;background:#fff;border-radius:8px;'><strong>Nachricht:</strong><br>{note}</p>" if note else ""

    admin_emails = db.query(User.email).filter(User.role == UserRole.ADMIN, User.is_active == True).all()
    for (admin_email,) in admin_emails:
        try:
            email_service.send_email(
                to_email=admin_email,
                subject=f"⭐ Premium-Interesse: {company.company_name}",
                html_content=f"""
                <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background:#2563eb;color:white;padding:20px;text-align:center;border-radius:10px 10px 0 0;">
                        <h1 style="margin:0;">⭐ Premium-Interesse</h1>
                    </div>
                    <div style="padding:24px;background:#f9fafb;">
                        <p>Eine Firma hat Interesse an einem Premium-Account bekundet:</p>
                        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Firma:</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{company.company_name}</td></tr>
                            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Ansprechpartner:</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{company.contact_person or '–'}</td></tr>
                            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">E-Mail:</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{current_user.email}</td></tr>
                            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Telefon:</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{company.phone or '–'}</td></tr>
                        </table>
                        {note_html}
                        <p style="color:#6b7280;font-size:13px;">Premium kannst du in der Nutzerverwaltung per Toggle freischalten.</p>
                    </div>
                </body></html>
                """,
                email_type="other",
            )
        except Exception:
            pass

    return {"message": "Anfrage gesendet. Wir melden uns bei dir!"}
