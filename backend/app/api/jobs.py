from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.applicant import PositionType
from app.schemas.job_posting import JobPostingCreate, JobPostingUpdate, JobPostingResponse, JobPostingListResponse

router = APIRouter(prefix="/jobs", tags=["Stellenangebote"])


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
    
    job = JobPosting(
        company_id=company.id,
        **job_data.model_dump()
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht ein Stellenangebot (nur eigene)"""
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
    
    db.delete(job)
    db.commit()
    return {"message": "Stellenangebot gelöscht"}


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
        JobPosting.company_id == company.id
    ).order_by(JobPosting.created_at.desc()).all()
    
    return jobs
