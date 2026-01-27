from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, JSON, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class PositionType(str, enum.Enum):
    STUDENTENFERIENJOB = "studentenferienjob"
    SAISONJOB = "saisonjob"
    WORK_AND_HOLIDAY = "workandholiday"  # Working Holiday Visum (Südamerika)
    FACHKRAFT = "fachkraft"
    AUSBILDUNG = "ausbildung"


class Gender(str, enum.Enum):
    """Geschlecht"""
    MALE = "male"
    FEMALE = "female"
    DIVERSE = "diverse"


class LanguageLevel(str, enum.Enum):
    NONE = "none"
    A1 = "a1"
    A2 = "a2"
    B1 = "b1"
    B2 = "b2"
    C1 = "c1"
    C2 = "c2"
    NATIVE = "native"


class Applicant(Base):
    __tablename__ = "applicants"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # ========== ALLGEMEINE PERSONENDATEN (für alle) ==========
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gender = Column(Enum(Gender, values_callable=lambda x: [e.value for e in x]))  # Geschlecht (m/w/d)
    date_of_birth = Column(Date)
    place_of_birth = Column(String(100))  # Geburtsort
    nationality = Column(String(100))
    
    # Datenschutz
    privacy_accepted = Column(Boolean, default=False)  # Datenschutzerklärung akzeptiert
    privacy_accepted_at = Column(Date)  # Wann akzeptiert
    
    # Kontaktdaten
    phone = Column(String(50))
    
    # Adresse (Heimatadresse)
    street = Column(String(255))
    house_number = Column(String(20))
    postal_code = Column(String(20))
    city = Column(String(100))
    country = Column(String(100))
    
    # ========== QUALIFIKATIONEN (für alle) ==========
    # Berufserfahrung (Legacy: Freitext)
    work_experience = Column(Text)  # Textbeschreibung der Berufserfahrung
    work_experience_years = Column(Integer, default=0)  # Jahre Berufserfahrung
    
    # Berufserfahrung (NEU: Strukturierte Liste)
    # Format: [{company, position, start_date, end_date, description, location}, ...]
    work_experiences = Column(JSON, default=[])
    
    # Sprachkenntnisse
    german_level = Column(Enum(LanguageLevel, values_callable=lambda x: [e.value for e in x]), default=LanguageLevel.NONE)
    english_level = Column(Enum(LanguageLevel, values_callable=lambda x: [e.value for e in x]), default=LanguageLevel.NONE)
    other_languages = Column(JSON, default=[])  # [{language: "Russisch", level: "B2"}, ...]
    
    # Deutschland-Erfahrung
    been_to_germany = Column(Boolean, default=False)
    germany_details = Column(Text)  # Wann, wie lange, warum
    
    # ========== POSITIONSTYP ==========
    position_type = Column(Enum(PositionType, values_callable=lambda x: [e.value for e in x]))  # Legacy: Einzelauswahl
    position_types = Column(JSON, default=[])   # NEU: Mehrfachauswahl als Liste ["studentenferienjob", "fachkraft"]
    
    # ========== STUDENTENFERIENJOB-SPEZIFISCH ==========
    # Universität
    university_name = Column(String(255))
    university_street = Column(String(255))
    university_house_number = Column(String(20))
    university_postal_code = Column(String(20))
    university_city = Column(String(100))
    university_country = Column(String(100))
    
    # Studium
    field_of_study = Column(String(255))  # Studienfach
    current_semester = Column(Integer)  # Fachsemester
    
    # Semesterferien
    semester_break_start = Column(Date)
    semester_break_end = Column(Date)
    continue_studying = Column(Boolean)  # Nach Semesterferien weiter studieren?
    
    # ========== AUSBILDUNG-SPEZIFISCH ==========
    desired_profession = Column(String(255))  # Gewünschter Ausbildungsberuf
    school_degree = Column(String(100))  # Schulabschluss
    
    # ========== FACHKRAFT-SPEZIFISCH ==========
    profession = Column(String(255))  # Beruf/Fachrichtung
    degree = Column(String(255))  # Abschluss (z.B. Bachelor, Master)
    degree_year = Column(Integer)  # Abschlussjahr
    
    # ========== SAISONJOB-SPEZIFISCH ==========
    available_from = Column(Date)  # Verfügbar ab
    available_until = Column(Date)  # Verfügbar bis
    preferred_work_area = Column(String(255))  # Bevorzugter Arbeitsbereich
    
    # ========== ZUSÄTZLICHE INFOS ==========
    additional_info = Column(Text)  # Sonstige Informationen
    profile_image = Column(String(255))
    
    # ========== ANABIN UNI-VERIFIZIERUNG ==========
    anabin_verified = Column(String(50), default="not_checked")  # not_checked, verified, not_found, uncertain, error
    anabin_match_score = Column(Integer)  # 0-100
    anabin_institution_name = Column(String(500))  # Gefundener Name in anabin
    anabin_institution_id = Column(String(100))  # Anabin-ID
    anabin_status = Column(String(50))  # H+, H+/-, H-
    anabin_notes = Column(Text)  # Admin-Notizen zur Verifizierung
    anabin_checked_at = Column(Date)  # Wann geprüft
    anabin_checked_by = Column(Integer, ForeignKey("users.id"))  # Wer hat geprüft
    
    # Relationships
    user = relationship("User", back_populates="applicant", foreign_keys=[user_id])
    applications = relationship("Application", back_populates="applicant")
    documents = relationship("Document", back_populates="applicant")
    job_requests = relationship("JobRequest", back_populates="applicant")
