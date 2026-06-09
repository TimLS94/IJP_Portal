"""
Files API - Stellt hochgeladene Dateien bereit (Logos, etc.)
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import os
from pathlib import Path

from app.services.storage_service import storage_service
from app.core.config import settings
from app.core.security import decode_token

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


@router.get("/{file_path:path}")
async def get_file(
    file_path: str,
    request: Request,
):
    """
    Liefert eine Datei aus dem Storage.
    Öffentliche Prefixe (z.B. Firmenlogos) sind ohne Login abrufbar,
    alle anderen Dateien (Dokumente, Pässe, CVs) nur für eingeloggte Nutzer.
    """
    is_public = file_path.startswith(_PUBLIC_PREFIXES)

    if not is_public:
        # Auth manuell prüfen (img-Tags senden keinen Bearer-Token,
        # daher kein Depends – aber geschützte Dateien brauchen einen gültigen Token)
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.lower().startswith("bearer ") else None
        if not token or not decode_token(token):
            raise HTTPException(status_code=401, detail="Nicht autorisiert")

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
