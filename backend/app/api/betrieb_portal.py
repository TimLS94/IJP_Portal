"""
Öffentliches, passwortgeschütztes Betrieb-Portal.

Eine IJP-Firma öffnet /betrieb/<token>, gibt das Passwort ein und sieht read-only
die ihr zugeteilten Studenten (JobRequest.assigned_betrieb_id), deren öffentlichen
Status und die vom Admin freigegebenen Dokumente. Kein Nutzer-Account.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_betrieb_token, get_current_betrieb
from app.core.rate_limiter import rate_limit_login
from app.models.betrieb_access import BetriebAccessLink
from app.models.ijp import IJPBetrieb
from app.models.job_request import JobRequest, JOB_REQUEST_STATUS_LABELS
from app.models.document import Document
from app.services.storage_service import storage_service

router = APIRouter(prefix="/betrieb-portal", tags=["betrieb-portal"])


class BetriebLoginRequest(BaseModel):
    password: str


@router.get("/{token}/info")
def portal_info(token: str, db: Session = Depends(get_db)):
    """Öffentlich: Existiert/aktiv? Liefert den Firmennamen für die Login-Seite."""
    link = db.query(BetriebAccessLink).filter(BetriebAccessLink.token == token).first()
    if not link or not link.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zugang nicht gefunden")
    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == link.betrieb_id).first()
    return {"betrieb_name": betrieb.name if betrieb else None}


@router.post("/{token}/login")
async def portal_login(
    token: str,
    data: BetriebLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Passwort prüfen -> kurzlebigen, gescopeten Betrieb-Token ausstellen."""
    # Brute-Force-Schutz (per IP + Token)
    await rate_limit_login(request, email=f"betrieb:{token[:16]}")

    link = db.query(BetriebAccessLink).filter(BetriebAccessLink.token == token).first()
    if not link or not link.is_active or not verify_password(data.password, link.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falsches Passwort oder Zugang gesperrt",
        )

    link.last_accessed_at = datetime.utcnow()
    db.commit()
    return {
        "access_token": create_betrieb_token(link.betrieb_id),
        "token_type": "bearer",
    }


def _student_entry(req: JobRequest, db: Session) -> dict:
    a = req.applicant
    status_val = req.public_status or req.status
    docs = (
        db.query(Document)
        .filter(Document.applicant_id == a.id, Document.shared_with_betrieb == True)
        .all()
    )
    return {
        "request_id": req.id,
        "name": f"{a.first_name} {a.last_name}".strip(),
        "nationality": a.nationality,
        "status": status_val.value if status_val else None,
        "status_label": JOB_REQUEST_STATUS_LABELS.get(
            status_val, status_val.value if status_val else ""
        ),
        "position_type": req.position_type.value if req.position_type else None,
        "preferred_location": req.preferred_location,
        "documents": [
            {
                "id": d.id,
                "type": d.document_type.value if d.document_type else None,
                "name": d.original_name,
                "size": d.file_size,
            }
            for d in docs
        ],
    }


@router.get("/me")
def portal_me(
    betrieb_id: int = Depends(get_current_betrieb),
    db: Session = Depends(get_db),
):
    """Read-only-Übersicht: zugeteilte Studenten + Status + freigegebene Dokumente."""
    betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == betrieb_id).first()
    reqs = (
        db.query(JobRequest)
        .filter(JobRequest.assigned_betrieb_id == betrieb_id)
        .order_by(JobRequest.created_at.desc())
        .all()
    )
    return {
        "betrieb_name": betrieb.name if betrieb else None,
        "students": [_student_entry(r, db) for r in reqs if r.applicant is not None],
    }


@router.get("/documents/{document_id}")
async def portal_download(
    document_id: int,
    betrieb_id: int = Depends(get_current_betrieb),
    db: Session = Depends(get_db),
):
    """Sicherer Dokument-Download: nur freigegebene Dokumente von Studenten,
    die genau diesem Betrieb zugeteilt sind."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.shared_with_betrieb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nicht gefunden")

    assigned = (
        db.query(JobRequest)
        .filter(
            JobRequest.applicant_id == doc.applicant_id,
            JobRequest.assigned_betrieb_id == betrieb_id,
        )
        .first()
    )
    if not assigned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nicht gefunden")

    ok, content, _err = await storage_service.download_file(doc.file_path)
    if not ok or content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Datei nicht verfügbar")

    safe_name = (doc.original_name or "dokument").replace('"', "").replace("\n", " ")
    return Response(
        content=content,
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
    )
