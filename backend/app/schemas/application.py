from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.application import ApplicationStatus


class ApplicationBase(BaseModel):
    applicant_message: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    job_posting_id: int


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    company_notes: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: int
    applicant_id: int
    job_posting_id: int
    status: ApplicationStatus
    company_notes: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationWithDetails(ApplicationResponse):
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    applicant_name: Optional[str] = None
