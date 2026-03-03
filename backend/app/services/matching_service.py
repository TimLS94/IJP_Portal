"""
Matching-Service für Bewerber und Stellen

Berechnet einen Matching-Score basierend auf:
- Sprachkenntnisse (35 Punkte: 25 Deutsch, 10 Englisch)
- Berufserfahrung (25 Punkte)
- Textvergleich Profil/Stelle (25 Punkte) - NEU
- Verfügbarkeit (10 Punkte)
- Positionstyp (5 Punkte) - REDUZIERT

Zusätzlich: Datenqualitäts-Indikator
- Zeigt an, wenn zu wenig Daten für aussagekräftigen Score

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
    
    NEUE GEWICHTUNG:
    - Deutschkenntnisse: 25 Punkte
    - Berufserfahrung: 25 Punkte  
    - Textvergleich: 25 Punkte (NEU)
    - Englischkenntnisse: 10 Punkte
    - Verfügbarkeit: 10 Punkte
    - Positionstyp: 5 Punkte (REDUZIERT)
    
    Returns:
        dict: {
            "total_score": int (0-100),
            "breakdown": {...},
            "details": [str],
            "data_quality": {...}  # NEU: Datenqualitäts-Indikator
        }
    """
    scores = {
        "position_type": 0,
        "german_level": 0,
        "english_level": 0,
        "experience": 0,
        "text_match": 0,
        "availability": 0
    }
    details = []
    data_quality = _calculate_data_quality(applicant, job)
    
    # 1. Deutschkenntnisse (25 Punkte) - WICHTIGSTER FAKTOR
    german_match = _check_language_match(
        applicant.german_level.value if applicant.german_level else "keine",
        job.german_required.value if job.german_required else "not_required",
        max_score=25
    )
    scores["german_level"] = german_match["score"]
    if german_match["exceeds"]:
        details.append(f"✓ Deutschkenntnisse übertreffen Anforderungen")
    elif german_match["meets"]:
        details.append(f"✓ Deutschkenntnisse erfüllen Anforderungen")
    else:
        details.append(f"✗ Deutschkenntnisse unter Anforderungen ({german_match['gap']} Stufen)")
    
    # 2. Berufserfahrung (25 Punkte)
    exp_match = _check_experience_match(applicant, job)
    scores["experience"] = exp_match["score"]
    if exp_match.get("has_relevant_experience"):
        details.append(f"✓ Relevante Berufserfahrung: {', '.join(exp_match.get('relevant_entries', []))}")
    elif exp_match["has_experience"]:
        details.append(f"○ {applicant.work_experience_years or 0} Jahre Berufserfahrung (nicht stellenrelevant)")
    
    # 3. Textvergleich Profil/Stelle (25 Punkte) - NEU
    text_match = _check_text_match(applicant, job)
    scores["text_match"] = text_match["score"]
    if text_match["score"] >= 20:
        details.append(f"✓ Profil passt sehr gut zur Stellenbeschreibung")
    elif text_match["score"] >= 10:
        details.append(f"○ Profil passt teilweise zur Stellenbeschreibung")
    elif text_match["matched_keywords"]:
        details.append(f"○ Einige Übereinstimmungen: {', '.join(text_match['matched_keywords'][:3])}")
    
    # 4. Englischkenntnisse (10 Punkte)
    english_match = _check_language_match(
        applicant.english_level.value if applicant.english_level else "keine",
        job.english_required.value if job.english_required else "not_required",
        max_score=10
    )
    scores["english_level"] = english_match["score"]
    if english_match["meets"] or english_match["exceeds"]:
        details.append(f"✓ Englischkenntnisse erfüllen Anforderungen")
    elif job.english_required and job.english_required.value != "not_required":
        details.append(f"✗ Englischkenntnisse unter Anforderungen")
    
    # 5. Verfügbarkeit (10 Punkte)
    availability_match = _check_availability_match(applicant, job)
    scores["availability"] = availability_match["score"]
    if availability_match["available"]:
        details.append(f"✓ Verfügbarkeit passt")
    
    # 6. Positionstyp-Match (5 Punkte) - STARK REDUZIERT
    position_match = _check_position_match(applicant, job)
    scores["position_type"] = position_match["score"]
    if position_match["match"]:
        details.append(f"✓ Positionstyp passt")
    
    # Gesamtscore berechnen (max 100)
    total_score = min(100, sum(scores.values()))
    
    return {
        "total_score": total_score,
        "breakdown": scores,
        "details": details,
        "recommendation": _get_recommendation(total_score),
        "data_quality": data_quality
    }


