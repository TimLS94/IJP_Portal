from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List, Union
import os
import logging

logger = logging.getLogger(__name__)

# Default Secret Key - NUR für lokale Entwicklung!
_DEFAULT_SECRET_KEY = "CHANGE-THIS-IN-PRODUCTION-USE-ENV-VAR"


class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "IJP Portal API"
    DEBUG: bool = False  # WICHTIG: In Produktion immer False!
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (SQLite für Entwicklung, PostgreSQL/MySQL für Produktion)
    DATABASE_URL: str = "sqlite:///./ijp_portal.db"
    
    # JWT - WICHTIG: SECRET_KEY muss in Produktion über Environment Variable gesetzt werden!
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Password Policy
    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_PASSWORD_NUMBER: bool = True
    REQUIRE_PASSWORD_SPECIAL: bool = False  # Optional: Sonderzeichen
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: str = "pdf"  # Kommasepariert für mehrere: "pdf,doc,docx"
    
    # CORS - Kann als kommaseparierter String oder JSON-Array angegeben werden
    # Beispiel: "https://example.com,https://app.example.com" oder '["https://example.com"]'
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Frontend URL (für E-Mail Links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Email Settings (SendGrid)
    SMTP_HOST: str = "smtp.sendgrid.net"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # Muss "apikey" sein für SendGrid
    SMTP_PASSWORD: str = ""  # SendGrid API Key
    FROM_EMAIL: str = "noreply@internationaljobplacement.com"
    FROM_NAME: str = "International Job Placement"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Gibt CORS_ORIGINS als Liste zurück"""
        if not self.CORS_ORIGINS:
            return ["http://localhost:5173"]
        # Kommaseparierte Werte in Liste umwandeln
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Gibt ALLOWED_EXTENSIONS als Liste zurück"""
        if not self.ALLOWED_EXTENSIONS:
            return ["pdf"]
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def validate_security(self) -> None:
        """Validiert kritische Sicherheitseinstellungen beim Startup"""
        warnings = []
        errors = []
        
        # SECRET_KEY Prüfung
        if self.SECRET_KEY == _DEFAULT_SECRET_KEY:
            if self.DEBUG:
                warnings.append("⚠️  SECRET_KEY ist auf Default gesetzt - OK für Entwicklung")
            else:
                errors.append("🔴 KRITISCH: SECRET_KEY muss in Produktion geändert werden! Setze SECRET_KEY Environment Variable.")
        
        # DEBUG in Produktion
        if self.DEBUG and "render.com" in self.DATABASE_URL:
            warnings.append("⚠️  DEBUG ist aktiviert aber DATABASE_URL deutet auf Produktion hin")
        
        # Logging
        for warning in warnings:
            logger.warning(warning)
        
        for error in errors:
            logger.error(error)
            # In Produktion mit Default-Key nicht starten
            if not self.DEBUG and self.SECRET_KEY == _DEFAULT_SECRET_KEY:
                raise ValueError("Anwendung kann nicht mit Default SECRET_KEY in Produktion gestartet werden!")


settings = Settings()

# Sicherheitsvalidierung beim Import
settings.validate_security()
