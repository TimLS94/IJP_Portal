from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limiter import get_locked_accounts, unlock_account
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.application import Application, ApplicationStatus, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS
from app.models.document import Document
from app.models.password_reset import PasswordResetToken

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    """Prüft ob der Benutzer Admin ist"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin-Rechte erforderlich"
        )
    return current_user


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt Statistiken für das Admin-Dashboard"""
    
    # Zeitraum für "neu" (letzte 7 Tage)
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    stats = {
        "users": {
            "total": db.query(User).count(),
            "applicants": db.query(User).filter(User.role == UserRole.APPLICANT).count(),
            "companies": db.query(User).filter(User.role == UserRole.COMPANY).count(),
            "new_this_week": db.query(User).filter(User.created_at >= week_ago).count()
        },
        "jobs": {
            "total": db.query(JobPosting).count(),
            "active": db.query(JobPosting).filter(JobPosting.is_active == True).count(),
            "new_this_week": db.query(JobPosting).filter(JobPosting.created_at >= week_ago).count()
        },
        "applications": {
            "total": db.query(Application).count(),
            "pending": db.query(Application).filter(Application.status == ApplicationStatus.PENDING).count(),
            "accepted": db.query(Application).filter(Application.status == ApplicationStatus.ACCEPTED).count(),
            "rejected": db.query(Application).filter(Application.status == ApplicationStatus.REJECTED).count(),
            "new_this_week": db.query(Application).filter(Application.applied_at >= week_ago).count()
        },
        "position_types": {}
    }
    
    # Stellen nach Typ - robuste Abfrage, die nur existierende DB-Werte zählt
    position_counts = db.query(
        JobPosting.position_type,
        func.count(JobPosting.id)
    ).group_by(JobPosting.position_type).all()
    
    # Initialisiere alle bekannten Positionstypen mit 0
    for pos_type in PositionType:
        stats["position_types"][pos_type.value] = 0
    
    # Überschreibe mit tatsächlichen Werten aus der DB
    for pos_type, count in position_counts:
        if pos_type:
            stats["position_types"][pos_type.value] = count
    
    return stats


@router.get("/users")
async def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Benutzer"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        user_data = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        
        # Zusätzliche Daten je nach Rolle
        if user.role == UserRole.APPLICANT:
            applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
            if applicant:
                user_data["name"] = f"{applicant.first_name} {applicant.last_name}"
                user_data["position_type"] = applicant.position_type
        elif user.role == UserRole.COMPANY:
            company = db.query(Company).filter(Company.user_id == user.id).first()
            if company:
                user_data["name"] = company.company_name
        
        result.append(user_data)
    
    return {"total": total, "users": result}


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aktiviert/Deaktiviert einen Benutzer. Bei Firmen wird eine Aktivierungs-E-Mail gesendet."""
    from app.services.email_service import email_service
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benutzer nicht gefunden"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sie können sich nicht selbst deaktivieren"
        )
    
    was_inactive = not user.is_active
    user.is_active = not user.is_active
    db.commit()
    
    # Wenn eine FIRMA aktiviert wird, sende Aktivierungs-E-Mail
    if user.is_active and was_inactive and user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user.id).first()
        if company:
            email_service.send_company_activated(
                to_email=user.email,
                company_name=company.company_name
            )
    
    return {"message": f"Benutzer {'aktiviert' if user.is_active else 'deaktiviert'}", "is_active": user.is_active}


@router.get("/jobs")
async def list_all_jobs(
    is_active: Optional[bool] = None,
    position_type: Optional[PositionType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Stellenangebote für Admin"""
    query = db.query(JobPosting)
    
    if is_active is not None:
        query = query.filter(JobPosting.is_active == is_active)
    
    if position_type:
        query = query.filter(JobPosting.position_type == position_type)
    
    total = query.count()
    jobs = query.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for job in jobs:
        company = db.query(Company).filter(Company.id == job.company_id).first()
        app_count = db.query(Application).filter(Application.job_posting_id == job.id).count()
        
        result.append({
            "id": job.id,
            "title": job.title,
            "position_type": job.position_type,
            "location": job.location,
            "is_active": job.is_active,
            "created_at": job.created_at,
            "company_name": company.company_name if company else "Unbekannt",
            "application_count": app_count,
            "view_count": job.view_count or 0,
            "slug": job.slug
        })
    
    return {"total": total, "jobs": result}


