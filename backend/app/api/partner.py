"""
Partner-Links API

Öffentliche read-only Ansicht für externe Partner (Sprachschulen, Agenturen),
die Bewerber an IJP vermitteln. Kein Login — nur Token-Validierung.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db, utc_now
from app.core.config import settings
from app.core.security import get_current_user, verify_password, get_password_hash, create_access_token, decode_token
from app.models.user import User, UserRole
from app.models.partner_link import PartnerLink
from app.models.interview_candidate import InterviewCandidate
from app.models.applicant import Applicant
from app.models.document import Document, DocumentType, DOCUMENT_REQUIREMENTS
from app.models.job_request import JobRequest, JobRequestStatus, JOB_REQUEST_STATUS_LABELS, JOB_REQUEST_STATUS_COLORS, INTERNAL_JOB_REQUEST_STATUSES
from app.models.applicant import PositionType

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
    # E-Mail-Adresse des Bewerbers (für den Partner sichtbar)
    _user = db.query(User).filter(User.id == applicant.user_id).first()
    _email = _user.email if _user else None
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

    from app.services.document_requirements_service import get_for_position
    requirements = get_for_position(db, pos_type) if pos_type else {}
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
        "email": _email,
        # Vom Partner angelegte Studenten (ohne eigenes Passwort) darf der Partner
        # vervollständigen; selbst-registrierte verwalten ihr Profil selbst.
        # Editierbar: passwortlos ODER vom Admin für Partner-Bearbeitung freigeschaltet.
        "editable_by_partner": bool(_user and (not _user.password_hash or getattr(applicant, "partner_edit_override", False))),
        "has_password": bool(_user and _user.password_hash),  # True = Student verwaltet selbst
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
    can_add_students: Optional[bool] = None
    can_edit_students: Optional[bool] = None
    can_add_interview_candidates: Optional[bool] = None
    send_onboarding_email: Optional[bool] = None
    password: Optional[str] = None  # Klartext zum Setzen; leer/None = kein Passwort


class UpdatePartnerLinkSchema(BaseModel):
    name: Optional[str] = None
    partner_source: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    can_add_students: Optional[bool] = None
    can_edit_students: Optional[bool] = None
    can_add_interview_candidates: Optional[bool] = None
    send_onboarding_email: Optional[bool] = None
    password: Optional[str] = None  # Klartext zum Setzen; "" = Passwortschutz entfernen


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
            "can_add_students": bool(getattr(link, "can_add_students", True)),
            "can_edit_students": bool(getattr(link, "can_edit_students", False)),
            "can_add_interview_candidates": bool(getattr(link, "can_add_interview_candidates", False)),
            "send_onboarding_email": bool(getattr(link, "send_onboarding_email", True)),
            "has_password": bool(getattr(link, "password_hash", None)),
            "password": getattr(link, "password_plain", None),  # Klartext (nur Admin) zum Wiederanzeigen
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
        can_add_students=True if data.can_add_students is None else data.can_add_students,
        can_edit_students=False if data.can_edit_students is None else data.can_edit_students,
        can_add_interview_candidates=False if data.can_add_interview_candidates is None else data.can_add_interview_candidates,
        send_onboarding_email=True if data.send_onboarding_email is None else data.send_onboarding_email,
        password_hash=(get_password_hash(data.password) if (data.password or "").strip() else None),
        password_plain=((data.password or "").strip() or None),
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
    if data.can_add_students is not None:
        link.can_add_students = data.can_add_students
    if data.can_edit_students is not None:
        link.can_edit_students = data.can_edit_students
    if data.can_add_interview_candidates is not None:
        link.can_add_interview_candidates = data.can_add_interview_candidates
    if data.send_onboarding_email is not None:
        link.send_onboarding_email = data.send_onboarding_email
    if data.password is not None:
        # "" entfernt den Passwortschutz, sonst neues Passwort setzen.
        link.password_hash = get_password_hash(data.password) if data.password.strip() else None
        link.password_plain = data.password.strip() or None
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

def _partner_authorized(link: "PartnerLink", request: Request) -> bool:
    """True, wenn der Link offen ist (kein Passwort gesetzt) ODER ein gültiges
    Partner-Session-Token für genau diesen Link mitgeschickt wurde (nach /login)."""
    if not getattr(link, "password_hash", None):
        return True
    tok = request.headers.get("X-Partner-Token") or request.query_params.get("pt") or ""
    payload = decode_token(tok)
    if not payload or payload.get("scope") != "partner_portal":
        return False
    return payload.get("sub") == f"partner:{link.id}"


class PartnerLoginSchema(BaseModel):
    password: str


@router.get("/partner/{token}/meta")
async def partner_meta(token: str, db: Session = Depends(get_db)):
    """Öffentlich: nur Name + ob der Link ein Passwort verlangt (keine Bewerberdaten)."""
    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link nicht gefunden")
    return {
        "partner_name": link.name,
        "is_active": bool(link.is_active),
        "requires_password": bool(getattr(link, "password_hash", None)),
        "can_add_interview_candidates": bool(getattr(link, "can_add_interview_candidates", False)),
    }


@router.post("/partner/{token}/login")
async def partner_login(token: str, data: PartnerLoginSchema, db: Session = Depends(get_db)):
    """Prüft das vom Admin gesetzte Link-Passwort und gibt ein kurzlebiges
    Partner-Session-Token zurück (12h), das die Partner-Endpunkte autorisiert."""
    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Link nicht gefunden oder deaktiviert")
    if getattr(link, "password_hash", None) and not verify_password(data.password, link.password_hash):
        raise HTTPException(status_code=403, detail="Falsches Passwort")
    partner_token = create_access_token(
        data={"sub": f"partner:{link.id}", "scope": "partner_portal"},
        expires_delta=timedelta(hours=12),
    )
    return {"partner_token": partner_token}


@router.get("/partner/{token}")
async def get_partner_view(
    token: str,
    request: Request,
    date_from: Optional[str] = Query(None, description="ISO date, filter: IJP Auftrag ab"),
    date_to: Optional[str] = Query(None, description="ISO date, filter: IJP Auftrag bis"),
    db: Session = Depends(get_db),
):
    """
    Öffentlicher Endpunkt für Partner-Links.
    Gibt eine gefilterte, read-only Übersicht aller Bewerber dieses Partners zurück.
    Kein Login erforderlich — nur Token-Validierung (plus Passwort, falls gesetzt).
    """
    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link nicht gefunden")
    if not link.is_active:
        raise HTTPException(status_code=403, detail="Dieser Link wurde deaktiviert")
    if not _partner_authorized(link, request):
        raise HTTPException(status_code=401, detail="Passwort erforderlich")

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

    can_edit = bool(getattr(link, "can_edit_students", False))
    entries = [_build_applicant_entry(a, db) for a in applicants]
    # Bearbeiten nur, wenn der Admin es für diesen Partner freigegeben hat.
    if not can_edit:
        for e in entries:
            e["editable_by_partner"] = False

    # Zusammenfassung
    total = len(entries)
    commissioned = sum(1 for e in entries if e["has_job_request"])
    docs_complete = sum(1 for e in entries if e["docs_complete"])

    return {
        "partner_name": link.name,
        "total_applicants": total,
        "commissioned_count": commissioned,
        "docs_complete_count": docs_complete,
        "can_add_students": bool(getattr(link, "can_add_students", True)),
        "can_edit_students": can_edit,
        "can_add_interview_candidates": bool(getattr(link, "can_add_interview_candidates", False)),
        "applicants": entries,
    }


class PartnerApplicantCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    consent: bool = False


@router.post("/partner/{token}/applicants")
async def partner_add_applicant(token: str, data: PartnerApplicantCreate, request: Request, db: Session = Depends(get_db)):
    """Ein Partner legt über seinen Link selbst einen Studenten (Bewerber) an.
    Der Bewerber wird der Partner-Quelle zugeordnet und erscheint sofort in der
    Partner-Ansicht. Kein Passwort (Konto ist später per 'Passwort vergessen'/Google
    übernehmbar). Selbst-Registrierung per Link funktioniert unverändert weiter."""
    from datetime import date as _date

    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Link nicht gefunden oder deaktiviert")
    if not _partner_authorized(link, request):
        raise HTTPException(status_code=401, detail="Passwort erforderlich")
    if not getattr(link, "can_add_students", True):
        raise HTTPException(status_code=403, detail="Das Anlegen von Studenten ist für diesen Link nicht freigegeben.")

    first = (data.first_name or "").strip()
    last = (data.last_name or "").strip()
    email = (data.email or "").strip().lower()
    if not first or not last:
        raise HTTPException(status_code=400, detail="Vor- und Nachname erforderlich")
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Ungültige E-Mail-Adresse")
    if not data.consent:
        raise HTTPException(status_code=400, detail="Bitte die Einwilligung des Studenten bestätigen")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Diese E-Mail ist bereits registriert")

    # Anlegen in try/except: schlägt der Insert fehl (z.B. E-Mail-Dublette durch eine
    # Race-Condition bei mehreren schnellen Einträgen), MUSS zurückgerollt werden –
    # sonst bleibt die Session "aborted" und vergiftet die Verbindung (InFailedSqlTransaction),
    # was Folge-Anfragen reißt und einen Teil der Studenten still verschluckt.
    try:
        user = User(email=email, password_hash=None, role=UserRole.APPLICANT, is_active=True)
        db.add(user)
        db.flush()  # ID generieren

        applicant = Applicant(
            user_id=user.id,
            first_name=first,
            last_name=last,
            phone=((data.phone or "").strip() or None),
            invite_source=link.partner_source,
            privacy_accepted=True,   # Partner bestätigt die Einwilligung des Studenten
            privacy_accepted_at=_date.today(),
            portal="ijp",            # IJP-Studenten-Unterportal (nicht der öffentliche JobOn-Pool)
        )
        db.add(applicant)
        db.commit()
        db.refresh(applicant)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"Partner-Student anlegen fehlgeschlagen ({email}): {e}")
        # Falls parallel schon angelegt: existierenden Account als Erfolg behandeln wäre riskant
        # (fremde Zuordnung) – daher klare Fehlermeldung, Partner kann erneut/korrigiert eintragen.
        raise HTTPException(
            status_code=409,
            detail="Student konnte nicht angelegt werden (evtl. ist die E-Mail bereits vergeben). Bitte Angaben prüfen und erneut versuchen.",
        )

    # KEINE automatische Beauftragung mehr: der Student wird nur gespeichert.
    # Der IJP-Auftrag entsteht erst durch die EXPLIZITE Beauftragung ("IJP beauftragen"
    # nach dem Profil-Speichern) – erst dann gilt er als beauftragt.

    # Onboarding-Mail (Passwort-Setzen-Link, 7 Tage gültig), wenn für diesen Link aktiviert.
    # Fallback für den Studenten bleibt jederzeit "Passwort vergessen" mit seiner E-Mail.
    if getattr(link, "send_onboarding_email", True):
        try:
            from app.models.password_reset import PasswordResetToken
            from app.services.email_service import email_service
            from datetime import timedelta
            reset = PasswordResetToken(
                user_id=user.id,
                token=PasswordResetToken.generate_token(),
                expires_at=utc_now() + timedelta(days=7),
            )
            db.add(reset)
            db.commit()
            email_service.send_student_onboarding_email(email, f"{first} {last}".strip(), reset.token)
        except Exception:
            db.rollback()

    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "user": {"id": user.id, "email": user.email, "role": user.role.value, "is_active": user.is_active, "portal": "ijp"},
        "applicant": _build_applicant_entry(applicant, db),
    }


@router.post("/partner/{token}/applicants/{applicant_id}/access")
async def partner_applicant_access(token: str, applicant_id: int, request: Request, db: Session = Depends(get_db)):
    """Zugriffs-Token für einen vom Partner angelegten Studenten – damit der Partner
    dessen vollständiges Profil + Dokumente im echten Formular ausfüllen kann.
    Nur innerhalb der Partner-Quelle und nur für Studenten OHNE eigenes Passwort
    (selbst-registrierte verwalten ihr Profil selbst)."""
    from app.core.security import create_access_token

    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Link nicht gefunden oder deaktiviert")
    if not _partner_authorized(link, request):
        raise HTTPException(status_code=401, detail="Passwort erforderlich")
    if not getattr(link, "can_edit_students", False):
        raise HTTPException(status_code=403, detail="Das Bearbeiten von Studentendaten ist für diesen Link nicht freigegeben.")

    applicant = db.query(Applicant).filter(
        Applicant.id == applicant_id,
        Applicant.invite_source == link.partner_source,
    ).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Student nicht gefunden")

    user = db.query(User).filter(User.id == applicant.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Konto nicht gefunden")
    if user.password_hash and not getattr(applicant, "partner_edit_override", False):
        raise HTTPException(status_code=403, detail="Dieser Student verwaltet sein Profil selbst.")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "user": {"id": user.id, "email": user.email, "role": user.role.value, "is_active": user.is_active, "portal": getattr(applicant, "portal", "ijp") or "ijp"},
    }


# ── Bewerbungsgespräch-Kandidaten (reine IJP-Thematik) ─────────────────────────
# Angelegt von IJP (Admin) ODER von einem freigeschalteten Partner.

class InterviewCandidateSchema(BaseModel):
    first_name: str
    last_name: str
    german_level: Optional[str] = None
    english_level: Optional[str] = None
    notes: Optional[str] = None
    interview_done: Optional[bool] = False
    interview_date: Optional[str] = None  # ISO (YYYY-MM-DD)


class InterviewCandidateUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    german_level: Optional[str] = None
    english_level: Optional[str] = None
    notes: Optional[str] = None
    interview_done: Optional[bool] = None
    interview_date: Optional[str] = None


def _parse_iso_date(value: Optional[str]):
    """'YYYY-MM-DD' -> date | None. Leerer String -> None (Datum löschen)."""
    from datetime import date as _date
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    try:
        return _date.fromisoformat(value[:10])
    except ValueError:
        raise HTTPException(status_code=400, detail="Ungültiges Datum (Format: YYYY-MM-DD)")


def _candidate_dict(c: "InterviewCandidate", partner_name: Optional[str] = None) -> dict:
    return {
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "german_level": c.german_level,
        "english_level": c.english_level,
        "notes": c.notes,
        "interview_done": bool(c.interview_done),
        "interview_date": c.interview_date.isoformat() if c.interview_date else None,
        "has_cv": bool(c.cv_content),
        "cv_filename": c.cv_filename,
        "partner_source": c.partner_source,
        "partner_name": partner_name,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }


def _apply_candidate_fields(c: "InterviewCandidate", data, *, partial: bool):
    """Setzt die Felder aus dem Schema. partial=True -> nur gesetzte Felder (PATCH)."""
    if not partial or data.first_name is not None:
        if data.first_name is not None:
            c.first_name = data.first_name.strip()
    if not partial or data.last_name is not None:
        if data.last_name is not None:
            c.last_name = data.last_name.strip()
    if not partial or data.german_level is not None:
        c.german_level = (data.german_level or "").strip() or None
    if not partial or data.english_level is not None:
        c.english_level = (data.english_level or "").strip() or None
    if not partial or data.notes is not None:
        c.notes = (data.notes or "").strip() or None
    if data.interview_done is not None:
        c.interview_done = bool(data.interview_done)
    if not partial or data.interview_date is not None:
        c.interview_date = _parse_iso_date(data.interview_date)


async def _store_cv(c: "InterviewCandidate", file: UploadFile, db: Session) -> None:
    """Hängt genau 1 PDF als Lebenslauf an den Kandidaten (ersetzt ein vorhandenes)."""
    fname = (file.filename or "").strip()
    if not fname.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Nur PDF-Dateien sind erlaubt")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Datei ist leer")
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Datei zu groß. Maximum: {settings.MAX_FILE_SIZE // (1024 * 1024)} MB",
        )
    c.cv_content = content
    c.cv_filename = fname[:255]
    c.cv_mime = "application/pdf"
    c.cv_uploaded_at = utc_now()
    db.commit()


def _cv_response(c: "InterviewCandidate") -> Response:
    """Liefert den angehängten Lebenslauf als PDF-Download (ASCII-sicherer Name)."""
    if not c.cv_content:
        raise HTTPException(status_code=404, detail="Kein Lebenslauf angehängt")
    safe_name = (c.cv_filename or "lebenslauf.pdf").encode("ascii", "ignore").decode("ascii") or "lebenslauf.pdf"
    return Response(
        content=c.cv_content,
        media_type=c.cv_mime or "application/pdf",
        headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
    )


# ── Admin: Kandidaten verwalten (sieht ALLE, auch die der Partner) ─────────────

@router.get("/admin/interview-candidates")
async def admin_list_interview_candidates(
    partner_source: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(InterviewCandidate)
    if partner_source:
        q = q.filter(InterviewCandidate.partner_source == partner_source)
    candidates = q.order_by(InterviewCandidate.created_at.desc()).all()
    # Partner-Namen (source -> name) für die Anzeige
    source_to_name = {
        l.partner_source: l.name
        for l in db.query(PartnerLink).all()
    }
    return {
        "candidates": [
            _candidate_dict(c, source_to_name.get(c.partner_source) if c.partner_source else None)
            for c in candidates
        ]
    }


@router.post("/admin/interview-candidates")
async def admin_create_interview_candidate(
    data: InterviewCandidateSchema,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not (data.first_name or "").strip() or not (data.last_name or "").strip():
        raise HTTPException(status_code=400, detail="Vor- und Nachname erforderlich")
    c = InterviewCandidate(created_by_user_id=current_user.id)
    _apply_candidate_fields(c, data, partial=False)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _candidate_dict(c)


@router.patch("/admin/interview-candidates/{candidate_id}")
async def admin_update_interview_candidate(
    candidate_id: int,
    data: InterviewCandidateUpdateSchema,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(InterviewCandidate).filter(InterviewCandidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    _apply_candidate_fields(c, data, partial=True)
    db.commit()
    db.refresh(c)
    return _candidate_dict(c)


@router.delete("/admin/interview-candidates/{candidate_id}")
async def admin_delete_interview_candidate(
    candidate_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(InterviewCandidate).filter(InterviewCandidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    db.delete(c)
    db.commit()
    return {"message": "Gelöscht"}


@router.post("/admin/interview-candidates/{candidate_id}/cv")
async def admin_upload_candidate_cv(
    candidate_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(InterviewCandidate).filter(InterviewCandidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    await _store_cv(c, file, db)
    db.refresh(c)
    return _candidate_dict(c)


@router.get("/admin/interview-candidates/{candidate_id}/cv")
async def admin_download_candidate_cv(
    candidate_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(InterviewCandidate).filter(InterviewCandidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    return _cv_response(c)


@router.delete("/admin/interview-candidates/{candidate_id}/cv")
async def admin_delete_candidate_cv(
    candidate_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(InterviewCandidate).filter(InterviewCandidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    c.cv_content = None
    c.cv_filename = None
    c.cv_mime = None
    c.cv_uploaded_at = None
    db.commit()
    return {"message": "Lebenslauf entfernt"}


# ── Partner: eigene Kandidaten (nur wenn freigeschaltet) ───────────────────────

def _partner_candidate_link(token: str, request: Request, db: Session) -> "PartnerLink":
    """Validiert den Partner-Link + die Freischaltung für Kandidaten und gibt ihn zurück."""
    link = db.query(PartnerLink).filter(PartnerLink.token == token).first()
    if not link or not link.is_active:
        raise HTTPException(status_code=404, detail="Link nicht gefunden oder deaktiviert")
    if not _partner_authorized(link, request):
        raise HTTPException(status_code=401, detail="Passwort erforderlich")
    if not getattr(link, "can_add_interview_candidates", False):
        raise HTTPException(status_code=403, detail="Das Anlegen von Gesprächs-Kandidaten ist für diesen Link nicht freigegeben.")
    return link


@router.get("/partner/{token}/interview-candidates")
async def partner_list_interview_candidates(token: str, request: Request, db: Session = Depends(get_db)):
    link = _partner_candidate_link(token, request, db)
    candidates = (
        db.query(InterviewCandidate)
        .filter(InterviewCandidate.partner_link_id == link.id)
        .order_by(InterviewCandidate.created_at.desc())
        .all()
    )
    return {"candidates": [_candidate_dict(c, link.name) for c in candidates]}


@router.post("/partner/{token}/interview-candidates")
async def partner_create_interview_candidate(token: str, data: InterviewCandidateSchema, request: Request, db: Session = Depends(get_db)):
    link = _partner_candidate_link(token, request, db)
    if not (data.first_name or "").strip() or not (data.last_name or "").strip():
        raise HTTPException(status_code=400, detail="Vor- und Nachname erforderlich")
    c = InterviewCandidate(partner_link_id=link.id, partner_source=link.partner_source)
    _apply_candidate_fields(c, data, partial=False)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _candidate_dict(c, link.name)


@router.patch("/partner/{token}/interview-candidates/{candidate_id}")
async def partner_update_interview_candidate(token: str, candidate_id: int, data: InterviewCandidateUpdateSchema, request: Request, db: Session = Depends(get_db)):
    link = _partner_candidate_link(token, request, db)
    c = db.query(InterviewCandidate).filter(
        InterviewCandidate.id == candidate_id,
        InterviewCandidate.partner_link_id == link.id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    _apply_candidate_fields(c, data, partial=True)
    db.commit()
    db.refresh(c)
    return _candidate_dict(c, link.name)


@router.delete("/partner/{token}/interview-candidates/{candidate_id}")
async def partner_delete_interview_candidate(token: str, candidate_id: int, request: Request, db: Session = Depends(get_db)):
    link = _partner_candidate_link(token, request, db)
    c = db.query(InterviewCandidate).filter(
        InterviewCandidate.id == candidate_id,
        InterviewCandidate.partner_link_id == link.id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    db.delete(c)
    db.commit()
    return {"message": "Gelöscht"}


def _partner_own_candidate(token: str, candidate_id: int, request: Request, db: Session):
    """Validiert Link+Freigabe und gibt den Kandidaten dieses Partners zurück (404 sonst)."""
    link = _partner_candidate_link(token, request, db)
    c = db.query(InterviewCandidate).filter(
        InterviewCandidate.id == candidate_id,
        InterviewCandidate.partner_link_id == link.id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kandidat nicht gefunden")
    return link, c


@router.post("/partner/{token}/interview-candidates/{candidate_id}/cv")
async def partner_upload_candidate_cv(token: str, candidate_id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    link, c = _partner_own_candidate(token, candidate_id, request, db)
    await _store_cv(c, file, db)
    db.refresh(c)
    return _candidate_dict(c, link.name)


@router.get("/partner/{token}/interview-candidates/{candidate_id}/cv")
async def partner_download_candidate_cv(token: str, candidate_id: int, request: Request, db: Session = Depends(get_db)):
    _link, c = _partner_own_candidate(token, candidate_id, request, db)
    return _cv_response(c)


@router.delete("/partner/{token}/interview-candidates/{candidate_id}/cv")
async def partner_delete_candidate_cv(token: str, candidate_id: int, request: Request, db: Session = Depends(get_db)):
    _link, c = _partner_own_candidate(token, candidate_id, request, db)
    c.cv_content = None
    c.cv_filename = None
    c.cv_mime = None
    c.cv_uploaded_at = None
    db.commit()
    return {"message": "Lebenslauf entfernt"}
