"""
Firmen-Aufträge Model

Wenn eine Firma IJP beauftragt, Personal zu finden oder beim
Bewerbungsprozess zu unterstützen, wird hier ein Auftrag erstellt.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class CompanyRequestType(str, enum.Enum):
    """Art des Auftrags"""
    RECRUITING = "recruiting"           # Personal finden
    SUPPORT = "support"                 # Unterstützung beim bestehenden Prozess
    DOCUMENTS = "documents"             # Hilfe bei Dokumenten
    FULL_SERVICE = "full_service"       # Kompletter Recruiting-Service


class CompanyRequestStatus(str, enum.Enum):
    """Status eines Firmen-Auftrags"""
    
    # 1. Eingang
    PENDING = "pending"                 # Eingereicht, wartet auf Bearbeitung
    
    # 2. IJP Prüfung
    IJP_REVIEW = "ijp_review"           # IJP prüft Anfrage
    IJP_ACCEPTED = "ijp_accepted"       # IJP hat angenommen
    IJP_REJECTED = "ijp_rejected"       # IJP hat abgelehnt
    
    # 3. Aktive Bearbeitung
    IN_PROGRESS = "in_progress"         # Wird bearbeitet
    CANDIDATES_FOUND = "candidates_found"  # Kandidaten gefunden
    CANDIDATES_SENT = "candidates_sent"    # Kandidaten an Firma gesendet
    
    # 4. Firma entscheidet
    COMPANY_REVIEW = "company_review"   # Firma prüft Kandidaten
    INTERVIEWS = "interviews"           # Interviews laufen
    
    # 5. Abschluss
    COMPLETED = "completed"             # Erfolgreich abgeschlossen
    CANCELLED = "cancelled"             # Abgebrochen
    ON_HOLD = "on_hold"                 # Pausiert


# Status Labels für Frontend
COMPANY_REQUEST_STATUS_LABELS = {
    CompanyRequestStatus.PENDING: "Eingereicht",
    CompanyRequestStatus.IJP_REVIEW: "Wird von IJP geprüft",
    CompanyRequestStatus.IJP_ACCEPTED: "Von IJP angenommen",
    CompanyRequestStatus.IJP_REJECTED: "Von IJP abgelehnt",
    CompanyRequestStatus.IN_PROGRESS: "In Bearbeitung",
    CompanyRequestStatus.CANDIDATES_FOUND: "Kandidaten gefunden",
    CompanyRequestStatus.CANDIDATES_SENT: "Kandidaten gesendet",
    CompanyRequestStatus.COMPANY_REVIEW: "Firma prüft Kandidaten",
    CompanyRequestStatus.INTERVIEWS: "Interviews laufen",
    CompanyRequestStatus.COMPLETED: "Abgeschlossen",
    CompanyRequestStatus.CANCELLED: "Abgebrochen",
    CompanyRequestStatus.ON_HOLD: "Pausiert",
}

# Status Farben für Frontend
COMPANY_REQUEST_STATUS_COLORS = {
    CompanyRequestStatus.PENDING: "yellow",
    CompanyRequestStatus.IJP_REVIEW: "blue",
    CompanyRequestStatus.IJP_ACCEPTED: "green",
    CompanyRequestStatus.IJP_REJECTED: "red",
    CompanyRequestStatus.IN_PROGRESS: "indigo",
    CompanyRequestStatus.CANDIDATES_FOUND: "purple",
    CompanyRequestStatus.CANDIDATES_SENT: "purple",
    CompanyRequestStatus.COMPANY_REVIEW: "blue",
    CompanyRequestStatus.INTERVIEWS: "indigo",
    CompanyRequestStatus.COMPLETED: "green",
    CompanyRequestStatus.CANCELLED: "red",
    CompanyRequestStatus.ON_HOLD: "orange",
}

# Request Type Labels
COMPANY_REQUEST_TYPE_LABELS = {
    CompanyRequestType.RECRUITING: "Personal finden",
    CompanyRequestType.SUPPORT: "Prozess-Unterstützung",
    CompanyRequestType.DOCUMENTS: "Dokumenten-Hilfe",
    CompanyRequestType.FULL_SERVICE: "Full-Service Recruiting",
}


class CompanyRequest(Base):
    """
    Ein Firmen-Auftrag an IJP - z.B. Personal finden oder
    Unterstützung beim Bewerbungsprozess.
    """
    __tablename__ = "company_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Art des Auftrags
    request_type = Column(Enum(CompanyRequestType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    
    # Status
    status = Column(Enum(CompanyRequestStatus, values_callable=lambda obj: [e.value for e in obj]), default=CompanyRequestStatus.PENDING)
    
    # Details zum Auftrag
    title = Column(String(255))  # z.B. "5 Erntehelfer für Sommer 2026"
    description = Column(Text)   # Ausführliche Beschreibung
    
    # Anzahl benötigtes Personal (für Recruiting)
    positions_needed = Column(Integer, default=1)
    positions_filled = Column(Integer, default=0)
    
    # Zeitrahmen
    start_date = Column(DateTime)  # Wann wird Personal benötigt
    end_date = Column(DateTime)    # Bis wann
    deadline = Column(DateTime)    # Deadline für die Vermittlung
    
    # Anforderungen (JSON für Flexibilität)
    requirements = Column(JSON, default={})
    # Beispiel: {"german_level": "B1", "experience_years": 2, "skills": ["Gabelstapler"]}
    
    # Budget/Vergütung
    salary_range = Column(String(100))  # z.B. "15-18€/Stunde"
    budget_note = Column(Text)          # Zusätzliche Infos zu Budget
    
    # Verweis auf bestehende Stelle (optional)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    
    # Verweis auf bestehende Bewerbungen die unterstützt werden sollen
    application_ids = Column(JSON, default=[])  # Liste von application_ids
    
    # Kontaktperson
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    
    # Admin-Bereich
    admin_notes = Column(Text)
    assigned_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Ergebnis
    candidates_proposed = Column(Integer, default=0)  # Vorgeschlagene Kandidaten
    candidates_hired = Column(Integer, default=0)     # Eingestellte Kandidaten
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    company = relationship("Company", back_populates="company_requests")
    job_posting = relationship("JobPosting")
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id])


