"""
CV-Parser: Extrahiert Profilfelder aus hochgeladenen Lebensläufen.
Text-Extraktion via PyMuPDF, Strukturierung via OpenAI GPT-4o-mini (Fallback: Gemini).
"""
import json
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Du bist ein Experte für das Auslesen von Lebensläufen.
Analysiere den folgenden Lebenslauf-Text und extrahiere ALLE Daten als JSON.

Gib NUR valides JSON zurück, keine Erklärungen davor oder danach.

JSON-Schema (alle Felder optional, nur ausfüllen wenn klar erkennbar):
{
  "first_name": "string",
  "last_name": "string",
  "date_of_birth": "YYYY-MM-DD",
  "place_of_birth": "string",
  "nationality": "string",
  "phone": "string",
  "street": "string",
  "house_number": "string",
  "postal_code": "string",
  "city": "string",
  "country": "string",
  "german_level": "none|a1|a2|b1|b2|c1|c2|native",
  "english_level": "none|a1|a2|b1|b2|c1|c2|native",
  "other_languages": [{"language": "string", "level": "string"}],
  "work_experience_years": integer,
  "work_experiences": [
    {
      "company": "string",
      "position": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null (null = aktuell/heute)",
      "description": "string",
      "location": "string"
    }
  ],
  "field_of_study": "string",
  "university_name": "string",
  "university_city": "string",
  "current_semester": integer,
  "school_degree": "string",
  "professional_title": "string"
}

Regeln:
- Sprachniveaus: "Muttersprache"/"native" → "native"; A1/A2/B1/B2/C1/C2 direkt; "fließend"/"sehr gut" → b2; "gut" → b1; "Grundkenntnisse" → a2
- work_experience_years: Summe aller Berufserfahrungen berechnen ODER direkt genannte Zahl nehmen
- work_experiences: ALLE Stellen/Jobs vollständig auflisten — keine auslassen!
  - Für jede Stelle: Firmenname, Stellenbezeichnung, Start- und Enddatum (YYYY-MM)
  - end_date = null wenn "aktuell", "heute", "bis heute", "present", "–"
  - description: kurze Zusammenfassung der Tätigkeiten (max 3 Sätze)
  - location: Stadt/Land wenn angegeben
- date_of_birth nur wenn eindeutig als Geburtsdatum markiert
- Wenn unklar: Feld weglassen (nicht raten)
- JSON muss valide sein

Lebenslauf-Text:
"""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extrahiert Text aus PDF-Bytes via PyMuPDF"""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text("text"))
        doc.close()
        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""


def _extract_json(raw: str) -> Optional[dict]:
    """Extrahiert JSON aus einer Antwort die evtl. Markdown-Blöcke enthält."""
    # Markdown code blocks entfernen
    raw = re.sub(r'```(?:json)?\s*', '', raw).strip()
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group())
    except json.JSONDecodeError:
        return None


def parse_cv_with_openai(text: str, api_key: str) -> Optional[dict]:
    """Schickt den CV-Text an OpenAI GPT-4o-mini."""
    if not text or len(text) < 50:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        truncated = text[:12000]
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du extrahierst strukturierte Daten aus Lebensläufen. Antworte immer mit validem JSON, ohne Erklärungen."},
                {"role": "user", "content": EXTRACTION_PROMPT + truncated},
            ],
            temperature=0.1,
            max_tokens=3000,
        )
        raw = response.choices[0].message.content.strip()
        return _extract_json(raw)
    except Exception as e:
        logger.error(f"OpenAI CV parsing failed: {e}")
        return None


def parse_cv_with_gemini(text: str, api_key: str) -> Optional[dict]:
    """Schickt den CV-Text an Gemini (neues google-genai SDK)."""
    if not text or len(text) < 50:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        truncated = text[:8000]
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=EXTRACTION_PROMPT + truncated,
        )
        raw = response.text.strip()
        return _extract_json(raw)
    except Exception as e:
        logger.error(f"Gemini CV parsing failed: {e}")
        return None


