from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base, utc_now


class UserRole(str, enum.Enum):
    APPLICANT = "applicant"
    COMPANY = "company"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    last_login_at = Column(DateTime, nullable=True)  # Letzter Login-Zeitpunkt
    
    # E-Mail-Präferenzen (DSGVO-konform)
    email_newsletter = Column(Boolean, default=True)  # Newsletter/Marketing E-Mails
    email_job_alerts = Column(Boolean, default=True)  # Neue Stellenbenachrichtigungen
    email_notifications = Column(Boolean, default=True)  # Allgemeine Benachrichtigungen (Bewerbungsstatus, etc.)
    
    # Relationships
    # foreign_keys als String, da Applicant.user_id noch nicht importiert ist
    applicant = relationship("Applicant", back_populates="user", uselist=False, primaryjoin="User.id==Applicant.user_id")
    company = relationship("Company", back_populates="user", uselist=False)
    company_memberships = relationship("CompanyMember", foreign_keys="CompanyMember.user_id", back_populates="user")
