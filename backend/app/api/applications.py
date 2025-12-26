from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.document import Document, DOCUMENT_REQUIREMENTS
from app.models.application import Application, ApplicationStatus, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationWithDetails
from app.services.email_service import email_service

router = APIRouter(prefix="/applications", tags=["Bewerbungen"])


# ========== HELPER: Bewerbungsvoraussetzungen prüfen ==========
def check_application_requirements(applicant: Applicant, job: JobPosting, db: Session) -> dict:
    """Prüft ob alle Pflichtfelder und Dokumente für die Bewerbung vorhanden sind"""
    
    errors = []
    warnings = []
    
    # Pflichtfelder im Profil
    required_fields = {
        'first_name': 'Vorname',
        'last_name': 'Nachname',
        'date_of_birth': 'Geburtsdatum',
        'nationality': 'Nationalität',
        'phone': 'Telefonnummer',
        'street': 'Straße',
        'city': 'Stadt',
        'country': 'Land',
    }
    
    for field, label in required_fields.items():
        if not getattr(applicant, field, None):
            errors.append(f"Pflichtfeld fehlt: {label}")
    
    # Position Type prüfen (nur Warnung, kein harter Fehler)
    applicant_position = getattr(applicant, 'position_type', None)
    job_position = getattr(job, 'position_type', None)
    
    if not applicant_position:
        warnings.append("Bitte wählen Sie eine Stellenart in Ihrem Profil für eine bessere Zuordnung")
    elif job_position and applicant_position != job_position:
        # Nur eine Warnung, kein Fehler - Bewerbung trotzdem möglich
        try:
            applicant_value = applicant_position.value if hasattr(applicant_position, 'value') else str(applicant_position)
            job_value = job_position.value if hasattr(job_position, 'value') else str(job_position)
            warnings.append(f"Ihre Stellenart ({applicant_value}) unterscheidet sich von der Stelle ({job_value})")
        except Exception:
            pass  # Ignoriere Fehler beim Formatieren der Warnung
    
    # Pflichtdokumente prüfen (optional - nur wenn Stellenart gesetzt)
    if applicant_position:
        try:
            requirements = DOCUMENT_REQUIREMENTS.get(applicant_position, {})
            required_docs = requirements.get('required', [])
            
            # Hochgeladene Dokumente holen
            uploaded_docs = db.query(Document).filter(Document.applicant_id == applicant.id).all()
            uploaded_types = [doc.document_type for doc in uploaded_docs]
            
            for req in required_docs:
                if req.get('type') not in uploaded_types:
                    # Als Warnung, nicht als Fehler - damit Bewerbung trotzdem möglich ist
                    warnings.append(f"Empfohlenes Dokument fehlt: {req.get('name', 'Unbekannt')}")
        except Exception:
            pass  # Bei Fehlern einfach ignorieren
    
    return {
        'can_apply': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


@router.get("/check-requirements/{job_id}")
async def check_requirements_for_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Prüft ob der Bewerber alle Voraussetzungen für die Bewerbung erfüllt"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur Bewerber")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return {
            'can_apply': False,
            'errors': ['Bitte erstellen Sie zuerst Ihr Bewerber-Profil'],
            'warnings': []
        }
    
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    
    return check_application_requirements(applicant, job, db)


@router.get("/status-options")
async def get_status_options():
    """Gibt alle verfügbaren Status-Optionen zurück"""
    return {
        'statuses': [
            {
                'value': status.value,
                'label': APPLICATION_STATUS_LABELS.get(status, status.value),
                'color': APPLICATION_STATUS_COLORS.get(status, 'gray')
            }
            for status in ApplicationStatus
        ]
    }


