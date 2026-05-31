"""
IJP Dokumentenservice — Admin-Bereich
- CRUD für IJP-Betriebe
- Template-basierte PDF-Generierung (erweiterbar für weitere Dokumente)
"""
import io
import re
import logging
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.ijp import IJPBetrieb
from app.models.applicant import Applicant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ijp", tags=["IJP"])


# ── Auth helper ────────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur Admins")
    return current_user


# ── Template-System ────────────────────────────────────────────────────────────

DOCUMENT_TYPES: Dict[str, str] = {
    "wohnungsbestaetigung": "Wohnungsbestätigung",
}

DEFAULT_TEMPLATES: Dict[str, str] = {
    "wohnungsbestaetigung": """\
{{betrieb_name}}
{{contact_person}}
{{street}}
{{postal_code}} {{city}}


An die
Deutsche Botschaft


Betreff: Bestätigung zur Unterkunft und Übernahme der Anreisekosten


Sehr geehrte Damen und Herren,

hiermit bestätigen wir, dass {{gender_article}} {{applicant_name}} für den gesamten Zeitraum {{gender_possessive}} Beschäftigung in unserem Betrieb eine Unterkunft erhält. Die Unterkunft wird von uns organisiert und während der Dauer des Arbeitsverhältnisses zur Verfügung gestellt.

Des Weiteren erklären wir, dass wir bereit sind, die Anreisekosten des Arbeitnehmers zu übernehmen.

Diese Bestätigung erfolgt zur Vorlage bei der deutschen Botschaft im Rahmen des Visumverfahrens.

Für Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen


{{contact_person}}""",
}

TEMPLATE_VARIABLES: Dict[str, List[Dict[str, str]]] = {
    "wohnungsbestaetigung": [
        {"key": "betrieb_name",       "label": "Betriebsname"},
        {"key": "contact_person",     "label": "Ansprechpartner"},
        {"key": "street",             "label": "Straße"},
        {"key": "postal_code",        "label": "PLZ"},
        {"key": "city",               "label": "Ort"},
        {"key": "applicant_name",     "label": "Name des Bewerbers"},
        {"key": "gender_article",     "label": "Geschlechtsartikel"},
        {"key": "gender_possessive",  "label": "Possessivpronomen (ihrer/seiner)"},
    ],
}


def _substitute(template: str, variables: Dict[str, str]) -> str:
    for key, value in variables.items():
        template = template.replace(f"{{{{{key}}}}}", value)
    return template


# ── Schemas ────────────────────────────────────────────────────────────────────

