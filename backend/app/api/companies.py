from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company
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
