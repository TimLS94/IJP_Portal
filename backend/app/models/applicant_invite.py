"""
Einladungs-Token für Bewerber-Registrierung mit Quellen-Tracking.
Ermöglicht das Nachverfolgen, von welcher Sprachschule/Partner ein Bewerber kam.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
import secrets

from app.core.database import Base, utc_now


class ApplicantInviteToken(Base):
    """
    Einladungs-Token für Bewerber-Registrierung mit Quellen-Tracking.
    Wird vom Admin erstellt und kann mehrfach verwendet werden.
    """
    __tablename__ = "applicant_invite_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    
    # Erstellt von Admin
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Quelle/Partner (z.B. "Sprachschule Taschkent", "Partner Kirgisistan")
    source_name = Column(String(255), nullable=False)  # Pflichtfeld!
    source_country = Column(String(100), nullable=True)  # Optional: Land
    description = Column(Text, nullable=True)  # Zusätzliche Notizen
    
    # Gültigkeit
    expires_at = Column(DateTime(timezone=True), nullable=True)  # None = unbegrenzt
    
    # Nutzungslimit
    max_uses = Column(Integer, nullable=True)  # None = unbegrenzt
    current_uses = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    @staticmethod
    def generate_token(source_name: str = None):
        """Generiert einen lesbaren Token aus dem Quellennamen"""
        import re
        import unicodedata
        
        if source_name:
            # Umlaute und Sonderzeichen normalisieren
            normalized = unicodedata.normalize('NFKD', source_name)
            ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
            # Nur Buchstaben, Zahlen, Bindestriche
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', ascii_text.lower()).strip('-')
            # Kürzen auf max 30 Zeichen
            slug = slug[:30].rstrip('-')
            # Kurzen Suffix für Eindeutigkeit
            suffix = secrets.token_urlsafe(4)
            return f"{slug}-{suffix}" if slug else secrets.token_urlsafe(16)
        
        return secrets.token_urlsafe(32)
    
    def is_valid(self) -> bool:
        """Prüft ob der Token noch gültig ist"""
        if not self.is_active:
            return False
        
        # Ablaufdatum prüfen
        if self.expires_at:
            now = datetime.now(timezone.utc)
            expires = self.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if now > expires:
                return False
        
        # Nutzungslimit prüfen
        if self.max_uses is not None and self.current_uses >= self.max_uses:
            return False
        
        return True
    
    def use(self):
        """Markiert den Token als verwendet"""
        self.current_uses += 1
        self.last_used_at = datetime.now(timezone.utc)
