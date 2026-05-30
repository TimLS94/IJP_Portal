"""
Files API - Stellt hochgeladene Dateien bereit (Logos, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
import os
from pathlib import Path

from app.services.storage_service import storage_service
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/files", tags=["Dateien"])

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
    current_user: User = Depends(get_current_user),
):
    """
    Liefert eine Datei aus dem Storage.
    Nur für authentifizierte Benutzer zugänglich.
    """
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
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )
