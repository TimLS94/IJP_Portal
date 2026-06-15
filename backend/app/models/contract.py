from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now


class ContractTemplate(Base):
    """Wiederverwendbare Vertragsvorlage (.docx mit {{Platzhaltern}})."""
    __tablename__ = "contract_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_content = Column(LargeBinary, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class Contract(Base):
    """Ein an einen Bewerber (über seinen IJP-Auftrag) versendeter Vertrag."""
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    job_request_id = Column(Integer, ForeignKey("job_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("contract_templates.id", ondelete="SET NULL"), nullable=True)

    # Gefülltes PDF, das an den Bewerber geht
    generated_filename = Column(String(255), nullable=False)
    generated_content = Column(LargeBinary, nullable=False)

    # Vom Bewerber hochgeladene, unterschriebene Datei
    signed_filename = Column(String(255), nullable=True)
    signed_content = Column(LargeBinary, nullable=True)

    status = Column(String(20), nullable=False, default="sent")  # "sent" | "signed"
    sent_at = Column(DateTime(timezone=True), default=utc_now)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    sent_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    job_request = relationship("JobRequest")
    template = relationship("ContractTemplate")
