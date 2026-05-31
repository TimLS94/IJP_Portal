"""
IJP Dokumentenservice — Admin-Bereich
- CRUD für IJP-Betriebe
- Persistente, DB-gespeicherte Dokument-Vorlagen (editierbar)
- Template-basierte PDF-Generierung
"""
import io
import re
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.ijp import IJPBetrieb, IJPTemplate, CRMContact
from app.models.applicant import Applicant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ijp", tags=["IJP"])


# ── Auth helper ────────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur Admins")
    return current_user


# ── Seed-Daten (werden beim ersten Start in die DB geschrieben) ────────────────

SEED_TEMPLATES = [
    {
        "doc_type": "wohnungsbestaetigung",
        "label": "Wohnungsbestätigung",
        "template_text": """\
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
        "variables": [
            {"key": "betrieb_name",       "label": "Betriebsname"},
            {"key": "contact_person",     "label": "Ansprechpartner"},
            {"key": "street",             "label": "Straße"},
            {"key": "postal_code",        "label": "PLZ"},
            {"key": "city",               "label": "Ort"},
            {"key": "applicant_name",     "label": "Name des Bewerbers"},
            {"key": "gender_article",     "label": "Geschlechtsartikel"},
            {"key": "gender_possessive",  "label": "Possessivpronomen (ihrer/seiner)"},
        ],
    },
]


def seed_ijp_templates(db: Session) -> None:
    """Schreibt fehlende Seed-Vorlagen in die DB (einmalig)."""
    for seed in SEED_TEMPLATES:
        exists = db.query(IJPTemplate).filter(IJPTemplate.doc_type == seed["doc_type"]).first()
        if not exists:
            db.add(IJPTemplate(**seed))
    db.commit()


# ── Helper ────────────────────────────────────────────────────────────────────

def _substitute(template: str, variables: Dict[str, str]) -> str:
    for key, value in variables.items():
        template = template.replace(f"{{{{{key}}}}}", value)
    return template


# ── Schemas ───────────────────────────────────────────────────────────────────

class BetriebCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    betriebsnummer: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BetriebResponse(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    betriebsnummer: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── CRM Schemas ───────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    salutation: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    is_primary: bool = False


class ContactResponse(BaseModel):
    id: int
    company_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    salutation: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    is_primary: bool = False

    class Config:
        from_attributes = True


class CompanyWithContacts(BetriebResponse):
    contacts: List[ContactResponse] = []


class ApplicantOption(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    gender: Optional[str] = None


class TemplateVar(BaseModel):
    key: str
    label: str


class TemplateCreate(BaseModel):
    doc_type: str
    label: str
    template_text: str
    variables: List[TemplateVar] = []


class TemplateUpdate(BaseModel):
    label: str
    template_text: str
    variables: List[TemplateVar] = []


class TemplateResponse(BaseModel):
    id: int
    doc_type: str
    label: str
    template_text: str
    variables: List[Dict[str, str]] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentRequest(BaseModel):
    doc_type: str
    betrieb_id: int
    applicant_id: int
    gender: str                           # "female" | "male"
    custom_template: Optional[str] = None  # wenn None → DB-Template


# ── Betriebe CRUD ─────────────────────────────────────────────────────────────

@router.get("/betriebe", response_model=List[BetriebResponse])
def list_betriebe(db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    return db.query(IJPBetrieb).order_by(IJPBetrieb.name).all()


@router.post("/betriebe", response_model=BetriebResponse, status_code=201)
def create_betrieb(data: BetriebCreate, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    betrieb = IJPBetrieb(**data.model_dump())
    db.add(betrieb)
    db.commit()
    db.refresh(betrieb)
    return betrieb


@router.put("/betriebe/{betrieb_id}", response_model=BetriebResponse)
def update_betrieb(betrieb_id: int, data: BetriebCreate, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
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
def delete_betrieb(betrieb_id: int, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == betrieb_id).first()
    if not betrieb:
        raise HTTPException(status_code=404, detail="Betrieb nicht gefunden")
    db.delete(betrieb)
    db.commit()


# ── Bewerber ──────────────────────────────────────────────────────────────────

@router.get("/applicants", response_model=List[ApplicantOption])
def list_applicants_for_ijp(search: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    query = db.query(Applicant, User).join(User, User.id == Applicant.user_id).filter(User.is_active == True)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Applicant.first_name.ilike(term)) | (Applicant.last_name.ilike(term)) | (User.email.ilike(term))
        )
    rows = query.order_by(Applicant.last_name, Applicant.first_name).limit(100).all()
    return [
        ApplicantOption(id=a.id, first_name=a.first_name or "", last_name=a.last_name or "",
                        email=u.email, gender=a.gender.value if a.gender else None)
        for a, u in rows
    ]


# ── Templates CRUD ────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[TemplateResponse])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    return db.query(IJPTemplate).order_by(IJPTemplate.label).all()


@router.get("/templates/{doc_type}", response_model=TemplateResponse)
def get_template(doc_type: str, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    tmpl = db.query(IJPTemplate).filter(IJPTemplate.doc_type == doc_type).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    return tmpl


@router.post("/templates", response_model=TemplateResponse, status_code=201)
def create_template(data: TemplateCreate, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    # Slug validieren
    if not re.match(r'^[a-z0-9_-]+$', data.doc_type):
        raise HTTPException(status_code=400, detail="doc_type darf nur Kleinbuchstaben, Ziffern, _ und - enthalten")
    existing = db.query(IJPTemplate).filter(IJPTemplate.doc_type == data.doc_type).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Vorlage '{data.doc_type}' existiert bereits")
    tmpl = IJPTemplate(
        doc_type=data.doc_type,
        label=data.label,
        template_text=data.template_text,
        variables=[v.model_dump() for v in data.variables],
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.put("/templates/{doc_type}", response_model=TemplateResponse)
def update_template(doc_type: str, data: TemplateUpdate, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    tmpl = db.query(IJPTemplate).filter(IJPTemplate.doc_type == doc_type).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    tmpl.label = data.label
    tmpl.template_text = data.template_text
    tmpl.variables = [v.model_dump() for v in data.variables]
    tmpl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{doc_type}", status_code=204)
def delete_template(doc_type: str, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    tmpl = db.query(IJPTemplate).filter(IJPTemplate.doc_type == doc_type).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    db.delete(tmpl)
    db.commit()


# ── PDF-Generierung ───────────────────────────────────────────────────────────

def _build_pdf_from_filled_text(filled_text: str) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.enums import TA_LEFT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2.5*cm, rightMargin=2.5*cm, topMargin=2.5*cm, bottomMargin=2.5*cm)
    styles = getSampleStyleSheet()
    normal = ParagraphStyle("ijp_normal", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=16, spaceAfter=2, alignment=TA_LEFT)

    story = []
    consecutive_blanks = 0
    for line in filled_text.split("\n"):
        stripped = line.strip()
        if not stripped:
            consecutive_blanks += 1
            if consecutive_blanks <= 2:
                story.append(Spacer(1, 0.45 * cm))
        else:
            consecutive_blanks = 0
            safe = stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if stripped.startswith("Betreff:"):
                story.append(Paragraph(f"<b>{safe}</b>", normal))
            else:
                story.append(Paragraph(safe, normal))

    doc.build(story)
    return buf.getvalue()


@router.post("/documents/generate")
def generate_document(req: DocumentRequest, db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    tmpl = db.query(IJPTemplate).filter(IJPTemplate.doc_type == req.doc_type).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Vorlage '{req.doc_type}' nicht gefunden")

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

    template_text = req.custom_template or tmpl.template_text
    filled = _substitute(template_text, variables)
    pdf_bytes = _build_pdf_from_filled_text(filled)

    safe_name = applicant_name.replace(" ", "_")
    filename = f"{tmpl.label}_{safe_name}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── CRM: Companies ────────────────────────────────────────────────────────────

@router.get("/crm/companies", response_model=List[CompanyWithContacts])
def crm_list_companies(
    search: Optional[str] = None,
    industry: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    q = db.query(IJPBetrieb)
    if search:
        term = f"%{search}%"
        q = q.filter(
            IJPBetrieb.name.ilike(term)
            | IJPBetrieb.city.ilike(term)
            | IJPBetrieb.industry.ilike(term)
        )
    if industry:
        q = q.filter(IJPBetrieb.industry == industry)
    if status:
        q = q.filter(IJPBetrieb.status == status)
    return q.order_by(IJPBetrieb.name).all()


@router.post("/crm/companies", response_model=CompanyWithContacts, status_code=201)
def crm_create_company(
    data: BetriebCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    company = IJPBetrieb(**data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/crm/companies/{company_id}", response_model=CompanyWithContacts)
def crm_get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    company = db.query(IJPBetrieb).filter(IJPBetrieb.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firma nicht gefunden")
    return company


@router.put("/crm/companies/{company_id}", response_model=CompanyWithContacts)
def crm_update_company(
    company_id: int,
    data: BetriebCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    company = db.query(IJPBetrieb).filter(IJPBetrieb.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firma nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(company, key, value)
    company.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(company)
    return company


@router.delete("/crm/companies/{company_id}", status_code=204)
def crm_delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    company = db.query(IJPBetrieb).filter(IJPBetrieb.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firma nicht gefunden")
    db.delete(company)
    db.commit()


# ── CRM: Contacts ─────────────────────────────────────────────────────────────

@router.post("/crm/companies/{company_id}/contacts", response_model=ContactResponse, status_code=201)
def crm_create_contact(
    company_id: int,
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    company = db.query(IJPBetrieb).filter(IJPBetrieb.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firma nicht gefunden")
    contact = CRMContact(company_id=company_id, **data.model_dump())
    db.add(contact)
    # If this is marked primary, unset others
    if data.is_primary:
        db.query(CRMContact).filter(
            CRMContact.company_id == company_id, CRMContact.id != contact.id
        ).update({"is_primary": False})
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/crm/contacts/{contact_id}", response_model=ContactResponse)
def crm_update_contact(
    contact_id: int,
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(contact, key, value)
    if data.is_primary:
        db.query(CRMContact).filter(
            CRMContact.company_id == contact.company_id, CRMContact.id != contact_id
        ).update({"is_primary": False})
    contact.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/crm/contacts/{contact_id}", status_code=204)
def crm_delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")
    db.delete(contact)
    db.commit()


@router.get("/crm/meta")
def crm_meta(db: Session = Depends(get_db), current_user: User = Depends(_require_admin)):
    """Distinct industries and statuses for filter dropdowns."""
    industries = [
        r[0] for r in db.query(IJPBetrieb.industry).filter(IJPBetrieb.industry.isnot(None)).distinct().all()
    ]
    statuses = [
        r[0] for r in db.query(IJPBetrieb.status).filter(IJPBetrieb.status.isnot(None)).distinct().all()
    ]
    return {"industries": sorted(industries), "statuses": sorted(statuses)}
