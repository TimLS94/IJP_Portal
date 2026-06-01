from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now


class IJPBetrieb(Base):
    __tablename__ = "ijp_betriebe"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    street = Column(String(255), nullable=True)
    postal_code = Column(String(10), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    betriebsnummer = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    industry = Column(String(100), nullable=True)
    status = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    contacts = relationship("CRMContact", back_populates="company", cascade="all, delete-orphan", order_by="CRMContact.is_primary.desc()")
    company_documents = relationship("CompanyDocument", back_populates="company", cascade="all, delete-orphan", order_by="CompanyDocument.created_at.desc()")


class CRMContact(Base):
    __tablename__ = "crm_contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("ijp_betriebe.id", ondelete="CASCADE"), nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    salutation = Column(String(20), nullable=True)
    title = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    company = relationship("IJPBetrieb", back_populates="contacts")


class CompanyDocument(Base):
    __tablename__ = "company_documents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("ijp_betriebe.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_content = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    company = relationship("IJPBetrieb", back_populates="company_documents")


class IJPTemplate(Base):
    __tablename__ = "ijp_templates"

    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String(100), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    template_text = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
