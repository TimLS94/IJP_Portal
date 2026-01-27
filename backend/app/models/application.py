from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    # Bewerber-Seite
    PENDING = "pending"                     # Eingereicht - wartet auf Prüfung
    
    # IJP Vermittler Workflow
    IJP_REVIEW = "ijp_review"               # IJP prüft Unterlagen
    IJP_APPROVED = "ijp_approved"           # IJP hat freigegeben
    IJP_REJECTED = "ijp_rejected"           # IJP hat abgelehnt (unvollständig etc.)
    
    # An Firma weitergeleitet
    SENT_TO_COMPANY = "sent_to_company"     # An Partnerunternehmen gesendet
    COMPANY_REVIEW = "company_review"       # Firma prüft
    
    # Interview-Phase
    INTERVIEW_SCHEDULED = "interview_scheduled"  # Vorstellungsgespräch geplant
    INTERVIEW_DONE = "interview_done"            # Vorstellungsgespräch durchgeführt
    
    # Finale Status
    ACCEPTED = "accepted"                   # Angenommen
    REJECTED = "rejected"                   # Abgelehnt
    WITHDRAWN = "withdrawn"                 # Vom Bewerber zurückgezogen
    
    # Vertrag
    CONTRACT_SENT = "contract_sent"         # Vertrag versendet
    CONTRACT_SIGNED = "contract_signed"     # Vertrag unterschrieben
    COMPLETED = "completed"                 # Abgeschlossen


# Status Labels für Frontend
APPLICATION_STATUS_LABELS = {
    ApplicationStatus.PENDING: "Eingereicht",
    ApplicationStatus.IJP_REVIEW: "Wird von IJP geprüft",
    ApplicationStatus.IJP_APPROVED: "Von IJP freigegeben",
    ApplicationStatus.IJP_REJECTED: "Von IJP abgelehnt",
    ApplicationStatus.SENT_TO_COMPANY: "An Unternehmen gesendet",
    ApplicationStatus.COMPANY_REVIEW: "Wird vom Unternehmen geprüft",
    ApplicationStatus.INTERVIEW_SCHEDULED: "Vorstellungsgespräch geplant",
    ApplicationStatus.INTERVIEW_DONE: "Vorstellungsgespräch durchgeführt",
    ApplicationStatus.ACCEPTED: "Angenommen",
    ApplicationStatus.REJECTED: "Abgelehnt",
    ApplicationStatus.WITHDRAWN: "Zurückgezogen",
    ApplicationStatus.CONTRACT_SENT: "Vertrag versendet",
    ApplicationStatus.CONTRACT_SIGNED: "Vertrag unterschrieben",
    ApplicationStatus.COMPLETED: "Abgeschlossen",
}

# Status-Farben für Frontend
APPLICATION_STATUS_COLORS = {
    ApplicationStatus.PENDING: "yellow",
    ApplicationStatus.IJP_REVIEW: "blue",
    ApplicationStatus.IJP_APPROVED: "green",
    ApplicationStatus.IJP_REJECTED: "red",
    ApplicationStatus.SENT_TO_COMPANY: "purple",
    ApplicationStatus.COMPANY_REVIEW: "blue",
    ApplicationStatus.INTERVIEW_SCHEDULED: "indigo",
    ApplicationStatus.INTERVIEW_DONE: "indigo",
    ApplicationStatus.ACCEPTED: "green",
    ApplicationStatus.REJECTED: "red",
    ApplicationStatus.WITHDRAWN: "gray",
    ApplicationStatus.CONTRACT_SENT: "orange",
    ApplicationStatus.CONTRACT_SIGNED: "green",
    ApplicationStatus.COMPLETED: "green",
}


class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    
    # Status
    status = Column(Enum(ApplicationStatus, values_callable=lambda x: [e.value for e in x]), default=ApplicationStatus.PENDING)
    
    # Notizen
    applicant_message = Column(Text)  # Nachricht vom Bewerber
    company_notes = Column(Text)      # Interne Notizen der Firma
    admin_notes = Column(Text)        # Interne Notizen von IJP Admin
    
    # Timestamps
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    applicant = relationship("Applicant", back_populates="applications")
    job_posting = relationship("JobPosting", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", order_by="Interview.created_at.desc()")
