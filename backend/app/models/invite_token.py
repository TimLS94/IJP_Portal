from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
import secrets

from app.core.database import Base, utc_now


class InviteToken(Base):
    """
    Einladungs-Token für Firmen-Registrierung ohne Admin-Bestätigung.
    Wird vom Admin erstellt und kann einmalig oder mehrfach verwendet werden.
    """
    __tablename__ = "invite_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    
    # Erstellt von Admin
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Optionale Beschreibung/Name für den Token
    name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
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
    def generate_token():
        """Generiert einen sicheren zufälligen Token"""
        return secrets.token_urlsafe(32)
    
    def is_valid(self) -> bool:
        """Prüft ob der Token noch gültig ist"""
        if not self.is_active:
            return False
        
        # Ablaufdatum prüfen
        if self.expires_at:
            now = datetime.now(timezone.utc)
            expires = self.expires_at
            # Falls expires_at keine Zeitzone hat, füge UTC hinzu
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