def sanitize_parsed_data(data: dict) -> dict:
    """Bereinigt und validiert die geparsten Daten"""
    valid_levels = {"none", "a1", "a2", "b1", "b2", "c1", "c2", "native"}
    result = {}

    for key in ("first_name", "last_name", "place_of_birth", "nationality",
                "phone", "street", "house_number", "postal_code", "city", "country",
                "field_of_study", "university_name", "university_city",
                "school_degree", "professional_title"):
        if isinstance(data.get(key), str) and data[key].strip():
            result[key] = data[key].strip()

    # Datum
    dob = data.get("date_of_birth")
    if isinstance(dob, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', dob):
        result["date_of_birth"] = dob

    # Sprachniveaus
    for lang_key in ("german_level", "english_level"):
        level = str(data.get(lang_key, "")).lower().strip()
        if level in valid_levels:
            result[lang_key] = level

    # Weitere Sprachen
    other = data.get("other_languages")
    if isinstance(other, list):
        clean_langs = []
        for item in other:
            if isinstance(item, dict) and item.get("language"):
                clean_langs.append({
                    "language": str(item["language"]).strip(),
                    "level": str(item.get("level", "")).strip()
                })
        if clean_langs:
            result["other_languages"] = clean_langs

    # Berufserfahrung Jahre
    years = data.get("work_experience_years")
    if isinstance(years, (int, float)) and 0 <= years <= 60:
        result["work_experience_years"] = int(years)

    # Strukturierte Berufserfahrung
    experiences = data.get("work_experiences")
    if isinstance(experiences, list):
        clean_exp = []
        for exp in experiences:
            if isinstance(exp, dict) and exp.get("company"):
                clean_exp.append({
                    "company":    str(exp.get("company", "")).strip(),
                    "position":   str(exp.get("position", "")).strip(),
                    "start_date": str(exp.get("start_date", "")).strip(),
                    "end_date":   exp.get("end_date"),  # null = aktuell
                    "description":str(exp.get("description", "")).strip(),
                    "location":   str(exp.get("location", "")).strip(),
                })
        if clean_exp:
            result["work_experiences"] = clean_exp
            # work_experience_years aus Einträgen berechnen wenn nicht vorhanden
            if "work_experience_years" not in result:
                result["work_experience_years"] = _calc_years(clean_exp)

    # Semester
    semester = data.get("current_semester")
    if isinstance(semester, (int, float)) and 1 <= semester <= 30:
        result["current_semester"] = int(semester)

    return result


def _calc_years(experiences: list) -> int:
    """Berechnet Berufserfahrung in Jahren aus den Stellen."""
    from datetime import date
    import calendar
    total_months = 0
    for exp in experiences:
        sd = exp.get("start_date", "")
        ed = exp.get("end_date")
        if not sd:
            continue
        try:
            sy, sm = int(sd[:4]), int(sd[5:7]) if len(sd) >= 7 else 1
            if ed:
                ey, em = int(ed[:4]), int(ed[5:7]) if len(ed) >= 7 else 12
            else:
                now = date.today()
                ey, em = now.year, now.month
            total_months += max(0, (ey - sy) * 12 + (em - sm))
        except (ValueError, TypeError):
            continue
    return max(0, total_months // 12)


def parse_cv_regex(text: str) -> dict:
    """
    Robuster regelbasierter Parser für deutsche und englische Lebensläufe.
    Erkennt Sektionen, Berufserfahrungen, Ausbildung und Sprachen ohne AI.
    """
    from datetime import date as _date
    result: dict = {}
    lines = [l.strip() for l in text.split("\n")]
    full = "\n".join(lines)

    # ── Kontaktdaten ──────────────────────────────────────────────────────────
    email_m = re.search(r'[\w.\-+]+@[\w.\-]+\.\w{2,}', full)
    if email_m:
        result["email"] = email_m.group()

    phone_m = re.search(
        r'(?:Tel\.?|Phone|Mobil|Mobile|Handy|Telefon)?[\s:]*(\+?[\d][\d\s\-/().]{6,})',
        full, re.IGNORECASE
    )
    if phone_m:
        ph = phone_m.group(1).strip()
        if len(re.sub(r'\D', '', ph)) >= 7:
            result["phone"] = ph

    # ── Name (erste nicht-leere Zeile die wie Name aussieht) ─────────────────
    for line in lines[:8]:
        words = line.split()
        if 2 <= len(words) <= 4 and all(re.match(r"^[A-ZÄÖÜa-zäöüßé\-']+$", w) for w in words):
            result["first_name"] = words[0]
            result["last_name"] = " ".join(words[1:])
            break

    # ── Geburtsdatum ──────────────────────────────────────────────────────────
    dob_m = re.search(
        r'(?:geboren|geb\.?|birth|dob|birthdate)[:\s*]*(\d{1,2})[./](\d{1,2})[./](\d{4})',
        full, re.IGNORECASE
    )
    if dob_m:
        d, m, y = dob_m.group(1), dob_m.group(2), dob_m.group(3)
        result["date_of_birth"] = f"{y}-{int(m):02d}-{int(d):02d}"

    # ── Sektionen erkennen ────────────────────────────────────────────────────
    SECTION_RE = re.compile(
        r'^(BERUFSERFAHRUNG|BERUFLICHE\s+ERFAHRUNG|WORK\s+EXPERIENCE|EMPLOYMENT|EXPERIENCE|'
        r'AUSBILDUNG|BILDUNG|EDUCATION|QUALIFIKATION|'
        r'SPRACHEN|LANGUAGES|SPRACHKENNTNISSE|'
        r'SKILLS|F[ÄA]HIGKEITEN|KENNTNISSE|TOOLS)',
        re.IGNORECASE
    )
    sections: dict[str, list[str]] = {}
    current_section = "header"
    sections[current_section] = []
    for line in lines:
        if SECTION_RE.match(line):
            current_section = SECTION_RE.match(line).group(1).upper().split()[0]
            sections[current_section] = []
        else:
            sections.setdefault(current_section, []).append(line)

    # ── Datumsformat MM/YYYY oder MM.YYYY → YYYY-MM ───────────────────────────
    def parse_date(s: str) -> Optional[str]:
        m = re.match(r'(\d{1,2})[./](\d{4})', s.strip())
        if m:
            return f"{m.group(2)}-{int(m.group(1)):02d}"
        m2 = re.match(r'(\d{4})-(\d{2})', s.strip())
        if m2:
            return s.strip()[:7]
        return None

    # ── Berufserfahrungen ─────────────────────────────────────────────────────
    experience_section_keys = [k for k in sections if any(
        kw in k for kw in ("BERUFS", "WORK", "EMPLOYMENT", "EXPERIENCE")
    )]
    exp_text = "\n".join(
        "\n".join(sections[k]) for k in experience_section_keys
    )

    # Datums-Range-Muster: "MM/YYYY – MM/YYYY" oder "MM/YYYY – heute"
    DATE_RANGE = re.compile(
        r'(\d{1,2}[./]\d{4})\s*[–—\-]+\s*((?:\d{1,2}[./]\d{4})|heute|aktuell|present|bis\s+heute)',
        re.IGNORECASE
    )
    # Job-Zeile: "Position | Firma" oder "Position – Subtitle | Firma"
    JOB_LINE = re.compile(
        r'^(.+?)\s*[|│]\s*(.+?)(?:\s*[–—\-]+\s*(.+))?$'
    )

    exp_lines = exp_text.split("\n")
    experiences = []
    i = 0
    while i < len(exp_lines):
        line = exp_lines[i].strip()
        # Prüfe ob nächste Zeile ein Datum ist
        next_line = exp_lines[i+1].strip() if i+1 < len(exp_lines) else ""
        date_m = DATE_RANGE.search(line) or DATE_RANGE.search(next_line)
        job_m  = JOB_LINE.match(line)

        if job_m and date_m:
            position_raw = job_m.group(1).strip()
            company_raw  = job_m.group(2).strip()
            location_raw = job_m.group(3).strip() if job_m.group(3) else ""

            start_str = date_m.group(1)
            end_str   = date_m.group(2)
            start_iso = parse_date(start_str)
            end_iso   = None if re.search(r'heute|aktuell|present', end_str, re.I) else parse_date(end_str)

            # Beschreibung: nächste nicht-leere Zeilen sammeln bis zum nächsten Datum
            j = i + 1
            desc_lines = []
            while j < len(exp_lines):
                dl = exp_lines[j].strip()
                if DATE_RANGE.search(dl):
                    j += 1
                    continue
                if JOB_LINE.match(dl) and j + 1 < len(exp_lines) and DATE_RANGE.search(exp_lines[j+1]):
                    break
                if dl:
                    desc_lines.append(dl.lstrip("–—•▪-").strip())
                j += 1
                if len(desc_lines) >= 4:
                    break

            experiences.append({
                "company":     company_raw,
                "position":    position_raw,
                "start_date":  start_iso or "",
                "end_date":    end_iso,
                "description": " ".join(desc_lines[:3]),
                "location":    location_raw,
            })
        i += 1

    if experiences:
        result["work_experiences"] = experiences
        result["work_experience_years"] = _calc_years(experiences)

    # ── Ausbildung ────────────────────────────────────────────────────────────
    edu_keys = [k for k in sections if any(kw in k for kw in ("AUSBILDUNG", "BILDUNG", "EDUCATION", "QUALIFIKATION"))]
    edu_text = "\n".join("\n".join(sections[k]) for k in edu_keys)
    uni_m = re.search(r'(?:Universität|Hochschule|University|College|FH|TU|HTW|HFH)[^\n,]*', edu_text, re.I)
    if uni_m:
        result["university_name"] = uni_m.group().strip()
    study_m = re.search(r'(?:B\.?Sc\.?|M\.?Sc\.?|Bachelor|Master|Diplom)[^\n,|–—]*', edu_text, re.I)
    if study_m:
        result["field_of_study"] = study_m.group().strip()

    # ── Sprachen ─────────────────────────────────────────────────────────────
    lang_keys = [k for k in sections if any(kw in k for kw in ("SPRACH", "LANG"))]
    lang_text = "\n".join("\n".join(sections[k]) for k in lang_keys) or full

    LEVEL_MAP = {
        r'mutterspra\w+|native|c2': 'native',
        r'fließend|verhandlungs|sehr\s+gut|c1': 'c1',
        r'gut|b2': 'b2',
        r'mittel|b1': 'b1',
        r'grundkennt\w+|basic|a2|a1': 'a2',
    }

    def detect_level(s: str) -> str:
        s = s.lower()
        for pat, lvl in LEVEL_MAP.items():
            if re.search(pat, s):
                return lvl
        return "b1"

    de_m = re.search(r'Deutsch[^\n]*', lang_text, re.I)
    if de_m:
        result["german_level"] = detect_level(de_m.group())

    en_m = re.search(r'Englisch[^\n]*|English[^\n]*', lang_text, re.I)
    if en_m:
        result["english_level"] = detect_level(en_m.group())

    # Weitere Sprachen — nur bekannte Sprachen akzeptieren
    KNOWN_LANGUAGES = {
        "Französisch", "Spanisch", "Italienisch", "Portugiesisch", "Russisch",
        "Polnisch", "Türkisch", "Arabisch", "Chinesisch", "Japanisch", "Koreanisch",
        "Niederländisch", "Schwedisch", "Norwegisch", "Dänisch", "Finnisch",
        "Ukrainisch", "Tschechisch", "Slowakisch", "Rumänisch", "Ungarisch",
        "Griechisch", "Hebräisch", "Hindi", "Urdu", "Vietnamesisch", "Indonesisch",
        "Thai", "Persisch", "Swahili", "French", "Spanish", "Italian", "Russian",
        "Chinese", "Japanese", "Arabic", "Portuguese", "Dutch", "Swedish",
    }
    other_langs = []
    for lang_name in KNOWN_LANGUAGES:
        m = re.search(rf'{lang_name}[^\n]*', lang_text, re.I)
        if m:
            level_str = m.group()
            other_langs.append({
                "language": lang_name,
                "level": detect_level(level_str)
            })
    if other_langs:
        result["other_languages"] = other_langs[:6]

    return result


async def parse_cv(pdf_bytes: bytes, openai_key: str = "", gemini_key: str = "") -> Optional[dict]:
    """Hauptfunktion: PDF → Text → AI → bereinigte Profildaten.
    Versucht zuerst OpenAI, dann Gemini, dann Regex-Parser."""
    text = extract_text_from_pdf(pdf_bytes)
    if not text:
        return None

    raw_data = None

    # 1. OpenAI (bevorzugt)
    if openai_key:
        raw_data = parse_cv_with_openai(text, openai_key)

    # 2. Gemini als Fallback
    if not raw_data and gemini_key:
        raw_data = parse_cv_with_gemini(text, gemini_key)

    if raw_data:
        return sanitize_parsed_data(raw_data)

    # 3. Starker Regex-Fallback (kein API-Key nötig)
    logger.info("AI parsing unavailable, using regex fallback")
    result = parse_cv_regex(text)
    return result if result else None

    return sanitize_parsed_data(raw_data)
