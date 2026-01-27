"""
IJP-Aufträge Model

Wenn ein Bewerber IJP beauftragt, einen Job für ihn zu finden,
wird hier ein Auftrag erstellt mit Datenschutz-Zustimmung.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base
from app.models.applicant import PositionType


class JobRequestStatus(str, enum.Enum):
    """Status eines IJP-Auftrags - ähnlicher Workflow wie bei Bewerbungen"""
    
    # 1. Eingang
    PENDING = "pending"                     # Eingereicht, wartet auf Prüfung
    
    # 2. IJP Prüfung
    IJP_REVIEW = "ijp_review"               # IJP prüft Unterlagen
    IJP_APPROVED = "ijp_approved"           # IJP hat freigegeben
    IJP_REJECTED = "ijp_rejected"           # IJP hat abgelehnt (unvollständig etc.)
    
    # 3. Jobsuche
    SEARCHING = "searching"                 # IJP sucht aktiv nach Jobs
    MATCHED = "matched"                     # Passende Stelle gefunden
    
    # 4. An Firma weitergeleitet
    SENT_TO_COMPANY = "sent_to_company"     # An Partnerunternehmen gesendet
    COMPANY_REVIEW = "company_review"       # Firma prüft Kandidat
    
    # 5. Interview-Phase
    INTERVIEW_SCHEDULED = "interview_scheduled"  # Vorstellungsgespräch geplant
    INTERVIEW_DONE = "interview_done"            # Vorstellungsgespräch durchgeführt
    
    # 6. Entscheidung
    ACCEPTED = "accepted"                   # Von Firma angenommen
    REJECTED = "rejected"                   # Von Firma abgelehnt
    
    # 7. Vertrag
    CONTRACT_SENT = "contract_sent"         # Vertrag versendet
    CONTRACT_SIGNED = "contract_signed"     # Vertrag unterschrieben
    
    # 8. Abschluss
    PLACED = "placed"                       # Erfolgreich vermittelt
    COMPLETED = "completed"                 # Abgeschlossen
    
    # Sonstiges
    ON_HOLD = "on_hold"                     # Pausiert
    CANCELLED = "cancelled"                 # Abgebrochen
    WITHDRAWN = "withdrawn"                 # Vom Bewerber zurückgezogen


# Status Labels für Frontend
JOB_REQUEST_STATUS_LABELS = {
    JobRequestStatus.PENDING: "Eingereicht",
    JobRequestStatus.IJP_REVIEW: "Wird von IJP geprüft",
    JobRequestStatus.IJP_APPROVED: "Von IJP freigegeben",
    JobRequestStatus.IJP_REJECTED: "Von IJP abgelehnt",
    JobRequestStatus.SEARCHING: "Jobsuche aktiv",
    JobRequestStatus.MATCHED: "Passende Stelle gefunden",
    JobRequestStatus.SENT_TO_COMPANY: "An Unternehmen gesendet",
    JobRequestStatus.COMPANY_REVIEW: "Wird vom Unternehmen geprüft",
    JobRequestStatus.INTERVIEW_SCHEDULED: "Vorstellungsgespräch geplant",
    JobRequestStatus.INTERVIEW_DONE: "Vorstellungsgespräch durchgeführt",
    JobRequestStatus.ACCEPTED: "Von Firma angenommen",
    JobRequestStatus.REJECTED: "Von Firma abgelehnt",
    JobRequestStatus.CONTRACT_SENT: "Vertrag versendet",
    JobRequestStatus.CONTRACT_SIGNED: "Vertrag unterschrieben",
    JobRequestStatus.PLACED: "Erfolgreich vermittelt",
    JobRequestStatus.COMPLETED: "Abgeschlossen",
    JobRequestStatus.ON_HOLD: "Pausiert",
    JobRequestStatus.CANCELLED: "Abgebrochen",
    JobRequestStatus.WITHDRAWN: "Zurückgezogen",
}

# Status Farben für Frontend
JOB_REQUEST_STATUS_COLORS = {
    JobRequestStatus.PENDING: "yellow",
    JobRequestStatus.IJP_REVIEW: "blue",
    JobRequestStatus.IJP_APPROVED: "green",
    JobRequestStatus.IJP_REJECTED: "red",
    JobRequestStatus.SEARCHING: "indigo",
    JobRequestStatus.MATCHED: "purple",
    JobRequestStatus.SENT_TO_COMPANY: "purple",
    JobRequestStatus.COMPANY_REVIEW: "blue",
    JobRequestStatus.INTERVIEW_SCHEDULED: "indigo",
    JobRequestStatus.INTERVIEW_DONE: "indigo",
    JobRequestStatus.ACCEPTED: "green",
    JobRequestStatus.REJECTED: "red",
    JobRequestStatus.CONTRACT_SENT: "orange",
    JobRequestStatus.CONTRACT_SIGNED: "green",
    JobRequestStatus.PLACED: "green",
    JobRequestStatus.COMPLETED: "gray",
    JobRequestStatus.ON_HOLD: "orange",
    JobRequestStatus.CANCELLED: "red",
    JobRequestStatus.WITHDRAWN: "gray",
}


class JobRequest(Base):
    """
    Ein IJP-Auftrag - wenn ein Bewerber IJP beauftragt,
    eine Stelle für ihn zu finden.
    """
    __tablename__ = "job_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)
    
    # Stellenart für diesen Auftrag (z.B. "studentenferienjob", "fachkraft")
    position_type = Column(Enum(PositionType, values_callable=lambda obj: [e.value for e in obj]), nullable=True)
    
    # Status
    status = Column(Enum(JobRequestStatus, values_callable=lambda obj: [e.value for e in obj]), default=JobRequestStatus.PENDING)
    
    # Datenschutz-Zustimmung
    privacy_consent = Column(Boolean, default=False)
    privacy_consent_date = Column(DateTime)
    privacy_consent_text = Column(Text)  # Der Text der Zustimmung
    
    # Optionale Präferenzen
    preferred_location = Column(String(255))  # Bevorzugte Region/Stadt
    preferred_start_date = Column(DateTime)   # Gewünschtes Startdatum
    notes = Column(Text)                      # Zusätzliche Wünsche vom Bewerber
    
    # Vermittlung - Firma
    matched_company_name = Column(String(255))  # Name des Unternehmens
    matched_job_title = Column(String(255))     # Stellentitel
    interview_date = Column(DateTime)            # Interviewtermin
    interview_link = Column(String(500))         # Zoom/Teams/Meet Link für Interview
    contract_date = Column(DateTime)             # Vertragsdatum
    
    # Admin-Notizen (intern)
    admin_notes = Column(Text)
    assigned_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    applicant = relationship("Applicant", back_populates="job_requests")
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id])
