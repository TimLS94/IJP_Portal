"""
Partner-Links für externe Partner (z.B. Sprachschulen, Agenturen),
die Bewerber an IJP vermitteln. Jeder Link gibt read-only Einblick
in die eigenen Bewerber – ohne Login, nur per Token.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
import secrets
from app.core.database import Base, utc_now


class PartnerLink(Base):
    __tablename__ = "partner_links"

    id = Column(Integer, primary_key=True, index=True)

    # Anzeigename des Partners (z.B. "Janara Sprachschule")
    name = Column(String(255), nullable=False)

    # Muss exakt mit applicant.invite_source übereinstimmen
    partner_source = Column(String(255), nullable=False, index=True)

    # Sicherer Zugriffs-Token (URL-safe, 32 Bytes)
    token = Column(String(64), unique=True, index=True, nullable=False)

    # Link aktiv/deaktiviert
    is_active = Column(Boolean, default=True)

    # Optionale Notiz für den Admin
    notes = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(32)
