from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.applicant import PositionType
from app.models.job_posting import RequiredLanguageLevel
from app.schemas.company import CompanyResponse

# Mindestlohn in Deutschland (aktuell)
MINIMUM_WAGE = 13.90


class OtherLanguageRequirement(BaseModel):
    language: str
    level: RequiredLanguageLevel


class JobPostingBase(BaseModel):
    title: str
    position_type: PositionType
    description: str
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    
    location: Optional[str] = None
    remote_possible: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_type: Optional[str] = None
    
    # Sprachanforderungen
    german_required: Optional[RequiredLanguageLevel] = RequiredLanguageLevel.NOT_REQUIRED
    english_required: Optional[RequiredLanguageLevel] = RequiredLanguageLevel.NOT_REQUIRED
    other_languages_required: Optional[List[OtherLanguageRequirement]] = []
    
    additional_requirements: Optional[dict] = {}
    deadline: Optional[date] = None  # Bewerbungsschluss (max 1 Monat)
    
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
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    
    location: Optional[str] = None
    remote_possible: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_type: Optional[str] = None
    
    german_required: Optional[RequiredLanguageLevel] = None
    english_required: Optional[RequiredLanguageLevel] = None
    other_languages_required: Optional[List[OtherLanguageRequirement]] = None
    
    additional_requirements: Optional[dict] = None
    is_active: Optional[bool] = None
    deadline: Optional[date] = None  # Bewerbungsschluss
    
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
