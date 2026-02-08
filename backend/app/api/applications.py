from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.document import Document, DOCUMENT_REQUIREMENTS
from app.models.application import Application, ApplicationDocument, ApplicationStatus, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS
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
    
    # Hochgeladene Dokumente holen
    uploaded_docs = db.query(Document).filter(Document.applicant_id == applicant.id).all()
    uploaded_types = [doc.document_type.value if hasattr(doc.document_type, 'value') else str(doc.document_type) for doc in uploaded_docs]
    
    # CV-PFLICHT: Nur bei Work and Holiday ist ein Lebenslauf zwingend erforderlich
    # Bei anderen Stellenarten ist es eine Empfehlung (kann nachgereicht werden)
    job_position_value = job_position.value if hasattr(job_position, 'value') else str(job_position) if job_position else None
    if 'cv' not in uploaded_types:
        if job_position_value == 'workandholiday':
            errors.append("Lebenslauf erforderlich: Bitte laden Sie einen Lebenslauf in Ihrem Profil hoch")
        elif job_position_value != 'studentenferienjob':
            warnings.append("Lebenslauf empfohlen: Bitte laden Sie einen Lebenslauf hoch (kann nachgereicht werden)")
    
    # Pflichtdokumente prüfen (optional - nur wenn Stellenart gesetzt)
    if applicant_position:
        try:
            requirements = DOCUMENT_REQUIREMENTS.get(applicant_position, {})
            required_docs = requirements.get('required', [])
            
            for req in required_docs:
                req_type = req.get('type')
                req_type_value = req_type.value if hasattr(req_type, 'value') else str(req_type) if req_type else None
                if req_type_value and req_type_value not in uploaded_types:
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
    
    # Dokumente für diese Bewerbung freigeben
    if application_data.document_ids:
        # Prüfe ob die Dokumente dem Bewerber gehören
        docs = db.query(Document).filter(
            Document.id.in_(application_data.document_ids),
            Document.applicant_id == applicant.id
        ).all()
        
        for doc in docs:
            app_doc = ApplicationDocument(
                application_id=application.id,
                document_id=doc.id,
                is_follow_up=False
            )
            db.add(app_doc)
        db.commit()
    
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
    
    # E-Mail an Firma über neue Bewerbung
    if company_user:
        email_service.send_new_application_notification(
            to_email=company_user.email,
            company_name=company.company_name,
            applicant_name=f"{applicant.first_name} {applicant.last_name}",
            job_title=job.title,
            applicant_email=user.email,
            applicant_phone=applicant.phone,
            position_type=job.position_type.value if job.position_type else None,
            applied_at=application.applied_at
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
            "company_name": app.job_posting.company.company_name if app.job_posting and app.job_posting.company else None,
            "job_translations": app.job_posting.translations if app.job_posting else None,
            "requested_documents": app.requested_documents or []
        }
        result.append(ApplicationWithDetails(**app_dict))
    
    return result


