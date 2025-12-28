"""
Document Service - Verarbeitet Dokument-Uploads

Verwendet StorageService für persistenten Cloud-Storage (Cloudflare R2)
oder lokales Filesystem als Fallback.
"""
import os
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.config import settings
from app.models.document import Document, DocumentType
from app.services.storage_service import storage_service


class DocumentService:
    # PDF Magic Bytes (erste Bytes einer echten PDF-Datei)
    PDF_MAGIC_BYTES = b'%PDF'
    
    # Erlaubte MIME-Types für PDF
    ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/x-pdf',
        'application/octet-stream'  # Manchmal von Browsern gesendet
    ]
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Extrahiert die Dateiendung"""
        return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    @staticmethod
    def is_allowed_file(filename: str) -> bool:
        """Prüft ob die Dateiendung erlaubt ist"""
        ext = DocumentService.get_file_extension(filename)
        return ext in settings.allowed_extensions_list
    
    @staticmethod
    def is_valid_pdf(file_content: bytes) -> bool:
        """
        Prüft ob die Datei wirklich eine PDF ist (Magic Bytes Check).
        Dies verhindert, dass umbenannte Dateien hochgeladen werden.
        """
        if len(file_content) < 4:
            return False
        return file_content[:4] == DocumentService.PDF_MAGIC_BYTES
    
    @staticmethod
    async def save_file(
        file: UploadFile,
        applicant_id: int,
        document_type: DocumentType,
        description: str,
        db: Session
    ) -> Document:
        """Speichert eine Datei und erstellt einen Datenbank-Eintrag"""
        
        # 1. Dateiendung prüfen
        if not DocumentService.is_allowed_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail="Nur PDF-Dateien sind erlaubt. Bitte laden Sie eine PDF-Datei hoch."
            )
        
        # 2. MIME-Type prüfen (erste Verteidigungslinie)
        if file.content_type and file.content_type not in DocumentService.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Nur PDF-Dateien sind erlaubt. Die hochgeladene Datei ist keine gültige PDF."
            )
        
        # 3. Datei einlesen
        file_content = await file.read()
        
        # 4. Dateigröße prüfen
        if len(file_content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Datei zu groß. Maximum: {settings.MAX_FILE_SIZE / 1024 / 1024} MB"
            )
        
        # 5. PDF Magic Bytes prüfen (echte PDF-Validierung)
        if not DocumentService.is_valid_pdf(file_content):
            raise HTTPException(
                status_code=400,
                detail="Die Datei ist keine gültige PDF. Bitte stellen Sie sicher, dass Sie eine echte PDF-Datei hochladen."
            )
        
        # Eindeutigen Dateinamen generieren
        ext = DocumentService.get_file_extension(file.filename)
        unique_filename = f"{uuid.uuid4()}.{ext}"
        
        # Datei über StorageService speichern (R2 oder lokal)
        success, file_path, error = await storage_service.upload_file(
            file_content=file_content,
            applicant_id=applicant_id,
            filename=unique_filename,
            content_type=file.content_type or 'application/pdf'
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Fehler beim Speichern der Datei: {error}"
            )
        
        # Datenbank-Eintrag erstellen
        document = Document(
            applicant_id=applicant_id,
            document_type=document_type,
            file_name=unique_filename,
            original_name=file.filename,
            file_path=file_path,  # Bei R2: Key, bei lokal: Pfad
            file_size=len(file_content),
            mime_type=file.content_type,
            description=description
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return document
    
    @staticmethod
    async def get_file_content(document: Document) -> Optional[bytes]:
        """Holt den Inhalt einer Datei"""
        success, content, error = await storage_service.download_file(document.file_path)
        if success:
            return content
        return None
    
    @staticmethod
    async def delete_file(document: Document, db: Session) -> bool:
        """Löscht eine Datei und den Datenbank-Eintrag"""
        
        # Datei über StorageService löschen
        await storage_service.delete_file(document.file_path)
        
        # Datenbank-Eintrag löschen
        db.delete(document)
        db.commit()
        
        return True
    
    @staticmethod
    def delete_file_sync(document: Document, db: Session) -> bool:
        """Synchrone Version für Kompatibilität"""
        import asyncio
        return asyncio.run(DocumentService.delete_file(document, db))
    
    @staticmethod
    def get_documents_by_applicant(applicant_id: int, db: Session) -> List[Document]:
        """Holt alle Dokumente eines Bewerbers"""
        return db.query(Document).filter(Document.applicant_id == applicant_id).all()
