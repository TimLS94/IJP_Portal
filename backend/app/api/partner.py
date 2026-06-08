"""
Partner-Links API

Öffentliche read-only Ansicht für externe Partner (Sprachschulen, Agenturen),
die Bewerber an IJP vermitteln. Kein Login — nur Token-Validierung.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db, utc_now
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.partner_link import PartnerLink
from app.models.applicant import Applicant
from app.models.document import Document, DocumentType, DOCUMENT_REQUIREMENTS
from app.models.job_request import JobRequest, JOB_REQUEST_STATUS_LABELS, JOB_REQUEST_STATUS_COLORS, INTERNAL_JOB_REQUEST_STATUSES

router = APIRouter(tags=["Partner"])

# ── Document type labels ───────────────────────────────────────────────────────

DOC_TYPE_LABELS = {
    DocumentType.PASSPORT: "Reisepass",
    DocumentType.CV: "Lebenslauf",
    DocumentType.PHOTO: "Bewerbungsfoto",
    DocumentType.ENROLLMENT_CERT: "Immatrikulationsbescheinigung",
    DocumentType.ENROLLMENT_TRANSLATION: "Immatrikulation (Übersetzung)",
    DocumentType.BA_DECLARATION: "BA-Erklärung",
    DocumentType.LANGUAGE_CERT: "Sprachzertifikat",
    DocumentType.DIPLOMA: "Abschlusszeugnis",
    DocumentType.SCHOOL_CERT: "Schulzeugnis",
    DocumentType.WORK_REFERENCE: "Arbeitszeugnis",
    DocumentType.VISA: "Visum",
    DocumentType.COVER_LETTER: "Anschreiben",
    DocumentType.OTHER: "Sonstiges",
}

POSITION_TYPE_LABELS = {
    "studentenferienjob": "Studentenferienjob",
    "saisonjob": "Saisonjob",
    "fachkraft": "Fachkraft",
    "ausbildung": "Ausbildung",
    "workandholiday": "Work & Holiday",
}


def _build_applicant_entry(applicant: Applicant, db: Session) -> dict:
    """Baut einen Datensatz für die Partner-Ansicht auf."""
    # Aktiver IJP-Auftrag (neuester)
    job_request = (
        db.query(JobRequest)
        .filter(JobRequest.applicant_id == applicant.id)
        .order_by(JobRequest.created_at.desc())
        .first()
    )

    # Position type: bevorzuge JobRequest, Fallback auf Profil
    if job_request and job_request.position_type:
        pos_type = job_request.position_type.value
    elif applicant.position_type:
        pos_type = applicant.position_type.value
    else:
        pos_type = None

    # Dokument-Checkliste
    uploaded_docs = db.query(Document.document_type).filter(Document.applicant_id == applicant.id).all()
    uploaded_types = {d[0] for d in uploaded_docs}

    requirements = DOCUMENT_REQUIREMENTS.get(pos_type, {}) if pos_type else {}
    required_docs = requirements.get("required", [])
    optional_docs = requirements.get("optional", [])

    doc_checklist_required = [
        {
            "type": dt.value,
            "label": DOC_TYPE_LABELS.get(dt, dt.value),
            "uploaded": dt in uploaded_types,
        }
        for dt in required_docs
    ]
    doc_checklist_optional = [
        {
            "type": dt.value,
            "label": DOC_TYPE_LABELS.get(dt, dt.value),
            "uploaded": dt in uploaded_types,
        }
        for dt in optional_docs
    ]

    required_complete = all(d["uploaded"] for d in doc_checklist_required)
    required_count = sum(1 for d in doc_checklist_required if d["uploaded"])

    # Status für den Partner (public_status hat Vorrang)
    if job_request:
        display_status = job_request.public_status or job_request.status
        if job_request.public_status:
            status_label = JOB_REQUEST_STATUS_LABELS.get(job_request.public_status)
            status_color = JOB_REQUEST_STATUS_COLORS.get(job_request.public_status)
        elif job_request.status in INTERNAL_JOB_REQUEST_STATUSES:
            status_label = "In Bearbeitung"
            status_color = "blue"
        else:
            status_label = JOB_REQUEST_STATUS_LABELS.get(job_request.status)
            status_color = JOB_REQUEST_STATUS_COLORS.get(job_request.status)
    else:
        display_status = None
        status_label = None
        status_color = None

    return {
        "applicant_id": applicant.id,
        "first_name": applicant.first_name,
        "last_name": applicant.last_name,
        "position_type": pos_type,
        "position_type_label": POSITION_TYPE_LABELS.get(pos_type) if pos_type else None,
        "registered_at": applicant.created_at if hasattr(applicant, "created_at") else None,
        # IJP-Auftrag
        "has_job_request": job_request is not None,
        "job_request_id": job_request.id if job_request else None,
        "job_request_created_at": job_request.created_at if job_request else None,
        "job_request_status": display_status.value if display_status else None,
        "job_request_status_label": status_label,
        "job_request_status_color": status_color,
        # Dokument-Übersicht
        "docs_required_total": len(doc_checklist_required),
        "docs_required_uploaded": required_count,
        "docs_complete": required_complete,
        "doc_checklist_required": doc_checklist_required,
        "doc_checklist_optional": doc_checklist_optional,
        "total_docs_uploaded": len(uploaded_types),
    }


# ── Admin-Schemas ──────────────────────────────────────────────────────────────

class CreatePartnerLinkSchema(BaseModel):
    name: str
    partner_source: str
    notes: Optional[str] = None


class UpdatePartnerLinkSchema(BaseModel):
    name: Optional[str] = None
    partner_source: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich")
    return current_user


# ── Admin Endpoints ────────────────────────────────────────────────────────────

@router.get("/admin/partner-links")
async def list_partner_links(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Listet alle Partner-Links."""
    links = db.query(PartnerLink).order_by(PartnerLink.created_at.desc()).all()
    result = []
    for link in links:
        applicant_count = (
            db.query(func.count(Applicant.id))
            .filter(Applicant.invite_source == link.partner_source)
            .scalar()
        )
        result.append({
            "id": link.id,
            "name": link.name,
            "partner_source": link.partner_source,
            "token": link.token,
            "is_active": link.is_active,
            "notes": link.notes,
            "applicant_count": applicant_count,
            "created_at": link.created_at,
            "last_accessed_at": link.last_accessed_at,
        })
    return {"links": result}


