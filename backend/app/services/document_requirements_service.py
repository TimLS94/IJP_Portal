"""
Liefert die effektiven Dokumentenanforderungen pro Stellenart.

Basis sind die Defaults aus DOCUMENT_REQUIREMENTS. Der Admin kann pro
Stellenart überschreiben, welche der jeweils relevanten Dokumente Pflicht
sind (gespeichert als Setting). Fallback ist immer der Default.
"""
from app.models.document import DOCUMENT_REQUIREMENTS
from app.services.settings_service import get_setting

SETTING_KEY = "document_required_overrides"  # { position_type: [doc_type_value, ...] }


def get_effective_requirements(db) -> dict:
    """Gibt {position_type: {'required': [DocumentType], 'optional': [DocumentType], 'descriptions': {...}}} zurück."""
    overrides = get_setting(db, SETTING_KEY, {}) or {}
    if not isinstance(overrides, dict):
        overrides = {}

    result = {}
    for pos, conf in DOCUMENT_REQUIREMENTS.items():
        default_required = list(conf.get("required", []))
        default_optional = list(conf.get("optional", []))
        descriptions = conf.get("descriptions", {})
        relevant = default_required + default_optional  # alle relevanten Doku-Typen dieser Stellenart

        if pos in overrides and isinstance(overrides[pos], list):
            req_values = set(overrides[pos])
            required = [dt for dt in relevant if dt.value in req_values]
            optional = [dt for dt in relevant if dt.value not in req_values]
        else:
            required = default_required
            optional = default_optional

        result[pos] = {"required": required, "optional": optional, "descriptions": descriptions}
    return result


def get_for_position(db, position_type: str) -> dict:
    """Effektive Anforderungen für eine einzelne Stellenart (oder {})."""
    return get_effective_requirements(db).get(position_type, {})
