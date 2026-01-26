from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Boolean, DateTime, Enum, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base
from app.models.applicant import PositionType


class RequiredLanguageLevel(str, enum.Enum):
    """Sprachanforderungen für Stellenangebote - detaillierte GER-Stufen"""
    NOT_REQUIRED = "not_required"  # Nicht erforderlich
    # Neue detaillierte Stufen
    A1 = "a1"                      # A1 - Grundkenntnisse
    A2 = "a2"                      # A2 - Grundkenntnisse
    B1 = "b1"                      # B1 - Gute Kenntnisse
    B2 = "b2"                      # B2 - Sehr gute Kenntnisse
    C1 = "c1"                      # C1 - Fließend
    C2 = "c2"                      # C2 - Fließend
    # Alte Werte für Rückwärtskompatibilität (bestehende Daten in DB)
    BASIC = "basic"                # Legacy: wird als A2 angezeigt
    GOOD = "good"                  # Legacy: wird als B1 angezeigt
    FLUENT = "fluent"              # Legacy: wird als C1 angezeigt


# Labels für die Sprachniveaus (für API-Responses)
LANGUAGE_LEVEL_LABELS = {
    RequiredLanguageLevel.NOT_REQUIRED: "Nicht erforderlich",
    RequiredLanguageLevel.A1: "A1 - Grundkenntnisse",
    RequiredLanguageLevel.A2: "A2 - Grundkenntnisse",
    RequiredLanguageLevel.B1: "B1 - Gute Kenntnisse",
    RequiredLanguageLevel.B2: "B2 - Sehr gute Kenntnisse",
    RequiredLanguageLevel.C1: "C1 - Fließend",
    RequiredLanguageLevel.C2: "C2 - Fließend",
    # Legacy-Werte (für bestehende Daten)
    RequiredLanguageLevel.BASIC: "A2 - Grundkenntnisse",
    RequiredLanguageLevel.GOOD: "B1 - Gute Kenntnisse",
    RequiredLanguageLevel.FLUENT: "C1 - Fließend",
}


class EmploymentType(str, enum.Enum):
    """Einstellungsart"""
    FULLTIME = "fulltime"
    PARTTIME = "parttime"
    BOTH = "both"  # Vollzeit und Teilzeit möglich


class JobPosting(Base):
    __tablename__ = "job_postings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Stelleninformationen
    title = Column(String(255), nullable=False)
    position_type = Column(Enum(PositionType), nullable=False)
    employment_type = Column(Enum(EmploymentType))  # NEU: Vollzeit/Teilzeit
    description = Column(Text, nullable=False)
    tasks = Column(Text)  # NEU: Aufgaben
    requirements = Column(Text)
    benefits = Column(Text)
    
    # Ort und Zeit
    location = Column(String(255))
    address = Column(String(255))  # NEU: Straße
    postal_code = Column(String(20))  # NEU: PLZ
    remote_possible = Column(Boolean, default=False)
    start_date = Column(Date)
    end_date = Column(Date)  # Optional, z.B. für Saisonjobs
    
    # Kontaktperson (NEU)
    contact_person = Column(String(255))  # Ansprechpartner
    contact_phone = Column(String(50))  # Telefon
    contact_email = Column(String(255))  # E-Mail
    
    # Vergütung (Float für Dezimalwerte wie 12,50€)
    salary_min = Column(Float)
    salary_max = Column(Float)
    salary_type = Column(String(50))  # "hourly", "monthly", "yearly"
    
    # ========== SPRACHANFORDERUNGEN ==========
    german_required = Column(Enum(RequiredLanguageLevel), default=RequiredLanguageLevel.NOT_REQUIRED)
    english_required = Column(Enum(RequiredLanguageLevel), default=RequiredLanguageLevel.NOT_REQUIRED)
    other_languages_required = Column(JSON, default=[])  # [{language: "Russisch", level: "basic"}, ...]
    
    # Zusätzliche Anforderungen (JSON für Flexibilität)
    additional_requirements = Column(JSON, default={})
    
    # Status
    is_active = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)  # Für archivierte Stellen (reaktivierbar)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Deadline (dynamisch aus Admin-Settings)
    deadline = Column(Date)  # Bewerbungsschluss
    archived_at = Column(DateTime)  # Wann archiviert
    
    # Relationships
    company = relationship("Company", back_populates="job_postings")
    applications = relationship("Application", back_populates="job_posting")
