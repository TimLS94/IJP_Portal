"""
Verträge – IJP-Auftrag.

Admin lädt wiederverwendbare Word-Vorlagen (mit {{Platzhaltern}}) hoch, versendet
einen gefüllten Vertrag (als PDF) an einen Bewerber. Der Bewerber lädt das PDF
herunter, unterschreibt und lädt die unterschriebene Datei wieder hoch. IJP wird
benachrichtigt, sobald der Vertrag unterzeichnet ist.
"""
import io
import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.models.job_request import JobRequest, JobRequestStatus
from app.models.contract import ContractTemplate, Contract
from app.models.notification import Notification
from app.services.email_service import email_service
from app.services.docx_pdf_service import docx_to_pdf_bytes
from app.api.ijp import _applicant_context, _smart_fill_docx_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contracts", tags=["contracts"])

FRONTEND_URL = "https://www.jobon.work"


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich")
    return current_user


# ── Schemas ─────────────────────────────────────────────────────────────────

class ContractTemplateResponse(BaseModel):
    id: int
    name: str
    original_filename: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SendContractRequest(BaseModel):
    template_id: int


# ── Admin: Vorlagen ───────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[ContractTemplateResponse])
def list_contract_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return (
        db.query(ContractTemplate)
        .filter(ContractTemplate.is_active == True)  # noqa: E712
        .order_by(ContractTemplate.created_at.desc())
        .all()
    )


