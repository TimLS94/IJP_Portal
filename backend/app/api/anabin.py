"""
Anabin University Verification API

Endpoints für die Verifizierung von Universitäten über anabin.kmk.org
Nur für Admins zugänglich.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.services.anabin_service import anabin_service, VerificationStatus

router = APIRouter(prefix="/anabin", tags=["Anabin Verifizierung"])


class VerifyUniversityRequest(BaseModel):
    """Request für manuelle Verifizierung"""
    applicant_id: int
    anabin_verified: str  # verified, not_found, uncertain
    anabin_match_score: Optional[int] = None
    anabin_institution_name: Optional[str] = None
    anabin_institution_id: Optional[str] = None
    anabin_status: Optional[str] = None
    anabin_notes: Optional[str] = None


@router.get("/students-to-verify")
async def get_students_to_verify(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listet alle Studenten (Studentenferienjob) die verifiziert werden müssen.
    Nur für Admins.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können auf diese Funktion zugreifen"
        )
    
    # Alle Bewerber mit Universitätsname (= potenzielle Studenten)
    # Einfachere Abfrage, die sowohl position_type als auch university_name berücksichtigt
    from sqlalchemy import or_, and_, cast, String
    
    applicants = db.query(Applicant).filter(
        or_(
            Applicant.position_type == PositionType.STUDENTENFERIENJOB,
            and_(
                Applicant.university_name != None,
                Applicant.university_name != ""
            )
        )
    ).all()
    
    result = []
    for app in applicants:
        result.append({
            "id": app.id,
            "name": f"{app.first_name} {app.last_name}",
            "university_name": app.university_name,
            "university_city": app.university_city,
            "university_country": app.university_country,
            "field_of_study": app.field_of_study,
            "current_semester": app.current_semester,
            "nationality": app.nationality,
            # Verifizierungsstatus
            "anabin_verified": app.anabin_verified or "not_checked",
            "anabin_match_score": app.anabin_match_score,
            "anabin_institution_name": app.anabin_institution_name,
            "anabin_institution_id": app.anabin_institution_id,
            "anabin_status": app.anabin_status,
            "anabin_notes": app.anabin_notes,
            "anabin_checked_at": app.anabin_checked_at,
        })
    
    # Sortieren: Nicht geprüfte zuerst
    result.sort(key=lambda x: (
        0 if x["anabin_verified"] == "not_checked" else 1,
        x["name"]
    ))
    
    return {
        "total": len(result),
        "not_checked": len([r for r in result if r["anabin_verified"] == "not_checked"]),
        "verified": len([r for r in result if r["anabin_verified"] == "verified"]),
        "not_found": len([r for r in result if r["anabin_verified"] == "not_found"]),
        "uncertain": len([r for r in result if r["anabin_verified"] == "uncertain"]),
        "students": result
    }


@router.get("/search/{applicant_id}")
async def search_university_for_applicant(
    applicant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sucht die Universität eines Bewerbers in anabin.
    Nur für Admins.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können auf diese Funktion zugreifen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber nicht gefunden"
        )
    
    if not applicant.university_name:
        return {
            "success": False,
            "message": "Kein Universitätsname hinterlegt",
            "applicant": {
                "id": applicant.id,
                "name": f"{applicant.first_name} {applicant.last_name}",
            },
            "result": None
        }
    
    # Anabin-Suche durchführen
    result = anabin_service.verify_university(
        university_name=applicant.university_name,
        country=applicant.university_country or applicant.nationality,
        city=applicant.university_city
    )
    
    return {
        "success": True,
        "applicant": {
            "id": applicant.id,
            "name": f"{applicant.first_name} {applicant.last_name}",
            "university_name": applicant.university_name,
            "university_city": applicant.university_city,
            "university_country": applicant.university_country,
        },
        "result": result
    }


@router.post("/verify")
async def manually_verify_university(
    data: VerifyUniversityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Speichert das Verifizierungsergebnis manuell.
    Nur für Admins.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können auf diese Funktion zugreifen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.id == data.applicant_id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber nicht gefunden"
        )
    
    # Verifizierungsdaten speichern
    applicant.anabin_verified = data.anabin_verified
    applicant.anabin_match_score = data.anabin_match_score
    applicant.anabin_institution_name = data.anabin_institution_name
    applicant.anabin_institution_id = data.anabin_institution_id
    applicant.anabin_status = data.anabin_status
    applicant.anabin_notes = data.anabin_notes
    applicant.anabin_checked_at = date.today()
    applicant.anabin_checked_by = current_user.id
    
    db.commit()
    db.refresh(applicant)
    
    return {
        "success": True,
        "message": f"Verifizierung für {applicant.first_name} {applicant.last_name} gespeichert",
        "data": {
            "anabin_verified": applicant.anabin_verified,
            "anabin_match_score": applicant.anabin_match_score,
            "anabin_institution_name": applicant.anabin_institution_name,
        }
    }


@router.post("/auto-verify/{applicant_id}")
async def auto_verify_university(
    applicant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Führt automatische Verifizierung durch und speichert das Ergebnis.
    Nur für Admins.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können auf diese Funktion zugreifen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber nicht gefunden"
        )
    
    if not applicant.university_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein Universitätsname hinterlegt"
        )
    
    # Anabin-Suche durchführen
    result = anabin_service.verify_university(
        university_name=applicant.university_name,
        country=applicant.university_country or applicant.nationality,
        city=applicant.university_city
    )
    
    # Ergebnis speichern
    applicant.anabin_verified = result['status']
    applicant.anabin_match_score = int(result['match_score']) if result['match_score'] else None
    applicant.anabin_checked_at = date.today()
    applicant.anabin_checked_by = current_user.id
    
    if result['best_match']:
        applicant.anabin_institution_name = result['best_match'].get('name')
        applicant.anabin_institution_id = result['best_match'].get('anabin_id')
        applicant.anabin_status = result['best_match'].get('status')
    
    db.commit()
    db.refresh(applicant)
    
    return {
        "success": True,
        "message": result['message'],
        "applicant": {
            "id": applicant.id,
            "name": f"{applicant.first_name} {applicant.last_name}",
        },
        "result": result
    }
