"""
Matching-Service für Bewerber und Stellen

Berechnet einen Matching-Score basierend auf:
- Sprachkenntnisse
- Positionstyp
- Berufserfahrung
- Qualifikationen

WICHTIG: Keine Berücksichtigung von:
- Geschlecht
- Nationalität/Herkunft
- Alter
- Religion
- etc.
"""

from sqlalchemy.orm import Session
from app.models.applicant import Applicant, PositionType, LanguageLevel
from app.models.job_posting import JobPosting, RequiredLanguageLevel


# Sprachniveau-Mapping für Vergleich
LANGUAGE_LEVEL_ORDER = {
    'keine': 0, 'none': 0, 'not_required': 0,
    'a1': 1, 'A1': 1,
    'a2': 2, 'A2': 2, 'basic': 2,
    'b1': 3, 'B1': 3, 'good': 3,
    'b2': 4, 'B2': 4,
    'c1': 5, 'C1': 5, 'fluent': 5,
    'c2': 6, 'C2': 6,
    'muttersprachlich': 7, 'native': 7
}


def calculate_match_score(applicant: Applicant, job: JobPosting) -> dict:
    """
    Berechnet den Matching-Score zwischen Bewerber und Stelle.
    
    Returns:
        dict: {
            "total_score": int (0-100),
            "breakdown": {
                "position_type": int,
                "german_level": int,
                "english_level": int,
                "experience": int,
                "availability": int
            },
            "details": [str]  # Erklärungen
        }
    """
    scores = {
        "position_type": 0,
        "german_level": 0,
        "english_level": 0,
        "experience": 0,
        "availability": 0
    }
    details = []
    
    # 1. Positionstyp-Match (30 Punkte)
    position_match = _check_position_match(applicant, job)
    scores["position_type"] = position_match["score"]
    if position_match["match"]:
        details.append(f"✓ Positionstyp passt: {job.position_type.value}")
    else:
        details.append(f"✗ Positionstyp stimmt nicht überein")
    
    # 2. Deutschkenntnisse (25 Punkte)
    german_match = _check_language_match(
        applicant.german_level.value if applicant.german_level else "keine",
        job.german_required.value if job.german_required else "not_required"
    )
    scores["german_level"] = german_match["score"]
    if german_match["exceeds"]:
        details.append(f"✓ Deutschkenntnisse übertreffen Anforderungen")
    elif german_match["meets"]:
        details.append(f"✓ Deutschkenntnisse erfüllen Anforderungen")
    else:
        details.append(f"✗ Deutschkenntnisse unter Anforderungen ({german_match['gap']} Stufen)")
    
    # 3. Englischkenntnisse (15 Punkte)
    english_match = _check_language_match(
        applicant.english_level.value if applicant.english_level else "keine",
        job.english_required.value if job.english_required else "not_required"
    )
    scores["english_level"] = english_match["score"]
    if english_match["meets"] or english_match["exceeds"]:
        details.append(f"✓ Englischkenntnisse erfüllen Anforderungen")
    elif job.english_required and job.english_required.value != "not_required":
        details.append(f"✗ Englischkenntnisse unter Anforderungen")
    
    # 4. Berufserfahrung (20 Punkte)
    exp_match = _check_experience_match(applicant, job)
    scores["experience"] = exp_match["score"]
    if exp_match["has_experience"]:
        details.append(f"✓ {applicant.work_experience_years or 0} Jahre Berufserfahrung")
    
    # 5. Verfügbarkeit (10 Punkte)
    availability_match = _check_availability_match(applicant, job)
    scores["availability"] = availability_match["score"]
    if availability_match["available"]:
        details.append(f"✓ Verfügbarkeit passt")
    
    # Gesamtscore berechnen (max 100)
    total_score = min(100, sum(scores.values()))
    
    return {
        "total_score": total_score,
        "breakdown": scores,
        "details": details,
        "recommendation": _get_recommendation(total_score)
    }


def _check_position_match(applicant: Applicant, job: JobPosting) -> dict:
    """Prüft ob der Positionstyp passt (30 Punkte)"""
    job_type = job.position_type.value if job.position_type else None
    
    # Prüfe position_types Array (Mehrfachauswahl)
    applicant_types = applicant.position_types or []
    if isinstance(applicant_types, list) and job_type in applicant_types:
        return {"match": True, "score": 30}
    
    # Fallback auf einzelnes position_type
    if applicant.position_type and applicant.position_type.value == job_type:
        return {"match": True, "score": 30}
    
    return {"match": False, "score": 0}


