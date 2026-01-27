from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    APPLICANT = "applicant"
    COMPANY = "company"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # foreign_keys als String, da Applicant.user_id noch nicht importiert ist
    applicant = relationship("Applicant", back_populates="user", uselist=False, primaryjoin="User.id==Applicant.user_id")
    company = relationship("Company", back_populates="user", uselist=False)
    company_memberships = relationship("CompanyMember", foreign_keys="CompanyMember.user_id", back_populates="user")
