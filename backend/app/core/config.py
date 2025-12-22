from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "IJP Portal API"
    DEBUG: bool = False  # WICHTIG: In Produktion immer False!
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (SQLite für Entwicklung, PostgreSQL/MySQL für Produktion)
    DATABASE_URL: str = "sqlite:///./ijp_portal.db"
    
    # JWT - WICHTIG: SECRET_KEY muss in Produktion über Environment Variable gesetzt werden!
    SECRET_KEY: str = "CHANGE-THIS-IN-PRODUCTION-USE-ENV-VAR"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: list = ["pdf"]  # Nur PDF-Dokumente erlaubt
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # Frontend URL (für E-Mail Links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Email Settings
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@ijp-portal.de"
    FROM_NAME: str = "IJP Portal"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
