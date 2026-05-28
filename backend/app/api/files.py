"""
Files API - Stellt hochgeladene Dateien bereit (Logos, etc.)
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import os

from app.services.storage_service import storage_service
from app.core.config import settings

router = APIRouter(prefix="/files", tags=["Dateien"])


@router.get("/{file_path:path}")
async def get_file(file_path: str):
    """
    Liefert eine Datei aus dem Storage.
    Wird für lokalen Storage verwendet, R2 hat eigene Public URLs.
    """
    # Sicherheitscheck: Keine Pfad-Traversal erlauben
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Ungültiger Dateipfad")
    
    # Datei herunterladen
    success, content, error = await storage_service.download_file(file_path)
    
    if not success or content is None:
        # Versuche lokalen Pfad
        local_path = os.path.join(settings.UPLOAD_DIR, file_path)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                content = f.read()
        else:
            raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    
    # Content-Type bestimmen
    content_type = "application/octet-stream"
    ext = os.path.splitext(file_path)[1].lower()
    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".pdf": "application/pdf",
    }
    content_type = content_types.get(ext, content_type)
    
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000",  # 1 Jahr Cache
        }
    )
