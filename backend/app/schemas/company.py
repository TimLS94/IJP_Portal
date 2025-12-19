from pydantic import BaseModel
from typing import Optional


class CompanyBase(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    
    # Adresse
    street: Optional[str] = None
    house_number: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Kontakt
    phone: Optional[str] = None
    website: Optional[str] = None
    
    # Info
    description: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    
    street: Optional[str] = None
    house_number: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    phone: Optional[str] = None
    website: Optional[str] = None
    
    description: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: int
    user_id: int
    logo: Optional[str] = None
    
    class Config:
        from_attributes = True
