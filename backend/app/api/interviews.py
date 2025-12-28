"""
Interview/Termin-Verwaltung API

Workflow:
1. Firma schlägt 2 Termine vor → Bewerber bekommt Email
2. Bewerber bestätigt einen Termin ODER lehnt ab
3. Bei Bestätigung: Firma bekommt Email mit bestätigtem Termin
4. Bei Absage: Firma bekommt Email und muss neue Termine vorschlagen
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limiter import check_rate_limit
from app.models import User, Application, Interview, InterviewStatus
from app.models.application import ApplicationStatus
from app.services.email_service import email_service

router = APIRouter(prefix="/interviews", tags=["interviews"])


# === Pydantic Schemas ===

class InterviewPropose(BaseModel):
    """Firma schlägt Termine vor"""
    application_id: int
    proposed_date_1: datetime
    proposed_date_2: Optional[datetime] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    send_email: bool = True  # Email nur senden wenn True


class InterviewConfirm(BaseModel):
    """Bewerber bestätigt einen Termin"""
    selected_date: datetime  # Der gewählte Termin (muss einer der vorgeschlagenen sein)


class InterviewDecline(BaseModel):
    """Bewerber lehnt ab"""
    reason: Optional[str] = None


class InterviewCancel(BaseModel):
    """Termin absagen (für Firma oder Bewerber)"""
    reason: Optional[str] = None


class InterviewResponse(BaseModel):
    id: int
    application_id: int
    status: str
    status_label: str
    proposed_date_1: datetime
    proposed_date_2: Optional[datetime]
    confirmed_date: Optional[datetime]
    location: Optional[str]
    meeting_link: Optional[str]
    notes_company: Optional[str]
    notes_applicant: Optional[str]
    created_at: datetime
    
    # Zusatzinfos
    applicant_name: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# === Helper Functions ===

def get_interview_response(interview: Interview, include_details: bool = True) -> dict:
    """Konvertiert Interview zu Response-Dict"""
    from app.models.interview import INTERVIEW_STATUS_LABELS
    
    response = {
        "id": interview.id,
        "application_id": interview.application_id,
        "status": interview.status.value,
        "status_label": INTERVIEW_STATUS_LABELS.get(interview.status, interview.status.value),
        "proposed_date_1": interview.proposed_date_1,
        "proposed_date_2": interview.proposed_date_2,
        "confirmed_date": interview.confirmed_date,
        "location": interview.location,
        "meeting_link": interview.meeting_link,
        "notes_company": interview.notes_company,
        "notes_applicant": interview.notes_applicant,
        "created_at": interview.created_at,
    }
    
    if include_details and interview.application:
        app = interview.application
        response["applicant_name"] = f"{app.applicant.first_name} {app.applicant.last_name}" if app.applicant else None
        response["job_title"] = app.job_posting.title if app.job_posting else None
        response["company_name"] = app.job_posting.company.company_name if app.job_posting and app.job_posting.company else None
    
    return response




# === API Endpunkte ===

@router.post("/propose", response_model=dict)
async def propose_interview(
    request: Request,
    data: InterviewPropose,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Firma schlägt Interview-Termine vor.
    Bewerber bekommt Email mit den Terminoptionen.
    """
    # Rate Limiting: 10 Vorschläge pro Stunde
    await check_rate_limit(request, "interview_propose", max_requests=10, window_seconds=3600)
    # Prüfe ob Benutzer Firma oder Admin ist
    if current_user.role not in ["company", "admin"]:
        raise HTTPException(status_code=403, detail="Nur Firmen können Termine vorschlagen")
    
    # Hole die Bewerbung
    application = db.query(Application).filter(Application.id == data.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    # Prüfe ob Firma zur Bewerbung gehört (außer Admin)
    if current_user.role == "company":
        if not application.job_posting or application.job_posting.company_id != current_user.company.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung für diese Bewerbung")
    
    # Alle bestehenden bestätigten/vorgeschlagenen Termine auf CANCELLED setzen
    # (Es kann nur 1 aktiver Termin existieren)
    old_interviews = db.query(Interview).filter(
        and_(
            Interview.application_id == data.application_id,
            Interview.status.in_([InterviewStatus.CONFIRMED, InterviewStatus.PROPOSED])
        )
    ).all()
    
    for old in old_interviews:
        old.status = InterviewStatus.CANCELLED
        old.updated_at = datetime.utcnow()
    
    # Erstelle neuen Interview-Vorschlag
    interview = Interview(
        application_id=data.application_id,
        status=InterviewStatus.PROPOSED,
        proposed_date_1=data.proposed_date_1,
        proposed_date_2=data.proposed_date_2,
        location=data.location,
        meeting_link=data.meeting_link,
        notes_company=data.notes,
    )
    db.add(interview)
    
    # Aktualisiere Bewerbungsstatus
    application.status = ApplicationStatus.INTERVIEW_SCHEDULED
    application.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    # Sende Email an Bewerber (nur wenn send_email=True)
    if data.send_email:
        applicant = application.applicant
        if applicant and applicant.user and applicant.user.email:
            job_title = application.job_posting.title if application.job_posting else "Stelle"
            company_name = application.job_posting.company.company_name if application.job_posting and application.job_posting.company else "Unternehmen"
            
            email_service.send_interview_proposed(
                to_email=applicant.user.email,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=job_title,
                company_name=company_name,
                date_1=data.proposed_date_1.strftime("%d.%m.%Y um %H:%M Uhr"),
                date_2=data.proposed_date_2.strftime("%d.%m.%Y um %H:%M Uhr") if data.proposed_date_2 else None,
                location=data.location,
                meeting_link=data.meeting_link,
                notes=data.notes,
            )
    
    return {
        "success": True,
        "message": "Terminvorschläge gespeichert",
        "interview": get_interview_response(interview)
    }


@router.post("/{interview_id}/confirm", response_model=dict)
async def confirm_interview(
    interview_id: int,
    data: InterviewConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bewerber bestätigt einen der vorgeschlagenen Termine.
    Firma bekommt Email mit bestätigtem Termin.
    """
    # Hole Interview
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview nicht gefunden")
    
    # Prüfe ob Bewerber berechtigt ist
    application = interview.application
    if current_user.role == "applicant":
        if not application.applicant or application.applicant.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur der Bewerber kann Termine bestätigen")
    
    # Prüfe Status
    if interview.status != InterviewStatus.PROPOSED:
        raise HTTPException(status_code=400, detail="Dieser Termin kann nicht mehr bestätigt werden")
    
    # Prüfe ob gewählter Termin einer der vorgeschlagenen ist
    selected = data.selected_date
    valid_dates = [interview.proposed_date_1]
    if interview.proposed_date_2:
        valid_dates.append(interview.proposed_date_2)
    
    # Toleranz von 1 Minute für Zeitvergleich
    date_matches = any(abs((selected - d).total_seconds()) < 60 for d in valid_dates)
    if not date_matches:
        raise HTTPException(status_code=400, detail="Ungültiger Termin - bitte wählen Sie einen der vorgeschlagenen Termine")
    
    # Alle anderen Termine für diese Bewerbung auf CANCELLED setzen (nur 1 bestätigter Termin erlaubt)
    other_interviews = db.query(Interview).filter(
        and_(
            Interview.application_id == interview.application_id,
            Interview.id != interview.id,
            Interview.status.in_([InterviewStatus.CONFIRMED, InterviewStatus.PROPOSED])
        )
    ).all()
    
    for other in other_interviews:
        other.status = InterviewStatus.CANCELLED
        other.updated_at = datetime.utcnow()
    
    # Bestätige Termin
    interview.status = InterviewStatus.CONFIRMED
    interview.confirmed_date = selected
    interview.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    # Sende Email an Firma
    if application.job_posting and application.job_posting.company:
        company = application.job_posting.company
        company_email = company.user.email if company.user else None
        
        if company_email:
            applicant = application.applicant
            email_service.send_interview_confirmed(
                to_email=company_email,
                company_name=company.company_name,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=application.job_posting.title,
                confirmed_date=selected.strftime("%d.%m.%Y um %H:%M Uhr"),
                location=interview.location,
                meeting_link=interview.meeting_link,
            )
    
    return {
        "success": True,
        "message": "Termin bestätigt",
        "interview": get_interview_response(interview)
    }


@router.post("/{interview_id}/decline", response_model=dict)
async def decline_interview(
    interview_id: int,
    data: InterviewDecline,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bewerber lehnt alle vorgeschlagenen Termine ab.
    Firma bekommt Email und muss neue Termine vorschlagen.
    """
    # Hole Interview
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview nicht gefunden")
    
    # Prüfe ob Bewerber berechtigt ist
    application = interview.application
    if current_user.role == "applicant":
        if not application.applicant or application.applicant.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur der Bewerber kann Termine ablehnen")
    
    # Prüfe Status
    if interview.status != InterviewStatus.PROPOSED:
        raise HTTPException(status_code=400, detail="Dieser Termin kann nicht mehr abgelehnt werden")
    
    # Lehne ab
    interview.status = InterviewStatus.DECLINED
    interview.notes_applicant = data.reason
    interview.updated_at = datetime.utcnow()
    
    # Setze Bewerbungsstatus zurück
    application.status = ApplicationStatus.COMPANY_REVIEW
    application.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    # Sende Email an Firma
    if application.job_posting and application.job_posting.company:
        company = application.job_posting.company
        company_email = company.user.email if company.user else None
        
        if company_email:
            applicant = application.applicant
            email_service.send_interview_declined(
                to_email=company_email,
                company_name=company.company_name,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=application.job_posting.title,
                reason=data.reason,
            )
    
    return {
        "success": True,
        "message": "Termine abgelehnt - Firma wird benachrichtigt",
        "interview": get_interview_response(interview)
    }


@router.post("/{interview_id}/cancel", response_model=dict)
async def cancel_interview(
    interview_id: int,
    data: InterviewCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Termin absagen - funktioniert für Firma UND Bewerber.
    Der jeweils andere wird per Email benachrichtigt.
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview nicht gefunden")
    
    application = interview.application
    is_company = current_user.role == "company"
    is_applicant = current_user.role == "applicant"
    is_admin = current_user.role == "admin"
    
    # Berechtigungsprüfung
    if is_applicant:
        if not application.applicant or application.applicant.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
    elif is_company:
        if not application.job_posting or application.job_posting.company_id != current_user.company.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
    elif not is_admin:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Nur bestätigte oder vorgeschlagene Termine können abgesagt werden
    if interview.status not in [InterviewStatus.CONFIRMED, InterviewStatus.PROPOSED]:
        raise HTTPException(status_code=400, detail="Dieser Termin kann nicht abgesagt werden")
    
    # Absagen
    interview.status = InterviewStatus.CANCELLED
    interview.notes_applicant = data.reason if is_applicant else interview.notes_applicant
    interview.notes_company = data.reason if is_company else interview.notes_company
    interview.updated_at = datetime.utcnow()
    
    # Status zurücksetzen
    application.status = ApplicationStatus.COMPANY_REVIEW
    application.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(interview)
    
    # Email an die andere Partei senden
    job_title = application.job_posting.title if application.job_posting else "Stelle"
    company_name = application.job_posting.company.company_name if application.job_posting and application.job_posting.company else "Unternehmen"
    applicant = application.applicant
    applicant_name = f"{applicant.first_name} {applicant.last_name}" if applicant else "Bewerber"
    
    cancelled_date = interview.confirmed_date or interview.proposed_date_1
    date_str = cancelled_date.strftime("%d.%m.%Y um %H:%M Uhr") if cancelled_date else "Termin"
    
    if is_company or is_admin:
        # Firma hat abgesagt -> Email an Bewerber
        if applicant and applicant.user and applicant.user.email:
            email_service.send_interview_cancelled(
                to_email=applicant.user.email,
                recipient_name=applicant_name,
                other_party_name=company_name,
                job_title=job_title,
                cancelled_date=date_str,
                reason=data.reason,
                cancelled_by="company"
            )
    else:
        # Bewerber hat abgesagt -> Email an Firma
        company = application.job_posting.company if application.job_posting else None
        if company and company.user and company.user.email:
            email_service.send_interview_cancelled(
                to_email=company.user.email,
                recipient_name=company_name,
                other_party_name=applicant_name,
                job_title=job_title,
                cancelled_date=date_str,
                reason=data.reason,
                cancelled_by="applicant"
            )
    
    return {
        "success": True,
        "message": "Termin abgesagt - die andere Partei wurde benachrichtigt",
        "interview": get_interview_response(interview)
    }


class SendUpdateEmail(BaseModel):
    """Sendet kombinierte Update-Email an Bewerber"""
    application_id: int
    new_status: Optional[str] = None
    interview_dates: Optional[List[str]] = None
    interview_location: Optional[str] = None
    interview_link: Optional[str] = None
    interview_notes: Optional[str] = None


@router.post("/send-update-email", response_model=dict)
async def send_update_email(
    request: Request,
    data: SendUpdateEmail,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sendet eine kombinierte Update-Email an den Bewerber.
    Enthält Status-Änderung UND/ODER Interview-Termine in einer Email.
    """
    # Rate Limiting: 20 Emails pro Stunde
    await check_rate_limit(request, "interview_email", max_requests=20, window_seconds=3600)
    
    if current_user.role not in ["company", "admin"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    application = db.query(Application).filter(Application.id == data.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    # Berechtigungsprüfung für Firma
    if current_user.role == "company":
        if not application.job_posting or application.job_posting.company_id != current_user.company.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung für diese Bewerbung")
    
    applicant = application.applicant
    if not applicant or not applicant.user or not applicant.user.email:
        raise HTTPException(status_code=400, detail="Bewerber-Email nicht verfügbar")
    
    job_title = application.job_posting.title if application.job_posting else "Stelle"
    company_name = application.job_posting.company.company_name if application.job_posting and application.job_posting.company else "Unternehmen"
    
    email_service.send_application_update(
        to_email=applicant.user.email,
        applicant_name=f"{applicant.first_name} {applicant.last_name}",
        job_title=job_title,
        company_name=company_name,
        new_status=data.new_status,
        interview_dates=data.interview_dates,
        interview_location=data.interview_location,
        interview_link=data.interview_link,
        interview_notes=data.interview_notes,
    )
    
    return {
        "success": True,
        "message": "Update-Email gesendet"
    }


@router.get("/application/{application_id}", response_model=List[dict])
async def get_interviews_for_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Hole alle Interviews für eine Bewerbung"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    # Berechtigungsprüfung
    if current_user.role == "applicant":
        if not application.applicant or application.applicant.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
    elif current_user.role == "company":
        if not application.job_posting or application.job_posting.company_id != current_user.company.id:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
    # Admin hat immer Zugriff
    
    interviews = db.query(Interview).filter(
        Interview.application_id == application_id
    ).order_by(Interview.created_at.desc()).all()
    
    return [get_interview_response(i, include_details=False) for i in interviews]


@router.get("/pending", response_model=List[dict])
async def get_pending_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Hole alle offenen Interview-Anfragen für den aktuellen Benutzer"""
    
    if current_user.role == "applicant":
        # Bewerber: Hole alle PROPOSED Interviews für eigene Bewerbungen
        interviews = db.query(Interview).join(Application).join(
            Application.applicant
        ).filter(
            and_(
                Application.applicant.has(user_id=current_user.id),
                Interview.status == InterviewStatus.PROPOSED
            )
        ).all()
    elif current_user.role == "company":
        # Firma: Hole alle offenen Interviews für eigene Stellen
        from app.models import JobPosting
        interviews = db.query(Interview).join(Application).join(
            Application.job_posting
        ).filter(
            and_(
                JobPosting.company_id == current_user.company.id,
                Interview.status.in_([InterviewStatus.PROPOSED, InterviewStatus.DECLINED])
            )
        ).all()
    else:
        # Admin: Alle offenen
        interviews = db.query(Interview).filter(
            Interview.status.in_([InterviewStatus.PROPOSED, InterviewStatus.DECLINED])
        ).all()
    
    return [get_interview_response(i) for i in interviews]

