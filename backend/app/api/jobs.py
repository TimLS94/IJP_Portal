from fastapi import APIRouter, Depends, HTTPException, status, Query
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
        query = query.filter(
            (JobPosting.title.ilike(f"%{search}%")) |
            (JobPosting.description.ilike(f"%{search}%"))
        )
    
    jobs = query.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit).all()
    return jobs


@router.get("/{job_id}", response_model=JobPostingResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Gibt ein Stellenangebot zurück (öffentlich)"""
    job = db.query(JobPosting).options(
        joinedload(JobPosting.company)
    ).filter(JobPosting.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden"
        )
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
    for field, value in update_data.items():
        setattr(job, field, value)
    
    db.commit()
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
