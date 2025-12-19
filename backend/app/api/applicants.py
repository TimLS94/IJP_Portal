from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate, ApplicantResponse

router = APIRouter(prefix="/applicants", tags=["Bewerber"])


def get_applicant_or_404(user: User, db: Session) -> Applicant:
    """Holt das Bewerber-Profil oder wirft 404"""
    applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber-Profil nicht gefunden"
        )
    return applicant


@router.get("/me", response_model=ApplicantResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt das eigene Bewerber-Profil zurück"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    return get_applicant_or_404(current_user, db)


@router.post("/me", response_model=ApplicantResponse)
async def create_my_profile(
    profile_data: ApplicantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt das eigene Bewerber-Profil"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    # Prüfen ob bereits ein Profil existiert
    existing = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bewerber-Profil existiert bereits"
        )
    
    applicant = Applicant(
        user_id=current_user.id,
        **profile_data.model_dump()
    )
    db.add(applicant)
    db.commit()
    db.refresh(applicant)
    return applicant


@router.put("/me", response_model=ApplicantResponse)
async def update_my_profile(
    profile_data: ApplicantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert das eigene Bewerber-Profil"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    applicant = get_applicant_or_404(current_user, db)
    
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(applicant, field, value)
    
    db.commit()
    db.refresh(applicant)
    return applicant


@router.get("/{applicant_id}", response_model=ApplicantResponse)
async def get_applicant(
    applicant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt ein Bewerber-Profil zurück (nur für Firmen)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Bewerber-Profile einsehen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber nicht gefunden"
        )
    return applicant
