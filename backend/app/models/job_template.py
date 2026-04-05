from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import utc_now
from app.core.database import Base


class JobTemplate(Base):
    """Vorlage für Stellenanzeigen - Firmen können Templates erstellen und wiederverwenden"""
    __tablename__ = "job_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Template-Name (für die Übersicht)
    name = Column(String(255), nullable=False)
    
    # Stelleninformationen (wie bei JobPosting)
    title = Column(String(255))
    position_type = Column(String(50))
    position_types = Column(JSON, default=[])
    employment_type = Column(String(50))
    description = Column(Text)
    tasks = Column(Text)
    requirements = Column(Text)
    benefits = Column(Text)
    
    # Ort
    location = Column(String(255))
    address = Column(String(255))
    postal_code = Column(String(20))
    remote_possible = Column(Boolean, default=False)
    accommodation_provided = Column(Boolean, default=False)
    
    # Kontaktperson
    contact_person = Column(String(255))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    
    # Vergütung
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    salary_type = Column(String(50))
    
    # Sprachanforderungen
    german_required = Column(String(50))
    english_required = Column(String(50))
    other_languages_required = Column(JSON, default=[])
    
    # Zusätzliche Anforderungen
    additional_requirements = Column(JSON, default={})
    
    # Mehrsprachige Inhalte
    translations = Column(JSON, default={})
    available_languages = Column(JSON, default=["de"])
    
    # Metadaten
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationship
    company = relationship("Company", backref="job_templates")
