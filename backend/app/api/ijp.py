"""
IJP Dokumentenservice — Admin-Bereich
- CRUD für IJP-Betriebe
- PDF-Generierung (Wohnungsbestätigung etc.)
"""
import io
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
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


class WohnungsbestaetigungRequest(BaseModel):
    betrieb_id: int
    applicant_id: int
    gender: str  # "female" | "male" | "diverse"


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


# ── Applicants für Auswahl ─────────────────────────────────────────────────────

@router.get("/applicants", response_model=List[ApplicantOption])
def list_applicants_for_ijp(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Alle Bewerber für die Dokument-Auswahl."""
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


# ── PDF-Generierung ────────────────────────────────────────────────────────────

def _build_wohnungsbestaetigung_pdf(
    betrieb: IJPBetrieb,
    applicant_name: str,
    gender: str,
) -> bytes:
    """Erstellt die Wohnungsbestätigung als PDF-Bytes."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.enums import TA_LEFT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import os

    # Geschlechtsabhängige Formulierungen
    if gender == "female":
        gender_article = "die Arbeitnehmerin"
        gender_possessive = "ihrer"
    else:
        gender_article = "der Arbeitnehmer"
        gender_possessive = "seiner"

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
        "normal_de",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        spaceAfter=0,
    )
    bold = ParagraphStyle(
        "bold_de",
        parent=normal,
        fontName="Helvetica-Bold",
    )

    def sp(height_cm: float):
        return Spacer(1, height_cm * cm)

    story = []

    # Absender-Block (Betrieb)
    story.append(Paragraph(betrieb.name, bold))
    story.append(Paragraph(betrieb.contact_person, normal))
    story.append(Paragraph(betrieb.street, normal))
    story.append(Paragraph(f"{betrieb.postal_code} {betrieb.city}", normal))

    story.append(sp(1.2))

    # Empfänger
    story.append(Paragraph("An die", normal))
    story.append(Paragraph("Deutsche Botschaft", normal))

    story.append(sp(1.2))

    # Betreff
    story.append(Paragraph(
        "<b>Betreff: Bestätigung zur Unterkunft und Übernahme der Anreisekosten</b>",
        normal,
    ))

    story.append(sp(0.8))

    # Anrede
    story.append(Paragraph("Sehr geehrte Damen und Herren,", normal))
    story.append(sp(0.4))

    # Haupttext
    main_text = (
        f"hiermit bestätigen wir, dass {gender_article} <b>{applicant_name}</b> "
        f"für den gesamten Zeitraum {gender_possessive} Beschäftigung in unserem Betrieb "
        f"eine Unterkunft erhält. Die Unterkunft wird von uns organisiert und während der "
        f"Dauer des Arbeitsverhältnisses zur Verfügung gestellt."
    )
    story.append(Paragraph(main_text, normal))
    story.append(sp(0.4))

    story.append(Paragraph(
        "Des Weiteren erklären wir, dass wir bereit sind, die Anreisekosten "
        "des Arbeitnehmers zu übernehmen.",
        normal,
    ))
    story.append(sp(0.4))

    story.append(Paragraph(
        "Diese Bestätigung erfolgt zur Vorlage bei der deutschen Botschaft "
        "im Rahmen des Visumverfahrens.",
        normal,
    ))
    story.append(sp(0.4))

    story.append(Paragraph(
        "Für Rückfragen stehen wir Ihnen gerne zur Verfügung.",
        normal,
    ))

    story.append(sp(1.0))

    story.append(Paragraph("Mit freundlichen Grüßen", normal))

    story.append(sp(1.5))

    story.append(Paragraph(betrieb.contact_person, normal))

    doc.build(story)
    return buf.getvalue()


@router.post("/documents/wohnungsbestaetigung")
def generate_wohnungsbestaetigung(
    req: WohnungsbestaetigungRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == req.betrieb_id).first()
    if not betrieb:
        raise HTTPException(status_code=404, detail="Betrieb nicht gefunden")

    applicant = db.query(Applicant).filter(Applicant.id == req.applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber nicht gefunden")

    applicant_name = f"{applicant.first_name} {applicant.last_name}".strip()
    gender = req.gender or (applicant.gender.value if applicant.gender else "male")

    pdf_bytes = _build_wohnungsbestaetigung_pdf(betrieb, applicant_name, gender)

    safe_name = applicant_name.replace(" ", "_")
    filename = f"Wohnungsbestaetigung_{safe_name}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
