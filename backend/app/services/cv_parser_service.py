"""
CV-Parser: Extrahiert Profilfelder aus hochgeladenen Lebensläufen.
Text-Extraktion via PyMuPDF, Strukturierung via Gemini Flash (kostenlos).
"""
import json
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Du bist ein Experte für das Auslesen von Lebensläufen.
Analysiere den folgenden Lebenslauf-Text und extrahiere die Daten als JSON.

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
    {"company": "string", "position": "string", "start_date": "YYYY-MM", "end_date": "YYYY-MM or null", "description": "string", "location": "string"}
  ],
  "field_of_study": "string",
  "university_name": "string",
  "university_city": "string",
  "current_semester": integer,
  "school_degree": "string",
  "professional_title": "string"
}

Regeln:
- Sprachniveaus: Wenn "Muttersprache" → "native", A1/A2/B1/B2/C1/C2 direkt übernehmen, "gut"/"fließend" → schätze B2, "Grundkenntnisse" → A2
- date_of_birth nur wenn eindeutig als Geburtsdatum erkennbar
- work_experience_years: Berechne aus den Stellen oder nimm direkt genannte Zahl
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


def parse_cv_with_gemini(text: str, api_key: str) -> Optional[dict]:
    """Schickt den CV-Text an Gemini und bekommt strukturierte Daten zurück"""
    if not text or len(text) < 50:
        logger.warning("CV text too short to parse")
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Auf max 8000 Zeichen kürzen um Token-Limit nicht zu sprengen
        truncated = text[:8000]
        response = model.generate_content(
            EXTRACTION_PROMPT + truncated,
            generation_config={"temperature": 0.1, "max_output_tokens": 2048}
        )

        raw = response.text.strip()

        # JSON aus der Antwort extrahieren (falls Gemini etwas drumherum schreibt)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not json_match:
            logger.warning("No JSON found in Gemini response")
            return None

        data = json.loads(json_match.group())
        return data

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

    # Datum validieren
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
                    "company": str(exp.get("company", "")).strip(),
                    "position": str(exp.get("position", "")).strip(),
                    "start_date": str(exp.get("start_date", "")).strip(),
                    "end_date": exp.get("end_date"),
                    "description": str(exp.get("description", "")).strip(),
                    "location": str(exp.get("location", "")).strip(),
                })
        if clean_exp:
            result["work_experiences"] = clean_exp

    # Semester
    semester = data.get("current_semester")
    if isinstance(semester, (int, float)) and 1 <= semester <= 30:
        result["current_semester"] = int(semester)

    return result


async def parse_cv(pdf_bytes: bytes, api_key: str) -> Optional[dict]:
    """Hauptfunktion: PDF → Text → Gemini → bereinigte Profildaten"""
    text = extract_text_from_pdf(pdf_bytes)
    if not text:
        return None

    raw_data = parse_cv_with_gemini(text, api_key)
    if not raw_data:
        return None

    return sanitize_parsed_data(raw_data)