class BetriebCreate(BaseModel):
    name: str
    contact_person: str
    street: str
    postal_code: str
    city: str
    betriebsnummer: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class BetriebResponse(BaseModel):
    id: int
    name: str
    contact_person: str
    street: str
    postal_code: str
    city: str
    betriebsnummer: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicantOption(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    gender: Optional[str] = None


class DocumentRequest(BaseModel):
    doc_type: str = "wohnungsbestaetigung"
    betrieb_id: int
    applicant_id: int
    gender: str                        # "female" | "male"
    custom_template: Optional[str] = None  # wenn None → Default-Template


# ── Betriebe CRUD ──────────────────────────────────────────────────────────────

@router.get("/betriebe", response_model=List[BetriebResponse])
def list_betriebe(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    return db.query(IJPBetrieb).order_by(IJPBetrieb.name).all()


@router.post("/betriebe", response_model=BetriebResponse, status_code=201)
def create_betrieb(
    data: BetriebCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    betrieb = IJPBetrieb(**data.model_dump())
    db.add(betrieb)
    db.commit()
    db.refresh(betrieb)
    return betrieb


@router.put("/betriebe/{betrieb_id}", response_model=BetriebResponse)
def update_betrieb(
    betrieb_id: int,
    data: BetriebCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == betrieb_id).first()
    if not betrieb:
        raise HTTPException(status_code=404, detail="Betrieb nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(betrieb, key, value)
    betrieb.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(betrieb)
    return betrieb


@router.delete("/betriebe/{betrieb_id}", status_code=204)
def delete_betrieb(
    betrieb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == betrieb_id).first()
    if not betrieb:
        raise HTTPException(status_code=404, detail="Betrieb nicht gefunden")
    db.delete(betrieb)
    db.commit()


# ── Bewerber-Auswahl ───────────────────────────────────────────────────────────

@router.get("/applicants", response_model=List[ApplicantOption])
def list_applicants_for_ijp(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    query = (
        db.query(Applicant, User)
        .join(User, User.id == Applicant.user_id)
        .filter(User.is_active == True)
    )
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Applicant.first_name.ilike(term)) |
            (Applicant.last_name.ilike(term)) |
            (User.email.ilike(term))
        )
    rows = query.order_by(Applicant.last_name, Applicant.first_name).limit(100).all()
    return [
        ApplicantOption(
            id=a.id,
            first_name=a.first_name or "",
            last_name=a.last_name or "",
            email=u.email,
            gender=a.gender.value if a.gender else None,
        )
        for a, u in rows
    ]


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_document_types(current_user: User = Depends(_require_admin)):
    """Gibt alle verfügbaren Dokument-Typen zurück."""
    return [
        {"value": k, "label": v}
        for k, v in DOCUMENT_TYPES.items()
    ]


@router.get("/templates/{doc_type}")
def get_template(
    doc_type: str,
    current_user: User = Depends(_require_admin),
):
    """Gibt das Standard-Template und die verfügbaren Variablen zurück."""
    if doc_type not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Dokument-Typ nicht gefunden")
    return {
        "doc_type": doc_type,
        "label": DOCUMENT_TYPES[doc_type],
        "template": DEFAULT_TEMPLATES[doc_type],
        "variables": TEMPLATE_VARIABLES.get(doc_type, []),
    }


# ── PDF-Generierung ────────────────────────────────────────────────────────────

def _build_pdf_from_filled_text(filled_text: str, filename_hint: str = "Dokument") -> bytes:
    """Rendert einen bereits befüllten Freitext als PDF (ReportLab)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.enums import TA_LEFT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()
    normal = ParagraphStyle(
        "ijp_normal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        spaceAfter=2,
        alignment=TA_LEFT,
    )

    story = []
    lines = filled_text.split("\n")
    consecutive_blanks = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            consecutive_blanks += 1
            # Max 2 blank lines worth of spacing
            if consecutive_blanks <= 2:
                story.append(Spacer(1, 0.45 * cm))
        else:
            consecutive_blanks = 0
            # Auto-bold: "Betreff:" lines
            if stripped.startswith("Betreff:"):
                story.append(Paragraph(f"<b>{stripped}</b>", normal))
            else:
                # Escape HTML special chars for ReportLab
                safe = stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(safe, normal))

    doc.build(story)
    return buf.getvalue()


@router.post("/documents/generate")
def generate_document(
    req: DocumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Generiert ein Dokument als PDF-Download."""
    if req.doc_type not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=400, detail="Unbekannter Dokument-Typ")

    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == req.betrieb_id).first()
    if not betrieb:
        raise HTTPException(status_code=404, detail="Betrieb nicht gefunden")

    applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber nicht gefunden")

    applicant_name = f"{applicant.first_name or ''} {applicant.last_name or ''}".strip()
    gender = req.gender or (applicant.gender.value if applicant.gender else "male")

    variables = {
        "betrieb_name":      betrieb.name,
        "contact_person":    betrieb.contact_person,
        "street":            betrieb.street,
        "postal_code":       betrieb.postal_code,
        "city":              betrieb.city,
        "applicant_name":    applicant_name,
        "gender_article":    "die Arbeitnehmerin" if gender == "female" else "der Arbeitnehmer",
        "gender_possessive": "ihrer" if gender == "female" else "seiner",
    }

    template = req.custom_template or DEFAULT_TEMPLATES[req.doc_type]
    filled = _substitute(template, variables)
    pdf_bytes = _build_pdf_from_filled_text(filled)

    safe_name = applicant_name.replace(" ", "_")
    filename = f"{DOCUMENT_TYPES.get(req.doc_type, req.doc_type)}_{safe_name}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Legacy-Endpoint (Rückwärtskompatibilität) ──────────────────────────────────

@router.post("/documents/wohnungsbestaetigung")
def generate_wohnungsbestaetigung_legacy(
    req: DocumentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    req.doc_type = "wohnungsbestaetigung"
    return generate_document(req, db, current_user)
