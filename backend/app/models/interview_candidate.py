"""
Bewerbungsgespräch-Kandidaten (reine IJP-Thematik).

Eine leichte Kandidaten-Liste für Vorstellungsgespräche: Name, Sprachkenntnisse
(Deutsch/Englisch), Notizen und ob/wann das Gespräch durchgeführt wurde.
Angelegt werden können Kandidaten entweder intern von IJP (Admin) oder von einem
Partner über seinen Partner-Link – letzteres aber nur, wenn der Partner dafür
freigeschaltet ist (PartnerLink.can_add_interview_candidates).

Bewusst eigenständig und NICHT mit `Application`/`Interview` verknüpft – das sind
Vorab-Gespräche, noch ohne Bewerber-Konto oder Stelle.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey
from app.core.database import Base, utc_now


class InterviewCandidate(Base):
    __tablename__ = "interview_candidates"

    id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String(255), nullable=False)   # Vorname
    last_name = Column(String(255), nullable=False)    # Name

    # Sprachkenntnisse (frei / CEFR-Level als Text, z.B. "B2", "Muttersprache")
    german_level = Column(String(50), nullable=True)
    english_level = Column(String(50), nullable=True)

    notes = Column(Text, nullable=True)                # Notizen

    # Gespräch durchgeführt + an welchem Datum
    interview_done = Column(Boolean, default=False, server_default="false", nullable=False)
    interview_date = Column(Date, nullable=True)

    # Herkunft: welcher Partner hat den Kandidaten angelegt.
    # NULL = intern von IJP angelegt.
    partner_link_id = Column(Integer, ForeignKey("partner_links.id", ondelete="SET NULL"), nullable=True, index=True)
    partner_source = Column(String(255), nullable=True, index=True)

    # Admin, der den Kandidaten angelegt hat (nur bei interner Anlage gesetzt)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
