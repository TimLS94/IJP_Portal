"""
Partner-Links für externe Partner (z.B. Sprachschulen, Agenturen),
die Bewerber an IJP vermitteln. Jeder Link gibt read-only Einblick
in die eigenen Bewerber – ohne Login, nur per Token.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
import secrets
from app.core.database import Base, utc_now


class PartnerLink(Base):
    __tablename__ = "partner_links"

    id = Column(Integer, primary_key=True, index=True)

    # Anzeigename des Partners (z.B. "Janara Sprachschule")
    name = Column(String(255), nullable=False)

    # Muss exakt mit applicant.invite_source übereinstimmen
    partner_source = Column(String(255), nullable=False, index=True)

    # Sicherer Zugriffs-Token (URL-safe, 32 Bytes)
    token = Column(String(64), unique=True, index=True, nullable=False)

    # Link aktiv/deaktiviert
    is_active = Column(Boolean, default=True)

    # Admin-steuerbare Rechte des Partners:
    # darf selbst Studenten anlegen / darf bereits eingegebene Daten nachbearbeiten.
    can_add_students = Column(Boolean, default=True, server_default="true", nullable=False)
    can_edit_students = Column(Boolean, default=False, server_default="false", nullable=False)

    # Darf dieser Partner Bewerbungsgespräch-Kandidaten anlegen/pflegen? (reine IJP-Thematik,
    # standardmäßig aus – muss vom Admin explizit freigeschaltet werden)
    can_add_interview_candidates = Column(Boolean, default=False, server_default="false", nullable=False)

    # Onboarding-Mail an den Studenten beim Anlegen (Passwort-Setzen-Link) senden?
    send_onboarding_email = Column(Boolean, default=True, server_default="true", nullable=False)

    # Standard-Routing für von IJP hochgeladene Unterlagen der Studenten dieses Partners:
    #   True  = an den Partner (im Partner-Portal zum Download + Hinweis-E-Mail)
    #   False = direkt an den Studenten
    # Pro Student übersteuerbar (applicant.documents_recipient). Rückwirkend änderbar.
    documents_to_partner = Column(Boolean, default=False, server_default="false", nullable=False)

    # Optionaler Passwortschutz des Links (vom Admin vorgegeben). Ist er gesetzt,
    # muss der Partner vor dem Zugriff das Passwort eingeben. NULL = offener Link.
    password_hash = Column(String(255), nullable=True)
    # Klartext des Link-Passworts, damit der Admin es wieder anzeigen kann (nur Admin-sichtbar).
    # Bewusst für dieses geteilte Zugangs-Secret – KEIN Nutzer-Konto-Passwort.
    password_plain = Column(String(255), nullable=True)

    # Optionale Notiz für den Admin
    notes = Column(String(500), nullable=True)

    # Benachrichtigungs-E-Mails des Partners: komma-/zeilengetrennte Adressen.
    # Ändert IJP den (sichtbaren) Status eines Bewerbers dieses Partners, gehen an
    # diese Adressen Status-Update-Mails. Vom Admin gepflegt.
    notification_emails = Column(Text, nullable=True)

    @property
    def notification_email_list(self) -> list:
        """Parst notification_emails in eine bereinigte Liste gültiger Adressen."""
        raw = self.notification_emails or ""
        parts = raw.replace(";", ",").replace("\n", ",").split(",")
        seen, out = set(), []
        for p in parts:
            e = p.strip()
            key = e.lower()
            if e and "@" in e and "." in e.split("@")[-1] and key not in seen:
                seen.add(key)
                out.append(e)
        return out

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(32)
