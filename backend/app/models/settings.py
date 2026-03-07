from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from app.core.database import Base


class GlobalSettings(Base):
    """Globale Einstellungen für das Portal (Feature Flags etc.)"""
    __tablename__ = "global_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text)  # Wert als String (wird je nach Typ konvertiert)
    value_type = Column(String(20), default="string")  # string, boolean, integer, json
    description = Column(Text)  # Beschreibung für Admin-UI
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer)  # User-ID des Admins


# Standard Feature Flags
DEFAULT_SETTINGS = {
    # Matching Features
    "matching_enabled_for_companies": {
        "value": "true",
        "value_type": "boolean",
        "description": "Ermöglicht Firmen das Matching-Score der Bewerber zu sehen"
    },
    "matching_enabled_for_applicants": {
        "value": "true", 
        "value_type": "boolean",
        "description": "Ermöglicht Bewerbern das Matching-Score für Stellen zu sehen"
    },
    # Job-Einstellungen
    "max_job_deadline_days": {
        "value": "90",
        "value_type": "integer",
        "description": "Maximale Anzahl Tage, wie lange eine Stelle aktiv bleiben kann (Standard: 90 Tage = 3 Monate)"
    },
    "auto_deactivate_expired_jobs": {
        "value": "true",
        "value_type": "boolean",
        "description": "Automatisch Jobs deaktivieren wenn Deadline erreicht"
    },
    "archive_deletion_days": {
        "value": "90",
        "value_type": "integer",
        "description": "Nach wie vielen Tagen archivierte Stellen endgültig gelöscht werden (Standard: 90 Tage = 3 Monate)"
    },
    # E-Mail Benachrichtigungen
    "job_notifications_enabled": {
        "value": "true",
        "value_type": "boolean",
        "description": "E-Mail-Benachrichtigungen an Bewerber aktivieren"
    },
    "job_notifications_threshold": {
        "value": "85",
        "value_type": "integer",
        "description": "Mindest-Matching-Score für E-Mail-Benachrichtigungen (0-100)"
    },
    "instant_job_notifications_enabled": {
        "value": "true",
        "value_type": "boolean",
        "description": "Sofortige E-Mail bei neuer passender Stelle senden"
    },
    "weekly_digest_enabled": {
        "value": "true",
        "value_type": "boolean",
        "description": "Wöchentliche Zusammenfassung passender Stellen senden"
    },
    "weekly_digest_days": {
        "value": "[1]",
        "value_type": "json",
        "description": "Wochentage für Digest-E-Mail (0=Sonntag, 1=Montag, ..., 6=Samstag)"
    },
    "weekly_digest_hour": {
        "value": "9",
        "value_type": "integer",
        "description": "Uhrzeit für Digest-E-Mail (0-23, UTC)"
    }
}

