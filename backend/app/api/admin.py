from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.application import Application, ApplicationStatus, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS
from app.models.document import Document

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
    
    # Stellen nach Typ
    for pos_type in PositionType:
        count = db.query(JobPosting).filter(JobPosting.position_type == pos_type).count()
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
            "application_count": app_count
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
    
    # Zugehörige Daten löschen
    if user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user_id).first()
        if applicant:
            # Zuerst Dokumente löschen (Fremdschlüssel auf applicant_id)
            db.query(Document).filter(Document.applicant_id == applicant.id).delete()
            # Dann Bewerbungen löschen
            db.query(Application).filter(Application.applicant_id == applicant.id).delete()
            db.delete(applicant)
    elif user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user_id).first()
        if company:
            jobs = db.query(JobPosting).filter(JobPosting.company_id == company.id).all()
            for job in jobs:
                db.query(Application).filter(Application.job_posting_id == job.id).delete()
            db.query(JobPosting).filter(JobPosting.company_id == company.id).delete()
            db.delete(company)
    
    db.delete(user)
    db.commit()
    
    return {"message": "Benutzer gelöscht"}
