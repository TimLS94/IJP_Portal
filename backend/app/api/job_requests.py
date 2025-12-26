"""
API Endpoints für IJP-Aufträge (Job Requests)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
import csv
import io
import zipfile
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.job_request import JobRequest, JobRequestStatus, JOB_REQUEST_STATUS_LABELS, JOB_REQUEST_STATUS_COLORS
from app.models.document import Document
from app.services.email_service import email_service

router = APIRouter(prefix="/job-requests", tags=["IJP-Aufträge"])


# ========== PYDANTIC SCHEMAS ==========

class CreateJobRequestSchema(BaseModel):
    privacy_consent: bool
    preferred_location: Optional[str] = None
    preferred_start_date: Optional[datetime] = None
    notes: Optional[str] = None


class UpdateJobRequestStatusSchema(BaseModel):
    status: JobRequestStatus
    admin_notes: Optional[str] = None
    matched_company_name: Optional[str] = None
    matched_job_title: Optional[str] = None
    interview_date: Optional[str] = None  # ISO format date string
    interview_link: Optional[str] = None  # Zoom/Teams/Meet Link
    contract_date: Optional[str] = None   # ISO format date string


# ========== DATENSCHUTZ TEXT ==========

PRIVACY_CONSENT_TEXT = """
DATENSCHUTZERKLÄRUNG - IJP Vermittlungsservice

Mit Ihrer Zustimmung erklären Sie sich einverstanden, dass:

1. DATENVERARBEITUNG
IJP International Job Placement Ihre personenbezogenen Daten (Name, Kontaktdaten, 
Qualifikationen, Dokumente) zum Zweck der Arbeitsvermittlung verarbeitet.

2. DATENWEITERGABE AN PARTNERUNTERNEHMEN
Ihre Daten und Dokumente an potenzielle Arbeitgeber (Partnerunternehmen) 
weitergegeben werden dürfen, soweit dies für die Stellenvermittlung erforderlich ist.

3. ZWECKBINDUNG
Die Datenverarbeitung erfolgt ausschließlich zum Zweck der Arbeitsvermittlung 
und damit verbundener Dienstleistungen.

4. SPEICHERDAUER
Ihre Daten werden für die Dauer des Vermittlungsprozesses sowie für einen 
angemessenen Zeitraum danach gespeichert (max. 2 Jahre nach Abschluss).

5. WIDERRUF
Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. 
Ein Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.

6. IHRE RECHTE
Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung 
der Verarbeitung Ihrer Daten gemäß DSGVO.

