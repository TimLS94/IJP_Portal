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
    days: int = Query(7, ge=1, le=365, description="Zeitraum in Tagen"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt Statistiken für das Admin-Dashboard mit wählbarem Zeitraum"""
    
    # Zeitraum für Statistiken
    period_start = datetime.utcnow() - timedelta(days=days)
    now = datetime.utcnow()
    
    # Basis-Statistiken
    stats = {
        "period_days": days,
        "users": {
            "total": db.query(User).count(),
            "applicants": db.query(User).filter(User.role == UserRole.APPLICANT).count(),
            "companies": db.query(User).filter(User.role == UserRole.COMPANY).count(),
            "active": db.query(User).filter(User.is_active == True).count(),
            "inactive": db.query(User).filter(User.is_active == False).count(),
            "new_in_period": db.query(User).filter(User.created_at >= period_start).count()
        },
        "jobs": {
            "total": db.query(JobPosting).count(),
            "active": db.query(JobPosting).filter(JobPosting.is_active == True, JobPosting.is_draft == False).count(),
            "drafts": db.query(JobPosting).filter(JobPosting.is_draft == True).count(),
            "archived": db.query(JobPosting).filter(JobPosting.is_active == False, JobPosting.archived_at != None).count(),
            "expired": db.query(JobPosting).filter(
                JobPosting.deadline != None,
                JobPosting.deadline < now.date(),
                JobPosting.is_active == True
            ).count(),
            "new_in_period": db.query(JobPosting).filter(JobPosting.created_at >= period_start).count(),
            "archived_in_period": db.query(JobPosting).filter(JobPosting.archived_at >= period_start).count()
        },
        "applications": {
            "total": db.query(Application).count(),
            "pending": db.query(Application).filter(Application.status == ApplicationStatus.PENDING).count(),
            "accepted": db.query(Application).filter(Application.status == ApplicationStatus.ACCEPTED).count(),
            "rejected": db.query(Application).filter(Application.status == ApplicationStatus.REJECTED).count(),
            "in_review": db.query(Application).filter(Application.status == ApplicationStatus.COMPANY_REVIEW).count(),
            "interview": db.query(Application).filter(Application.status == ApplicationStatus.INTERVIEW_SCHEDULED).count(),
            "new_in_period": db.query(Application).filter(Application.applied_at >= period_start).count(),
            "accepted_in_period": db.query(Application).filter(
                Application.status == ApplicationStatus.ACCEPTED,
                Application.updated_at >= period_start
            ).count()
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
    
    # Löschgründe / Erfolgsstatistik
    from app.models.job_posting import JobDeletionReason, DELETION_REASON_LABELS
    
    deletion_counts = db.query(
        JobPosting.deletion_reason,
        func.count(JobPosting.id)
    ).filter(
        JobPosting.deletion_reason != None
    ).group_by(JobPosting.deletion_reason).all()
    
    deletion_stats = {
        "total_deleted": 0,
        "filled_via_jobon": 0,  # ERFOLGE!
        "filled_via_other": 0,
        "position_cancelled": 0,
        "company_closed": 0,
        "seasonal_end": 0,
        "budget_reasons": 0,
        "other": 0,
        "in_period": {
            "total": 0,
            "filled_via_jobon": 0
        }
    }
    
    for reason, count in deletion_counts:
        if reason:
            deletion_stats["total_deleted"] += count
            deletion_stats[reason.value] = count
    
    # Erfolge im Zeitraum
    period_deletions = db.query(
        JobPosting.deletion_reason,
        func.count(JobPosting.id)
    ).filter(
        JobPosting.deleted_at >= period_start,
        JobPosting.deletion_reason != None
    ).group_by(JobPosting.deletion_reason).all()
    
    for reason, count in period_deletions:
        if reason:
            deletion_stats["in_period"]["total"] += count
            if reason.value == "filled_via_jobon":
                deletion_stats["in_period"]["filled_via_jobon"] = count
    
    stats["deletion_reasons"] = deletion_stats
    stats["success_rate"] = {
        "total_successes": deletion_stats["filled_via_jobon"],
        "successes_in_period": deletion_stats["in_period"]["filled_via_jobon"],
        "success_percentage": round(
            (deletion_stats["filled_via_jobon"] / deletion_stats["total_deleted"] * 100) 
            if deletion_stats["total_deleted"] > 0 else 0, 1
        )
    }
    
    return stats


@router.get("/email-stats")
async def get_email_stats(
    days: int = Query(30, ge=1, le=365, description="Zeitraum in Tagen"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt E-Mail-Statistiken nach Typ für das Admin-Dashboard"""
    from app.models.email_log import EmailLog
    
    period_start = datetime.utcnow() - timedelta(days=days)
    
    # E-Mail-Typen Labels (deutsch)
    type_labels = {
        "welcome": "Registrierung",
        "password_reset": "Passwort vergessen",
        "application_received": "Bewerbung eingegangen",
        "new_application": "Neue Bewerbung (Firma)",
        "application_status": "Status-Update",
        "job_match": "Passende Stelle",
        "job_digest": "Wöchentlicher Digest",
        "company_pending": "Firma wartet",
        "company_activated": "Firma aktiviert",
        "admin_notification": "Admin-Benachrichtigung",
        "cold_outreach": "Kaltakquise",
        "other": "Sonstige"
    }
    
    # Statistiken nach Typ
    stats_by_type = db.query(
        EmailLog.email_type,
        func.count(EmailLog.id).label("total"),
        func.sum(EmailLog.success).label("success")
    ).filter(
        EmailLog.created_at >= period_start
    ).group_by(EmailLog.email_type).all()
    
    # Ergebnis formatieren
    result = {
        "period_days": days,
        "total_sent": 0,
        "total_success": 0,
        "total_failed": 0,
        "by_type": []
    }
    
    for email_type, total, success in stats_by_type:
        success = success or 0
        failed = total - success
        result["total_sent"] += total
        result["total_success"] += success
        result["total_failed"] += failed
        
        # email_type ist jetzt ein String, nicht mehr ein Enum
        type_str = email_type.lower() if email_type else "other"
        result["by_type"].append({
            "type": type_str,
            "label": type_labels.get(type_str, type_str),
            "total": total,
            "success": success,
            "failed": failed
        })
    
    # Sortieren nach Anzahl
    result["by_type"].sort(key=lambda x: x["total"], reverse=True)
    
    # Letzte 10 E-Mails
    recent_emails = db.query(EmailLog).order_by(
        EmailLog.created_at.desc()
    ).limit(10).all()
    
    result["recent"] = [
        {
            "type": (e.email_type.lower() if e.email_type else "other"),
            "label": type_labels.get(e.email_type.lower() if e.email_type else "other", "Sonstige"),
            "recipient": e.recipient_email,
            "subject": e.subject,
            "success": e.success == 1,
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in recent_emails
    ]
    
    return result


@router.get("/cold-outreach-stats")
async def get_cold_outreach_stats(
    days: int = Query(30, ge=1, le=365, description="Zeitraum in Tagen"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Holt Kaltakquise-Statistiken pro Mitarbeiter für das Admin-Dashboard"""
    from app.models.email_log import EmailLog
    
    period_start = datetime.utcnow() - timedelta(days=days)
    
    # Gesamt-Statistik für Kaltakquise
    total_stats = db.query(
        func.count(EmailLog.id).label("total"),
        func.sum(EmailLog.success).label("success")
    ).filter(
        EmailLog.email_type == "cold_outreach",
        EmailLog.created_at >= period_start
    ).first()
    
    total = total_stats.total or 0
    success = total_stats.success or 0
    
    # Statistik pro Mitarbeiter
    by_user = db.query(
        EmailLog.sent_by_user_id,
        User.email,
        func.count(EmailLog.id).label("total"),
        func.sum(EmailLog.success).label("success")
    ).join(
        User, EmailLog.sent_by_user_id == User.id, isouter=True
    ).filter(
        EmailLog.email_type == "cold_outreach",
        EmailLog.created_at >= period_start
    ).group_by(
        EmailLog.sent_by_user_id, User.email
    ).order_by(
        func.count(EmailLog.id).desc()
    ).all()
    
    # Statistik pro Tag (für Chart)
    by_day = db.query(
        func.date(EmailLog.created_at).label("date"),
        func.count(EmailLog.id).label("total")
    ).filter(
        EmailLog.email_type == "cold_outreach",
        EmailLog.created_at >= period_start
    ).group_by(
        func.date(EmailLog.created_at)
    ).order_by(
        func.date(EmailLog.created_at)
    ).all()
    
    return {
        "period_days": days,
        "total": total,
        "success": success,
        "failed": total - success,
        "by_user": [
            {
                "user_id": user_id,
                "email": email or "Unbekannt",
                "total": t,
                "success": s or 0,
                "failed": t - (s or 0)
            }
            for user_id, email, t, s in by_user
        ],
        "by_day": [
            {
                "date": d.isoformat() if d else None,
                "total": t
            }
            for d, t in by_day
        ]
    }


@router.get("/users")
async def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query("created_at", description="Sortierfeld: email, role, created_at, last_login_at, is_active"),
    sort_dir: Optional[str] = Query("desc", description="Sortierrichtung: asc oder desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Benutzer mit serverseitiger Sortierung"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    
    total = query.count()
    
    # Serverseitige Sortierung mit korrekter NULL-Behandlung
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_dir == "asc":
        # Bei aufsteigend: NULL-Werte ans Ende (z.B. "Noch nie" bei last_login_at)
        query = query.order_by(sort_column.asc().nullslast())
    else:
        # Bei absteigend: NULL-Werte ans Ende
        query = query.order_by(sort_column.desc().nullslast())
    
    users = query.offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        user_data = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at
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
            "slug": job.slug,
            "position_type": job.position_type,
            "location": job.location,
            "is_active": job.is_active,
            "created_at": job.created_at,
            "company_name": company.company_name if company else "Unbekannt",
            "application_count": app_count,
            "view_count": job.view_count or 0,
            "available_languages": job.available_languages or ["de"]
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
        "max_job_deadline_days": get_setting(db, "max_job_deadline_days", 90),
        "job_notifications_enabled": get_setting(db, "job_notifications_enabled", True),
        "job_notifications_threshold": get_setting(db, "job_notifications_threshold", 85),
        "instant_job_notifications_enabled": get_setting(db, "instant_job_notifications_enabled", True),
        "weekly_digest_enabled": get_setting(db, "weekly_digest_enabled", True),
        "weekly_digest_days": get_setting(db, "weekly_digest_days", [1]),
        "weekly_digest_hour": get_setting(db, "weekly_digest_hour", 9)
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


# ==================== E-MAIL BENACHRICHTIGUNGEN ====================

@router.post("/email/trigger-digest")
async def trigger_weekly_digest(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Löst den wöchentlichen Job-Digest manuell aus (Admin only)"""
    from app.services.job_notification_service import send_weekly_job_digest
    import traceback
    import logging
    
    try:
        emails_sent = send_weekly_job_digest(db)
        return {
            "success": True,
            "message": f"Wöchentlicher Digest wurde an {emails_sent} Bewerber gesendet",
            "emails_sent": emails_sent
        }
    except Exception as e:
        logging.getLogger(__name__).error(f"Digest trigger error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Senden: {str(e)}")


@router.get("/email/templates")
async def get_email_templates(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Gibt Vorschau der E-Mail-Vorlagen zurück (Admin only)"""
    from app.services.email_service import email_service
    
    # Beispieldaten für Vorschau
    sample_job = {
        "title": "Servicekraft im Hotel (m/w/d)",
        "company_name": "Muster Hotel GmbH",
        "location": "München",
        "match_score": 92,
        "job_slug": "servicekraft-im-hotel-muenchen-123"
    }
    
    sample_jobs_list = [
        {"job": type('Job', (), {
            "title": "Servicekraft im Hotel (m/w/d)",
            "company": type('Company', (), {"company_name": "Muster Hotel GmbH"})(),
            "location": "München",
            "url_slug": "servicekraft-im-hotel-muenchen-123"
        })(), "score": 92},
        {"job": type('Job', (), {
            "title": "Kellner/in im Restaurant",
            "company": type('Company', (), {"company_name": "Restaurant Beispiel"})(),
            "location": "Berlin",
            "url_slug": "kellner-restaurant-berlin-456"
        })(), "score": 87},
        {"job": type('Job', (), {
            "title": "Rezeptionist/in",
            "company": type('Company', (), {"company_name": "Hotel Sonnenschein"})(),
            "location": "Hamburg",
            "url_slug": "rezeptionist-hamburg-789"
        })(), "score": 85}
    ]
    
    # Generiere HTML-Vorlagen
    templates = {}
    
    # 1. Neue Stelle Benachrichtigung
    templates["new_job_notification"] = {
        "name": "Neue passende Stelle",
        "description": "Wird sofort gesendet, wenn eine neue Stelle zum Profil passt",
        "subject": f"🎯 Neue passende Stelle: {sample_job['title']}",
        "html": f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0;">🎯 New Job Match!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A position matching your profile</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hello Max Mustermann,</p>
                <p>Great news! A new position has been posted that matches your profile:</p>
                
                <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb;">
                    <h2 style="margin: 0 0 10px 0; color: #1f2937;">{sample_job['title']}</h2>
                    <p style="margin: 5px 0; color: #6b7280;">🏢 {sample_job['company_name']}</p>
                    <p style="margin: 5px 0; color: #6b7280;">📍 {sample_job['location']}</p>
                    <div style="margin-top: 15px; padding: 10px; background: #ecfdf5; border-radius: 8px; text-align: center;">
                        <span style="color: #059669; font-weight: bold; font-size: 18px;">✨ {sample_job['match_score']}% Match</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.jobon.work/jobs/{sample_job['job_slug']}" 
                       style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        View Position →
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">Best regards,<br>Your JobOn Team</p>
            </div>
        </body></html>
        """
    }
    
    # 2. Wöchentlicher Digest
    jobs_html = ""
    for match in sample_jobs_list:
        job = match["job"]
        score = match["score"]
        jobs_html += f"""
        <div style="background: white; border-radius: 12px; padding: 20px; margin: 15px 0; border-left: 4px solid #2563eb;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3 style="margin: 0 0 8px 0; color: #1f2937;">{job.title}</h3>
                    <p style="margin: 3px 0; color: #6b7280; font-size: 14px;">🏢 {job.company.company_name}</p>
                    <p style="margin: 3px 0; color: #6b7280; font-size: 14px;">📍 {job.location}</p>
                </div>
                <div style="background: #ecfdf5; padding: 8px 12px; border-radius: 20px;">
                    <span style="color: #059669; font-weight: bold;">{score}%</span>
                </div>
            </div>
            <a href="https://www.jobon.work/jobs/{job.url_slug}" 
               style="color: #2563eb; text-decoration: none; font-size: 14px; margin-top: 10px; display: inline-block;">
                View Details →
            </a>
        </div>
        """
    
    templates["weekly_digest"] = {
        "name": "Wöchentlicher Job-Digest",
        "description": "Zusammenfassung aller passenden Stellen der letzten Woche",
        "subject": "📬 Your Weekly Job Matches - 3 new positions!",
        "html": f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0;">📬 Weekly Job Digest</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your personalized job matches</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hello Max Mustermann,</p>
                <p>Here are the <strong>3 new positions</strong> from the last week that match your profile:</p>
                
                {jobs_html}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.jobon.work/jobs" 
                       style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        View All Jobs →
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">Best regards,<br>Your JobOn Team</p>
            </div>
        </body></html>
        """
    }
    
    return templates


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


# ========== ADMIN JOB TRANSLATION ==========

class AdminTranslateJobRequest(BaseModel):
    languages: List[str]  # z.B. ["en", "es", "ru"]


@router.post("/jobs/{job_id}/translate")
async def admin_translate_job(
    job_id: int,
    request: AdminTranslateJobRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin übersetzt eine Stellenanzeige in die gewählten Sprachen.
    Markiert die Stelle als 'admin_translated'.
    """
    from app.services.translation_service import translate_job_fields, get_deepl_status
    
    # Job laden
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    
    # DeepL Status prüfen
    deepl_status = get_deepl_status()
    if not deepl_status.get("configured"):
        raise HTTPException(
            status_code=503, 
            detail="Übersetzungsservice nicht verfügbar. Bitte DEEPL_API_KEY konfigurieren."
        )
    
    # Verfügbare Sprachen
    valid_languages = ["en", "es", "ru"]
    languages_to_translate = [lang for lang in request.languages if lang in valid_languages]
    
    if not languages_to_translate:
        raise HTTPException(status_code=400, detail="Keine gültigen Sprachen angegeben")
    
    # Bestehende Übersetzungen laden oder initialisieren
    translations = job.translations or {}
    available_languages = job.available_languages or ["de"]
    admin_translated_languages = job.admin_translated_languages or []
    
    translated_languages = []
    errors = []
    
    for target_lang in languages_to_translate:
        try:
            # Übersetzen
            translated = await translate_job_fields(
                title=job.title,
                description=job.description,
                tasks=job.tasks,
                requirements=job.requirements,
                benefits=job.benefits,
                target_lang=target_lang,
                source_lang='de'
            )
            
            if translated and translated.get('title'):
                translations[target_lang] = translated
                if target_lang not in available_languages:
                    available_languages.append(target_lang)
                if target_lang not in admin_translated_languages:
                    admin_translated_languages.append(target_lang)
                translated_languages.append(target_lang)
            else:
                errors.append(f"{target_lang}: Übersetzung fehlgeschlagen")
                
        except Exception as e:
            errors.append(f"{target_lang}: {str(e)}")
    
    # Job aktualisieren
    if translated_languages:
        # SQLAlchemy erkennt JSON-Änderungen nicht automatisch - flag_modified verwenden
        from sqlalchemy.orm.attributes import flag_modified
        
        job.translations = translations
        job.available_languages = available_languages
        job.admin_translated = True
        job.admin_translated_at = datetime.utcnow()
        job.admin_translated_languages = admin_translated_languages
        
        # Explizit als geändert markieren für JSON-Felder
        flag_modified(job, 'translations')
        flag_modified(job, 'available_languages')
        flag_modified(job, 'admin_translated_languages')
        
        db.commit()
    
    return {
        "success": len(translated_languages) > 0,
        "job_id": job_id,
        "translated_languages": translated_languages,
        "errors": errors,
        "message": f"Stelle in {len(translated_languages)} Sprache(n) übersetzt" if translated_languages else "Keine Übersetzungen erstellt"
    }


@router.get("/jobs/{job_id}/translation-status")
async def get_job_translation_status(
    job_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Gibt den Übersetzungsstatus einer Stelle zurück"""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")
    
    return {
        "job_id": job_id,
        "available_languages": job.available_languages or ["de"],
        "admin_translated": job.admin_translated or False,
        "admin_translated_at": job.admin_translated_at,
        "admin_translated_languages": job.admin_translated_languages or [],
        "has_translations": bool(job.translations)
    }


# ==================== EINLADUNGS-TOKENS ====================

class InviteTokenCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    expires_in_days: Optional[int] = None  # None = unbegrenzt
    max_uses: Optional[int] = None  # None = unbegrenzt


@router.get("/invite-tokens")
async def list_invite_tokens(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Listet alle Einladungs-Tokens"""
    from app.models.invite_token import InviteToken
    
    tokens = db.query(InviteToken).order_by(InviteToken.created_at.desc()).all()
    
    return [
        {
            "id": t.id,
            "token": t.token,
            "name": t.name,
            "description": t.description,
            "expires_at": t.expires_at.isoformat() if t.expires_at else None,
            "max_uses": t.max_uses,
            "current_uses": t.current_uses,
            "is_active": t.is_active,
            "is_valid": t.is_valid(),
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
            "created_by_email": t.created_by.email if t.created_by else None,
            "registration_url": f"/register?invite={t.token}",
        }
        for t in tokens
    ]


@router.post("/invite-tokens")
async def create_invite_token(
    data: InviteTokenCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Erstellt einen neuen Einladungs-Token für Firmen-Registrierung"""
    from app.models.invite_token import InviteToken
    
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    
    token = InviteToken(
        token=InviteToken.generate_token(),
        created_by_id=current_user.id,
        name=data.name,
        description=data.description,
        expires_at=expires_at,
        max_uses=data.max_uses
    )
    
    db.add(token)
    db.commit()
    db.refresh(token)
    
    return {
        "id": token.id,
        "token": token.token,
        "name": token.name,
        "description": token.description,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
        "max_uses": token.max_uses,
        "current_uses": token.current_uses,
        "is_active": token.is_active,
        "is_valid": token.is_valid(),
        "created_at": token.created_at.isoformat() if token.created_at else None,
        "last_used_at": None,
        "created_by_email": current_user.email,
        "registration_url": f"/register?invite={token.token}"
    }


@router.delete("/invite-tokens/{token_id}")
async def delete_invite_token(
    token_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Löscht einen Einladungs-Token permanent"""
    from app.models.invite_token import InviteToken
    
    token = db.query(InviteToken).filter(InviteToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token nicht gefunden")
    
    db.delete(token)
    db.commit()
    
    return {"message": "Token gelöscht"}


@router.put("/invite-tokens/{token_id}/toggle")
async def toggle_invite_token(
    token_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Aktiviert/Deaktiviert einen Einladungs-Token"""
    from app.models.invite_token import InviteToken
    
    token = db.query(InviteToken).filter(InviteToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token nicht gefunden")
    
    token.is_active = not token.is_active
    db.commit()
    
    return {
        "id": token.id,
        "is_active": token.is_active,
        "message": "Token aktiviert" if token.is_active else "Token deaktiviert"
    }