@router.delete("/jobs/{job_id}")
async def admin_delete_job(
    job_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Löscht ein Stellenangebot (Admin)"""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stellenangebot nicht gefunden"
        )
    
    # Bewerbungen löschen
    db.query(Application).filter(Application.job_posting_id == job_id).delete()
    
    db.delete(job)
    db.commit()
    
    return {"message": "Stellenangebot gelöscht"}


@router.get("/applications")
async def list_all_applications(
    status_filter: Optional[ApplicationStatus] = None,
    position_type: Optional[PositionType] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Bewerbungen für Admin mit erweiterten Filtern"""
    query = db.query(Application).join(Applicant).join(JobPosting)
    
    if status_filter:
        query = query.filter(Application.status == status_filter)
    
    if position_type:
        query = query.filter(Applicant.position_type == position_type)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Applicant.first_name.ilike(search_term)) |
            (Applicant.last_name.ilike(search_term)) |
            (JobPosting.title.ilike(search_term))
        )
    
    total = query.count()
    applications = query.order_by(Application.applied_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for app in applications:
        applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
        applicant_user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        job = db.query(JobPosting).filter(JobPosting.id == app.job_posting_id).first()
        company = db.query(Company).filter(Company.id == job.company_id).first() if job else None
        doc_count = db.query(Document).filter(Document.applicant_id == applicant.id).count() if applicant else 0
        
        result.append({
            "id": app.id,
            "status": app.status.value,
            "status_label": APPLICATION_STATUS_LABELS.get(app.status, app.status.value),
            "status_color": APPLICATION_STATUS_COLORS.get(app.status, "gray"),
            "applied_at": app.applied_at,
            "updated_at": app.updated_at,
            "applicant_id": applicant.id if applicant else None,
            "applicant_name": f"{applicant.first_name} {applicant.last_name}" if applicant else "Unbekannt",
            "applicant_email": applicant_user.email if applicant_user else None,
            "applicant_phone": applicant.phone if applicant else None,
            "position_type": applicant.position_type.value if applicant and applicant.position_type else None,
            "job_id": job.id if job else None,
            "job_title": job.title if job else "Unbekannt",
            "company_name": company.company_name if company else "Unbekannt",
            "document_count": doc_count,
            "admin_notes": app.admin_notes,
        })
    
    return {"total": total, "applications": result}


@router.get("/applications/{application_id}")
async def get_application_details(
    application_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt detaillierte Informationen zu einer Bewerbung inkl. Bewerber und Dokumente"""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
    applicant_user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
    job = db.query(JobPosting).filter(JobPosting.id == app.job_posting_id).first()
    company = db.query(Company).filter(Company.id == job.company_id).first() if job else None
    documents = db.query(Document).filter(Document.applicant_id == applicant.id).all() if applicant else []
    
    return {
        "application": {
            "id": app.id,
            "status": app.status.value,
            "status_label": APPLICATION_STATUS_LABELS.get(app.status, app.status.value),
            "applicant_message": app.applicant_message,
            "company_notes": app.company_notes,
            "admin_notes": app.admin_notes,
            "applied_at": app.applied_at,
            "updated_at": app.updated_at,
        },
        "applicant": {
            "id": applicant.id if applicant else None,
            "first_name": applicant.first_name if applicant else None,
            "last_name": applicant.last_name if applicant else None,
            "email": applicant_user.email if applicant_user else None,
            "phone": applicant.phone if applicant else None,
            "date_of_birth": applicant.date_of_birth if applicant else None,
            "nationality": applicant.nationality if applicant else None,
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
        "job": {
            "id": job.id if job else None,
            "title": job.title if job else None,
            "position_type": job.position_type.value if job and job.position_type else None,
            "company_name": company.company_name if company else None,
        },
        "documents": [
            {
                "id": doc.id,
                "document_type": doc.document_type.value,
                "original_name": doc.original_name,
                "file_path": doc.file_path,
                "file_size": doc.file_size,
                "uploaded_at": doc.uploaded_at,
            }
            for doc in documents
        ]
    }


class UpdateApplicationStatusRequest(BaseModel):
    status: ApplicationStatus
    admin_notes: Optional[str] = None


@router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    data: UpdateApplicationStatusRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aktualisiert den Status einer Bewerbung (Admin)"""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Bewerbung nicht gefunden")
    
    old_status = app.status
    app.status = data.status
    if data.admin_notes is not None:
        app.admin_notes = data.admin_notes
    
    db.commit()
    db.refresh(app)
    
    # E-Mail an Bewerber senden bei Statusänderung
    if data.status != old_status:
        applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
        applicant_user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        job = db.query(JobPosting).filter(JobPosting.id == app.job_posting_id).first()
        
        if applicant_user and job:
            from app.services.email_service import email_service
            email_service.send_application_status_update(
                to_email=applicant_user.email,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=job.title,
                company_name="IJP Portal",
                new_status=APPLICATION_STATUS_LABELS.get(data.status, data.status.value)
            )
    
    return {
        "message": "Status aktualisiert",
        "status": app.status.value,
        "status_label": APPLICATION_STATUS_LABELS.get(app.status, app.status.value)
    }


@router.get("/applications/export/csv")
async def export_applications_csv(
    status_filter: Optional[ApplicationStatus] = None,
    position_type: Optional[PositionType] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Exportiert Bewerbungen als CSV"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    query = db.query(Application).join(Applicant).join(JobPosting)
    
    if status_filter:
        query = query.filter(Application.status == status_filter)
    if position_type:
        query = query.filter(Applicant.position_type == position_type)
    
    applications = query.order_by(Application.applied_at.desc()).all()
    
    # CSV erstellen
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Header
    writer.writerow([
        'ID', 'Bewerbungsdatum', 'Status', 'Vorname', 'Nachname', 'E-Mail', 'Telefon',
        'Geburtsdatum', 'Nationalität', 'Stellenart', 'Stadt', 'Land',
        'Deutschkenntnisse', 'Englischkenntnisse', 'Stellentitel', 'Unternehmen', 'Notizen'
    ])
    
    for app in applications:
        applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
        applicant_user = db.query(User).filter(User.id == applicant.user_id).first() if applicant else None
        job = db.query(JobPosting).filter(JobPosting.id == app.job_posting_id).first()
        company = db.query(Company).filter(Company.id == job.company_id).first() if job else None
        
        writer.writerow([
            app.id,
            app.applied_at.strftime('%d.%m.%Y %H:%M') if app.applied_at else '',
            APPLICATION_STATUS_LABELS.get(app.status, app.status.value),
            applicant.first_name if applicant else '',
            applicant.last_name if applicant else '',
            applicant_user.email if applicant_user else '',
            applicant.phone if applicant else '',
            applicant.date_of_birth.strftime('%d.%m.%Y') if applicant and applicant.date_of_birth else '',
            applicant.nationality if applicant else '',
            applicant.position_type.value if applicant and applicant.position_type else '',
            applicant.city if applicant else '',
            applicant.country if applicant else '',
            applicant.german_level.value if applicant and applicant.german_level else '',
            applicant.english_level.value if applicant and applicant.english_level else '',
            job.title if job else '',
            company.company_name if company else '',
            app.admin_notes or ''
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bewerbungen_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"}
    )


@router.get("/applicants/{applicant_id}/documents")
async def get_applicant_documents(
    applicant_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Dokumente eines Bewerbers"""
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber nicht gefunden")
    
    documents = db.query(Document).filter(Document.applicant_id == applicant_id).all()
    
    return {
        "applicant": {
            "id": applicant.id,
            "name": f"{applicant.first_name} {applicant.last_name}"
        },
        "documents": [
            {
                "id": doc.id,
                "document_type": doc.document_type.value,
                "original_name": doc.original_name,
                "file_path": doc.file_path,
                "file_size": doc.file_size,
                "uploaded_at": doc.uploaded_at,
            }
            for doc in documents
        ]
    }


@router.get("/applicants/{applicant_id}/documents/download-all")
async def download_all_documents(
    applicant_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Erstellt ein ZIP-Archiv mit allen Dokumenten eines Bewerbers"""
    from fastapi.responses import StreamingResponse
    import zipfile
    import io
    import os
    from app.core.config import settings
    
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber nicht gefunden")
    
    documents = db.query(Document).filter(Document.applicant_id == applicant_id).all()
    
    if not documents:
        raise HTTPException(status_code=404, detail="Keine Dokumente vorhanden")
    
    # ZIP erstellen
    zip_buffer = io.BytesIO()
    files_added = 0
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for doc in documents:
            # Baue den vollständigen Pfad: uploads/{applicant_id}/{filename}
            full_path = os.path.join(settings.UPLOAD_DIR, str(applicant_id), doc.file_name)
            
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
        raise HTTPException(status_code=404, detail="Keine Dateien auf dem Server gefunden")
    
    zip_buffer.seek(0)
    filename = f"dokumente_{applicant.first_name}_{applicant.last_name}_{datetime.now().strftime('%Y%m%d')}.zip"
    
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/applicants")
async def list_all_applicants(
    position_type: Optional[PositionType] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Bewerber mit Filtern"""
    query = db.query(Applicant)
    
    if position_type:
        query = query.filter(Applicant.position_type == position_type)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Applicant.first_name.ilike(search_term)) |
            (Applicant.last_name.ilike(search_term))
        )
    
    total = query.count()
    applicants = query.order_by(Applicant.id.desc()).offset(skip).limit(limit).all()
    
    result = []
    for applicant in applicants:
        user = db.query(User).filter(User.id == applicant.user_id).first()
        app_count = db.query(Application).filter(Application.applicant_id == applicant.id).count()
        doc_count = db.query(Document).filter(Document.applicant_id == applicant.id).count()
        
        result.append({
            "id": applicant.id,
            "first_name": applicant.first_name,
            "last_name": applicant.last_name,
            "email": user.email if user else None,
            "phone": applicant.phone,
            "position_type": applicant.position_type.value if applicant.position_type else None,
            "nationality": applicant.nationality,
            "city": applicant.city,
            "application_count": app_count,
            "document_count": doc_count,
        })
    
    return {"total": total, "applicants": result}


class CreateAdminRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/users/create-admin")
async def create_admin_user(
    data: CreateAdminRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Erstellt einen neuen Admin-Benutzer (nur für Admins)"""
    from app.core.security import get_password_hash
    
    # Prüfen ob E-Mail bereits existiert
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-Mail bereits registriert"
        )
    
    # Passwort-Validierung
    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwort muss mindestens 6 Zeichen haben"
        )
    
    admin = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return {
        "message": "Admin-Benutzer erstellt",
        "user": {
            "id": admin.id,
            "email": admin.email,
            "role": admin.role.value,
            "created_at": admin.created_at
        }
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Löscht einen Benutzer (nur für Admins)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benutzer nicht gefunden"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sie können sich nicht selbst löschen"
        )
    
    # Password Reset Tokens löschen (falls vorhanden)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
    
    # Zugehörige Daten löschen
    if user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user_id).first()
        if applicant:
            # IJP-Aufträge löschen (WICHTIG: vor Applicant löschen!)
            from app.models.job_request import JobRequest
            from app.models.interview import Interview
            from app.models.application import ApplicationDocument
            db.query(JobRequest).filter(JobRequest.applicant_id == applicant.id).delete()
            # Zuerst application_documents löschen (FK auf documents)
            doc_ids = [d.id for d in db.query(Document).filter(Document.applicant_id == applicant.id).all()]
            if doc_ids:
                db.query(ApplicationDocument).filter(ApplicationDocument.document_id.in_(doc_ids)).delete(synchronize_session=False)
            # Dann Dokumente löschen
            db.query(Document).filter(Document.applicant_id == applicant.id).delete()
            # Interviews löschen (vor Bewerbungen!)
            applications = db.query(Application).filter(Application.applicant_id == applicant.id).all()
            for app in applications:
                db.query(Interview).filter(Interview.application_id == app.id).delete()
            # Dann Bewerbungen löschen
            db.query(Application).filter(Application.applicant_id == applicant.id).delete()
            db.delete(applicant)
    elif user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user_id).first()
        if company:
            from app.models.interview import Interview
            jobs = db.query(JobPosting).filter(JobPosting.company_id == company.id).all()
            for job in jobs:
                # Interviews zu Bewerbungen dieser Jobs löschen
                applications = db.query(Application).filter(Application.job_posting_id == job.id).all()
                for app in applications:
                    db.query(Interview).filter(Interview.application_id == app.id).delete()
                db.query(Application).filter(Application.job_posting_id == job.id).delete()
            db.query(JobPosting).filter(JobPosting.company_id == company.id).delete()
            db.delete(company)
    
    db.delete(user)
    db.commit()
    
    return {"message": "Benutzer gelöscht"}


# ==================== FEATURE FLAGS / SETTINGS ====================

@router.get("/settings")
async def get_all_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt alle globalen Einstellungen (Admin only)"""
    from app.services.settings_service import get_all_settings
    return get_all_settings(db)


from pydantic import BaseModel
from typing import Union

class SettingUpdateRequest(BaseModel):
    value: Union[bool, int, str]

@router.put("/settings/{key}")
async def update_setting(
    key: str,
    data: SettingUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aktualisiert eine globale Einstellung (Admin only)"""
    from app.services.settings_service import set_setting
    
    setting = set_setting(db, key, data.value, current_user.id)
    
    return {
        "message": f"Einstellung '{key}' wurde aktualisiert",
        "key": key,
        "value": data.value
    }


@router.get("/settings/feature-flags")
async def get_feature_flags(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt alle Feature Flags und Einstellungen (Admin only)"""
    from app.services.settings_service import get_setting
    
    return {
        "matching_enabled_for_companies": get_setting(db, "matching_enabled_for_companies", True),
        "matching_enabled_for_applicants": get_setting(db, "matching_enabled_for_applicants", True),
        "auto_deactivate_expired_jobs": get_setting(db, "auto_deactivate_expired_jobs", True),
        "archive_deletion_days": get_setting(db, "archive_deletion_days", 90),
        "max_job_deadline_days": get_setting(db, "max_job_deadline_days", 90)
    }


@router.get("/settings/archive-deletion-preview")
async def get_archive_deletion_preview(
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Zeigt an, wie viele archivierte Stellen gelöscht werden würden,
    wenn die Archiv-Löschfrist auf X Tage gesetzt wird.
    """
    from app.models.job_posting import JobPosting
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    affected_jobs = db.query(JobPosting).filter(
        JobPosting.is_archived == True,
        JobPosting.archived_at != None,
        JobPosting.archived_at < cutoff
    ).all()
    
    return {
        "days": days,
        "affected_count": len(affected_jobs),
        "affected_jobs": [
            {
                "id": job.id,
                "title": job.title,
                "archived_at": job.archived_at.isoformat() if job.archived_at else None,
                "days_archived": (datetime.utcnow() - job.archived_at).days if job.archived_at else 0
            }
            for job in affected_jobs[:20]  # Maximal 20 anzeigen
        ],
        "warning": f"Bei einer Änderung auf {days} Tage würden {len(affected_jobs)} archivierte Stellen sofort gelöscht!" if len(affected_jobs) > 0 else None
    }


# ==================== DSGVO / DATENSCHUTZ ====================

@router.get("/gdpr/export/{user_id}")
async def export_user_data(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    DSGVO Art. 15: Recht auf Auskunft - Exportiert alle Daten eines Benutzers als JSON
    """
    from app.models.job_request import JobRequest
    from app.services.storage_service import storage_service
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "export_type": "DSGVO Art. 15 Datenauskunft",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    }
    
    if user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user_id).first()
        if applicant:
            # Alle Bewerberdaten
            export_data["applicant"] = {
                "id": applicant.id,
                "first_name": applicant.first_name,
                "last_name": applicant.last_name,
                "gender": applicant.gender.value if applicant.gender else None,
                "date_of_birth": applicant.date_of_birth.isoformat() if applicant.date_of_birth else None,
                "place_of_birth": applicant.place_of_birth,
                "nationality": applicant.nationality,
                "phone": applicant.phone,
                "address": {
                    "street": applicant.street,
                    "house_number": applicant.house_number,
                    "postal_code": applicant.postal_code,
                    "city": applicant.city,
                    "country": applicant.country,
                },
                "university": {
                    "name": applicant.university_name,
                    "street": applicant.university_street,
                    "house_number": applicant.university_house_number,
                    "postal_code": applicant.university_postal_code,
                    "city": applicant.university_city,
                    "country": applicant.university_country,
                    "field_of_study": applicant.field_of_study,
                    "current_semester": applicant.current_semester,
                },
                "semester_break": {
                    "start": applicant.semester_break_start.isoformat() if applicant.semester_break_start else None,
                    "end": applicant.semester_break_end.isoformat() if applicant.semester_break_end else None,
                    "continue_studying": applicant.continue_studying,
                },
                "languages": {
                    "german_level": applicant.german_level.value if applicant.german_level else None,
                    "english_level": applicant.english_level.value if applicant.english_level else None,
                    "other_languages": applicant.other_languages or [],
                },
                "work_experience": applicant.work_experience,
                "work_experience_years": applicant.work_experience_years,
                "work_experiences": applicant.work_experiences or [],
                "position_type": applicant.position_type.value if applicant.position_type else None,
                "position_types": applicant.position_types or [],
                "profession": applicant.profession,
                "degree": applicant.degree,
                "degree_year": applicant.degree_year,
                "desired_profession": applicant.desired_profession,
                "school_degree": applicant.school_degree,
                "available_from": applicant.available_from.isoformat() if applicant.available_from else None,
                "available_until": applicant.available_until.isoformat() if applicant.available_until else None,
                "preferred_work_area": applicant.preferred_work_area,
                "been_to_germany": applicant.been_to_germany,
                "germany_details": applicant.germany_details,
                "additional_info": applicant.additional_info,
                "privacy_accepted": applicant.privacy_accepted,
                "privacy_accepted_at": applicant.privacy_accepted_at.isoformat() if applicant.privacy_accepted_at else None,
                "anabin": {
                    "verified": applicant.anabin_verified,
                    "match_score": applicant.anabin_match_score,
                    "institution_name": applicant.anabin_institution_name,
                    "status": applicant.anabin_status,
                    "notes": applicant.anabin_notes,
                    "checked_at": applicant.anabin_checked_at.isoformat() if applicant.anabin_checked_at else None,
                }
            }
            
            # Dokumente
            documents = db.query(Document).filter(Document.applicant_id == applicant.id).all()
            export_data["documents"] = [
                {
                    "id": doc.id,
                    "type": doc.document_type.value,
                    "file_name": doc.file_name,
                    "original_name": doc.original_name,
                    "file_path": doc.file_path,  # Pfad zum Download
                    "file_size": doc.file_size,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                    "is_verified": doc.is_verified,
                }
                for doc in documents
            ]
            
            # Bewerbungen
            applications = db.query(Application).filter(Application.applicant_id == applicant.id).all()
            export_data["applications"] = [
                {
                    "id": app.id,
                    "job_title": app.job_posting.title if app.job_posting else None,
                    "company": app.job_posting.company.company_name if app.job_posting and app.job_posting.company else None,
                    "status": app.status.value,
                    "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                    "applicant_message": app.applicant_message,
                }
                for app in applications
            ]
            
            # IJP-Aufträge
            job_requests = db.query(JobRequest).filter(JobRequest.applicant_id == applicant.id).all()
            export_data["job_requests"] = [
                {
                    "id": req.id,
                    "position_type": req.position_type.value,
                    "status": req.status.value,
                    "notes": req.notes,
                    "admin_notes": req.admin_notes,
                    "created_at": req.created_at.isoformat() if req.created_at else None,
                }
                for req in job_requests
            ]
    
    elif user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user_id).first()
        if company:
            export_data["company"] = {
                "id": company.id,
                "company_name": company.company_name,
                "street": company.street,
                "house_number": company.house_number,
                "postal_code": company.postal_code,
                "city": company.city,
                "country": company.country,
                "phone": company.phone,
                "website": company.website,
                "description": company.description,
                "industry": company.industry,
                "company_size": company.company_size,
                "contact_person": company.contact_person,
            }
            
            # Stellenangebote
            jobs = db.query(JobPosting).filter(JobPosting.company_id == company.id).all()
            export_data["job_postings"] = [
                {
                    "id": job.id,
                    "title": job.title,
                    "description": job.description,
                    "location": job.location,
                    "is_active": job.is_active,
                    "created_at": job.created_at.isoformat() if job.created_at else None,
                }
                for job in jobs
            ]
    
    return export_data


@router.delete("/gdpr/data/{user_id}")
async def delete_user_data(
    user_id: int,
    delete_documents: bool = Query(True, description="Dokumente aus dem Storage löschen"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    DSGVO Art. 17: Recht auf Löschung - Löscht personenbezogene Daten ohne den Account zu löschen.
    Der Account bleibt bestehen (für Audit-Trail), aber alle persönlichen Daten werden anonymisiert.
    """
    from app.services.storage_service import storage_service
    from app.models.job_request import JobRequest
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Sie können Ihre eigenen Daten nicht löschen")
    
    deleted_items = {
        "documents_deleted": 0,
        "documents_from_storage": 0,
        "applicant_anonymized": False,
        "company_anonymized": False,
        "applications_deleted": 0,
        "job_requests_deleted": 0,
    }
    
    if user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user_id).first()
        if applicant:
            # 1. Dokumente löschen (aus Datenbank UND Storage)
            documents = db.query(Document).filter(Document.applicant_id == applicant.id).all()
            for doc in documents:
                if delete_documents and doc.file_path:
                    success, error = await storage_service.delete_file(doc.file_path)
                    if success:
                        deleted_items["documents_from_storage"] += 1
                db.delete(doc)
                deleted_items["documents_deleted"] += 1
            
            # 2. Bewerbungen löschen
            applications = db.query(Application).filter(Application.applicant_id == applicant.id).all()
            for app in applications:
                db.delete(app)
                deleted_items["applications_deleted"] += 1
            
            # 3. IJP-Aufträge löschen
            job_requests = db.query(JobRequest).filter(JobRequest.applicant_id == applicant.id).all()
            for req in job_requests:
                db.delete(req)
                deleted_items["job_requests_deleted"] += 1
            
            # 4. Bewerberprofil anonymisieren
            applicant.first_name = "[GELÖSCHT]"
            applicant.last_name = "[GELÖSCHT]"
            applicant.date_of_birth = None
            applicant.place_of_birth = None
            applicant.nationality = None
            applicant.phone = None
            applicant.street = None
            applicant.house_number = None
            applicant.postal_code = None
            applicant.city = None
            applicant.country = None
            applicant.university_name = None
            applicant.university_street = None
            applicant.university_house_number = None
            applicant.university_postal_code = None
            applicant.university_city = None
            applicant.university_country = None
            applicant.field_of_study = None
            applicant.work_experience = None
            applicant.work_experiences = []
            applicant.germany_details = None
            applicant.additional_info = None
            applicant.profile_image = None
            deleted_items["applicant_anonymized"] = True
    
    elif user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user_id).first()
        if company:
            # Firmenprofil anonymisieren
            company.company_name = "[GELÖSCHT]"
            company.street = None
            company.house_number = None
            company.postal_code = None
            company.city = None
            company.phone = None
            company.website = None
            company.description = None
            company.contact_person = None
            company.contact_email = None
            deleted_items["company_anonymized"] = True
    
    # User-Email anonymisieren
    user.email = f"deleted_{user.id}@anonymized.local"
    user.is_active = False
    
    db.commit()
    
    return {
        "message": "Personenbezogene Daten wurden gelöscht/anonymisiert",
        "user_id": user_id,
        "details": deleted_items
    }


@router.get("/gdpr/documents/{user_id}")
async def get_user_documents_for_deletion(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Dokumente eines Benutzers für selektive Löschung"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    if user.role != UserRole.APPLICANT:
        return {"documents": [], "message": "Nur Bewerber haben Dokumente"}
    
    applicant = db.query(Applicant).filter(Applicant.user_id == user_id).first()
    if not applicant:
        return {"documents": [], "message": "Kein Bewerberprofil gefunden"}
    
    documents = db.query(Document).filter(Document.applicant_id == applicant.id).all()
    
    return {
        "user_id": user_id,
        "applicant_id": applicant.id,
        "applicant_name": f"{applicant.first_name} {applicant.last_name}",
        "documents": [
            {
                "id": doc.id,
                "type": doc.document_type.value,
                "type_label": {
                    "passport": "Reisepass",
                    "cv": "Lebenslauf",
                    "photo": "Bewerbungsfoto",
                    "enrollment_cert": "Immatrikulationsbescheinigung",
                    "enrollment_trans": "Immatrikulation (Übersetzung)",
                    "ba_declaration": "BA-Erklärung",
                    "language_cert": "Sprachzertifikat",
                    "diploma": "Zeugnis/Diplom",
                    "school_cert": "Schulzeugnis",
                    "work_reference": "Arbeitszeugnis",
                    "visa": "Visum",
                    "other": "Sonstiges",
                }.get(doc.document_type.value, doc.document_type.value),
                "original_name": doc.original_name,
                "file_size_kb": round(doc.file_size / 1024, 1) if doc.file_size else None,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            }
            for doc in documents
        ]
    }


@router.delete("/gdpr/documents/{document_id}")
async def delete_single_document(
    document_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Löscht ein einzelnes Dokument (aus Datenbank und Storage)"""
    from app.services.storage_service import storage_service
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    # Aus Storage löschen
    storage_deleted = False
    if document.file_path:
        success, error = await storage_service.delete_file(document.file_path)
        storage_deleted = success
    
    # Aus Datenbank löschen
    db.delete(document)
    db.commit()
    
    return {
        "message": "Dokument gelöscht",
        "document_id": document_id,
        "storage_deleted": storage_deleted
    }


# ==================== MATCHING ====================

@router.get("/matching/job/{job_id}")
async def get_job_matches(
    job_id: int,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Findet die besten Bewerber-Matches für eine Stelle (Admin only)"""
    from app.services.matching_service import get_top_matches_for_job
    from app.services.settings_service import is_company_matching_enabled
    
    if not is_company_matching_enabled(db):
        return {"matches": [], "message": "Matching ist deaktiviert"}
    
    matches = get_top_matches_for_job(db, job_id, limit)
    return {"matches": matches, "total": len(matches)}


@router.get("/matching/applicant/{applicant_id}")
async def get_applicant_matches(
    applicant_id: int,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Findet die besten Stellen-Matches für einen Bewerber (Admin only)"""
    from app.services.matching_service import get_top_matches_for_applicant
    from app.services.settings_service import is_applicant_matching_enabled
    
    if not is_applicant_matching_enabled(db):
        return {"matches": [], "message": "Matching ist deaktiviert"}
    
    matches = get_top_matches_for_applicant(db, applicant_id, limit)
    return {"matches": matches, "total": len(matches)}


# ========== ACCOUNT LOCKOUT MANAGEMENT ==========

@router.get("/locked-accounts")
async def get_locked_accounts_list(
    current_user: User = Depends(require_admin)
):
    """Gibt alle aktuell gesperrten Accounts zurück"""
    locked = await get_locked_accounts()
    return {"locked_accounts": locked, "total": len(locked)}


@router.post("/unlock-account/{email}")
async def admin_unlock_account(
    email: str,
    current_user: User = Depends(require_admin)
):
    """Entsperrt einen Account manuell"""
    success = await unlock_account(email)
    if success:
        return {"message": f"Account {email} wurde entsperrt"}
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Account {email} ist nicht gesperrt"
    )
