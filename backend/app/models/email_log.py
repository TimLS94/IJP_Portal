"""
E-Mail Log Model für Statistiken
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from datetime import datetime
import enum

from app.core.database import Base


class EmailType(str, enum.Enum):
    """Typen von E-Mails die gesendet werden"""
    WELCOME = "welcome"  # Willkommens-E-Mail nach Registrierung
    PASSWORD_RESET = "password_reset"  # Passwort zurücksetzen
    APPLICATION_RECEIVED = "application_received"  # Bewerbung eingegangen (an Bewerber)
    NEW_APPLICATION = "new_application"  # Neue Bewerbung (an Firma)
    APPLICATION_STATUS = "application_status"  # Status-Update (Angenommen/Abgelehnt)
    JOB_MATCH = "job_match"  # Passende Stelle gefunden
    JOB_DIGEST = "job_digest"  # Wöchentlicher Job-Digest
    COMPANY_PENDING = "company_pending"  # Firma wartet auf Freischaltung
    COMPANY_ACTIVATED = "company_activated"  # Firma freigeschaltet
    ADMIN_NOTIFICATION = "admin_notification"  # Admin-Benachrichtigung
    COLD_OUTREACH = "cold_outreach"  # Kaltakquise E-Mail (business@jobon.work)
    OTHER = "other"  # Sonstige


class EmailLog(Base):
    """Speichert gesendete E-Mails für Statistiken"""
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    email_type = Column(SQLEnum(EmailType, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500))
    success = Column(Integer, default=1)  # 1 = erfolgreich, 0 = fehlgeschlagen
    sent_by_user_id = Column(Integer, nullable=True, index=True)  # Wer hat gesendet (für Kaltakquise-Tracking)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
