from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime, timedelta
from app.core.database import Base
import secrets


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(100), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    @staticmethod
    def generate_token():
        """Generiert einen sicheren Token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_expiry():
        """Token ist 1 Stunde gültig"""
        return datetime.utcnow() + timedelta(hours=1)
    
    def is_valid(self):
        """Prüft ob der Token noch gültig ist"""
        return not self.is_used and datetime.utcnow() < self.expires_at
