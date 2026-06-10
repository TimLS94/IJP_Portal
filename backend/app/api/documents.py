from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.core.database import get_db
from app.core.security import get_current_user, decode_token
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType
from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.document import Document, DocumentType, DOCUMENT_REQUIREMENTS
from app.schemas.document import (
    DocumentResponse, 
    DocumentRequirementsResponse, 
    DocumentRequirement,
    DOCUMENT_TYPE_LABELS,
    POSITION_TYPE_LABELS
)
from app.services.document_service import DocumentService
from app.services.storage_service import storage_service

router = APIRouter(prefix="/documents", tags=["Dokumente"])


def get_company_for_user(user: User, db: Session) -> Company:
    """Holt die Firma für einen User - funktioniert für Owner UND Teammitglieder"""
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if company:
        return company
    membership = db.query(CompanyMember).filter(
        CompanyMember.user_id == user.id,
        CompanyMember.is_active == True
    ).first()
    if membership:
        return membership.company
    return None


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
    
    # Bytes lesen bevor wir an DocumentService weitergeben (für CV-Parsing)
    file_bytes = await file.read()
    await file.seek(0)

    document = await DocumentService.save_file(
        file=file,
        applicant_id=applicant.id,
        document_type=document_type,
        description=description or "",
        db=db
    )

    # CV hochgeladen → leere Profilfelder automatisch aus CV befüllen
    if document_type == DocumentType.CV:
        try:
            await _enrich_profile_from_cv(applicant, file_bytes, db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"CV auto-enrich failed for applicant {applicant.id}: {e}")

    return {
        "id": document.id,
        "document_type": document.document_type.value,
        "type_label": DOCUMENT_TYPE_LABELS.get(document.document_type, document.document_type.value),
        "file_name": document.original_name,
        "file_size": document.file_size,
        "is_verified": document.is_verified,
        "uploaded_at": document.uploaded_at
    }


async def _enrich_profile_from_cv(applicant: Applicant, file_bytes: bytes, db: Session) -> None:
    """
    Parst das hochgeladene CV und befüllt NUR leere Profilfelder.
    Vorhandene Daten werden NIEMALS überschrieben.
    """
    from app.services.cv_parser_service import parse_cv
    from app.core.config import settings

    cv_data = await parse_cv(
        pdf_bytes=file_bytes,
        openai_key=getattr(settings, "OPENAI_API_KEY", ""),
        gemini_key=getattr(settings, "GOOGLE_API_KEY", ""),
    )
    if not cv_data:
        return

    changed = False

    # Erfahrungsjahre nur setzen wenn leer
    if not applicant.work_experience_years and cv_data.get("work_experience_years"):
        applicant.work_experience_years = int(cv_data["work_experience_years"])
        changed = True

    # Strukturierte Berufserfahrungen nur setzen wenn leer
    if not applicant.work_experiences and cv_data.get("work_experiences"):
        applicant.work_experiences = cv_data["work_experiences"]
        changed = True

    # Textbeschreibung der Erfahrung nur setzen wenn leer
    if not applicant.work_experience and cv_data.get("work_experiences"):
        exps = cv_data["work_experiences"]
        if isinstance(exps, list):
            lines = [
                f"{e.get('position', '')} bei {e.get('company', '')} ({e.get('start_date', '')}–{e.get('end_date') or 'heute'})"
                for e in exps if e.get("position") or e.get("company")
            ]
            if lines:
                applicant.work_experience = "\n".join(lines)
                changed = True

    # Sprachkenntnisse nur setzen wenn leer
    if not applicant.german_level and cv_data.get("german_level"):
        try:
            from app.models.applicant import LanguageLevel
            applicant.german_level = LanguageLevel(cv_data["german_level"])
            changed = True
        except Exception:
            pass

    if not applicant.english_level and cv_data.get("english_level"):
        try:
            from app.models.applicant import LanguageLevel
            applicant.english_level = LanguageLevel(cv_data["english_level"])
            changed = True
        except Exception:
            pass

    if changed:
        db.commit()


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