@router.get("/company")
async def get_company_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle Bewerbungen für die Firma mit Matching-Score"""
    from app.services.matching_service import calculate_match_score
    
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
        joinedload(Application.job_posting),
        joinedload(Application.interviews)
    ).join(JobPosting).filter(
        JobPosting.company_id == company.id
    ).order_by(Application.applied_at.desc()).all()
    
    result = []
    for app in applications:
        # Matching-Score berechnen
        match_score = None
        if app.applicant and app.job_posting:
            try:
                match_result = calculate_match_score(app.applicant, app.job_posting)
                match_score = match_result.get("total_score", 0)
            except:
                pass
        
        # Interview-Status ermitteln (neuestes relevantes Interview)
        interview_info = None
        if app.interviews:
            # Sortiere nach Erstellungsdatum (neuestes zuerst)
            sorted_interviews = sorted(app.interviews, key=lambda x: x.created_at, reverse=True)
            for interview in sorted_interviews:
                if interview.status.value in ['confirmed', 'proposed', 'declined']:
                    interview_info = {
                        "status": interview.status.value,
                        "confirmed_date": interview.confirmed_date.isoformat() if interview.confirmed_date else None,
                        "proposed_date_1": interview.proposed_date_1.isoformat() if interview.proposed_date_1 else None,
                    }
                    break
        
        app_dict = {
            "id": app.id,
            "applicant_id": app.applicant_id,
            "job_posting_id": app.job_posting_id,
            "job_id": app.job_posting_id,  # Alias für Frontend
            "status": app.status.value if hasattr(app.status, 'value') else app.status,
            "applicant_message": app.applicant_message,
            "company_notes": app.company_notes,
            "applied_at": app.applied_at,
            "updated_at": app.updated_at,
            "job_title": app.job_posting.title if app.job_posting else None,
            "job_slug": f"{app.job_posting.slug}-{app.job_posting.id}" if app.job_posting and app.job_posting.slug else str(app.job_posting_id),
            "applicant_name": f"{app.applicant.first_name} {app.applicant.last_name}" if app.applicant else None,
            "match_score": match_score,
            "interview_info": interview_info
        }
        result.append(app_dict)
    
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
            new_status_value = update_data.status.value if hasattr(update_data.status, 'value') else str(update_data.status)
            applicant_name = f"{applicant.first_name} {applicant.last_name}"
            
            # Bei Absage: Benutzerdefinierte Absage-E-Mail senden (wenn aktiviert)
            if new_status_value == 'rejected' and company.rejection_email_enabled:
                email_service.send_rejection_email(
                    to_email=applicant_user.email,
                    applicant_name=applicant_name,
                    job_title=job_posting.title,
                    company_name=company.company_name,
                    custom_subject=company.rejection_email_subject,
                    custom_text=company.rejection_email_text,
                    applicant_gender=applicant.gender,
                    applicant_last_name=applicant.last_name
                )
            else:
                # Standard Status-Update E-Mail
                email_service.send_application_status_update(
                    to_email=applicant_user.email,
                    applicant_name=applicant_name,
                    job_title=job_posting.title,
                    company_name=company.company_name,
                    new_status=new_status_value
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
    
    # NUR freigegebene Dokumente für diese Bewerbung laden (Datenschutz!)
    shared_doc_ids = db.query(ApplicationDocument.document_id).filter(
        ApplicationDocument.application_id == application.id
    ).all()
    shared_doc_ids = [d[0] for d in shared_doc_ids]
    
    if shared_doc_ids:
        documents = db.query(Document).filter(Document.id.in_(shared_doc_ids)).all()
    else:
        # Fallback für alte Bewerbungen ohne explizite Freigabe: Alle Dokumente zeigen
        # TODO: Nach Migration entfernen
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


@router.get("/company/{application_id}/match")
async def get_application_match_score(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Berechnet den Matching-Score für eine Bewerbung (nur für Firmen).
    Zeigt an, wie gut der Bewerber zur Stelle passt.
    """
    from app.services.matching_service import calculate_match_score
    from app.services.settings_service import is_company_matching_enabled
    
    # Feature Flag prüfen
    if not is_company_matching_enabled(db):
        return {"enabled": False, "message": "Matching ist derzeit deaktiviert"}
    
    if current_user.role != UserRole.COMPANY:
        return {"enabled": False, "message": "Matching nur für Firmen verfügbar"}
    
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
    
    # Bewerber und Job laden
    applicant = db.query(Applicant).filter(Applicant.id == application.applicant_id).first()
    job = db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
    
    if not applicant or not job:
        return {"enabled": True, "message": "Daten unvollständig", "total_score": 0}
    
    match = calculate_match_score(applicant, job)
    return {
        "enabled": True,
        "application_id": application_id,
        **match
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


# ========== DOKUMENTE ANFORDERN ==========

class DocumentRequestCreate(BaseModel):
    document_types: List[str]  # z.B. ["cv", "passport"]
    message: Optional[str] = None  # Nachricht an den Bewerber


@router.post("/company/{application_id}/request-documents")
async def request_documents_from_applicant(
    application_id: int,
    request_data: DocumentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Firma fordert fehlende Unterlagen vom Bewerber an.
    Der Bewerber wird per E-Mail benachrichtigt.
    """
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur Firmen können Unterlagen anfordern")
    
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
    
    # Bewerber-Daten für E-Mail
    applicant = db.query(Applicant).filter(Applicant.id == application.applicant_id).first()
    applicant_user = db.query(User).filter(User.id == applicant.user_id).first()
    job = db.query(JobPosting).filter(JobPosting.id == application.job_posting_id).first()
    
    # Angeforderte Dokumente speichern
    from datetime import datetime
    existing_requests = application.requested_documents or []
    
    for doc_type in request_data.document_types:
        existing_requests.append({
            "type": doc_type,
            "requested_by": "company",
            "requested_at": datetime.utcnow().isoformat(),
            "message": request_data.message,
            "company_name": company.company_name
        })
    
    application.requested_documents = existing_requests
    db.commit()
    
    # E-Mail an Bewerber senden
    if applicant_user and applicant:
        from app.models.document import DOCUMENT_REQUIREMENTS
        from app.schemas.document import DOCUMENT_TYPE_LABELS
        
        doc_labels = [DOCUMENT_TYPE_LABELS.get(dt, dt) for dt in request_data.document_types]
        
        email_service.send_document_request(
            to_email=applicant_user.email,
            applicant_name=f"{applicant.first_name} {applicant.last_name}",
            company_name=company.company_name,
            job_title=job.title if job else "Stelle",
            requested_documents=doc_labels,
            message=request_data.message
        )
    
    return {
        "message": "Dokumentenanforderung gesendet",
        "requested_documents": request_data.document_types
    }


@router.get("/my/requested-documents")
async def get_my_requested_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bewerber sieht alle angeforderten Dokumente für seine Bewerbungen.
    """
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur Bewerber")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return []
    
    applications = db.query(Application).options(
        joinedload(Application.job_posting)
    ).filter(
        Application.applicant_id == applicant.id,
        Application.requested_documents != None,
        Application.requested_documents != []
    ).all()
    
    result = []
    for app in applications:
        if app.requested_documents:
            result.append({
                "application_id": app.id,
                "job_title": app.job_posting.title if app.job_posting else None,
                "requested_documents": app.requested_documents
            })
    
    return result


# ========== DOKUMENTE NACHTRÄGLICH FREIGEBEN ==========

class ShareDocumentsRequest(BaseModel):
    document_ids: List[int]


@router.post("/my/{application_id}/share-documents")
async def share_documents_for_application(
    application_id: int,
    request_data: ShareDocumentsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bewerber gibt nachträglich Dokumente für eine Bewerbung frei.
    Wird verwendet wenn Firma Dokumente anfordert.
    """
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur Bewerber")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber-Profil nicht gefunden")
    
    # Prüfe ob die Bewerbung dem Bewerber gehört
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.applicant_id == applicant.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    # Prüfe ob die Dokumente dem Bewerber gehören
    docs = db.query(Document).filter(
        Document.id.in_(request_data.document_ids),
        Document.applicant_id == applicant.id
    ).all()
    
    # Bereits freigegebene Dokumente ermitteln
    existing_shares = db.query(ApplicationDocument.document_id).filter(
        ApplicationDocument.application_id == application_id
    ).all()
    existing_doc_ids = [d[0] for d in existing_shares]
    
    # Nur neue Dokumente freigeben
    added_count = 0
    for doc in docs:
        if doc.id not in existing_doc_ids:
            app_doc = ApplicationDocument(
                application_id=application.id,
                document_id=doc.id,
                is_follow_up=True  # Markiert als nachgereicht
            )
            db.add(app_doc)
            added_count += 1
    
    db.commit()
    
    return {
        "message": f"{added_count} Dokument(e) freigegeben",
        "shared_count": added_count
    }


@router.get("/my/{application_id}/shared-documents")
async def get_shared_documents_for_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bewerber sieht welche Dokumente für eine Bewerbung freigegeben sind.
    """
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur Bewerber")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return []
    
    # Prüfe ob die Bewerbung dem Bewerber gehört
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.applicant_id == applicant.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    # Freigegebene Dokumente laden
    shared_docs = db.query(ApplicationDocument).options(
        joinedload(ApplicationDocument.document)
    ).filter(
        ApplicationDocument.application_id == application_id
    ).all()
    
    return [
        {
            "id": sd.document.id,
            "document_type": sd.document.document_type.value if hasattr(sd.document.document_type, 'value') else str(sd.document.document_type),
            "original_name": sd.document.original_name,
            "shared_at": sd.shared_at,
            "is_follow_up": sd.is_follow_up
        }
        for sd in shared_docs
    ]
