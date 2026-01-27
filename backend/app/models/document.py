from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class DocumentType(str, enum.Enum):
    # Allgemeine Dokumente
    PASSPORT = "passport"                       # Reisepass
    CV = "cv"                                   # Lebenslauf
    PHOTO = "photo"                             # Bewerbungsfoto
    
    # Studentenferienjob-Dokumente
    ENROLLMENT_CERT = "enrollment_cert"         # Immatrikulationsbescheinigung Original
    ENROLLMENT_TRANSLATION = "enrollment_trans" # Immatrikulation mit Übersetzung
    BA_DECLARATION = "ba_declaration"           # Erklärung zur Immatrikulation (BA Dokument)
    
    # Sprachzertifikate
    LANGUAGE_CERT = "language_cert"             # Sprachzertifikat (Deutsch/Englisch)
    
    # Ausbildung/Fachkraft-Dokumente
    DIPLOMA = "diploma"                         # Studienzeugnis/Abschlusszeugnis
    SCHOOL_CERT = "school_cert"                 # Schulzeugnis
    WORK_REFERENCE = "work_reference"           # Arbeitszeugnis
    
    # Visum
    VISA = "visa"                               # Visum / Aufenthaltstitel
    
    # Sonstige
    OTHER = "other"                             # Sonstiges


# Dokumentenanforderungen je nach Positionstyp
DOCUMENT_REQUIREMENTS = {
    "studentenferienjob": {
        "required": [
            DocumentType.PASSPORT,
            DocumentType.ENROLLMENT_CERT,
            DocumentType.BA_DECLARATION,
        ],
        "optional": [
            DocumentType.CV,
            DocumentType.ENROLLMENT_TRANSLATION,
            DocumentType.PHOTO,
        ],
        "descriptions": {
            DocumentType.PASSPORT: "Gültiger Reisepass (alle Seiten mit Stempeln)",
            DocumentType.ENROLLMENT_CERT: "Immatrikulationsbescheinigung im Original",
            DocumentType.ENROLLMENT_TRANSLATION: "Beglaubigte deutsche oder englische Übersetzung der Immatrikulation",
            DocumentType.BA_DECLARATION: "Erklärung zur Immatrikulationsbescheinigung (Bundesagentur für Arbeit)",
            DocumentType.CV: "Lebenslauf (optional)",
            DocumentType.PHOTO: "Bewerbungsfoto (optional)",
        }
    },
    "ausbildung": {
        "required": [
            DocumentType.PASSPORT,
            DocumentType.LANGUAGE_CERT,
            DocumentType.CV,
        ],
        "optional": [
            DocumentType.SCHOOL_CERT,
            DocumentType.PHOTO,
        ],
        "descriptions": {
            DocumentType.PASSPORT: "Gültiger Reisepass (alle Seiten mit Stempeln)",
            DocumentType.LANGUAGE_CERT: "Sprachzertifikat (mindestens B1 Deutsch)",
            DocumentType.CV: "Tabellarischer Lebenslauf",
            DocumentType.SCHOOL_CERT: "Schulzeugnis (optional)",
            DocumentType.PHOTO: "Bewerbungsfoto (optional)",
        }
    },
    "fachkraft": {
        "required": [
            DocumentType.PASSPORT,
            DocumentType.CV,
            DocumentType.DIPLOMA,
        ],
        "optional": [
            DocumentType.LANGUAGE_CERT,
            DocumentType.WORK_REFERENCE,
            DocumentType.PHOTO,
        ],
        "descriptions": {
            DocumentType.PASSPORT: "Gültiger Reisepass (alle Seiten mit Stempeln)",
            DocumentType.CV: "Tabellarischer Lebenslauf",
            DocumentType.DIPLOMA: "Studienzeugnis / Berufsabschluss",
            DocumentType.LANGUAGE_CERT: "Sprachzertifikat (optional)",
            DocumentType.WORK_REFERENCE: "Arbeitszeugnisse (optional)",
            DocumentType.PHOTO: "Bewerbungsfoto (optional)",
        }
    },
    "saisonjob": {
        "required": [
            DocumentType.PASSPORT,
        ],
        "optional": [
            DocumentType.CV,
            DocumentType.WORK_REFERENCE,
            DocumentType.PHOTO,
        ],
        "descriptions": {
            DocumentType.PASSPORT: "Gültiger Reisepass (alle Seiten mit Stempeln)",
            DocumentType.CV: "Lebenslauf (optional)",
            DocumentType.WORK_REFERENCE: "Arbeitszeugnisse (optional)",
            DocumentType.PHOTO: "Bewerbungsfoto (optional)",
        }
    },
    "workandholiday": {
        "required": [
            DocumentType.PASSPORT,
            DocumentType.CV,
        ],
        "optional": [
            DocumentType.VISA,
            DocumentType.LANGUAGE_CERT,
            DocumentType.WORK_REFERENCE,
            DocumentType.PHOTO,
        ],
        "descriptions": {
            DocumentType.PASSPORT: "Gültiger Reisepass aus einem WHV-Partnerland (Argentinien, Chile, Australien, etc.)",
            DocumentType.CV: "Lebenslauf mit Foto",
            DocumentType.VISA: "Working Holiday Visum (falls bereits vorhanden)",
            DocumentType.LANGUAGE_CERT: "Deutschkenntnisse (optional, empfohlen)",
            DocumentType.WORK_REFERENCE: "Arbeitszeugnisse (optional)",
            DocumentType.PHOTO: "Bewerbungsfoto (optional)",
        }
    }
}


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)
    
    # Datei-Informationen
    document_type = Column(Enum(DocumentType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)  # in Bytes
    mime_type = Column(String(100))
    
    # Beschreibung und Status
    description = Column(String(500))
    is_verified = Column(Boolean, default=False)  # Von Admin geprüft?
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    applicant = relationship("Applicant", back_populates="documents")