Datum der Zustimmung: {date}
"""


# ========== HELPER ==========

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich")
    return current_user


# ========== BEWERBER ENDPOINTS ==========

POSITION_TYPE_LABELS = {
    PositionType.STUDENTENFERIENJOB: "Studentenferienjob",
    PositionType.SAISONJOB: "Saisonjob",
    PositionType.FACHKRAFT: "Fachkraft",
    PositionType.AUSBILDUNG: "Ausbildung",
}

@router.get("/my")
async def get_my_job_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Holt alle aktiven IJP-Aufträge des Bewerbers (einer pro Stellenart)"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur für Bewerber")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return {"has_requests": False, "requests": []}
    
    job_requests = db.query(JobRequest).filter(
        JobRequest.applicant_id == applicant.id,
        JobRequest.status.notin_([JobRequestStatus.CANCELLED, JobRequestStatus.COMPLETED, JobRequestStatus.WITHDRAWN])
    ).order_by(JobRequest.created_at.desc()).all()
    
    if not job_requests:
        return {"has_requests": False, "requests": []}
    
    return {
        "has_requests": True,
        "requests": [
            {
                "id": req.id,
                "position_type": req.position_type.value if req.position_type else None,
                "position_type_label": POSITION_TYPE_LABELS.get(req.position_type, "Allgemein") if req.position_type else "Allgemein",
                "status": req.status.value,
                "status_label": JOB_REQUEST_STATUS_LABELS.get(req.status),
                "status_color": JOB_REQUEST_STATUS_COLORS.get(req.status),
                "privacy_consent": req.privacy_consent,
                "privacy_consent_date": req.privacy_consent_date,
                "preferred_location": req.preferred_location,
                "preferred_start_date": req.preferred_start_date,
                "notes": req.notes,
                "matched_company_name": req.matched_company_name,
                "matched_job_title": req.matched_job_title,
                "interview_date": req.interview_date,
                "interview_link": req.interview_link,
                "contract_date": req.contract_date,
                "created_at": req.created_at,
                "updated_at": req.updated_at,
            }
            for req in job_requests
        ]
    }


@router.get("/privacy-text")
async def get_privacy_text():
    """Gibt den Datenschutz-Text zurück"""
    return {
        "text": PRIVACY_CONSENT_TEXT.format(date=datetime.now().strftime("%d.%m.%Y um %H:%M Uhr"))
    }


@router.post("")
async def create_job_requests(
    data: CreateJobRequestSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt IJP-Aufträge für alle gewählten Stellenarten (Bewerber beauftragt IJP)"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur für Bewerber")
    
    if not data.privacy_consent:
        raise HTTPException(
            status_code=400, 
            detail="Sie müssen der Datenschutzerklärung zustimmen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=400, detail="Bitte vervollständigen Sie zuerst Ihr Profil")
    
    # Prüfen ob Profil vollständig
    required_fields = ['first_name', 'last_name', 'phone']
    for field in required_fields:
        if not getattr(applicant, field, None):
            raise HTTPException(
                status_code=400, 
                detail=f"Bitte vervollständigen Sie Ihr Profil (fehlt: {field})"
            )
    
    # Stellenarten sammeln (aus position_types Array oder fallback auf position_type)
    position_types = []
    if getattr(applicant, 'position_types', None) and len(applicant.position_types) > 0:
        # position_types ist ein JSON-Array mit Strings
        for pt in applicant.position_types:
            try:
                position_types.append(PositionType(pt))
            except ValueError:
                pass
    elif getattr(applicant, 'position_type', None):
        position_types.append(applicant.position_type)
    
    if not position_types:
        raise HTTPException(
            status_code=400,
            detail="Bitte wählen Sie mindestens eine Stellenart in Ihrem Profil"
        )
    
    # Prüfen welche Stellenarten bereits aktive Aufträge haben
    existing_requests = db.query(JobRequest).filter(
        JobRequest.applicant_id == applicant.id,
        JobRequest.status.notin_([JobRequestStatus.CANCELLED, JobRequestStatus.COMPLETED, JobRequestStatus.WITHDRAWN])
    ).all()
    
    existing_position_types = {req.position_type for req in existing_requests if req.position_type}
    
    # Nur für neue Stellenarten Aufträge erstellen
    new_position_types = [pt for pt in position_types if pt not in existing_position_types]
    
    if not new_position_types:
        raise HTTPException(
            status_code=400, 
            detail="Für alle ausgewählten Stellenarten haben Sie bereits aktive Aufträge"
        )
    
    created_requests = []
    privacy_text = PRIVACY_CONSENT_TEXT.format(date=datetime.now().strftime("%d.%m.%Y um %H:%M Uhr"))
    
    for position_type in new_position_types:
        job_request = JobRequest(
            applicant_id=applicant.id,
            position_type=position_type,
            privacy_consent=True,
            privacy_consent_date=datetime.utcnow(),
            privacy_consent_text=privacy_text,
            preferred_location=data.preferred_location,
            preferred_start_date=data.preferred_start_date,
            notes=data.notes,
            status=JobRequestStatus.PENDING
        )
        db.add(job_request)
        created_requests.append(job_request)
    
    db.commit()
    
    # E-Mail an Bewerber
    position_labels = [POSITION_TYPE_LABELS.get(pt, pt.value) for pt in new_position_types]
    email_service.send_email(
        to_email=current_user.email,
        subject="IJP-Aufträge erfolgreich erstellt",
        html_content=f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">IJP-Aufträge erstellt!</h1>
                <p>Hallo {applicant.first_name},</p>
                <p>Ihre IJP-Aufträge wurden erfolgreich erstellt für:</p>
                <ul style="background: #f3f4f6; padding: 15px 15px 15px 35px; border-radius: 8px; margin: 20px 0;">
                    {"".join(f"<li><strong>{label}</strong></li>" for label in position_labels)}
                </ul>
                <p>Wir werden Ihre Unterlagen prüfen und uns bei passenden Stellen bei Ihnen melden.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP-Team</p>
            </div>
        </body>
        </html>
        """
    )
    
    return {
        "message": f"{len(created_requests)} IJP-Auftrag(e) erfolgreich erstellt",
        "created_count": len(created_requests),
        "position_types": [pt.value for pt in new_position_types]
    }