def _check_position_match(applicant: Applicant, job: JobPosting) -> dict:
    """Prüft ob der Positionstyp passt (5 Punkte) - STARK REDUZIERT"""
    job_type = job.position_type.value if job.position_type else None
    
    # Prüfe position_types Array (Mehrfachauswahl)
    applicant_types = applicant.position_types or []
    if isinstance(applicant_types, list) and job_type in applicant_types:
        return {"match": True, "score": 5}
    
    # Fallback auf einzelnes position_type
    if applicant.position_type and applicant.position_type.value == job_type:
        return {"match": True, "score": 5}
    
    # Kein Match, aber trotzdem ein paar Punkte wenn Bewerber flexibel ist
    if len(applicant_types) >= 3:
        return {"match": False, "score": 2}  # Flexibler Bewerber
    
    return {"match": False, "score": 0}


def _check_language_match(applicant_level: str, required_level: str, max_score: int = 25) -> dict:
    """
    Prüft Sprachkenntnisse.
    
    Args:
        applicant_level: Sprachniveau des Bewerbers
        required_level: Gefordertes Sprachniveau
        max_score: Maximale Punktzahl (25 für Deutsch, 15 für Englisch)
    """
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
        # Nicht erfüllt - proportional reduzieren basierend auf Gap
        gap = required_score - applicant_score
        # Pro Stufe Unterschied: größerer Abzug (proportional zum max_score)
        penalty_per_level = max_score / required_score  # Dynamische Strafe
        score = max(0, int(max_score - (gap * penalty_per_level * 1.5)))
        return {"meets": False, "exceeds": False, "gap": gap, "score": score}


def _check_experience_match(applicant: Applicant, job: JobPosting) -> dict:
    """
    Prüft Berufserfahrung (25 Punkte).
    
    Bewertet:
    - Relevante Berufserfahrung (passt zur Stelle): bis 18 Punkte
    - Allgemeine Berufserfahrung: bis 7 Punkte
    """
    years = applicant.work_experience_years or 0
    job_title = (job.title or "").lower()
    job_desc = (job.description or "").lower()
    job_tasks = (job.tasks or "").lower()
    
    # Keywords aus Stellentitel, Beschreibung und Aufgaben extrahieren
    job_keywords = _extract_keywords(f"{job_title} {job_desc} {job_tasks}")
    
    # Strukturierte Berufserfahrungen analysieren
    relevant_experience = 0
    total_experience = 0
    relevant_entries = []
    
    if applicant.work_experiences:
        try:
            for exp in applicant.work_experiences:
                if isinstance(exp, dict):
                    position = (exp.get("position", "") or "").lower()
                    company = (exp.get("company", "") or "").lower()
                    description = (exp.get("description", "") or "").lower()
                    
                    total_experience += 1
                    
                    # Prüfe ob Erfahrung relevant ist
                    exp_text = f"{position} {company} {description}"
                    exp_keywords = _extract_keywords(exp_text)
                    
                    # Berechne Übereinstimmung
                    if job_keywords and exp_keywords:
                        matches = len(job_keywords.intersection(exp_keywords))
                        if matches > 0:
                            relevant_experience += 1
                            relevant_entries.append(exp.get("position", ""))
        except:
            pass
    
    # Score berechnen
    score = 0
    
    # Relevante Erfahrung: bis 18 Punkte
    if relevant_experience > 0:
        score += min(18, relevant_experience * 6)  # 6 Punkte pro relevanter Erfahrung
    elif years > 0:
        # Fallback: Allgemeine Jahre (weniger Punkte)
        score += min(10, years * 2)  # Max 10 Punkte für allgemeine Jahre
    
    # Bonus für viel Erfahrung: bis 7 Punkte
    if total_experience > 0:
        score += min(7, total_experience * 2)  # 2 Punkte pro Eintrag, max 7
    elif years > 3:
        score += min(7, (years - 3) * 2)  # Bonus für >3 Jahre
    
    return {
        "has_experience": years > 0 or total_experience > 0,
        "has_relevant_experience": relevant_experience > 0,
        "relevant_entries": relevant_entries,
        "years": years,
        "entries": total_experience,
        "score": min(25, score)
    }


