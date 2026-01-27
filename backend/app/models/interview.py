from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class InterviewStatus(str, enum.Enum):
    """Status eines Interview-Terminvorschlags"""
    PROPOSED = "proposed"           # Firma hat Termine vorgeschlagen
    CONFIRMED = "confirmed"         # Bewerber hat bestätigt
    DECLINED = "declined"           # Bewerber hat abgelehnt
    CANCELLED = "cancelled"         # Abgesagt
    COMPLETED = "completed"         # Durchgeführt
    NEEDS_NEW_DATES = "needs_new_dates"  # Neue Termine nötig


INTERVIEW_STATUS_LABELS = {
    InterviewStatus.PROPOSED: "Termine vorgeschlagen",
    InterviewStatus.CONFIRMED: "Bestätigt",
    InterviewStatus.DECLINED: "Abgelehnt - neue Termine nötig",
    InterviewStatus.CANCELLED: "Abgesagt",
    InterviewStatus.COMPLETED: "Durchgeführt",
    InterviewStatus.NEEDS_NEW_DATES: "Neue Termine erforderlich",
}


class Interview(Base):
    """
    Interview-Termine zwischen Firma und Bewerber.
    Firma schlägt 2 Termine vor, Bewerber wählt einen aus oder lehnt ab.
    """
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    
    # Status
    status = Column(Enum(InterviewStatus, values_callable=lambda x: [e.value for e in x]), default=InterviewStatus.PROPOSED)
    
    # Terminvorschläge von der Firma (2 Optionen)
    proposed_date_1 = Column(DateTime, nullable=False)  # Erster Terminvorschlag
    proposed_date_2 = Column(DateTime, nullable=True)   # Zweiter Terminvorschlag (optional)
    
    # Bestätigter Termin
    confirmed_date = Column(DateTime, nullable=True)
    
    # Zusatzinfos
    location = Column(String(255))           # Ort (z.B. "Online via Zoom" oder Adresse)
    meeting_link = Column(String(500))       # Link für Online-Meeting
    notes_company = Column(Text)             # Notizen von der Firma
    notes_applicant = Column(Text)           # Notizen vom Bewerber (z.B. Absagegrund)
    
    # Erinnerungen
    reminder_sent = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    application = relationship("Application", back_populates="interviews")


# Füge die Beziehung auch zur Application hinzu (wird in __init__.py gemacht)

