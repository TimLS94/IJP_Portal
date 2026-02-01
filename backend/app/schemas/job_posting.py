from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.applicant import PositionType
from app.models.job_posting import RequiredLanguageLevel, EmploymentType
from app.schemas.company import CompanyResponse

# Mindestlohn in Deutschland (aktuell)
MINIMUM_WAGE = 13.90


class OtherLanguageRequirement(BaseModel):
    language: str
    level: RequiredLanguageLevel


class JobTranslation(BaseModel):
    """Übersetzung der Stelleninhalte in einer Sprache"""
    title: Optional[str] = None
    description: Optional[str] = None
    tasks: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None


class JobPostingBase(BaseModel):
    title: str
    position_type: PositionType
    employment_type: Optional[EmploymentType] = None  # NEU: Vollzeit/Teilzeit
    description: str
    tasks: Optional[str] = None  # NEU: Aufgaben
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    
    # Ort
    location: Optional[str] = None
    address: Optional[str] = None  # NEU: Straße
    postal_code: Optional[str] = None  # NEU: PLZ
    remote_possible: bool = False
    accommodation_provided: bool = False  # Unterkunft vorhanden
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    # Kontaktperson (NEU)
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_type: Optional[str] = None
    
    # Sprachanforderungen
    german_required: Optional[RequiredLanguageLevel] = RequiredLanguageLevel.NOT_REQUIRED
    english_required: Optional[RequiredLanguageLevel] = RequiredLanguageLevel.NOT_REQUIRED
    other_languages_required: Optional[List[OtherLanguageRequirement]] = []
    
    additional_requirements: Optional[dict] = {}
    deadline: Optional[date] = None  # Bewerbungsschluss
    
    # Mehrsprachige Inhalte
    translations: Optional[dict] = {}  # {"en": JobTranslation, "es": JobTranslation, ...}
    available_languages: Optional[List[str]] = ["de"]
    
    @field_validator('salary_min')
    @classmethod
    def validate_salary_min(cls, v):
        """Stellt sicher, dass der Mindestlohn nicht unterschritten wird"""
        if v is not None and v < MINIMUM_WAGE:
            raise ValueError(f'Der Mindestlohn darf nicht unter {MINIMUM_WAGE}€ liegen')
        return v
    
    @field_validator('salary_max')
    @classmethod
    def validate_salary_max(cls, v):
        """Stellt sicher, dass der Maximallohn nicht unter dem Mindestlohn liegt"""
        if v is not None and v < MINIMUM_WAGE:
            raise ValueError(f'Der Lohn darf nicht unter {MINIMUM_WAGE}€ liegen')
        return v


class JobPostingCreate(JobPostingBase):
    pass


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    position_type: Optional[PositionType] = None
    employment_type: Optional[EmploymentType] = None  # NEU
    description: Optional[str] = None
    tasks: Optional[str] = None  # NEU
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    
    location: Optional[str] = None
    address: Optional[str] = None  # NEU
    postal_code: Optional[str] = None  # NEU
    remote_possible: Optional[bool] = None
    accommodation_provided: Optional[bool] = None  # Unterkunft vorhanden
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    # Kontaktperson (NEU)
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_type: Optional[str] = None
    
    german_required: Optional[RequiredLanguageLevel] = None
    english_required: Optional[RequiredLanguageLevel] = None
    other_languages_required: Optional[List[OtherLanguageRequirement]] = None
    
    additional_requirements: Optional[dict] = None
    is_active: Optional[bool] = None
    deadline: Optional[date] = None  # Bewerbungsschluss
    
    # Mehrsprachige Inhalte
    translations: Optional[dict] = None
    available_languages: Optional[List[str]] = None
    
    @field_validator('salary_min')
    @classmethod
    def validate_salary_min(cls, v):
        """Stellt sicher, dass der Mindestlohn nicht unterschritten wird"""
        if v is not None and v < MINIMUM_WAGE:
            raise ValueError(f'Der Mindestlohn darf nicht unter {MINIMUM_WAGE}€ liegen')
        return v
    
    @field_validator('salary_max')
    @classmethod
    def validate_salary_max(cls, v):
        """Stellt sicher, dass der Maximallohn nicht unter dem Mindestlohn liegt"""
        if v is not None and v < MINIMUM_WAGE:
            raise ValueError(f'Der Lohn darf nicht unter {MINIMUM_WAGE}€ liegen')
        return v


class JobPostingResponse(JobPostingBase):
    id: int
    company_id: int
    is_active: bool
    is_archived: Optional[bool] = False
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
    company: Optional[CompanyResponse] = None
    
    class Config:
        from_attributes = True


class JobPostingListResponse(BaseModel):
    id: int
    title: str
    position_type: PositionType
    location: Optional[str]
    company_name: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Response mit Sprachlabels
class LanguageLevelOption(BaseModel):
    value: str
    label: str


class LanguageLevelsResponse(BaseModel):
    levels: List[LanguageLevelOption]
