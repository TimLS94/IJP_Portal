"""
API für Firmen-Aufträge an IJP
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.company_request import (
    CompanyRequest, CompanyRequestType, CompanyRequestStatus,
    COMPANY_REQUEST_STATUS_LABELS, COMPANY_REQUEST_STATUS_COLORS,
    COMPANY_REQUEST_TYPE_LABELS
)

router = APIRouter(prefix="/company-requests", tags=["Firmen-Aufträge"])


# ==================== SCHEMAS ====================

class CompanyRequestCreate(BaseModel):
    request_type: CompanyRequestType
    title: str
    description: Optional[str] = None
    positions_needed: int = 1
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    requirements: Optional[dict] = {}
    salary_range: Optional[str] = None
    budget_note: Optional[str] = None
    job_posting_id: Optional[int] = None
    application_ids: Optional[List[int]] = []
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class CompanyRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    positions_needed: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    requirements: Optional[dict] = None
    salary_range: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class CompanyRequestResponse(BaseModel):
    id: int
    company_id: int
    request_type: str
    request_type_label: str
    status: str
    status_label: str
    status_color: str
    title: Optional[str]
    description: Optional[str]
    positions_needed: int
    positions_filled: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    deadline: Optional[datetime]
    requirements: Optional[dict]
    salary_range: Optional[str]
    budget_note: Optional[str]
    job_posting_id: Optional[int]
    application_ids: Optional[List[int]]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    admin_notes: Optional[str]
    candidates_proposed: int
    candidates_hired: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


def request_to_response(req: CompanyRequest) -> CompanyRequestResponse:
    """Konvertiert CompanyRequest zu Response mit Labels"""
    return CompanyRequestResponse(
        id=req.id,
        company_id=req.company_id,
        request_type=req.request_type.value,
        request_type_label=COMPANY_REQUEST_TYPE_LABELS.get(req.request_type, req.request_type.value),
        status=req.status.value,
        status_label=COMPANY_REQUEST_STATUS_LABELS.get(req.status, req.status.value),
        status_color=COMPANY_REQUEST_STATUS_COLORS.get(req.status, "gray"),
        title=req.title,
        description=req.description,
        positions_needed=req.positions_needed or 1,
        positions_filled=req.positions_filled or 0,
        start_date=req.start_date,
        end_date=req.end_date,
        deadline=req.deadline,
        requirements=req.requirements or {},
        salary_range=req.salary_range,
        budget_note=req.budget_note,
        job_posting_id=req.job_posting_id,
        application_ids=req.application_ids or [],
        contact_name=req.contact_name,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        admin_notes=req.admin_notes,
        candidates_proposed=req.candidates_proposed or 0,
        candidates_hired=req.candidates_hired or 0,
        created_at=req.created_at,
        updated_at=req.updated_at,
        completed_at=req.completed_at
    )


# ==================== FIRMEN ENDPOINTS ====================

@router.get("/my", response_model=List[CompanyRequestResponse])
async def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Holt alle Aufträge der eigenen Firma"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    requests = db.query(CompanyRequest).filter(
        CompanyRequest.company_id == company.id
    ).order_by(CompanyRequest.created_at.desc()).all()
    
    return [request_to_response(r) for r in requests]


@router.post("", response_model=CompanyRequestResponse)
async def create_request(
    data: CompanyRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt einen neuen Auftrag an IJP"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    # Kontaktdaten aus Firma übernehmen falls nicht angegeben
    contact_name = data.contact_name or company.contact_person
    contact_email = data.contact_email or current_user.email
    contact_phone = data.contact_phone or company.phone
    
    new_request = CompanyRequest(
        company_id=company.id,
        request_type=data.request_type,
        title=data.title,
        description=data.description,
        positions_needed=data.positions_needed,
        start_date=data.start_date,
        end_date=data.end_date,
        deadline=data.deadline,
        requirements=data.requirements or {},
        salary_range=data.salary_range,
        budget_note=data.budget_note,
        job_posting_id=data.job_posting_id,
        application_ids=data.application_ids or [],
        contact_name=contact_name,
        contact_email=contact_email,
        contact_phone=contact_phone
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return request_to_response(new_request)


@router.get("/{request_id}", response_model=CompanyRequestResponse)
async def get_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Holt einen spezifischen Auftrag"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    request = db.query(CompanyRequest).filter(
        CompanyRequest.id == request_id,
        CompanyRequest.company_id == company.id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    return request_to_response(request)


@router.put("/{request_id}", response_model=CompanyRequestResponse)
async def update_request(
    request_id: int,
    data: CompanyRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert einen Auftrag (nur wenn noch PENDING)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    request = db.query(CompanyRequest).filter(
        CompanyRequest.id == request_id,
        CompanyRequest.company_id == company.id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    if request.status != CompanyRequestStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail="Auftrag kann nur im Status 'Eingereicht' bearbeitet werden"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(request, field, value)
    
    db.commit()
    db.refresh(request)
    
    return request_to_response(request)


@router.delete("/{request_id}")
async def cancel_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Storniert einen Auftrag"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    request = db.query(CompanyRequest).filter(
        CompanyRequest.id == request_id,
        CompanyRequest.company_id == company.id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    if request.status in [CompanyRequestStatus.COMPLETED, CompanyRequestStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Auftrag kann nicht mehr storniert werden")
    
    request.status = CompanyRequestStatus.CANCELLED
    db.commit()
    
    return {"message": "Auftrag storniert"}


@router.delete("/{request_id}/permanent")
async def delete_request_permanent(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht einen Auftrag endgültig (nur wenn cancelled oder completed)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Firmenprofil nicht gefunden")
    
    request = db.query(CompanyRequest).filter(
        CompanyRequest.id == request_id,
        CompanyRequest.company_id == company.id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    if request.status not in [CompanyRequestStatus.COMPLETED, CompanyRequestStatus.CANCELLED]:
        raise HTTPException(
            status_code=400, 
            detail="Nur abgeschlossene oder stornierte Aufträge können endgültig gelöscht werden"
        )
    
    db.delete(request)
    db.commit()
    
    return {"message": "Auftrag endgültig gelöscht"}


@router.get("/options/types")
async def get_request_types():
    """Gibt alle verfügbaren Auftragstypen zurück"""
    return [
        {"value": t.value, "label": COMPANY_REQUEST_TYPE_LABELS.get(t, t.value)}
        for t in CompanyRequestType
    ]


@router.get("/options/statuses")
async def get_request_statuses():
    """Gibt alle verfügbaren Status zurück"""
    return [
        {
            "value": s.value, 
            "label": COMPANY_REQUEST_STATUS_LABELS.get(s, s.value),
            "color": COMPANY_REQUEST_STATUS_COLORS.get(s, "gray")
        }
        for s in CompanyRequestStatus
    ]


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/all", response_model=List[CompanyRequestResponse])
async def admin_get_all_requests(
    status: Optional[CompanyRequestStatus] = None,
    request_type: Optional[CompanyRequestType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Holt alle Firmen-Aufträge"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur für Admins")
    
    query = db.query(CompanyRequest)
    
    if status:
        query = query.filter(CompanyRequest.status == status)
    if request_type:
        query = query.filter(CompanyRequest.request_type == request_type)
    
    requests = query.order_by(CompanyRequest.created_at.desc()).all()
    
    return [request_to_response(r) for r in requests]


class AdminStatusUpdate(BaseModel):
    status: CompanyRequestStatus
    admin_notes: Optional[str] = None
    candidates_proposed: Optional[int] = None
    candidates_hired: Optional[int] = None
    positions_filled: Optional[int] = None


@router.put("/admin/{request_id}/status", response_model=CompanyRequestResponse)
async def admin_update_status(
    request_id: int,
    data: AdminStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Aktualisiert Status eines Auftrags"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur für Admins")
    
    request = db.query(CompanyRequest).filter(CompanyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    request.status = data.status
    request.assigned_admin_id = current_user.id
    
    if data.admin_notes is not None:
        request.admin_notes = data.admin_notes
    if data.candidates_proposed is not None:
        request.candidates_proposed = data.candidates_proposed
    if data.candidates_hired is not None:
        request.candidates_hired = data.candidates_hired
    if data.positions_filled is not None:
        request.positions_filled = data.positions_filled
    
    if data.status == CompanyRequestStatus.COMPLETED:
        request.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(request)
    
    return request_to_response(request)


@router.get("/admin/{request_id}", response_model=CompanyRequestResponse)
async def admin_get_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Holt Details eines Auftrags"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur für Admins")
    
    request = db.query(CompanyRequest).filter(CompanyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Auftrag nicht gefunden")
    
    return request_to_response(request)