def _check_language_match(applicant_level: str, required_level: str) -> dict:
    """Prüft Sprachkenntnisse (25/15 Punkte)"""
    max_score = 25  # Wird für Englisch auf 15 skaliert
    
    applicant_score = LANGUAGE_LEVEL_ORDER.get(applicant_level, 0)
    required_score = LANGUAGE_LEVEL_ORDER.get(required_level, 0)
    
    if required_score == 0:
        # Keine Anforderung = volle Punktzahl
        return {"meets": True, "exceeds": True, "gap": 0, "score": max_score}
    
    if applicant_score >= required_score:
        # Erfüllt oder übertrifft
        exceeds = applicant_score > required_score
        return {"meets": True, "exceeds": exceeds, "gap": 0, "score": max_score}
    else:
        # Nicht erfüllt - proportional reduzieren
        gap = required_score - applicant_score
        score = max(0, max_score - (gap * 5))
        return {"meets": False, "exceeds": False, "gap": gap, "score": score}


def _check_experience_match(applicant: Applicant, job: JobPosting) -> dict:
    """Prüft Berufserfahrung (20 Punkte)"""
    years = applicant.work_experience_years or 0
    
    # Strukturierte Berufserfahrungen zählen
    work_exp_count = 0
    if applicant.work_experiences:
        try:
            work_exp_count = len(applicant.work_experiences)
        except:
            pass
    
    # Basis-Score für Erfahrung
    score = 0
    if years > 0:
        score = min(15, years * 3)  # Max 15 Punkte für Jahre
    
    if work_exp_count > 0:
        score += min(5, work_exp_count * 2)  # Max 5 Punkte für Einträge
    
    return {
        "has_experience": years > 0 or work_exp_count > 0,
        "years": years,
        "entries": work_exp_count,
        "score": min(20, score)
    }


def _check_availability_match(applicant: Applicant, job: JobPosting) -> dict:
    """Prüft Verfügbarkeit (10 Punkte)"""
    # Für Studentenferienjobs: Semesterferien prüfen
    if job.position_type and job.position_type.value == "studentenferienjob":
        if applicant.semester_break_start and applicant.semester_break_end:
            if job.start_date:
                if applicant.semester_break_start <= job.start_date <= applicant.semester_break_end:
                    return {"available": True, "score": 10}
            return {"available": True, "score": 8}  # Hat Semesterferien angegeben
    
    # Für Saisonjobs: available_from/until prüfen
    if job.position_type and job.position_type.value == "saisonjob":
        if applicant.available_from:
            if job.start_date and applicant.available_from <= job.start_date:
                return {"available": True, "score": 10}
            return {"available": True, "score": 7}
    
    # Standard: Verfügbar
    return {"available": True, "score": 5}


def _get_recommendation(score: int) -> str:
    """Gibt eine Empfehlung basierend auf dem Score"""
    if score >= 80:
        return "Sehr gute Übereinstimmung"
    elif score >= 60:
        return "Gute Übereinstimmung"
    elif score >= 40:
        return "Teilweise Übereinstimmung"
    else:
        return "Geringe Übereinstimmung"


def get_top_matches_for_job(db: Session, job_id: int, limit: int = 20) -> list:
    """Findet die besten Bewerber-Matches für eine Stelle"""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        return []
    
    applicants = db.query(Applicant).all()
    matches = []
    
    for applicant in applicants:
        match = calculate_match_score(applicant, job)
        matches.append({
            "applicant_id": applicant.id,
            "applicant_name": f"{applicant.first_name} {applicant.last_name}",
            **match
        })
    
    # Nach Score sortieren
    matches.sort(key=lambda x: x["total_score"], reverse=True)
    return matches[:limit]


def get_top_matches_for_applicant(db: Session, applicant_id: int, limit: int = 20) -> list:
    """Findet die besten Stellen-Matches für einen Bewerber"""
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        return []
    
    jobs = db.query(JobPosting).filter(JobPosting.is_active == True).all()
    matches = []
    
    for job in jobs:
        match = calculate_match_score(applicant, job)
        matches.append({
            "job_id": job.id,
            "job_title": job.title,
            "company_id": job.company_id,
            **match
        })
    
    # Nach Score sortieren
    matches.sort(key=lambda x: x["total_score"], reverse=True)
    return matches[:limit]