@router.post("/templates", response_model=ContractTemplateResponse, status_code=201)
async def upload_contract_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Nur .docx-Vorlagen werden unterstützt")
    contents = await file.read()
    tmpl = ContractTemplate(name=name, original_filename=file.filename, file_content=contents)
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{template_id}", status_code=204)
def delete_contract_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    tmpl = db.query(ContractTemplate).filter(ContractTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    db.delete(tmpl)
    db.commit()


# ── Admin: Vertrag erzeugen & senden ──────────────────────────────────────────

@router.post("/job-requests/{request_id}")
def send_contract(
    request_id: int,
    data: SendContractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    job_request = db.query(JobRequest).filter(JobRequest.id == request_id).first()
    if not job_request:
        raise HTTPException(status_code=404, detail="IJP-Auftrag nicht gefunden")

    applicant = db.query(Applicant).filter(Applicant.id == job_request.applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerber nicht gefunden")

    tmpl = db.query(ContractTemplate).filter(ContractTemplate.id == data.template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Vertragsvorlage nicht gefunden")

    # Vorlage mit Bewerberdaten füllen und zu PDF konvertieren
    context = _applicant_context(applicant, db)
    try:
        filled_docx = _smart_fill_docx_bytes(tmpl.file_content, context)
        pdf_bytes = docx_to_pdf_bytes(filled_docx)
    except Exception as exc:
        logger.error(f"Vertrag konnte nicht erzeugt werden: {exc}")
        raise HTTPException(status_code=500, detail="Vertrag konnte nicht erzeugt werden (PDF-Konvertierung fehlgeschlagen)")

    applicant_name = f"{applicant.first_name or ''} {applicant.last_name or ''}".strip()
    safe_name = applicant_name.replace(" ", "_") or f"bewerber_{applicant.id}"
    filename = f"Vertrag_{safe_name}.pdf"

    contract = Contract(
        job_request_id=job_request.id,
        template_id=tmpl.id,
        generated_filename=filename,
        generated_content=pdf_bytes,
        status="sent",
        sent_at=datetime.utcnow(),
        sent_by_admin_id=current_user.id,
    )
    db.add(contract)

    # Status des Auftrags aktualisieren
    job_request.status = JobRequestStatus.CONTRACT_SENT
    job_request.contract_date = datetime.utcnow()
    db.commit()
    db.refresh(contract)

    # Bewerber benachrichtigen (in-app + E-Mail)
    user = db.query(User).filter(User.id == applicant.user_id).first()
    if user:
        try:
            db.add(Notification(
                user_id=user.id,
                type="contract",
                reference_id=contract.id,
                reference_type="contract",
                title="Vertrag unterschreiben",
                message="Ihr Vertrag liegt bereit. Bitte herunterladen, unterschreiben und wieder hochladen.",
                notification_key="notifications.contractToSign",
                notification_params=json.dumps({}),
            ))
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error(f"Vertrags-Notification fehlgeschlagen: {exc}")
        try:
            email_service.send_email(
                to_email=user.email,
                subject="Ihr Vertrag liegt bereit – bitte unterschreiben",
                html_content=f"""
                <html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width:600px;margin:0 auto;padding:20px;">
                    <h1 style="color:#2563eb;">Ihr Vertrag liegt bereit</h1>
                    <p>Hallo {applicant.first_name or ''},</p>
                    <p>Ihr Vertrag wurde erstellt. So geht es weiter:</p>
                    <ol style="background:#f3f4f6;padding:15px 15px 15px 35px;border-radius:8px;">
                        <li>Vertrag herunterladen</li>
                        <li>Ausdrucken und unterschreiben (oder digital signieren)</li>
                        <li>Unterschriebene Datei wieder hochladen</li>
                    </ol>
                    <p style="text-align:center;margin:30px 0;">
                        <a href="{FRONTEND_URL}/applicant/ijp-auftrag" style="background:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">Zum Vertrag</a>
                    </p>
                    <p>Mit freundlichen Grüßen,<br>Ihr IJP-Team</p>
                </div>
                </body></html>
                """,
                email_type="contract",
            )
        except Exception as exc:
            logger.error(f"Vertrags-E-Mail an Bewerber fehlgeschlagen: {exc}")

    return {"id": contract.id, "status": contract.status, "filename": filename}


@router.get("/job-requests/{request_id}")
def get_contract_for_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Neuesten Vertrag eines IJP-Auftrags (für die Admin-Detailansicht)."""
    contract = (
        db.query(Contract)
        .filter(Contract.job_request_id == request_id)
        .order_by(Contract.created_at.desc())
        .first()
    )
    if not contract:
        return {"contract": None}
    return {
        "contract": {
            "id": contract.id,
            "status": contract.status,
            "generated_filename": contract.generated_filename,
            "signed_filename": contract.signed_filename,
            "sent_at": contract.sent_at,
            "signed_at": contract.signed_at,
        }
    }


# ── Admin: Downloads ──────────────────────────────────────────────────────────

def _stream(content: bytes, filename: str) -> StreamingResponse:
    is_pdf = filename.lower().endswith(".pdf")
    if is_pdf:
        media_type = "application/pdf"
    else:
        import mimetypes
        media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{contract_id}/download/generated")
def admin_download_generated(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    return _stream(contract.generated_content, contract.generated_filename)


@router.get("/{contract_id}/download/signed")
def admin_download_signed(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or not contract.signed_content:
        raise HTTPException(status_code=404, detail="Keine unterschriebene Datei vorhanden")
    return _stream(contract.signed_content, contract.signed_filename or "unterschrieben.pdf")


# ── Bewerber ──────────────────────────────────────────────────────────────────

def _get_applicant(current_user: User, db: Session) -> Applicant:
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Bewerberprofil nicht gefunden")
    return applicant


@router.get("/my")
def my_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = _get_applicant(current_user, db)
    request_ids = [r.id for r in db.query(JobRequest.id).filter(JobRequest.applicant_id == applicant.id).all()]
    if not request_ids:
        return {"contracts": []}
    contracts = (
        db.query(Contract)
        .filter(Contract.job_request_id.in_(request_ids))
        .order_by(Contract.created_at.desc())
        .all()
    )
    return {
        "contracts": [
            {
                "id": c.id,
                "job_request_id": c.job_request_id,
                "status": c.status,
                "generated_filename": c.generated_filename,
                "signed_filename": c.signed_filename,
                "sent_at": c.sent_at,
                "signed_at": c.signed_at,
            }
            for c in contracts
        ]
    }


def _owns_contract(contract: Contract, applicant: Applicant, db: Session) -> bool:
    jr = db.query(JobRequest).filter(JobRequest.id == contract.job_request_id).first()
    return jr is not None and jr.applicant_id == applicant.id


@router.get("/{contract_id}/download")
def applicant_download(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = _get_applicant(current_user, db)
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or not _owns_contract(contract, applicant, db):
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    return _stream(contract.generated_content, contract.generated_filename)


@router.post("/{contract_id}/sign")
async def sign_contract(
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = _get_applicant(current_user, db)
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract or not _owns_contract(contract, applicant, db):
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")

    fname = (file.filename or "").lower()
    if not (fname.endswith(".pdf") or fname.endswith(".jpg") or fname.endswith(".jpeg") or fname.endswith(".png")):
        raise HTTPException(status_code=400, detail="Nur PDF, JPG oder PNG erlaubt")

    contract.signed_content = await file.read()
    contract.signed_filename = file.filename
    contract.status = "signed"
    contract.signed_at = datetime.utcnow()

    job_request = db.query(JobRequest).filter(JobRequest.id == contract.job_request_id).first()
    if job_request:
        job_request.status = JobRequestStatus.CONTRACT_SIGNED
    db.commit()

    # IJP (alle Admins) benachrichtigen – in-app + E-Mail
    applicant_name = f"{applicant.first_name or ''} {applicant.last_name or ''}".strip() or f"Bewerber #{applicant.id}"
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        try:
            db.add(Notification(
                user_id=admin.id,
                type="contract_signed",
                reference_id=contract.id,
                reference_type="contract",
                title="Vertrag unterzeichnet",
                message=f"{applicant_name} hat den Vertrag unterschrieben und hochgeladen.",
            ))
        except Exception as exc:
            logger.error(f"Admin-Notification fehlgeschlagen: {exc}")
    try:
        db.commit()
    except Exception:
        db.rollback()

    for admin in admins:
        try:
            email_service.send_email(
                to_email=admin.email,
                subject=f"✅ Vertrag unterzeichnet: {applicant_name}",
                html_content=f"""
                <html><body style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
                <div style="max-width:600px;margin:0 auto;padding:20px;">
                    <h1 style="color:#16a34a;">Vertrag unterzeichnet</h1>
                    <p><strong>{applicant_name}</strong> hat den Vertrag unterschrieben und hochgeladen.</p>
                    <p style="text-align:center;margin:30px 0;">
                        <a href="{FRONTEND_URL}/admin/job-requests" style="background:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">Im Admin-Bereich öffnen</a>
                    </p>
                </div>
                </body></html>
                """,
                email_type="contract_signed",
            )
        except Exception as exc:
            logger.error(f"Admin-E-Mail fehlgeschlagen: {exc}")

    return {"id": contract.id, "status": contract.status}
