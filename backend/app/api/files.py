"""
Files API - Stellt hochgeladene Dateien bereit (Logos, etc.)
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import os
from pathlib import Path

from app.services.storage_service import storage_service
from app.core.config import settings
from app.core.security import get_active_user_from_token
from app.core.database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter(prefix="/files", tags=["Dateien"])

# Prefixe, die öffentlich (ohne Login) abrufbar sind – z.B. Firmenlogos,
# die ohnehin auf öffentlichen Stellenanzeigen erscheinen.
_PUBLIC_PREFIXES = ("company-logos/",)

# Erlaubte Dateierweiterungen und ihre Content-Types
_CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
}


def _safe_resolve(file_path: str) -> Path:
    """
    Löst den Dateipfad sicher auf und stellt sicher dass er im UPLOAD_DIR liegt.
    Verhindert Path Traversal auch mit URL-encodierten Sequenzen.
    """
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    # Path.resolve() normalisiert ../ und URL-dekodierte Varianten
    resolved = (upload_dir / file_path).resolve()
    if not str(resolved).startswith(str(upload_dir) + os.sep) and resolved != upload_dir:
        raise HTTPException(status_code=400, detail="Ungültiger Dateipfad")
    return resolved


def _may_access_document(user, file_path: str, db: Session) -> bool:
    """Ownership-Check für Dokument-Dateien: Bewerber nur eigene, Firma nur bei
    vorhandener Bewerbung auf eine eigene Stelle, Admin alles."""
    from app.models.user import UserRole
    from app.models.document import Document
    from app.models.applicant import Applicant
    from app.models.company import Company
    from app.models.application import Application
    from app.models.job_posting import JobPosting

    if user.role == UserRole.ADMIN:
        return True

    document = db.query(Document).filter(Document.file_path == file_path).first()
    if not document:
        # Unbekannter documents/-Pfad: kein Zugriff (nichts durchreichen).
        return False

    if user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
        return bool(applicant and document.applicant_id == applicant.id)

    if user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user.id).first()
        if not company:
            return False
        has_application = db.query(Application).join(
            JobPosting, Application.job_posting_id == JobPosting.id
        ).filter(
            Application.applicant_id == document.applicant_id,
            JobPosting.company_id == company.id
        ).first()
        return bool(has_application)

    return False


@router.get("/{file_path:path}")
async def get_file(
    file_path: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Liefert eine Datei aus dem Storage.
    Öffentliche Prefixe (z.B. Firmenlogos) sind ohne Login abrufbar,
    Dokumente (Pässe, CVs) nur für berechtigte Nutzer (Eigentümer/verknüpfte Firma/Admin).
    """
    is_public = file_path.startswith(_PUBLIC_PREFIXES)

    if not is_public:
        # Auth manuell prüfen (img-Tags senden keinen Bearer-Token, daher kein Depends).
        # SICHERHEIT: gültiger UND aktiver Nutzer (kein betrieb_portal-Scope, nicht deaktiviert).
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.lower().startswith("bearer ") else None
        if not token:
            token = request.query_params.get("token")
        user = get_active_user_from_token(token, db)
        if not user:
            raise HTTPException(status_code=401, detail="Nicht autorisiert")

        # SICHERHEIT: Dokument-Dateien nur für Berechtigte (kein Zugriff über fremde Pfade).
        if file_path.startswith("documents/") and not _may_access_document(user, file_path, db):
            raise HTTPException(status_code=403, detail="Keine Berechtigung")

    # Datei herunterladen (R2 / S3 Storage)
    success, content, error = await storage_service.download_file(file_path)

    if not success or content is None:
        # Fallback: lokales Filesystem mit sicherer Pfad-Auflösung
        local_path = _safe_resolve(file_path)
        if local_path.exists():
            content = local_path.read_bytes()
        else:
            raise HTTPException(status_code=404, detail="Datei nicht gefunden")

    ext = os.path.splitext(file_path)[1].lower()
    content_type = _CONTENT_TYPES.get(ext, "application/octet-stream")

    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": ("public, max-age=86400" if is_public else "private, max-age=3600"),
            "X-Content-Type-Options": "nosniff",
        },
    )
