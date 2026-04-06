from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime, timedelta, timezone
from app.core.database import Base, utc_now
import secrets


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(100), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)  # Mit Zeitzone!
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    @staticmethod
    def generate_token():
        """Generiert einen sicheren Token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_expiry():
        """Token ist 1 Stunde gültig"""
        return datetime.now(timezone.utc) + timedelta(hours=1)
    
    def is_valid(self):
        """Prüft ob der Token noch gültig ist"""
        now = datetime.now(timezone.utc)
        # Falls expires_at keine Zeitzone hat, füge UTC hinzu
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return not self.is_used and now < expires