@router.delete("/my/{request_id}")
async def cancel_my_job_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Storniert einen einzelnen IJP-Auftrag"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=403, detail="Nur für Bewerber")
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Profil nicht gefunden")
    
    job_request = db.query(JobRequest).filter(
        JobRequest.id == request_id,
        JobRequest.applicant_id == applicant.id,
        JobRequest.status.notin_([JobRequestStatus.CANCELLED, JobRequestStatus.COMPLETED, JobRequestStatus.WITHDRAWN])
    ).first()
    
    if not job_request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    job_request.status = JobRequestStatus.WITHDRAWN
    db.commit()
    
    return {"message": "Auftrag zurückgezogen"}


# ========== ADMIN ENDPOINTS ==========

@router.get("/admin/status-options")
async def get_status_options(current_user: User = Depends(require_admin)):
    """Gibt alle Status-Optionen zurück"""
    return {
        "statuses": [
            {
                "value": status.value,
                "label": JOB_REQUEST_STATUS_LABELS.get(status),
                "color": JOB_REQUEST_STATUS_COLORS.get(status)
            }
            for status in JobRequestStatus
        ]
    }


@router.get("/admin")
async def list_job_requests(
    status_filter: Optional[JobRequestStatus] = None,
    position_type: Optional[PositionType] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle IJP-Aufträge für Admin"""
    query = db.query(JobRequest).join(Applicant)
    
    if status_filter:
        query = query.filter(JobRequest.status == status_filter)
    
    if position_type:
        # Filtern nach der Stellenart des Auftrags, nicht des Profils!
        query = query.filter(JobRequest.position_type == position_type)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Applicant.first_name.ilike(search_term)) |
            (Applicant.last_name.ilike(search_term))
        )
    
    total = query.count()
    requests = query.order_by(JobRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for req in requests:
        applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
        user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        doc_count = db.query(Document).filter(Document.applicant_id == applicant.id).count() if applicant else 0
        
        result.append({
            "id": req.id,
            "applicant_id": applicant.id if applicant else None,
            "applicant_name": f"{applicant.first_name} {applicant.last_name}" if applicant else "Unbekannt",
            "applicant_email": user.email if user else None,
            "applicant_phone": applicant.phone if applicant else None,
            # WICHTIG: position_type vom JobRequest nehmen, nicht vom Applicant!
            "position_type": req.position_type.value if req.position_type else None,
            "status": req.status.value,
            "status_label": JOB_REQUEST_STATUS_LABELS.get(req.status),
            "status_color": JOB_REQUEST_STATUS_COLORS.get(req.status),
            "privacy_consent": req.privacy_consent,
            "privacy_consent_date": req.privacy_consent_date,
            "preferred_location": req.preferred_location,
            "notes": req.notes,
            "admin_notes": req.admin_notes,
            "document_count": doc_count,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
        })
    
    return {"total": total, "requests": result}


@router.get("/admin/{request_id}")
async def get_job_request_details(
    request_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt detaillierte Informationen zu einem IJP-Auftrag"""
    req = db.query(JobRequest).filter(JobRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
    user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
    documents = db.query(Document).filter(Document.applicant_id == applicant.id).all() if applicant else []
    
    return {
        "request": {
            "id": req.id,
            "status": req.status.value,
            "status_label": JOB_REQUEST_STATUS_LABELS.get(req.status),
            "status_color": JOB_REQUEST_STATUS_COLORS.get(req.status),
            "privacy_consent": req.privacy_consent,
            "privacy_consent_date": req.privacy_consent_date,
            "preferred_location": req.preferred_location,
            "preferred_start_date": req.preferred_start_date,
            "notes": req.notes,
            "admin_notes": req.admin_notes,
            # Vermittlungs-Daten
            "matched_company_name": req.matched_company_name,
            "matched_job_title": req.matched_job_title,
            "interview_date": req.interview_date,
            "interview_link": req.interview_link,
            "contract_date": req.contract_date,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
            # Position Type vom Auftrag!
            "position_type": req.position_type.value if req.position_type else None,
        },
        "applicant": {
            "id": applicant.id if applicant else None,
            "first_name": applicant.first_name if applicant else None,
            "last_name": applicant.last_name if applicant else None,
            "email": user.email if user else None,
            "phone": applicant.phone if applicant else None,
            "date_of_birth": applicant.date_of_birth if applicant else None,
            "nationality": applicant.nationality if applicant else None,
            # Profil-Stellenart (kann von Auftrags-Stellenart abweichen)
            "position_type": applicant.position_type.value if applicant and applicant.position_type else None,
            "address": {
                "street": applicant.street if applicant else None,
                "house_number": applicant.house_number if applicant else None,
                "postal_code": applicant.postal_code if applicant else None,
                "city": applicant.city if applicant else None,
                "country": applicant.country if applicant else None,
            },
            "german_level": applicant.german_level.value if applicant and applicant.german_level else None,
            "english_level": applicant.english_level.value if applicant and applicant.english_level else None,
            "work_experience_years": applicant.work_experience_years if applicant else None,
            "university_name": applicant.university_name if applicant else None,
            "field_of_study": applicant.field_of_study if applicant else None,
        },
        "documents": [
            {
                "id": doc.id,
                "document_type": doc.document_type.value,
                "original_name": doc.original_name,
                "file_path": doc.file_path,
                "uploaded_at": doc.uploaded_at,
            }
            for doc in documents
        ]
    }


@router.put("/admin/{request_id}/status")
async def update_job_request_status(
    request_id: int,
    data: UpdateJobRequestStatusSchema,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aktualisiert den Status eines IJP-Auftrags"""
    req = db.query(JobRequest).filter(JobRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    old_status = req.status
    req.status = data.status
    
    # Optionale Felder aktualisieren
    if data.admin_notes is not None:
        req.admin_notes = data.admin_notes
    if data.matched_company_name is not None:
        req.matched_company_name = data.matched_company_name
    if data.matched_job_title is not None:
        req.matched_job_title = data.matched_job_title
    if data.interview_link is not None:
        req.interview_link = data.interview_link if data.interview_link else None
    if data.interview_date:
        from datetime import datetime
        try:
            req.interview_date = datetime.fromisoformat(data.interview_date.replace('Z', '+00:00'))
        except:
            req.interview_date = None
    if data.contract_date:
        from datetime import datetime
        try:
            req.contract_date = datetime.fromisoformat(data.contract_date.replace('Z', '+00:00'))
        except:
            req.contract_date = None
    
    db.commit()
    db.refresh(req)
    
    # E-Mail bei Statusänderung
    if data.status != old_status:
        applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
        user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        
        if user:
            # Position Type Label
            position_label = POSITION_TYPE_LABELS.get(req.position_type, "Allgemein") if req.position_type else "Allgemein"
            
            # Interview-Details für E-Mail
            interview_section = ""
            if req.interview_date or req.interview_link:
                interview_section = """
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #92400e; margin: 0 0 10px 0;">📅 Interview-Details</h3>
                """
                if req.interview_date:
                    interview_date_str = req.interview_date.strftime("%d.%m.%Y um %H:%M Uhr")
                    interview_section += f'<p style="margin: 5px 0;"><strong>Termin:</strong> {interview_date_str}</p>'
                if req.interview_link:
                    interview_section += f'<p style="margin: 5px 0;"><strong>Link:</strong> <a href="{req.interview_link}" style="color: #2563eb;">{req.interview_link}</a></p>'
                interview_section += "</div>"
            
            # Firma-Details für E-Mail
            company_section = ""
            if req.matched_company_name or req.matched_job_title:
                company_section = """
                <div style="background: #ede9fe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                    <h3 style="color: #5b21b6; margin: 0 0 10px 0;">🏢 Vermittlung an</h3>
                """
                if req.matched_company_name:
                    company_section += f'<p style="margin: 5px 0;"><strong>Firma:</strong> {req.matched_company_name}</p>'
                if req.matched_job_title:
                    company_section += f'<p style="margin: 5px 0;"><strong>Position:</strong> {req.matched_job_title}</p>'
                company_section += "</div>"
            
            # Frontend URL aus Settings oder Fallback
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
            
            email_service.send_email(
                to_email=user.email,
                subject=f"IJP Update: {JOB_REQUEST_STATUS_LABELS.get(data.status)} - {position_label}",
                html_content=f"""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2563eb; margin: 0;">IJP - International Job Placement</h1>
                            <p style="color: #6b7280; margin: 5px 0;">Status-Update zu Ihrem Vermittlungsauftrag</p>
                        </div>
                        
                        <p>Hallo {applicant.first_name},</p>
                        
                        <p>wir freuen uns, Ihnen mitzuteilen, dass sich der Status Ihres IJP-Auftrags für <strong>{position_label}</strong> geändert hat:</p>
                        
                        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px solid #93c5fd;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Neuer Status:</p>
                            <strong style="font-size: 22px; color: #1d4ed8;">{JOB_REQUEST_STATUS_LABELS.get(data.status)}</strong>
                        </div>
                        
                        {company_section}
                        {interview_section}
                        
                        <p>Loggen Sie sich in Ihr Konto ein, um alle Details zu sehen und auf dem Laufenden zu bleiben:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{frontend_url}/applicant/ijp-auftrag" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                                Jetzt ansehen →
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            Bei Fragen stehen wir Ihnen gerne zur Verfügung unter 
                            <a href="mailto:service@internationaljobplacement.com" style="color: #2563eb;">service@internationaljobplacement.com</a>
                        </p>
                        
                        <p>Mit freundlichen Grüßen,<br><strong>Ihr IJP-Team</strong></p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                IJP International Job Placement UG (haftungsbeschränkt)<br>
                                Oranienburger Straße 173, 13437 Berlin
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """
            )
    
    return {
        "message": "Status aktualisiert",
        "status": req.status.value,
        "status_label": JOB_REQUEST_STATUS_LABELS.get(req.status)
    }


@router.get("/admin/export/csv")
async def export_job_requests_csv(
    status_filter: Optional[JobRequestStatus] = None,
    position_type: Optional[PositionType] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Exportiert IJP-Aufträge als CSV mit vollständigen Profildaten"""
    query = db.query(JobRequest).join(Applicant)
    
    if status_filter:
        query = query.filter(JobRequest.status == status_filter)
    if position_type:
        query = query.filter(Applicant.position_type == position_type)
    
    requests = query.order_by(JobRequest.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Header - Alle Profildaten
    writer.writerow([
        # Auftrag
        'Auftrags-ID', 'Auftragsdatum', 'Status', 'Bevorzugte Region', 'Bewerber-Notizen', 'Admin-Notizen',
        'Datenschutz-Zustimmung', 'Datenschutz-Datum',
        # Persönliche Daten
        'Vorname', 'Nachname', 'E-Mail', 'Telefon', 'Geburtsdatum', 'Geburtsort', 'Nationalität',
        # Adresse
        'Straße', 'Hausnummer', 'PLZ', 'Stadt', 'Land',
        # Stellenart
        'Stellenart',
        # Qualifikationen
        'Deutschkenntnisse', 'Englischkenntnisse', 'Weitere Sprachen',
        'Berufserfahrung (Jahre)', 'Berufserfahrung (Details)',
        'Schon in Deutschland gewesen', 'Deutschland-Details',
        # Studenten-Daten
        'Universität', 'Uni-Stadt', 'Uni-Land', 'Studienfach', 'Fachsemester',
        'Semesterferien von', 'Semesterferien bis', 'Weiterstudieren',
        # Fachkraft/Ausbildung
        'Beruf', 'Abschluss', 'Abschlussjahr', 'Schulabschluss', 'Wunschberuf',
        # Verfügbarkeit
        'Verfügbar ab', 'Verfügbar bis', 'Bevorzugter Arbeitsbereich',
        # Meta
        'Zusätzliche Infos', 'Anzahl Dokumente'
    ])
    
    for req in requests:
        applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
        user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        doc_count = db.query(Document).filter(Document.applicant_id == applicant.id).count() if applicant else 0
        
        # Andere Sprachen als String
        other_langs = ''
        if applicant and applicant.other_languages:
            try:
                langs = applicant.other_languages if isinstance(applicant.other_languages, list) else []
                other_langs = ', '.join([f"{l.get('language', '')}: {l.get('level', '')}" for l in langs])
            except:
                other_langs = str(applicant.other_languages)
        
        writer.writerow([
            # Auftrag
            req.id,
            req.created_at.strftime('%d.%m.%Y %H:%M') if req.created_at else '',
            JOB_REQUEST_STATUS_LABELS.get(req.status, req.status.value),
            req.preferred_location or '',
            req.notes or '',
            req.admin_notes or '',
            'Ja' if req.privacy_consent else 'Nein',
            req.privacy_consent_date.strftime('%d.%m.%Y %H:%M') if req.privacy_consent_date else '',
            # Persönliche Daten
            applicant.first_name if applicant else '',
            applicant.last_name if applicant else '',
            user.email if user else '',
            applicant.phone if applicant else '',
            applicant.date_of_birth.strftime('%d.%m.%Y') if applicant and applicant.date_of_birth else '',
            applicant.place_of_birth if applicant else '',
            applicant.nationality if applicant else '',
            # Adresse
            applicant.street if applicant else '',
            applicant.house_number if applicant else '',
            applicant.postal_code if applicant else '',
            applicant.city if applicant else '',
            applicant.country if applicant else '',
            # Stellenart
            applicant.position_type.value if applicant and applicant.position_type else '',
            # Qualifikationen
            applicant.german_level.value if applicant and applicant.german_level else '',
            applicant.english_level.value if applicant and applicant.english_level else '',
            other_langs,
            applicant.work_experience_years if applicant else '',
            applicant.work_experience if applicant else '',
            'Ja' if applicant and applicant.been_to_germany else 'Nein',
            applicant.germany_details if applicant else '',
            # Studenten-Daten
            applicant.university_name if applicant else '',
            applicant.university_city if applicant else '',
            applicant.university_country if applicant else '',
            applicant.field_of_study if applicant else '',
            applicant.current_semester if applicant else '',
            applicant.semester_break_start.strftime('%d.%m.%Y') if applicant and applicant.semester_break_start else '',
            applicant.semester_break_end.strftime('%d.%m.%Y') if applicant and applicant.semester_break_end else '',
            'Ja' if applicant and applicant.continue_studying else 'Nein',
            # Fachkraft/Ausbildung
            applicant.profession if applicant else '',
            applicant.degree if applicant else '',
            applicant.degree_year if applicant else '',
            applicant.school_degree if applicant else '',
            applicant.desired_profession if applicant else '',
            # Verfügbarkeit
            applicant.available_from.strftime('%d.%m.%Y') if applicant and applicant.available_from else '',
            applicant.available_until.strftime('%d.%m.%Y') if applicant and applicant.available_until else '',
            applicant.preferred_work_area if applicant else '',
            # Meta
            applicant.additional_info if applicant else '',
            doc_count
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ijp_auftraege_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"}
    )


@router.get("/admin/{request_id}/documents/download-all")
async def download_all_documents(
    request_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lädt alle Dokumente eines IJP-Auftrags als ZIP herunter"""
    req = db.query(JobRequest).filter(JobRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber nicht gefunden")
    
    documents = db.query(Document).filter(Document.applicant_id == applicant.id).all()
    
    if not documents:
        raise HTTPException(status_code=404, detail="Keine Dokumente vorhanden")
    
    zip_buffer = io.BytesIO()
    files_added = 0
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for doc in documents:
            # Baue den vollständigen Pfad: uploads/{applicant_id}/{filename}
            full_path = os.path.join(settings.UPLOAD_DIR, str(applicant.id), doc.file_name)
            
            if os.path.exists(full_path):
                archive_name = f"{doc.document_type.value}_{doc.original_name}"
                zip_file.write(full_path, archive_name)
                files_added += 1
            elif os.path.exists(doc.file_path):
                # Fallback: Versuche den gespeicherten Pfad direkt
                archive_name = f"{doc.document_type.value}_{doc.original_name}"
                zip_file.write(doc.file_path, archive_name)
                files_added += 1
    
    if files_added == 0:
        raise HTTPException(status_code=404, detail="Keine Dateien gefunden auf dem Server")
    
    zip_buffer.seek(0)
    filename = f"dokumente_auftrag_{req.id}_{applicant.first_name}_{applicant.last_name}.zip"
    
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
