from sqlalchemy.orm import Session
from app.models.settings import GlobalSettings, DEFAULT_SETTINGS
import json


def get_setting(db: Session, key: str, default=None):
    """Holt eine Einstellung aus der Datenbank"""
    setting = db.query(GlobalSettings).filter(GlobalSettings.key == key).first()
    
    if not setting:
        # Fallback auf Default-Wert
        if key in DEFAULT_SETTINGS:
            return _convert_value(
                DEFAULT_SETTINGS[key]["value"],
                DEFAULT_SETTINGS[key]["value_type"]
            )
        return default
    
    return _convert_value(setting.value, setting.value_type)


def set_setting(db: Session, key: str, value, user_id: int = None):
    """Setzt eine Einstellung in der Datenbank"""
    setting = db.query(GlobalSettings).filter(GlobalSettings.key == key).first()
    
    # Value-Type bestimmen
    value_type = "string"
    if isinstance(value, bool):
        value_type = "boolean"
        value = "true" if value else "false"
    elif isinstance(value, int):
        value_type = "integer"
        value = str(value)
    elif isinstance(value, dict) or isinstance(value, list):
        value_type = "json"
        value = json.dumps(value)
    else:
        value = str(value)
    
    if setting:
        setting.value = value
        setting.value_type = value_type
        setting.updated_by = user_id
    else:
        # Beschreibung aus Defaults holen
        description = DEFAULT_SETTINGS.get(key, {}).get("description", "")
        setting = GlobalSettings(
            key=key,
            value=value,
            value_type=value_type,
            description=description,
            updated_by=user_id
        )
        db.add(setting)
    
    db.commit()
    return setting


def get_all_settings(db: Session):
    """Holt alle Einstellungen"""
    settings = db.query(GlobalSettings).all()
    result = {}
    
    # Erst Defaults
    for key, data in DEFAULT_SETTINGS.items():
        result[key] = {
            "value": _convert_value(data["value"], data["value_type"]),
            "description": data["description"],
            "is_default": True
        }
    
    # Dann DB-Werte überschreiben
    for setting in settings:
        result[setting.key] = {
            "value": _convert_value(setting.value, setting.value_type),
            "description": setting.description,
            "is_default": False,
            "updated_at": setting.updated_at
        }
    
    return result


def init_default_settings(db: Session):
    """Initialisiert Standard-Einstellungen falls nicht vorhanden"""
    for key, data in DEFAULT_SETTINGS.items():
        existing = db.query(GlobalSettings).filter(GlobalSettings.key == key).first()
        if not existing:
            setting = GlobalSettings(
                key=key,
                value=data["value"],
                value_type=data["value_type"],
                description=data["description"]
            )
            db.add(setting)
    db.commit()


def _convert_value(value: str, value_type: str):
    """Konvertiert String-Value zum richtigen Typ"""
    if value_type == "boolean":
        return value.lower() in ("true", "1", "yes")
    elif value_type == "integer":
        return int(value)
    elif value_type == "json":
        return json.loads(value)
    return value


# Feature Flag Helper
def is_company_matching_enabled(db: Session) -> bool:
    """Prüft ob Matching für Firmen aktiviert ist"""
    return get_setting(db, "matching_enabled_for_companies", True)


def is_applicant_matching_enabled(db: Session) -> bool:
    """Prüft ob Matching für Bewerber aktiviert ist"""
    return get_setting(db, "matching_enabled_for_applicants", True)


