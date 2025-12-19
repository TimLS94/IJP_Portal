import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.config import settings
from app.models.document import Document, DocumentType
from app.models.applicant import Applicant


class DocumentService:
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Extrahiert die Dateiendung"""
        return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    @staticmethod
    def is_allowed_file(filename: str) -> bool:
        """Prüft ob die Dateiendung erlaubt ist"""
        ext = DocumentService.get_file_extension(filename)
        return ext in settings.ALLOWED_EXTENSIONS
    
    @staticmethod
    async def save_file(
        file: UploadFile,
        applicant_id: int,
        document_type: DocumentType,
        description: str,
        db: Session
    ) -> Document:
        """Speichert eine Datei und erstellt einen Datenbank-Eintrag"""
        
        # Dateiendung prüfen
        if not DocumentService.is_allowed_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Dateityp nicht erlaubt. Erlaubt: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Dateigröße prüfen
        file_content = await file.read()
        if len(file_content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Datei zu groß. Maximum: {settings.MAX_FILE_SIZE / 1024 / 1024} MB"
            )
        
        # Eindeutigen Dateinamen generieren
        ext = DocumentService.get_file_extension(file.filename)
        unique_filename = f"{uuid.uuid4()}.{ext}"
        
        # Verzeichnis für Bewerber erstellen
        applicant_dir = os.path.join(settings.UPLOAD_DIR, str(applicant_id))
        os.makedirs(applicant_dir, exist_ok=True)
        
        # Dateipfad
        file_path = os.path.join(applicant_dir, unique_filename)
        
        # Datei speichern
        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(file_content)
        
        # Datenbank-Eintrag erstellen
        document = Document(
            applicant_id=applicant_id,
            document_type=document_type,
            file_name=unique_filename,
            original_name=file.filename,
            file_path=file_path,
            file_size=len(file_content),
            mime_type=file.content_type,
            description=description
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return document
    
    @staticmethod
    def delete_file(document: Document, db: Session) -> bool:
        """Löscht eine Datei und den Datenbank-Eintrag"""
        
        # Datei vom Filesystem löschen
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        # Datenbank-Eintrag löschen
        db.delete(document)
        db.commit()
        
        return True
    
    @staticmethod
    def get_documents_by_applicant(applicant_id: int, db: Session) -> List[Document]:
        """Holt alle Dokumente eines Bewerbers"""
        return db.query(Document).filter(Document.applicant_id == applicant_id).all()
