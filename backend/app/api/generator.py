from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.models.job_posting import JobPosting
from app.models.company import Company
from app.models.application import Application
from app.services.document_generator import DocumentGenerator

router = APIRouter(prefix="/generate", tags=["Dokument-Generierung"])


@router.get("/arbeitserlaubnis")
async def generate_arbeitserlaubnis(
    application_id: Optional[int] = Query(None, description="Bewerbungs-ID für stellenspezifische Daten"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generiert einen Antrag auf Arbeitserlaubnis als PDF.
    Kann mit einer Bewerbungs-ID aufgerufen werden, um stellenspezifische Daten einzufügen.
    """
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können dieses Dokument generieren"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitte erstellen Sie zuerst Ihr Bewerber-Profil"
        )
    
    job_posting = None
    company = None
    
    if application_id:
        application = db.query(Application).filter(
            Application.id == application_id,
            Application.applicant_id == applicant.id
        ).first()
        
        if application:
            job_posting = db.query(JobPosting).filter(
                JobPosting.id == application.job_posting_id
            ).first()
            
            if job_posting:
                company = db.query(Company).filter(
                    Company.id == job_posting.company_id
                ).first()
    
    pdf_buffer = DocumentGenerator.generate_arbeitserlaubnis_antrag(
        applicant=applicant,
        job_posting=job_posting,
        company=company
    )
    
    filename = f"Arbeitserlaubnis_Antrag_{applicant.last_name}_{applicant.first_name}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/lebenslauf")
async def generate_lebenslauf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generiert einen Lebenslauf als PDF basierend auf den Profildaten"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können einen Lebenslauf generieren"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitte erstellen Sie zuerst Ihr Bewerber-Profil"
        )
    
    pdf_buffer = DocumentGenerator.generate_lebenslauf(applicant)
    
    filename = f"Lebenslauf_{applicant.last_name}_{applicant.first_name}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/stellenbescheinigung/{application_id}")
async def generate_stellenbescheinigung(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generiert eine Stellenbescheinigung für eine spezifische Bewerbung.
    Kann von Bewerbern oder Firmen aufgerufen werden.
    """
    # Bewerbung finden
    application = db.query(Application).filter(Application.id == application_id).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerbung nicht gefunden"
        )
    
    # Berechtigung prüfen
    applicant = None
    if current_user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        if not applicant or application.applicant_id != applicant.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Keine Berechtigung"
            )
    elif current_user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        job_posting = db.query(JobPosting).filter(
            JobPosting.id == application.job_posting_id
        ).first()
        if not company or not job_posting or job_posting.company_id != company.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Keine Berechtigung"
            )
    
    # Daten laden
    if not applicant:
        applicant = db.query(Applicant).filter(
            Applicant.id == application.applicant_id
        ).first()
    
    job_posting = db.query(JobPosting).filter(
        JobPosting.id == application.job_posting_id
    ).first()
    
    company = db.query(Company).filter(
        Company.id == job_posting.company_id
    ).first()
    
    pdf_buffer = DocumentGenerator.generate_arbeitserlaubnis_antrag(
        applicant=applicant,
        job_posting=job_posting,
        company=company
    )
    
    filename = f"Stellenbescheinigung_{applicant.last_name}_{job_posting.title}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
