from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "IJP Portal API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (SQLite für Entwicklung, MySQL für Produktion)
    DATABASE_URL: str = "sqlite:///./ijp_portal.db"
    # Für MySQL: DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/ijp_portal"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
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
