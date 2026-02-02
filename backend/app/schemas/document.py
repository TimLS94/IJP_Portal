from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.document import DocumentType


class DocumentBase(BaseModel):
    document_type: DocumentType
    description: Optional[str] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentResponse(BaseModel):
    id: int
    document_type: DocumentType
    file_name: str
    original_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    description: Optional[str] = None
    is_verified: bool = False
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class DocumentRequirement(BaseModel):
    document_type: str
    type_label: str
    is_required: bool
    description: str


class DocumentRequirementsResponse(BaseModel):
    position_type: str
    position_label: str
    documents: List[DocumentRequirement]


# Labels für Dokumenttypen (Deutsch)
DOCUMENT_TYPE_LABELS = {
    DocumentType.PASSPORT: "Reisepass",
    DocumentType.CV: "Lebenslauf",
    DocumentType.COVER_LETTER: "Anschreiben",
    DocumentType.PHOTO: "Bewerbungsfoto",
    DocumentType.ENROLLMENT_CERT: "Immatrikulationsbescheinigung (Original)",
    DocumentType.ENROLLMENT_TRANSLATION: "Immatrikulation (Übersetzung DE/EN)",
    DocumentType.BA_DECLARATION: "Erklärung zur Immatrikulation (BA)",
    DocumentType.LANGUAGE_CERT: "Sprachzertifikat",
    DocumentType.DIPLOMA: "Studienzeugnis/Abschluss",
    DocumentType.SCHOOL_CERT: "Schulzeugnis",
    DocumentType.WORK_REFERENCE: "Arbeitszeugnis",
    DocumentType.VISA: "Visum / Aufenthaltstitel",
    DocumentType.OTHER: "Sonstiges",
}

POSITION_TYPE_LABELS = {
    "studentenferienjob": "Studentenferienjob",
    "saisonjob": "Saisonjob",
    "workandholiday": "Work & Holiday",
    "fachkraft": "Fachkraft",
    "ausbildung": "Ausbildung",
}