def _extract_keywords(text: str) -> set:
    """
    Extrahiert relevante Keywords aus einem Text für Matching.
    Entfernt Stoppwörter und normalisiert.
    """
    if not text:
        return set()
    
    # Stoppwörter (Deutsch/Englisch)
    stopwords = {
        'der', 'die', 'das', 'und', 'oder', 'für', 'in', 'bei', 'mit', 'von',
        'zu', 'auf', 'ist', 'im', 'als', 'auch', 'an', 'nach', 'wie', 'aus',
        'the', 'and', 'or', 'for', 'in', 'at', 'with', 'from', 'to', 'on',
        'm', 'w', 'd', 'mwd', 'gmbh', 'ag', 'kg', 'ug', 'mbh', 'hotel', 'stelle'
    }
    
    # Synonyme/verwandte Begriffe
    synonyms = {
        'housekeeping': {'reinigung', 'zimmerreinigung', 'zimmermädchen', 'roomkeeper', 'cleaning', 'hauswirtschaft'},
        'reinigung': {'housekeeping', 'zimmerreinigung', 'cleaning', 'sauberkeit'},
        'zimmerreinigung': {'housekeeping', 'reinigung', 'zimmermädchen'},
        'küche': {'koch', 'kochen', 'kitchen', 'küchenhilfe', 'gastro'},
        'koch': {'küche', 'kochen', 'kitchen', 'gastro', 'culinary'},
        'service': {'kellner', 'bedienung', 'gastronomie', 'restaurant', 'waiter'},
        'kellner': {'service', 'bedienung', 'gastronomie', 'waiter'},
        'rezeption': {'empfang', 'reception', 'front', 'desk', 'gästebetreuung'},
        'empfang': {'rezeption', 'reception', 'front', 'desk'},
        'pflege': {'altenpflege', 'krankenpflege', 'care', 'betreuung'},
        'lager': {'logistik', 'warehouse', 'kommissionierung', 'versand'},
        'büro': {'office', 'verwaltung', 'administration', 'sekretariat'},
    }
    
    # Text in Wörter aufteilen
    words = set()
    for word in text.lower().replace('-', ' ').replace('/', ' ').split():
        # Nur Wörter mit mindestens 3 Zeichen
        word = ''.join(c for c in word if c.isalnum())
        if len(word) >= 3 and word not in stopwords:
            words.add(word)
            # Synonyme hinzufügen
            if word in synonyms:
                words.update(synonyms[word])
    
    return words


