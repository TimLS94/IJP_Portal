import json as _json
import os
import re
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.models.blog import BlogPost
from app.models.insurance import InsuranceSignup
from app.models.site_metric import SiteMetric
from app.models.document import Document, DocumentType
from app.models.notification import Notification
from app.services.document_service import DocumentService
from app.services.settings_service import get_setting
from app.services.email_service import email_service
from app.core.config import settings
from app.core.rate_limiter import rate_limit_insurance

router = APIRouter(prefix="/insurance", tags=["Insurance / Arbeitnehmer-Infos"])


# ---- Helpers ---------------------------------------------------------------

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur Admins")
    return current_user


# Topic -> Settings-Key fuer den Blog-Tag
TOPIC_TAG_SETTING = {
    "hub": "arbeitnehmer_hub_tag",
    "krankenkasse": "krankenkasse_tag",
}
TOPIC_LINKS_SETTING = {
    "hub": "arbeitnehmer_manual_links",
    "krankenkasse": "krankenkasse_manual_links",
}


def _articles_for_tag(db: Session, tag: str, language: str, limit: int = 12) -> list:
    """Veroeffentlichte Blog-Posts, deren (komma-getrennte) Tags das Tag enthalten.

    Primaer in der gewuenschten Sprache; fehlt dort alles, faellt es auf Deutsch zurueck,
    damit die Seite nie komplett leer ist.
    """
    tag = (tag or "").strip()
    if not tag:
        return []

    like = f"%{tag}%"

    def _query(lang: Optional[str]):
        q = db.query(BlogPost).filter(
            BlogPost.is_published == True,  # noqa: E712
            BlogPost.tags.ilike(like),
        )
        if lang:
            q = q.filter(BlogPost.language == lang)
        return q.order_by(BlogPost.published_at.desc().nullslast()).limit(limit).all()

    posts = _query(language)
    if not posts and language != "de":
        posts = _query("de")

    out = []
    for p in posts:
        lang = p.language or "de"
        path = f"/blog/{p.slug}" if lang == "de" else f"/blog/{lang}/{p.slug}"
        out.append({
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "excerpt": p.excerpt,
            "language": lang,
            "featured_image": p.featured_image,
            "path": path,
            "published_at": p.published_at,
        })
    return out


def _manual_links(db: Session, topic: str, language: str) -> list:
    raw = get_setting(db, TOPIC_LINKS_SETTING.get(topic, ""), []) or []
    out = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        url = (item.get("url") or "").strip()
        if not url:
            continue
        title = item.get(f"title_{language}") or item.get("title_de") or item.get("title") or url
        desc = item.get(f"description_{language}") or item.get("description_de") or item.get("description") or ""
        out.append({"title": title, "url": url, "description": desc})
    return out


# ---- Oeffentliche Endpoints ------------------------------------------------

@router.get("/content")
async def get_content(
    topic: str = Query("hub"),
    language: str = Query("de"),
    db: Session = Depends(get_db),
):
    """Inhalte fuer die Arbeitnehmer-/Krankenkassen-Seiten: automatisch getaggte
    Blogartikel + manuell im Admin gepflegte Zusatzlinks."""
    if topic not in TOPIC_TAG_SETTING:
        raise HTTPException(status_code=400, detail="Unbekanntes Thema")

    if language not in ("de", "en", "es", "ru"):
        language = "de"

    tag = get_setting(db, TOPIC_TAG_SETTING[topic], topic)

    data = {
        "topic": topic,
        "tag": tag,
        "articles": _articles_for_tag(db, tag, language),
        "manual_links": _manual_links(db, topic, language),
    }

    if topic == "krankenkasse":
        data["partner"] = {
            "name": get_setting(db, "insurance_partner_name", "BARMER"),
            "url": get_setting(db, "insurance_partner_url", "https://www.barmer.de"),
            # Ob eine Anmeldung aktuell moeglich ist (BARMER-Link hinterlegt)
            "signup_available": bool((get_setting(db, "barmer_signup_url", "") or "").strip()),
        }

    return data


class SignupRequest(BaseModel):
    needs_embassy_proof: bool = False
    language: Optional[str] = "de"