async def get_user_from_token_or_query(
    token: Optional[str] = Query(None, description="Auth token for direct download links"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Versucht User aus Query-Token zu holen"""
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    request: Request,
    token: Optional[str] = Query(None, description="Auth token for direct download links"),
    db: Session = Depends(get_db)
):
    """Lädt ein Dokument herunter. Token aus Query-Parameter (direkte Links)
    ODER aus dem Authorization-Header (axios/fetch Aufrufe)."""
    current_user = None

    # Token aus Query-Parameter oder Authorization-Header
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:]

    if token:
        payload = decode_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == int(user_id)).first()

    if not current_user:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    
    from app.models.company import Company
    from app.models.application import Application
    from app.models.job_posting import JobPosting
    from fastapi.responses import Response
    
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
        company = get_company_for_user(current_user, db)
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
    
    import logging as _logging, traceback as _traceback
    _log = _logging.getLogger(__name__)
    try:
        # Datei über DocumentService laden (unterstützt R2 und lokal)
        file_content = await DocumentService.get_file_content(document)

        # Fallback: Datei liegt evtl. unter einem anderen Schlüssel im Bewerber-Ordner
        # (z.B. veralteter file_path aus der Übergangszeit). Wir suchen sie und heilen den Pfad.
        if file_content is None and document.applicant_id:
            _log.warning(f"Dokument {document.id}: file_path '{document.file_path}' nicht gefunden – versuche Fallback.")

            base = os.path.basename(document.file_path or "")
            folder = f"documents/{document.applicant_id}/"
            keys = storage_service.list_keys(folder)
            _log.warning(f"Dokument {document.id}: {len(keys)} Datei(en) im R2-Ordner {folder}: {keys}")

            candidates = []
            if base:
                candidates.append(f"{folder}{base}")
                candidates += [k for k in keys if os.path.basename(k) == base]
            if len(keys) == 1:
                candidates.append(keys[0])

            seen = set()
            for key in candidates:
                if not key or key in seen:
                    continue
                seen.add(key)
                ok, content, _ = await storage_service.download_file(key)
                if ok and content:
                    file_content = content
                    try:
                        document.file_path = key
                        db.commit()
                        _log.info(f"Dokument {document.id}: Pfad geheilt -> '{key}'")
                    except Exception:
                        db.rollback()
                    break

        if file_content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Datei nicht gefunden"
            )

        # Dateiname header-sicher machen (HTTP-Header sind latin-1; Umlaute/Akzente raus)
        download_name = _friendly_filename(document, db)
        safe_name = download_name.encode("ascii", "ignore").decode("ascii") or "dokument.pdf"

        return Response(
            content=file_content,
            media_type=document.mime_type or 'application/pdf',
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        _log.error(f"Download-Fehler Dokument {document_id}: {e}\n{_traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Download fehlgeschlagen: {e}")


def _friendly_filename(document, db: Session) -> str:
    """Baut einen sauberen Download-Namen: Vorname_Nachname_Dokumenttyp.ext
    (ASCII-sicher, fällt auf den Originalnamen zurück)."""
    import os as _os
    import re as _re
    import unicodedata as _ud
    from app.models.applicant import Applicant

    type_labels = {
        "cv": "Lebenslauf", "passport": "Reisepass", "photo": "Foto",
        "enrollment_cert": "Immatrikulation", "enrollment_trans": "Immatrikulation_Uebersetzung",
        "ba_declaration": "BA_Erklaerung", "language_cert": "Sprachzertifikat",
        "diploma": "Abschlusszeugnis", "school_cert": "Schulzeugnis",
        "work_reference": "Arbeitszeugnis", "visa": "Visum",
        "cover_letter": "Anschreiben", "other": "Dokument",
    }

    def _clean(s: str) -> str:
        if not s:
            return ""
        ascii_s = _ud.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
        return _re.sub(r"[^A-Za-z0-9]+", "_", ascii_s).strip("_")

    ext = _os.path.splitext(document.original_name or "")[1] or ".pdf"
    dtype = document.document_type.value if hasattr(document.document_type, "value") else str(document.document_type)
    label = type_labels.get(dtype, "Dokument")

    applicant = db.query(Applicant).filter(Applicant.id == document.applicant_id).first()
    parts = []
    if applicant:
        parts.append(_clean(applicant.first_name))
        parts.append(_clean(applicant.last_name))
    parts.append(_clean(label))
    parts = [p for p in parts if p]

    return ("_".join(parts) + ext) if parts else (document.original_name or f"dokument{ext}")


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
    
    await DocumentService.delete_file(document, db)
    
    return {"message": "Dokument gelöscht"}
