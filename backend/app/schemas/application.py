from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.application import ApplicationStatus


class ApplicationBase(BaseModel):
    applicant_message: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    job_posting_id: int
    document_ids: Optional[List[int]] = None  # IDs der freigegebenen Dokumente


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
    job_translations: Optional[Dict[str, Any]] = None
    requested_documents: Optional[List[Dict[str, Any]]] = None