@router.post("/admin/partner-links")
async def create_partner_link(
    data: CreatePartnerLinkSchema,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Erstellt einen neuen Partner-Link."""
    link = PartnerLink(
        name=data.name,
        partner_source=data.partner_source,
        token=PartnerLink.generate_token(),
        notes=data.notes,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"id": link.id, "token": link.token, "name": link.name}


@router.patch("/admin/partner-links/{link_id}")
async def update_partner_link(
    link_id: int,
    data: UpdatePartnerLinkSchema,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Aktualisiert einen Partner-Link (Name, Quelle, aktiv/inaktiv)."""
    link = db.query(PartnerLink).filter(PartnerLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link nicht gefunden")
    if data.name is not None:
        link.name = data.name
    if data.partner_source is not None:
        link.partner_source = data.partner_source
    if data.is_active is not None:
        link.is_active = data.is_active
    if data.notes is not None:
        link.notes = data.notes
    db.commit()
    return {"message": "Aktualisiert"}


@router.delete("/admin/partner-links/{link_id}")
async def delete_partner_link(
    link_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Löscht einen Partner-Link."""
    link = db.query(PartnerLink).filter(PartnerLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link nicht gefunden")
    db.delete(link)
    db.commit()
    return {"message": "Gelöscht"}


# ── Public Partner Endpoint ────────────────────────────────────────────────────

@router.get("/partner/{token}")
async def get_partner_view(
    token: str,
    date_from: Optional[str] = Query(None, description="ISO date, filter: IJP Auftrag ab"),
    date_to: Optional[str] = Query(None, description="ISO date, filter: IJP Auftrag bis"),
    db: Session = Depends(get_db),
):
    """
    Öffentlicher Endpunkt für Partner-Links.
    Gibt eine gefilterte, read-only Übersicht aller Bewerber dieses Partners zurück.
    Kein Login erforderlich — nur Token-Validierung.
    """
    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link nicht gefunden")
    if not link.is_active:
        raise HTTPException(status_code=403, detail="Dieser Link wurde deaktiviert")

    # Letzten Zugriff festhalten
    link.last_accessed_at = utc_now()
    db.commit()

    # Alle Bewerber dieses Partners
    applicants = (
        db.query(Applicant)
        .filter(Applicant.invite_source == link.partner_source)
        .order_by(Applicant.id.desc())
        .all()
    )

    # Datums-Filter: wenn gesetzt, nur Bewerber mit IJP-Auftrag im Zeitraum
    if date_from or date_to:
        try:
            dt_from = datetime.fromisoformat(date_from) if date_from else None
            dt_to = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59) if date_to else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Ungültiges Datumsformat (ISO: YYYY-MM-DD)")

        filtered = []
        for applicant in applicants:
            jr = (
                db.query(JobRequest)
                .filter(JobRequest.applicant_id == applicant.id)
                .order_by(JobRequest.created_at.desc())
                .first()
            )
            if jr is None:
                continue
            jr_date = jr.created_at
            if jr_date and jr_date.tzinfo:
                jr_date = jr_date.replace(tzinfo=None)
            if dt_from and jr_date < dt_from:
                continue
            if dt_to and jr_date > dt_to:
                continue
            filtered.append(applicant)
        applicants = filtered

    entries = [_build_applicant_entry(a, db) for a in applicants]

    # Zusammenfassung
    total = len(entries)
    commissioned = sum(1 for e in entries if e["has_job_request"])
    docs_complete = sum(1 for e in entries if e["docs_complete"])

    return {
        "partner_name": link.name,
        "total_applicants": total,
        "commissioned_count": commissioned,
        "docs_complete_count": docs_complete,
        "applicants": entries,
    }
