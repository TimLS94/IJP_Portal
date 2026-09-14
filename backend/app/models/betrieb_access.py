"""
Passwortgeschützter Zugriffslink für IJP-Betriebe (CRM-Firmen ohne eigenen Login).

Eine Firma bekommt einen Token-Link + Passwort und sieht damit read-only die
ihr zugeteilten Studenten (JobRequest.assigned_betrieb_id), deren öffentlichen
Status und die von uns freigegebenen Dokumente. Kein User-Account nötig.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import secrets

from app.core.database import Base, utc_now


class BetriebAccessLink(Base):
    __tablename__ = "betrieb_access_links"

    id = Column(Integer, primary_key=True, index=True)

    # Genau ein Link pro Betrieb
    betrieb_id = Column(
        Integer,
        ForeignKey("ijp_betriebe.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Sicherer Zugriffs-Token (URL-safe, 32 Bytes)
    token = Column(String(64), unique=True, index=True, nullable=False)

    # Passwort-Hash (bcrypt) – Klartext wird nie gespeichert
    password_hash = Column(String(255), nullable=False)

    # Link aktiv/deaktiviert (Admin kann jederzeit sperren)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    betrieb = relationship("IJPBetrieb")

    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(32)
