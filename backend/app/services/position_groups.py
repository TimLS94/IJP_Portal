"""
Positionstyp-Gruppen für Jobalerts / Stellenempfehlungen.

Sonderrolle "general" ("Allgemein / Sonstige") = **Wildcard/Catch-all**:
  - Ein general-JOB ist für ALLE Bewerber offen (Helferjob = niedrigste Hürde).
  - Ein general-BEWERBER ("Sonstige" / offen) matcht ALLE Job-Typen.

Restliche Gruppen überschneiden sich inhaltlich (symmetrisch):
  - saisonjob ↔ workandholiday     (kommen zusammen)
  - fachkraft                       (einzeln, eigenständig)
  - studentenferienjob              (einzeln)
  - ausbildung                      (einzeln)

Ein Bewerber, der z.B. nur "ausbildung" sucht, bekommt ausschließlich
Ausbildungs-Alerts (plus alle general-Jobs, weil diese Wildcard sind).
Wer "saisonjob" sucht, bekommt auch "workandholiday".
"""
from typing import Iterable, List, Optional

# "Allgemein / Sonstige" – wirkt in beide Richtungen als Wildcard.
GENERAL = "general"

# Symmetrische Gruppen (Äquivalenzklassen). "general" ist bewusst NICHT enthalten,
# da es als Wildcard gesondert behandelt wird.
POSITION_GROUPS: List[set] = [
    {"saisonjob", "workandholiday"},
    {"fachkraft"},
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

    "general" wirkt als Wildcard: ein general-Job passt zu jedem Bewerber, und ein
    general-Bewerber passt zu jedem Job. Hat der Bewerber gar keine Stellenart
    angegeben, gilt ebenfalls 'keine Einschränkung' -> True.
    """
    if not job_type:
        return False
    if not applicant_types:
        return True  # keine Präferenz -> alle Stellenarten erlaubt
    if job_type == GENERAL:
        return True  # Allgemein-Job: für alle Bewerber offen
    if GENERAL in applicant_types:
        return True  # Allgemein-Bewerber: offen für alle Stellenarten
    return job_type in expand_position_types(applicant_types)