@router.post("", response_model=ApplicationResponse)
async def create_application(
    application_data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt eine neue Bewerbung (One-Click für Bewerber)"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können sich bewerben"
        )
    
    # Bewerber-Profil holen
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitte erstellen Sie zuerst Ihr Bewerber-Profil"
        )
    
    # Job prüfen
    job = db.query(JobPosting).filter(
        JobPosting.id == application_data.job_posting_id,
        JobPosting.is_active == True
    ).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden oder nicht mehr aktiv"
        )
    
    # Prüfen ob bereits beworben
    existing = db.query(Application).filter(
        Application.applicant_id == applicant.id,
        Application.job_posting_id == job.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sie haben sich bereits auf diese Stelle beworben"
        )
    
    # NEUE PRÜFUNG: Pflichtfelder und Dokumente
    requirements = check_application_requirements(applicant, job, db)
    if not requirements['can_apply']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bewerbung nicht möglich: {'; '.join(requirements['errors'])}"
        )
    
    application = Application(
        applicant_id=applicant.id,
        job_posting_id=job.id,
        applicant_message=application_data.applicant_message
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    
    # Firmen-Daten für E-Mail holen
    company = db.query(Company).filter(Company.id == job.company_id).first()
    company_user = db.query(User).filter(User.id == company.user_id).first() if company else None
    
    # E-Mail an Bewerber
    user = db.query(User).filter(User.id == current_user.id).first()
    email_service.send_application_received(
        to_email=user.email,
        applicant_name=f"{applicant.first_name} {applicant.last_name}",
        job_title=job.title,
        company_name=company.company_name if company else "Unbekannt"
    )
    
    # E-Mail an Firma
    if company_user:
        email_service.send_new_application_notification(
            to_email=company_user.email,
            company_name=company.company_name,
            applicant_name=f"{applicant.first_name} {applicant.last_name}",
            job_title=job.title
        )
    
    return application


@router.get("/my", response_model=List[ApplicationWithDetails])
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle eigenen Bewerbungen (für Bewerber)"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return []
    
    applications = db.query(Application).options(
        joinedload(Application.job_posting).joinedload(JobPosting.company)
    ).filter(
        Application.applicant_id == applicant.id
    ).order_by(Application.applied_at.desc()).all()
    
    result = []
    for app in applications:
        app_dict = {
            "id": app.id,
            "applicant_id": app.applicant_id,
            "job_posting_id": app.job_posting_id,
            "status": app.status,
            "applicant_message": app.applicant_message,
            "company_notes": app.company_notes,
            "applied_at": app.applied_at,
            "updated_at": app.updated_at,
            "job_title": app.job_posting.title if app.job_posting else None,
            "company_name": app.job_posting.company.company_name if app.job_posting and app.job_posting.company else None
        }
        result.append(ApplicationWithDetails(**app_dict))
    
    return result


@router.get("/company", response_model=List[ApplicationWithDetails])
async def get_company_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle Bewerbungen für die Firma"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können auf diesen Endpunkt zugreifen"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return []
    
    applications = db.query(Application).options(
        joinedload(Application.applicant),
        joinedload(Application.job_posting)
    ).join(JobPosting).filter(
        JobPosting.company_id == company.id
    ).order_by(Application.applied_at.desc()).all()
    
    result = []
    for app in applications:
        app_dict = {
            "id": app.id,
            "applicant_id": app.applicant_id,
            "job_posting_id": app.job_posting_id,
            "status": app.status,
            "applicant_message": app.applicant_message,
            "company_notes": app.company_notes,
            "applied_at": app.applied_at,
            "updated_at": app.updated_at,
            "job_title": app.job_posting.title if app.job_posting else None,
            "applicant_name": f"{app.applicant.first_name} {app.applicant.last_name}" if app.applicant else None
        }
        result.append(ApplicationWithDetails(**app_dict))
    
    return result


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int,
    update_data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert eine Bewerbung (Status-Update durch Firma)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Bewerbungen aktualisieren"
        )
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    
    application = db.query(Application).join(JobPosting).filter(
        Application.id == application_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerbung nicht gefunden oder keine Berechtigung"
        )
    
    old_status = application.status
    
    if update_data.status:
        application.status = update_data.status
    if update_data.company_notes is not None:
        application.company_notes = update_data.company_notes
    
    db.commit()
    db.refresh(application)
    
    # E-Mail bei Statusänderung
    if update_data.status and update_data.status != old_status:
        applicant = db.query(Applicant).filter(Applicant.id == application.applicant_id).first()
        applicant_user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        job_posting = db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
        
        if applicant_user and job_posting:
            email_service.send_application_status_update(
                to_email=applicant_user.email,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=job_posting.title,
                company_name=company.company_name,
                new_status=update_data.status.value if hasattr(update_data.status, 'value') else str(update_data.status)
            )
    
    return application


