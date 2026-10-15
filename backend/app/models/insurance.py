from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now


class InsuranceSignup(Base):
    """Krankenkassen-Anmeldung eines eingeloggten Nutzers (BARMER-Partner).

    Der Nutzer klickt auf der Krankenkassen-Seite auf 'Anmelden', wir erfassen wer
    sich anmeldet und ob er einen Nachweis fuer die Botschaft braucht, und leiten
    anschliessend auf das externe BARMER-Formular weiter. Admin sieht die Liste.
    """
    __tablename__ = "insurance_signups"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Snapshot der Kontaktdaten zum Zeitpunkt der Anmeldung
    full_name = Column(String(255))
    email = Column(String(255))

    # Braucht der Nutzer einen Versicherungsnachweis fuer die Botschaft (Visum)?
    needs_embassy_proof = Column(Boolean, default=False, nullable=False)

    # Sprache, in der die Anmeldung erfolgt ist (de/en/es/ru)
    language = Column(String(5), default="de")

    # Bearbeitungsstatus fuer den Admin: new / contacted / registered / done
    status = Column(String(20), default="new", nullable=False, index=True)
    admin_note = Column(Text)

    # Botschafts-Dokument: hat der Admin das Dokument bereits an den Nutzer angehaengt?
    document_provided = Column(Boolean, default=False, nullable=False, server_default="false")
    document_id = Column(Integer, nullable=True)  # Referenz auf das erstellte Document

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User")
