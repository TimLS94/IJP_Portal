from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.models.applicant import PositionType, LanguageLevel


class OtherLanguage(BaseModel):
    language: str
    level: LanguageLevel


class WorkExperience(BaseModel):
    """Strukturierte Berufserfahrung"""
    company: str  # Firmenname
    position: str  # Position/Tätigkeit
    location: Optional[str] = None  # Ort
    start_date: Optional[str] = None  # Startdatum (YYYY-MM oder YYYY)
    end_date: Optional[str] = None  # Enddatum (YYYY-MM, YYYY oder "heute")
    description: Optional[str] = None  # Tätigkeitsbeschreibung


class ApplicantBase(BaseModel):
    # ========== ALLGEMEINE PERSONENDATEN ==========
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    
    # Kontaktdaten
    phone: Optional[str] = None
    
    # Adresse
    street: Optional[str] = None
    house_number: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    # ========== QUALIFIKATIONEN ==========
    work_experience: Optional[str] = None  # Legacy: Freitext
    work_experience_years: Optional[int] = 0
    work_experiences: Optional[List[WorkExperience]] = []  # NEU: Strukturierte Liste
    
    # Sprachkenntnisse
    german_level: Optional[LanguageLevel] = LanguageLevel.NONE
    english_level: Optional[LanguageLevel] = LanguageLevel.NONE
    other_languages: Optional[List[OtherLanguage]] = []
    
    # Deutschland-Erfahrung
    been_to_germany: Optional[bool] = False
    germany_details: Optional[str] = None
    
    # ========== POSITIONSTYP ==========
    position_type: Optional[PositionType] = None  # Legacy: Einzelauswahl
    position_types: Optional[List[PositionType]] = []  # NEU: Mehrfachauswahl
    
    # ========== STUDENTENFERIENJOB-SPEZIFISCH ==========
    university_name: Optional[str] = None
    university_street: Optional[str] = None
    university_house_number: Optional[str] = None
    university_postal_code: Optional[str] = None
    university_city: Optional[str] = None
    university_country: Optional[str] = None
    field_of_study: Optional[str] = None
    current_semester: Optional[int] = None
    semester_break_start: Optional[date] = None
    semester_break_end: Optional[date] = None
    continue_studying: Optional[bool] = None
    
    # ========== AUSBILDUNG-SPEZIFISCH ==========
    desired_profession: Optional[str] = None
    school_degree: Optional[str] = None
    
    # ========== FACHKRAFT-SPEZIFISCH ==========
    profession: Optional[str] = None
    degree: Optional[str] = None
    degree_year: Optional[int] = None
    
    # ========== SAISONJOB-SPEZIFISCH ==========
    available_from: Optional[date] = None
    available_until: Optional[date] = None
    preferred_work_area: Optional[str] = None
    
    # ========== ZUSÄTZLICHE INFOS ==========
    additional_info: Optional[str] = None


class ApplicantCreate(ApplicantBase):
    pass


class ApplicantUpdate(BaseModel):
    # Alle Felder optional für partielle Updates
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    
    street: Optional[str] = None
    house_number: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    work_experience: Optional[str] = None
    work_experience_years: Optional[int] = None
    work_experiences: Optional[List[WorkExperience]] = None  # NEU: Strukturierte Liste
    german_level: Optional[LanguageLevel] = None
    english_level: Optional[LanguageLevel] = None
    other_languages: Optional[List[OtherLanguage]] = None
    been_to_germany: Optional[bool] = None
    germany_details: Optional[str] = None
    
    position_type: Optional[PositionType] = None
    position_types: Optional[List[PositionType]] = None
    
    # Studentenferienjob
    university_name: Optional[str] = None
    university_street: Optional[str] = None
    university_house_number: Optional[str] = None
    university_postal_code: Optional[str] = None
    university_city: Optional[str] = None
    university_country: Optional[str] = None
    field_of_study: Optional[str] = None
    current_semester: Optional[int] = None
    semester_break_start: Optional[date] = None
    semester_break_end: Optional[date] = None
    continue_studying: Optional[bool] = None
    
    # Ausbildung
    desired_profession: Optional[str] = None
    school_degree: Optional[str] = None
    
    # Fachkraft
    profession: Optional[str] = None
    degree: Optional[str] = None
    degree_year: Optional[int] = None
    
    # Saisonjob
    available_from: Optional[date] = None
    available_until: Optional[date] = None
    preferred_work_area: Optional[str] = None
    
    additional_info: Optional[str] = None


class ApplicantResponse(ApplicantBase):
    id: int
    user_id: int
    profile_image: Optional[str] = None
    
    class Config:
        from_attributes = True


# Schema für Dokumentenanforderungen
class DocumentRequirement(BaseModel):
    document_type: str
    is_required: bool
    description: str


class DocumentRequirementsResponse(BaseModel):
    position_type: str
    required: List[DocumentRequirement]
    optional: List[DocumentRequirement]