@router.get("/company/{application_id}/applicant-details")
async def get_applicant_details_for_company(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gibt detaillierte Bewerber-Informationen für eine Bewerbung zurück.
    Nur für die Firma, bei der die Bewerbung eingegangen ist.
    Enthält: Profil, Kontaktdaten, Dokumente
    """
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    # Bewerbung mit Zugriffsprüfung
    application = db.query(Application).join(JobPosting).filter(
        Application.id == application_id,
        JobPosting.company_id == company.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    # Bewerber-Daten
    applicant = db.query(Applicant).filter(Applicant.id == application.applicant_id).first()
    applicant_user = db.query(User).filter(User.id == applicant.user_id).first()
    
    # Dokumente
    documents = db.query(Document).filter(Document.applicant_id == applicant.id).all()
    
    # Job-Details
    job = db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
    
    return {
        'application': {
            'id': application.id,
            'status': application.status.value,
            'status_label': APPLICATION_STATUS_LABELS.get(application.status, application.status.value),
            'applicant_message': application.applicant_message,
            'company_notes': application.company_notes,
            'applied_at': application.applied_at,
            'updated_at': application.updated_at,
        },
        'job': {
            'id': job.id,
            'title': job.title,
            'position_type': job.position_type.value if job.position_type else None,
        },
        'applicant': {
            'id': applicant.id,
            'first_name': applicant.first_name,
            'last_name': applicant.last_name,
            'email': applicant_user.email,
            'phone': applicant.phone,
            'date_of_birth': applicant.date_of_birth,
            'place_of_birth': applicant.place_of_birth,
            'nationality': applicant.nationality,
            'address': {
                'street': applicant.street,
                'house_number': applicant.house_number,
                'postal_code': applicant.postal_code,
                'city': applicant.city,
                'country': applicant.country,
            },
            'position_type': applicant.position_type.value if applicant.position_type else None,
            'work_experience': applicant.work_experience,
            'work_experience_years': applicant.work_experience_years,
            'german_level': applicant.german_level.value if applicant.german_level else None,
            'english_level': applicant.english_level.value if applicant.english_level else None,
            'other_languages': applicant.other_languages,
            'been_to_germany': applicant.been_to_germany,
            'germany_details': applicant.germany_details,
            # Positionsspezifische Daten
            'university_name': applicant.university_name,
            'field_of_study': applicant.field_of_study,
            'current_semester': applicant.current_semester,
            'profession': applicant.profession,
            'degree': applicant.degree,
            'available_from': applicant.available_from,
            'available_until': applicant.available_until,
        },
        'documents': [
            {
                'id': doc.id,
                'document_type': doc.document_type.value,
                'original_name': doc.original_name,
                'file_path': doc.file_path,
                'file_size': doc.file_size,
                'uploaded_at': doc.uploaded_at,
                'is_verified': doc.is_verified,
            }
            for doc in documents
        ]
    }


@router.delete("/{application_id}")
async def withdraw_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Zieht eine Bewerbung zurück (nur Bewerber)"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können Bewerbungen zurückziehen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.applicant_id == applicant.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerbung nicht gefunden"
        )
    
    application.status = ApplicationStatus.WITHDRAWN
    db.commit()
    
    return {"message": "Bewerbung zurückgezogen"}
