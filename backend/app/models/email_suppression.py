"""
E-Mail-Sperrliste (Suppression List).

Adressen hier bekommen NIE eine E-Mail – egal welcher Typ, egal welcher Sende-Weg
(SendGrid oder Outreach-SMTP). Wird z.B. nach einer Abmahnung/Opt-out genutzt.
Die Prüfung passiert auf der untersten Sende-Ebene, damit nichts durchrutscht.
"""
from sqlalchemy import Column, Integer, String, DateTime

from app.core.database import Base, utc_now


class EmailSuppression(Base):
    __tablename__ = "email_suppressions"

    id = Column(Integer, primary_key=True, index=True)
    # Immer kleingeschrieben gespeichert (case-insensitiver Abgleich)
    email = Column(String(320), unique=True, nullable=False, index=True)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
