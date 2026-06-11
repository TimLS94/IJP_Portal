"""
Positionstyp-Gruppen für Jobalerts / Stellenempfehlungen.

Manche Stellenarten überschneiden sich inhaltlich und sollen sich für
Benachrichtigungen gegenseitig auslösen (symmetrisch):

  - general  ↔ fachkraft           (kommen zusammen)
  - saisonjob ↔ workandholiday      (kommen zusammen)
  - studentenferienjob              (einzeln, keine Überschneidung)
  - ausbildung                      (einzeln, keine Überschneidung)

Ein Bewerber, der z.B. nur "ausbildung" sucht, bekommt ausschließlich
Ausbildungs-Alerts. Wer "saisonjob" sucht, bekommt auch "workandholiday".
"""
from typing import Iterable, List, Optional

# Symmetrische Gruppen (Äquivalenzklassen)
POSITION_GROUPS: List[set] = [
    {"general", "fachkraft"},
    {"saisonjob", "workandholiday"},
    {"studentenferienjob"},
    {"ausbildung"},
]


def expand_position_types(types: Iterable[str]) -> set:
    """Erweitert eine Menge gewünschter Stellenarten um alle Gruppen-Partner."""
    result: set = set()
    for t in types:
        if not t:
            continue
        result.add(t)
        for group in POSITION_GROUPS:
            if t in group:
                result |= group
    return result


def get_applicant_position_types(applicant) -> List[str]:
    """Liest die gewünschten Stellenarten eines Bewerbers (Liste oder Legacy-Einzelwert)."""
    types: List[str] = []
    raw = getattr(applicant, "position_types", None)
    if isinstance(raw, list):
        types = [str(t) for t in raw if t]
    if not types:
        legacy = getattr(applicant, "position_type", None)
        if legacy is not None:
            types = [legacy.value if hasattr(legacy, "value") else str(legacy)]
    return types


def position_compatible(applicant_types: List[str], job_type: Optional[str]) -> bool:
    """True, wenn die Stellenart des Jobs zu den (erweiterten) Wünschen des Bewerbers passt.

    Hat der Bewerber keine Stellenart angegeben, gilt 'keine Einschränkung' -> True.
    """
    if not job_type:
        return False
    if not applicant_types:
        return True  # keine Präferenz -> alle Stellenarten erlaubt
    return job_type in expand_position_types(applicant_types)
