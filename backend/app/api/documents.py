from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.document import Document, DocumentType, DOCUMENT_REQUIREMENTS
from app.schemas.document import (
    DocumentResponse, 
    DocumentRequirementsResponse, 
    DocumentRequirement,
    DOCUMENT_TYPE_LABELS,
    POSITION_TYPE_LABELS
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Dokumente"])


@router.get("/requirements/{position_type}", response_model=DocumentRequirementsResponse)
async def get_document_requirements(position_type: str):
    """Gibt die Dokumentenanforderungen für einen Positionstyp zurück"""
    if position_type not in DOCUMENT_REQUIREMENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unbekannter Positionstyp: {position_type}"
        )
    
    requirements = DOCUMENT_REQUIREMENTS[position_type]
    documents = []
    
    # Pflichtdokumente
    for doc_type in requirements["required"]:
        documents.append(DocumentRequirement(
            document_type=doc_type.value,
            type_label=DOCUMENT_TYPE_LABELS.get(doc_type, doc_type.value),
            is_required=True,
            description=requirements["descriptions"].get(doc_type, "")
        ))
    
    # Optionale Dokumente
    for doc_type in requirements["optional"]:
        documents.append(DocumentRequirement(
            document_type=doc_type.value,
            type_label=DOCUMENT_TYPE_LABELS.get(doc_type, doc_type.value),
            is_required=False,
            description=requirements["descriptions"].get(doc_type, "")
        ))
    
    return DocumentRequirementsResponse(
        position_type=position_type,
        position_label=POSITION_TYPE_LABELS.get(position_type, position_type),
        documents=documents
    )


@router.get("/requirements", response_model=List[DocumentRequirementsResponse])
async def get_all_document_requirements():
    """Gibt alle Dokumentenanforderungen für alle Positionstypen zurück"""
    all_requirements = []
    
    for position_type in DOCUMENT_REQUIREMENTS.keys():
        requirements = DOCUMENT_REQUIREMENTS[position_type]
        documents = []
        
        for doc_type in requirements["required"]:
            documents.append(DocumentRequirement(
                document_type=doc_type.value,
                type_label=DOCUMENT_TYPE_LABELS.get(doc_type, doc_type.value),
                is_required=True,
                description=requirements["descriptions"].get(doc_type, "")
            ))
        
        for doc_type in requirements["optional"]:
            documents.append(DocumentRequirement(
                document_type=doc_type.value,
                type_label=DOCUMENT_TYPE_LABELS.get(doc_type, doc_type.value),
                is_required=False,
                description=requirements["descriptions"].get(doc_type, "")
            ))
        
        all_requirements.append(DocumentRequirementsResponse(
            position_type=position_type,
            position_label=POSITION_TYPE_LABELS.get(position_type, position_type),
            documents=documents
        ))
    
    return all_requirements


@router.post("")
async def upload_document(
    document_type: DocumentType = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lädt ein Dokument hoch"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können Dokumente hochladen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitte erstellen Sie zuerst Ihr Bewerber-Profil"
        )
    
    document = await DocumentService.save_file(
        file=file,
        applicant_id=applicant.id,
        document_type=document_type,
        description=description or "",
        db=db
    )
    
    return {
        "id": document.id,
        "document_type": document.document_type.value,
        "type_label": DOCUMENT_TYPE_LABELS.get(document.document_type, document.document_type.value),
        "file_name": document.original_name,
        "file_size": document.file_size,
        "is_verified": document.is_verified,
        "uploaded_at": document.uploaded_at
    }


@router.get("")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listet alle Dokumente des Bewerbers"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return []
    
    documents = DocumentService.get_documents_by_applicant(applicant.id, db)
    
    return [
        {
            "id": doc.id,
            "document_type": doc.document_type.value,
            "type_label": DOCUMENT_TYPE_LABELS.get(doc.document_type, doc.document_type.value),
            "file_name": doc.original_name,
            "file_size": doc.file_size,
            "description": doc.description,
            "is_verified": doc.is_verified,
            "uploaded_at": doc.uploaded_at
        }
        for doc in documents
    ]


@router.get("/status")
async def get_document_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt den Status der hochgeladenen Dokumente zurück (für den aktuellen Positionstyp)"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return {"message": "Kein Profil vorhanden", "complete": False}
    
    if not applicant.position_type:
        return {"message": "Kein Positionstyp gewählt", "complete": False}
    
    position_type = applicant.position_type.value
    if position_type not in DOCUMENT_REQUIREMENTS:
        return {"message": "Unbekannter Positionstyp", "complete": False}
    
    requirements = DOCUMENT_REQUIREMENTS[position_type]
    uploaded_docs = DocumentService.get_documents_by_applicant(applicant.id, db)
    uploaded_types = {doc.document_type for doc in uploaded_docs}
    
    required_docs = requirements["required"]
    missing_required = [
        {
            "document_type": doc_type.value,
            "type_label": DOCUMENT_TYPE_LABELS.get(doc_type, doc_type.value),
            "description": requirements["descriptions"].get(doc_type, "")
        }
        for doc_type in required_docs if doc_type not in uploaded_types
    ]
    
    return {
        "position_type": position_type,
        "position_label": POSITION_TYPE_LABELS.get(position_type, position_type),
        "total_required": len(required_docs),
        "uploaded_required": len(required_docs) - len(missing_required),
        "missing_required": missing_required,
        "complete": len(missing_required) == 0
    }


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lädt ein Dokument herunter"""
    from app.models.company import Company
    from app.models.application import Application
    from app.models.job_posting import JobPosting
    
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )
    
    # Prüfen ob Benutzer berechtigt ist
    if current_user.role == UserRole.APPLICANT:
        # Bewerber darf nur eigene Dokumente herunterladen
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        if not applicant or document.applicant_id != applicant.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Keine Berechtigung"
            )
    elif current_user.role == UserRole.COMPANY:
        # Firma darf Dokumente herunterladen, wenn sie eine Bewerbung von diesem Bewerber hat
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company:
            raise HTTPException(status_code=403, detail="Firmenprofil nicht gefunden")
        
        # Prüfe ob es eine Bewerbung gibt, die zu dieser Firma gehört
        has_application = db.query(Application).join(JobPosting).filter(
            Application.applicant_id == document.applicant_id,
            JobPosting.company_id == company.id
        ).first()
        
        if not has_application:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Keine Berechtigung - Bewerber hat sich nicht bei Ihrer Firma beworben"
            )
    elif current_user.role != UserRole.ADMIN:
        # Nur Admins haben sonst Zugriff
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Keine Berechtigung"
        )
    
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datei nicht gefunden"
        )
    
    return FileResponse(
        path=document.file_path,
        filename=document.original_name,
        media_type=document.mime_type
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht ein Dokument"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können Dokumente löschen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.applicant_id == applicant.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )
    
    DocumentService.delete_file(document, db)
    
    return {"message": "Dokument gelöscht"}