@router.post("/signup")
async def create_signup(
    data: SignupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Eingeloggter Nutzer meldet sich zur Krankenkasse an. Wir speichern die Anmeldung
    (inkl. Botschafts-Nachweis-Flag) und geben die externe BARMER-URL zur Weiterleitung zurueck."""
    barmer_url = (get_setting(db, "barmer_signup_url", "") or "").strip()

    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if applicant and (applicant.first_name or applicant.last_name):
        full_name = f"{applicant.first_name or ''} {applicant.last_name or ''}".strip()
    else:
        full_name = current_user.email

    language = (data.language or "de")
    if language not in ("de", "en", "es", "ru"):
        language = "de"

    signup = InsuranceSignup(
        user_id=current_user.id,
        full_name=full_name,
        email=current_user.email,
        needs_embassy_proof=bool(data.needs_embassy_proof),
        language=language,
        status="new",
    )
    db.add(signup)
    db.commit()
    db.refresh(signup)

    return {
        "id": signup.id,
        "redirect_url": barmer_url or None,
        "signup_available": bool(barmer_url),
        "needs_embassy_proof": signup.needs_embassy_proof,
    }


def _frontend_url() -> str:
    url = getattr(settings, "FRONTEND_URL", "") or ""
    if not url or "localhost" in url or "127.0.0.1" in url:
        url = "https://www.jobonportal.de"
    return url.rstrip("/")


class EmailSignupRequest(BaseModel):
    email: EmailStr
    needs_embassy_proof: bool = False
    language: Optional[str] = "de"
    website: Optional[str] = ""  # Honeypot – im Formular versteckt, muss leer bleiben


@router.post("/signup-email")
async def create_signup_email(data: EmailSignupRequest, request: Request, db: Session = Depends(get_db)):
    """Anonyme Krankenkassen-Anmeldung nur per E-Mail (ohne Konto).

    Bot-Schutz: Honeypot (verstecktes Feld) + Rate-Limit (IP & E-Mail) + Double-Opt-In.
    Die Anmeldung zaehlt erst, nachdem der Bestaetigungslink angeklickt wurde.
    Die Antwort ist bewusst generisch (keine Auskunft, ob eine E-Mail schon existiert).
    """
    generic_ok = {"ok": True, "message": "Fast geschafft! Bitte bestätige deine E-Mail über den Link, den wir dir gerade geschickt haben."}

    # Honeypot: nur Bots fuellen das versteckte Feld 'website'.
    if (data.website or "").strip():
        return generic_ok

    email = str(data.email).strip().lower()
    await rate_limit_insurance(request, email)

    language = data.language if data.language in ("de", "en", "es", "ru") else "de"
    token = secrets.token_urlsafe(32)

    signup = InsuranceSignup(
        user_id=None,
        full_name=None,
        email=email,
        needs_embassy_proof=bool(data.needs_embassy_proof),
        language=language,
        status="pending",
        email_verified=False,
        verify_token=token,
        verify_token_expires=datetime.utcnow() + timedelta(hours=48),
    )
    db.add(signup)
    db.commit()

    verify_link = f"{_frontend_url()}/versicherung/bestaetigen?token={token}"
    try:
        email_service.send_insurance_verify_email(email, verify_link, language)
    except Exception:
        pass  # Zustellung best effort – Antwort bleibt generisch

    return generic_ok


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email")
async def verify_signup_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Bestaetigt eine anonyme E-Mail-Anmeldung (Double-Opt-In). Danach landet sie
    in der Admin-Liste (status 'new')."""
    token = (data.token or "").strip()
    if not token:
        return {"ok": False, "reason": "missing_token"}
    signup = db.query(InsuranceSignup).filter(InsuranceSignup.verify_token == token).first()
    if not signup:
        return {"ok": False, "reason": "invalid"}
    if signup.email_verified:
        return {"ok": True, "already": True}
    exp = signup.verify_token_expires
    if exp is not None and getattr(exp, "tzinfo", None) is not None:
        exp = exp.replace(tzinfo=None)
    if exp is not None and exp < datetime.utcnow():
        return {"ok": False, "reason": "expired"}
    signup.email_verified = True
    signup.status = "new"
    signup.verify_token = None
    signup.verify_token_expires = None
    db.commit()
    return {"ok": True}


# ---- Admin-Endpoints -------------------------------------------------------

@router.get("/admin/signups")
async def list_signups(
    status_filter: Optional[str] = Query(None, alias="status"),
    needs_embassy_proof: Optional[bool] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Liste aller Krankenkassen-Anmeldungen (wer hat sich angemeldet, wer braucht
    Botschafts-Papier)."""
    q = db.query(InsuranceSignup)
    if status_filter:
        q = q.filter(InsuranceSignup.status == status_filter)
    else:
        # Unbestaetigte Double-Opt-In-Anmeldungen (noch kein E-Mail-Klick) ausblenden
        q = q.filter(InsuranceSignup.status != "pending")
    if needs_embassy_proof is not None:
        q = q.filter(InsuranceSignup.needs_embassy_proof == needs_embassy_proof)

    rows = q.order_by(InsuranceSignup.created_at.desc()).all()

    total = len(rows)
    embassy = sum(1 for r in rows if r.needs_embassy_proof)

    return {
        "total": total,
        "embassy_needed": embassy,
        "signups": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "full_name": r.full_name,
                "email": r.email,
                "needs_embassy_proof": r.needs_embassy_proof,
                "language": r.language,
                "status": r.status,
                "admin_note": r.admin_note,
                "document_provided": bool(getattr(r, "document_provided", False)),
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in rows
        ],
    }


class SignupUpdate(BaseModel):
    status: Optional[str] = None
    admin_note: Optional[str] = None


@router.patch("/admin/signups/{signup_id}")
async def update_signup(
    signup_id: int,
    data: SignupUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    signup = db.query(InsuranceSignup).filter(InsuranceSignup.id == signup_id).first()
    if not signup:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")

    if data.status is not None:
        if data.status not in ("new", "contacted", "registered", "done"):
            raise HTTPException(status_code=400, detail="Ungültiger Status")
        signup.status = data.status
    if data.admin_note is not None:
        signup.admin_note = data.admin_note

    db.commit()
    db.refresh(signup)
    return {"message": "Aktualisiert", "id": signup.id, "status": signup.status}


@router.delete("/admin/signups/{signup_id}")
async def delete_signup(
    signup_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    signup = db.query(InsuranceSignup).filter(InsuranceSignup.id == signup_id).first()
    if not signup:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")
    db.delete(signup)
    db.commit()
    return {"message": "Gelöscht"}


# ---- Tracking (leichtgewichtig, zusaetzlich zu Google Analytics) -----------

ALLOWED_EVENTS = {
    "view_arbeitnehmer", "view_krankenkasse", "view_arbeitsvertrag",
    "view_steuern", "view_anmeldung", "view_bankkonto", "view_rechte",
    "click_insurance_signup",
}


class TrackRequest(BaseModel):
    event: str


@router.post("/track", status_code=204)
async def track_event(data: TrackRequest, db: Session = Depends(get_db)):
    """Oeffentliches, anonymes Zaehlen von Seitenaufrufen / Funktionsnutzung.
    Nur Keys aus der Whitelist werden gezaehlt (verhindert Spam)."""
    key = (data.event or "").strip()
    if key not in ALLOWED_EVENTS:
        return
    try:
        metric = db.query(SiteMetric).filter(SiteMetric.key == key).first()
        if metric:
            metric.count = (metric.count or 0) + 1
        else:
            db.add(SiteMetric(key=key, count=1))
        db.commit()
    except Exception:
        db.rollback()
    return


@router.get("/admin/metrics")
async def get_metrics(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin: einfache In-House-Statistik zu den Arbeitnehmer-Seiten + Krankenkassen-Funktion."""
    rows = db.query(SiteMetric).all()
    counts = {r.key: r.count for r in rows}

    page_views = {k: counts.get(k, 0) for k in (
        "view_arbeitnehmer", "view_krankenkasse", "view_arbeitsvertrag",
        "view_steuern", "view_anmeldung", "view_bankkonto", "view_rechte",
    )}

    signups_completed = db.query(InsuranceSignup).count()
    embassy_needed = db.query(InsuranceSignup).filter(InsuranceSignup.needs_embassy_proof == True).count()  # noqa: E712
    documents_provided = db.query(InsuranceSignup).filter(InsuranceSignup.document_provided == True).count()  # noqa: E712

    return {
        "page_views": page_views,
        "insurance": {
            "signup_clicks": counts.get("click_insurance_signup", 0),
            "signups_completed": signups_completed,
            "embassy_needed": embassy_needed,
            "documents_provided": documents_provided,
        },
    }


@router.post("/admin/signups/{signup_id}/document")
async def attach_signup_document(
    signup_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin haengt dem Nutzer den Krankenversicherungsnachweis (Botschaft) an:
    Dokument landet in seinen Dokumenten + In-App-Benachrichtigung + E-Mail."""
    signup = db.query(InsuranceSignup).filter(InsuranceSignup.id == signup_id).first()
    if not signup:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")

    applicant = db.query(Applicant).filter(Applicant.user_id == signup.user_id).first()
    if not applicant:
        raise HTTPException(status_code=400, detail="Nutzer hat kein Bewerberprofil – Dokument kann nicht angehängt werden.")

    document = await DocumentService.save_file(
        file=file,
        applicant_id=applicant.id,
        document_type=DocumentType.OTHER,
        description="Krankenversicherungsnachweis für die Botschaft",
        db=db,
    )

    signup.document_provided = True
    signup.document_id = document.id
    signup.status = "done"

    user = db.query(User).filter(User.id == signup.user_id).first()
    name = signup.full_name or (f"{applicant.first_name or ''} {applicant.last_name or ''}".strip()) or (user.email if user else "")

    db.add(Notification(
        user_id=signup.user_id,
        type="insurance_document",
        reference_id=document.id,
        reference_type="document",
        title="Krankenversicherungsnachweis verfügbar",
        message="Dein Krankenversicherungsnachweis für die Botschaft wurde in deinen Dokumenten hinterlegt.",
        notification_key="notifications.insuranceDocumentReady",
        notification_params=_json.dumps({}),
    ))
    db.commit()

    if user and user.email:
        try:
            email_service.send_insurance_document_ready(user.email, name)
        except Exception:
            pass

    return {"message": "Dokument angehängt und Nutzer benachrichtigt", "document_id": document.id}