def _check_text_match(applicant: Applicant, job: JobPosting) -> dict:
    """
    Vergleicht Bewerber-Profil mit Stellenbeschreibung (25 Punkte) - NEU.
    
    Analysiert:
    - Berufserfahrung-Beschreibungen vs. Stellenanforderungen
    - Zusätzliche Infos vs. Aufgaben/Benefits
    - Gewünschter Beruf vs. Stellentitel
    """
    matched_keywords = []
    score = 0
    
    # Job-Text zusammenstellen
    job_text = " ".join(filter(None, [
        job.title,
        job.description,
        job.tasks,
        job.requirements,
        job.benefits
    ])).lower()
    job_keywords = _extract_keywords(job_text)
    
    # Bewerber-Text zusammenstellen
    applicant_texts = []
    
    # Berufserfahrung (strukturiert)
    if applicant.work_experiences:
        try:
            for exp in applicant.work_experiences:
                if isinstance(exp, dict):
                    applicant_texts.append(exp.get("position", ""))
                    applicant_texts.append(exp.get("description", ""))
                    applicant_texts.append(exp.get("company", ""))
        except:
            pass
    
    # Berufserfahrung (Freitext)
    if applicant.work_experience:
        applicant_texts.append(applicant.work_experience)
    
    # Zusätzliche Infos
    if applicant.additional_info:
        applicant_texts.append(applicant.additional_info)
    
    # Gewünschter Beruf / Fachrichtung
    if applicant.profession:
        applicant_texts.append(applicant.profession)
    if applicant.desired_profession:
        applicant_texts.append(applicant.desired_profession)
    if applicant.preferred_work_area:
        applicant_texts.append(applicant.preferred_work_area)
    if applicant.field_of_study:
        applicant_texts.append(applicant.field_of_study)
    
    applicant_text = " ".join(filter(None, applicant_texts)).lower()
    applicant_keywords = _extract_keywords(applicant_text)
    
    # Übereinstimmungen berechnen
    if job_keywords and applicant_keywords:
        matches = job_keywords.intersection(applicant_keywords)
        matched_keywords = list(matches)[:10]  # Max 10 für Anzeige
        
        # Score basierend auf Anzahl der Matches
        match_count = len(matches)
        if match_count >= 8:
            score = 25  # Sehr viele Übereinstimmungen
        elif match_count >= 5:
            score = 20
        elif match_count >= 3:
            score = 15
        elif match_count >= 2:
            score = 10
        elif match_count >= 1:
            score = 5
    
    return {
        "score": score,
        "matched_keywords": matched_keywords,
        "job_keyword_count": len(job_keywords) if job_keywords else 0,
        "applicant_keyword_count": len(applicant_keywords) if applicant_keywords else 0
    }


def _calculate_data_quality(applicant: Applicant, job: JobPosting) -> dict:
    """
    Berechnet die Datenqualität für den Matching-Score.
    
    Gibt an, ob genügend Daten vorhanden sind für einen aussagekräftigen Score.
    """
    filled_fields = 0
    total_fields = 0
    missing_fields = []
    
    # Wichtige Bewerber-Felder prüfen
    checks = [
        (applicant.german_level and applicant.german_level.value != "none", "Deutschkenntnisse"),
        (applicant.work_experiences and len(applicant.work_experiences) > 0, "Berufserfahrung (strukturiert)"),
        (applicant.work_experience_years and applicant.work_experience_years > 0, "Jahre Berufserfahrung"),
        (applicant.work_experience, "Berufserfahrung (Beschreibung)"),
        (applicant.position_types and len(applicant.position_types) > 0, "Gewünschte Stellenarten"),
        (applicant.additional_info, "Zusätzliche Informationen"),
        (applicant.profession or applicant.desired_profession or applicant.preferred_work_area, "Beruf/Fachrichtung"),
    ]
    
    for is_filled, field_name in checks:
        total_fields += 1
        if is_filled:
            filled_fields += 1
        else:
            missing_fields.append(field_name)
    
    # Qualitätsstufe berechnen
    quality_percent = (filled_fields / total_fields * 100) if total_fields > 0 else 0
    
    if quality_percent >= 70:
        quality_level = "high"
        quality_label = "Aussagekräftig"
        quality_description = "Genügend Daten für zuverlässigen Score"
    elif quality_percent >= 40:
        quality_level = "medium"
        quality_label = "Eingeschränkt"
        quality_description = "Einige Daten fehlen, Score könnte ungenau sein"
    else:
        quality_level = "low"
        quality_label = "Unzureichend"
        quality_description = "Zu wenig Daten für aussagekräftigen Score"
    
    return {
        "level": quality_level,
        "label": quality_label,
        "description": quality_description,
        "percent": round(quality_percent),
        "filled_fields": filled_fields,
        "total_fields": total_fields,
        "missing_fields": missing_fields[:3],  # Max 3 anzeigen
        "is_reliable": quality_percent >= 50
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


