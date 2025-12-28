"""
Firmen-Mitglieder Model

Ermöglicht mehrere Benutzer pro Firma mit verschiedenen Rollen.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class CompanyRole(str, enum.Enum):
    """Rollen innerhalb einer Firma"""
    OWNER = "owner"      # Firmeninhaber - kann alles, inkl. Firma löschen
    ADMIN = "admin"      # Administrator - kann Benutzer verwalten
    MEMBER = "member"    # Mitarbeiter - kann Stellen und Bewerbungen verwalten


COMPANY_ROLE_LABELS = {
    CompanyRole.OWNER: "Inhaber",
    CompanyRole.ADMIN: "Administrator",
    CompanyRole.MEMBER: "Mitarbeiter",
}


class CompanyMember(Base):
    """
    Verknüpfung zwischen Benutzer und Firma.
    Ein Benutzer kann Mitglied einer Firma sein.
    """
    __tablename__ = "company_members"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Rolle in der Firma
    role = Column(Enum(CompanyRole), default=CompanyRole.MEMBER)
    
    # Einladung
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_at = Column(DateTime, default=datetime.utcnow)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="company_memberships")
    company = relationship("Company", back_populates="members")
    invited_by = relationship("User", foreign_keys=[invited_by_id])

