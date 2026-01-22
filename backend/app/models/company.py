from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Firmendaten
    company_name = Column(String(255), nullable=False)
    contact_person = Column(String(200))
    
    # Adresse
    street = Column(String(255))
    house_number = Column(String(20))
    postal_code = Column(String(20))
    city = Column(String(100))
    country = Column(String(100))
    
    # Kontakt
    phone = Column(String(50))
    website = Column(String(255))
    
    # Beschreibung
    description = Column(Text)
    industry = Column(String(100))
    company_size = Column(String(50))  # z.B. "1-10", "11-50", "51-200", etc.
    
    # Logo
    logo = Column(String(255))
    
    # Relationships
    user = relationship("User", back_populates="company")
    job_postings = relationship("JobPosting", back_populates="company")
    members = relationship("CompanyMember", back_populates="company")
    company_requests = relationship("CompanyRequest", back_populates="company")
