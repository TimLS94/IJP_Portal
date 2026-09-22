"""
Positionstyp-Gruppen für Jobalerts / Stellenempfehlungen.

Sonderrolle "general" ("Allgemein / Sonstige") = **Wildcard/Catch-all**:
  - Ein general-JOB ist für ALLE Bewerber offen (Helferjob = niedrigste Hürde).
  - Ein general-BEWERBER ("Sonstige" / offen) matcht ALLE Job-Typen.

Beziehungen der übrigen Stellenarten:
  - workandholiday -> saisonjob   (GERICHTET, nicht symmetrisch):
      Work-&-Holiday-Bewerber machen auch Saisonarbeit, sind also auch für
      Saison-Jobs offen. Ein reiner Saison-Bewerber ist aber NICHT automatisch
      für Work&Holiday offen (das braucht ein spezielles Visum).
  - fachkraft / studentenferienjob / ausbildung  (jeweils einzeln)

Ein Bewerber, der z.B. nur "ausbildung" sucht, bekommt ausschließlich
Ausbildungs-Alerts (plus alle general-Jobs, weil diese Wildcard sind).
Wer "workandholiday" sucht, bekommt auch "saisonjob" – aber nicht umgekehrt.
"""
from typing import Iterable, List, Optional

# "Allgemein / Sonstige" – wirkt in beide Richtungen als Wildcard.
GENERAL = "general"

# Gerichtete Erweiterungen (Ober-Kategorien): Wer den Schlüssel-Typ sucht, ist auch
# für die Werte-Typen offen – aber NICHT umgekehrt.
POSITION_EXPANSIONS = {
    "workandholiday": {"saisonjob"},  # W&H ist immer auch Saison, Saison aber nicht W&H
}


def expand_position_types(types: Iterable[str]) -> set:
    """Erweitert gewünschte Stellenarten um ihre (gerichteten) Ober-Kategorien."""
    result: set = set()
    for t in types:
        if not t:
            continue
        result.add(t)
        result |= POSITION_EXPANSIONS.get(t, set())
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


def get_job_position_types(job) -> List[str]:
    """Liest die Stellenarten eines Jobs (Liste oder Legacy-Einzelwert).
    
    Unterstützt sowohl das neue position_types Array als auch das Legacy position_type Feld.
    """
    types: List[str] = []
    raw = getattr(job, "position_types", None)
    if isinstance(raw, list):
        types = [str(t) for t in raw if t]
    if not types:
        legacy = getattr(job, "position_type", None)
        if legacy is not None:
            types = [legacy.value if hasattr(legacy, "value") else str(legacy)]
    return types


def position_compatible(applicant_types: List[str], job_type: Optional[str]) -> bool:
    """True, wenn die Stellenart des Jobs zu den (erweiterten) Wünschen des Bewerbers passt.

    "general" wirkt als Wildcard: ein general-Job passt zu jedem Bewerber, und ein
    general-Bewerber passt zu jedem Job. Hat der Bewerber gar keine Stellenart
    angegeben, gilt ebenfalls 'keine Einschränkung' -> True.
    
    HINWEIS: Diese Funktion prüft nur einen einzelnen job_type. Für Jobs mit mehreren
    Stellenarten (position_types) sollte position_compatible_multi verwendet werden.
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


def position_compatible_multi(applicant_types: List[str], job_types: List[str]) -> bool:
    """True, wenn MINDESTENS EINE Stellenart des Jobs zu den Wünschen des Bewerbers passt.
    
    Erweiterte Version von position_compatible für Jobs mit mehreren Stellenarten.
    Ein Match liegt vor, wenn der Bewerber mindestens eine der Job-Stellenarten sucht.
    
    Beispiel: Job hat ["fachkraft", "saisonjob", "workandholiday"]
              Bewerber sucht ["saisonjob"]
              -> Match, weil "saisonjob" in beiden vorkommt
    """
    if not job_types:
        return False
    if not applicant_types:
        return True  # keine Präferenz -> alle Stellenarten erlaubt
    
    # Wildcard-Checks
    if GENERAL in job_types:
        return True  # Allgemein-Job: für alle Bewerber offen
    if GENERAL in applicant_types:
        return True  # Allgemein-Bewerber: offen für alle Stellenarten
    
    # Erweitere die Bewerber-Typen (z.B. workandholiday -> auch saisonjob)
    expanded_applicant_types = expand_position_types(applicant_types)
    
    # Prüfe ob mindestens eine Job-Stellenart in den erweiterten Bewerber-Typen ist
    for jt in job_types:
        if jt in expanded_applicant_types:
            return True
    
    return False
