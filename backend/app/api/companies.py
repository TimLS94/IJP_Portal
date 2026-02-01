from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company, DEFAULT_REJECTION_SUBJECT, DEFAULT_REJECTION_TEXT
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse

router = APIRouter(prefix="/companies", tags=["Firmen"])


def get_company_or_404(user: User, db: Session) -> Company:
    """Holt das Firmen-Profil oder wirft 404"""
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmen-Profil nicht gefunden"
        )
    return company


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
