"""
Job Interaction Model - Likes/Merken und Reports für Bewerber
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base, utc_now


class InteractionType(str, enum.Enum):
    """Art der Interaktion mit einer Stelle"""
    LIKE = "like"           # Gemerkt/Geliked
    REPORT = "report"       # Negativ gemeldet


class ReportReason(str, enum.Enum):
    """Gründe für eine negative Meldung"""
    NOT_RELEVANT = "not_relevant"       # Nicht relevant für mich
    MISLEADING = "misleading"           # Irreführende Beschreibung
    DUPLICATE = "duplicate"             # Doppelte Stelle
    SPAM = "spam"                       # Spam/Fake
    INAPPROPRIATE = "inappropriate"     # Unangemessener Inhalt
    OTHER = "other"                     # Sonstiges


REPORT_REASON_LABELS = {
    ReportReason.NOT_RELEVANT: "Nicht relevant für mich",
    ReportReason.MISLEADING: "Irreführende Beschreibung",
    ReportReason.DUPLICATE: "Doppelte Stelle",
    ReportReason.SPAM: "Spam/Fake",
    ReportReason.INAPPROPRIATE: "Unangemessener Inhalt",
    ReportReason.OTHER: "Sonstiges",
}


class JobInteraction(Base):
    """Interaktionen von Bewerbern mit Stellen (Likes/Reports)"""
    __tablename__ = "job_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    
    interaction_type = Column(Enum(InteractionType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    
    # Nur für Reports
    report_reason = Column(Enum(ReportReason, values_callable=lambda x: [e.value for e in x]), nullable=True)
    report_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    applicant = relationship("Applicant", backref="job_interactions")
    job_posting = relationship("JobPosting", backref="interactions")
    
    # Ein Bewerber kann eine Stelle nur einmal liken ODER reporten
    __table_args__ = (
        UniqueConstraint('applicant_id', 'job_posting_id', 'interaction_type', name='uq_applicant_job_interaction'),
    )
