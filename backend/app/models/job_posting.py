from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Boolean, DateTime, Enum, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base
from app.models.applicant import PositionType


class RequiredLanguageLevel(str, enum.Enum):
    """Sprachanforderungen für Stellenangebote - vereinfachte Stufen"""
    NOT_REQUIRED = "not_required"      # Nicht erforderlich
    BASIC = "basic"                    # Grundkenntnisse (A1-A2)
    GOOD = "good"                      # Gute Kenntnisse (B1-B2)
    FLUENT = "fluent"                  # Fließend (C1-C2)


# Labels für die Sprachniveaus (für API-Responses)
LANGUAGE_LEVEL_LABELS = {
    RequiredLanguageLevel.NOT_REQUIRED: "Nicht erforderlich",
    RequiredLanguageLevel.BASIC: "Grundkenntnisse (A1-A2)",
    RequiredLanguageLevel.GOOD: "Gute Kenntnisse (B1-B2)",
    RequiredLanguageLevel.FLUENT: "Fließend (C1-C2)",
}


class JobPosting(Base):
    __tablename__ = "job_postings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Stelleninformationen
    title = Column(String(255), nullable=False)
    position_type = Column(Enum(PositionType), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text)
    benefits = Column(Text)
    
    # Ort und Zeit
    location = Column(String(255))
    remote_possible = Column(Boolean, default=False)
    start_date = Column(Date)
    end_date = Column(Date)  # Optional, z.B. für Saisonjobs
    
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="job_postings")
    applications = relationship("Application", back_populates="job_posting")
