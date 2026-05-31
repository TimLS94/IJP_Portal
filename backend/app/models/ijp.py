from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from app.core.database import Base, utc_now


class IJPBetrieb(Base):
    __tablename__ = "ijp_betriebe"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=False)
    street = Column(String(255), nullable=False)
    postal_code = Column(String(10), nullable=False)
    city = Column(String(100), nullable=False)
    betriebsnummer = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class IJPTemplate(Base):
    __tablename__ = "ijp_templates"

    id = Column(Integer, primary_key=True, index=True)
    doc_type = Column(String(100), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    template_text = Column(Text, nullable=False)
    # [{"key": "betrieb_name", "label": "Betriebsname"}, ...]
    variables = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
