"""
Bundesagentur für Arbeit – offizielle Jobsuche-API v5 (Liste) + v4 (Details)
Authentifizierung: X-API-Key Header mit clientId "jobboerse-jobsuche"

Ablauf:
  1. Liste via /pc/v5/jobs (refnr, Titel, Arbeitgeber, Ort)
  2. Details via /pc/v4/jobdetails/{base64(refnr)} (vollständige Beschreibung)
  3. Optional: OpenAI-Aufbereitung via OPENAI_API_KEY in .env
"""
import base64
import httpx
import logging
import re
import secrets
import json
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.company import Company
from app.models.job_posting import JobPosting
from app.models.user import User, UserRole
from app.models.applicant import PositionType
from app.services.slug_service import generate_job_slug
from app.services.settings_service import set_setting

logger = logging.getLogger(__name__)


def _detect_language_requirements(text: str) -> dict:
    """
    Erkennt Sprachanforderungen (Deutsch/Englisch) in einem Stellentext.
    Gibt {"german": "b1", "english": "a2"} oder ähnliches zurück.
    Fehlende Sprachen werden nicht zurückgegeben.
    """
    t = text.lower()
    result = {}

    # Muster: explizites Niveau (höchste Priorität)
    level_map = [
        (r"deutsch\w*\s*(c2|muttersprachlich|muttersprache|native)", "c2"),
        (r"deutsch\w*\s*c1",  "c1"),
        (r"deutsch\w*\s*b2",  "b2"),
        (r"deutsch\w*\s*b1",  "b1"),
        (r"deutsch\w*\s*a2",  "a2"),
        (r"deutsch\w*\s*a1",  "a1"),
        (r"(c2|muttersprachlich|muttersprache)\s*\w*deutsch", "c2"),
        (r"c1\s*\w*deutsch",  "c1"),
        (r"b2\s*\w*deutsch",  "b2"),
        (r"b1\s*\w*deutsch",  "b1"),
        (r"a2\s*\w*deutsch",  "a2"),
    ]
    for pattern, level in level_map:
        if re.search(pattern, t):
            result["german"] = level
            break

    # Wortbasiert (nur wenn noch kein Treffer)
    if "german" not in result:
        if re.search(r"flie.end\w*\s*deutsch|deutsch\w*\s*flie.end", t):
            result["german"] = "c1"
        elif re.search(r"sehr gut\w*\s*deutsch|deutsch\w*\s*sehr gut", t):
            result["german"] = "b2"
        elif re.search(r"gut\w*\s*deutsch|deutsch\w*\s*gut\w*kenntnis", t):
            result["german"] = "b1"
        elif re.search(r"grund\w*\s*deutsch|deutsch\w*\s*grund", t):
            result["german"] = "a2"
        elif re.search(r"deutschkenntnis|deutsch\w*\s*kenntnis|kenntnisse\s+deutsch", t):
            result["german"] = "b1"  # Default wenn nur "Deutschkenntnisse" erwähnt

    # Englisch
    eng_level_map = [
        (r"english\w*\s*(c2|native|fluent|muttersprachl)",  "c2"),
        (r"english\w*\s*c1|c1\s*english",  "c1"),
        (r"english\w*\s*b2|b2\s*english",  "b2"),
        (r"english\w*\s*b1|b1\s*english",  "b1"),
        (r"english\w*\s*a2|a2\s*english",  "a2"),
        (r"english\w*\s*a1|a1\s*english",  "a1"),
        (r"englisch\w*\s*(c2|muttersprachlich|native)",  "c2"),
        (r"englisch\w*\s*c1",  "c1"),
        (r"englisch\w*\s*b2",  "b2"),
        (r"englisch\w*\s*b1",  "b1"),
        (r"englisch\w*\s*a2",  "a2"),
    ]
    for pattern, level in eng_level_map:
        if re.search(pattern, t):
            result["english"] = level
            break

    if "english" not in result:
        if re.search(r"flie.end\w*\s*english|english\w*\s*flie.end|flie.end\w*\s*englisch", t):
            result["english"] = "c1"
        elif re.search(r"sehr gut\w*\s*english|sehr gut\w*\s*englisch", t):
            result["english"] = "b2"
        elif re.search(r"gut\w*\s*english|englischkenntnis|english\w*\s*kenntnis", t):
            result["english"] = "b1"

    return result


BA_JOBS_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v5/jobs"
BA_DETAIL_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails"
BA_API_KEY = "jobboerse-jobsuche"

BA_SYSTEM_EMAIL = "ba-scraper-system@internal.localhost"
BA_COMPANY_NAME = "Extern (Bundesagentur für Arbeit)"

ANGEBOTSART_TO_POSITION = {
    1: PositionType.FACHKRAFT.value,
    2: PositionType.AUSBILDUNG.value,
    4: PositionType.GENERAL.value,
    34: PositionType.GENERAL.value,
}


def _fetch_job_detail(ref_nr: str, headers: dict) -> dict:
    """Ruft die vollständige Stellenbeschreibung via v4-Detail-Endpoint ab."""
    encoded = base64.b64encode(ref_nr.encode()).decode()
    try:
        resp = httpx.get(f"{BA_DETAIL_URL}/{encoded}", headers=headers, timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except Exception as exc:
        logger.debug(f"Detail-Abruf fehlgeschlagen für {ref_nr}: {exc}")
    return {}


import re as _re
import html as _html_module


def _strip_markdown(text: str) -> str:
    """Entfernt Markdown-Marker (**bold**, *italic*, #Heading) aus plain text."""
    text = _re.sub(r'\*\*(.+?)\*\*', r'\1', text)   # **bold**
    text = _re.sub(r'\*(.+?)\*', r'\1', text)         # *italic*
    text = _re.sub(r'^#+\s*', '', text, flags=_re.MULTILINE)  # # Heading
    return text.strip()


def _plain_text_to_html(text: str) -> str:
    """Konvertiert einen plain-text Absatz in HTML."""
    text = _strip_markdown(text)
    text = _html_module.escape(text.strip())
    if not text:
        return ""
    return f"<p>{text}</p>"


def _bullets_to_html(lines: list[str]) -> str:
    """Konvertiert eine Liste von Bullet-Zeilen in eine HTML-Liste."""
    items = []
    for line in lines:
        line = _strip_markdown(line.strip().lstrip("*").strip())
        if line:
            items.append(f"<li>{_html_module.escape(line)}</li>")
    if not items:
        return ""
    return "<ul>" + "".join(items) + "</ul>"


# Schlüsselwörter für Sektionserkennung
_BENEFITS_HEADERS = {"unser angebot", "wir bieten", "das bieten wir", "benefits",
                     "deine vorteile", "ihre vorteile", "was wir bieten"}
_TASKS_HEADERS = {"die aufgaben", "ihre aufgaben", "deine aufgaben", "aufgaben",
                  "tätigkeiten", "was sie erwartet", "was dich erwartet",
                  "aufgabenbeschreibung", "deine aufgaben und verantwortlichkeiten"}
_REQUIREMENTS_HEADERS = {"dein profil", "ihr profil", "anforderungen", "voraussetzungen",
                         "das bringen sie mit", "qualifikationen", "was du mitbringst",
                         "was sie mitbringen", "das bringst du mit"}


def _parse_ba_description(raw: str) -> dict:
    """
    Zerlegt die BA-Rohtextbeschreibung in description/tasks/requirements/benefits (als HTML).
    Erkennt Sektionsüberschriften und Bullet-Points automatisch.
    """
    if not raw:
        return {"description": "", "tasks": "", "requirements": "", "benefits": ""}

    lines = raw.splitlines()
    current_section = "description"
    sections: dict[str, list] = {"description": [], "tasks": [], "requirements": [], "benefits": []}
    bullet_buffer: list[str] = []

    def flush_bullets():
        if bullet_buffer:
            sections[current_section].append(("bullets", list(bullet_buffer)))
            bullet_buffer.clear()

    for line in lines:
        stripped = line.strip()
        normalized = stripped.lower().rstrip(":").strip()

        # Sektions-Header erkennen (kurze Zeile ohne Bullet)
        if stripped and not stripped.startswith("*") and not stripped.startswith("#"):
            if normalized in _BENEFITS_HEADERS:
                flush_bullets()
                current_section = "benefits"
                continue
            if normalized in _TASKS_HEADERS:
                flush_bullets()
                current_section = "tasks"
                continue
            if normalized in _REQUIREMENTS_HEADERS:
                flush_bullets()
                current_section = "requirements"
                continue

        # Bullet-Punkt (BA nutzt "  *  Text" oder "* Text")
        if stripped.startswith("*") and not stripped.startswith("**"):
            bullet_buffer.append(stripped)
            continue

        # Leere Zeile: Bullets abschließen
        if not stripped:
            flush_bullets()
            continue

        # Normaler Text
        flush_bullets()
        sections[current_section].append(("text", stripped))

    flush_bullets()

    # HTML generieren
    result = {}
    for key, parts in sections.items():
        html_parts = []
        i = 0
        while i < len(parts):
            kind, content = parts[i]
            if kind == "bullets":
                html_parts.append(_bullets_to_html(content))
            else:
                html_parts.append(_plain_text_to_html(content))
            i += 1
        result[key] = "".join(html_parts)

    return result


def _parse_salary_from_text(text: str) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Versucht Gehalt aus Beschreibungstext per Regex zu extrahieren."""
    import re as _re2
    if not text:
        return None, None, None

    # Stundenlohn: z.B. "13,90 €/Std", "13.90 €/h", "ab 14 Euro pro Stunde"
    hourly_pattern = _re2.search(
        r'(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:–|-|bis)\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*[€Ee]\w*/(?:Std|Stunde|h\b)',
        text, _re2.IGNORECASE
    )
    if hourly_pattern:
        mn = float(hourly_pattern.group(1).replace(',', '.'))
        mx = float(hourly_pattern.group(2).replace(',', '.'))
        return mn, mx, "hourly"

    hourly_single = _re2.search(
        r'(?:ab|mindestens|ca\.)?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*[€Ee]\w*/(?:Std|Stunde|h\b)',
        text, _re2.IGNORECASE
    )
    if hourly_single:
        val = float(hourly_single.group(1).replace(',', '.'))
        return val, None, "hourly"

    # Monatslohn: z.B. "2.500 € / Monat", "2500 - 3000 € monatlich"
    monthly_range = _re2.search(
        r'(\d{1,4}(?:[.,]\d{3})?)\s*(?:–|-|bis)\s*(\d{1,4}(?:[.,]\d{3})?)\s*[€Ee]\w*/(?:Monat|Monaten?|m\b)',
        text, _re2.IGNORECASE
    )
    if monthly_range:
        mn = float(monthly_range.group(1).replace('.', '').replace(',', '.'))
        mx = float(monthly_range.group(2).replace('.', '').replace(',', '.'))
        return mn, mx, "monthly"

    monthly_single = _re2.search(
        r'(?:ab|mindestens|ca\.)?\s*(\d{1,4}(?:[.,]\d{3})?)\s*[€Ee]\w*/(?:Monat|Monaten?|m\b)',
        text, _re2.IGNORECASE
    )
    if monthly_single:
        val = float(monthly_single.group(1).replace('.', '').replace(',', '.'))
        return val, None, "monthly"

    return None, None, None


def _parse_detail(detail: dict) -> dict:
    """Extrahiert relevante Felder aus der Detail-Antwort."""
    raw_desc = detail.get("stellenangebotsBeschreibung", "").strip()
    parsed_fields = _parse_ba_description(raw_desc)

    # Beschäftigungsart aus Detail ableiten
    vollzeit = detail.get("arbeitszeitVollzeit", False)
    teilzeit = any([
        detail.get("arbeitszeitTeilzeitVormittag"),
        detail.get("arbeitszeitTeilzeitNachmittag"),
        detail.get("arbeitszeitTeilzeitAbend"),
        detail.get("arbeitszeitTeilzeitFlexibel"),
    ])
    if vollzeit and teilzeit:
        employment_type = "both"
    elif vollzeit:
        employment_type = "fulltime"
    elif teilzeit:
        employment_type = "parttime"
    else:
        employment_type = None

    # Adresse aus Detail
    lokationen = detail.get("stellenlokationen") or []
    street = ""
    if lokationen:
        adr = lokationen[0].get("adresse") or {}
        street = adr.get("strasse", "").strip()
        if street.lower() == "null":
            street = ""

    # Gehalt: aus BA-Feld "arbeitsentgelt" oder per Regex aus Beschreibung
    salary_min = salary_max = salary_type = None
    entgelt = detail.get("arbeitsentgelt") or {}
    if isinstance(entgelt, dict):
        brutto = entgelt.get("brutto")
        zeitraum = entgelt.get("zeitraum", "").lower()
        brutto_max = entgelt.get("bruttoMax")
        if brutto:
            try:
                salary_min = float(str(brutto).replace(',', '.'))
            except Exception:
                pass
        if brutto_max:
            try:
                salary_max = float(str(brutto_max).replace(',', '.'))
            except Exception:
                pass
        if zeitraum:
            if "stunde" in zeitraum or "hour" in zeitraum:
                salary_type = "hourly"
            elif "monat" in zeitraum or "month" in zeitraum:
                salary_type = "monthly"
            elif "jahr" in zeitraum or "year" in zeitraum or "annual" in zeitraum:
                salary_type = "yearly"

    # Fallback: Regex-Parsing aus Beschreibung
    if not salary_min:
        salary_min, salary_max, salary_type = _parse_salary_from_text(raw_desc)

    return {
        "raw_description": raw_desc,
        "description": parsed_fields["description"],
        "tasks": parsed_fields["tasks"],
        "requirements": parsed_fields["requirements"],
        "benefits": parsed_fields["benefits"],
        "employment_type": employment_type,
        "street": street,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "salary_type": salary_type,
    }


_AI_PROMPT_TEMPLATE = """Du bist ein Experte für Stellenausschreibungen. Strukturiere diese Stellenanzeige der Bundesagentur für Arbeit passend für das JobOn-Jobportal.

Originaldaten:
- Stellentitel: {title}
- Arbeitgeber: {employer}
- Ort: {city}
- Originalbeschreibung:
{raw_description}

Aufgabe: Extrahiere ALLE verfügbaren Informationen. Nutze NUR Informationen die im Original vorhanden sind – erfinde nichts.

Antworte NUR mit gültigem JSON (keine Codeblöcke), exakt in diesem Format:
{{
  "description": "<p>Ansprechende Einleitung über das Unternehmen und die Stelle (2-3 Sätze)</p>",
  "tasks": "<ul><li>Aufgabe 1</li><li>Aufgabe 2</li></ul>",
  "requirements": "<ul><li>Anforderung 1</li><li>Anforderung 2</li></ul>",
  "benefits": "<ul><li>Benefit 1</li><li>Benefit 2</li></ul>",
  "salary_min": null,
  "salary_max": null,
  "salary_type": null,
  "contact_person": null,
  "contact_phone": null
}}

Regeln:
- tasks, requirements, benefits: immer als <ul><li>...</li></ul>, falls vorhanden
- description: 2-3 Sätze als <p>...</p>
- Falls ein HTML-Feld fehlt: leerer String ""
- salary_min / salary_max: Zahl (float) in Euro, z.B. 15.5 für Stundenlohn oder 2500.0 für Monatslohn. null wenn nicht angegeben.
- salary_type: "hourly" für Stundenlohn, "monthly" für Monatslohn, "yearly" für Jahreslohn. null wenn nicht angegeben.
- Wenn nur ein Gehalt genannt wird (z.B. "ab 15€/Std"): salary_min setzen, salary_max null lassen.
- contact_person: Name des Ansprechpartners wenn explizit genannt, sonst null
- contact_phone: Telefonnummer des Ansprechpartners wenn explizit genannt, sonst null
- Kein Markdown, keine Codeblöcke, nur HTML-Tags in den HTML-Feldern"""


def _safe_float(val) -> Optional[float]:
    """Konvertiert KI-Wert sicher zu float, ignoriert ungültige Werte."""
    if val is None:
        return None
    try:
        f = float(val)
        return f if f >= 1.0 else None  # Sanity-Check: kein Cent-Betrag
    except (TypeError, ValueError):
        return None


def _parse_ai_json(raw: str, fallback_desc: str) -> dict:
    """Parst die JSON-Antwort der KI, mit Fallback bei Fehler."""
    try:
        result = json.loads(raw)
        return {
            "description": result.get("description", ""),
            "tasks": result.get("tasks", ""),
            "requirements": result.get("requirements", ""),
            "benefits": result.get("benefits", ""),
            "salary_min": _safe_float(result.get("salary_min")),
            "salary_max": _safe_float(result.get("salary_max")),
            "salary_type": result.get("salary_type") or None,
            "contact_person": result.get("contact_person") or None,
            "contact_phone": result.get("contact_phone") or None,
        }
    except Exception:
        return {
            "description": fallback_desc, "tasks": "", "requirements": "", "benefits": "",
            "salary_min": None, "salary_max": None, "salary_type": None,
            "contact_person": None, "contact_phone": None,
        }


def _enhance_with_openai(title: str, employer: str, city: str, raw_description: str) -> dict:
    if not settings.OPENAI_API_KEY:
        return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = _AI_PROMPT_TEMPLATE.format(
            title=title, employer=employer, city=city,
            raw_description=raw_description or "Keine vorhanden"
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
        return _parse_ai_json(resp.choices[0].message.content, raw_description)
    except Exception as exc:
        logger.warning(f"OpenAI fehlgeschlagen für '{title}': {exc}")
        return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}


def _enhance_with_anthropic(title: str, employer: str, city: str, raw_description: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = _AI_PROMPT_TEMPLATE.format(
            title=title, employer=employer, city=city,
            raw_description=raw_description or "Keine vorhanden"
        )
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = _re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
        return _parse_ai_json(raw, raw_description)
    except Exception as exc:
        logger.warning(f"Anthropic fehlgeschlagen für '{title}': {exc}")
        return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}


def _enhance_with_gemini(title: str, employer: str, city: str, raw_description: str) -> dict:
    """Google Gemini – kostenloser Tier über google-genai SDK."""
    if not settings.GOOGLE_AI_API_KEY:
        return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}
    try:
        from google import genai
        client = genai.Client(api_key=settings.GOOGLE_AI_API_KEY)
        prompt = _AI_PROMPT_TEMPLATE.format(
            title=title, employer=employer, city=city,
            raw_description=raw_description or "Keine vorhanden"
        )
        resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        raw = resp.text.strip()
        if raw.startswith("```"):
            raw = _re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
        return _parse_ai_json(raw, raw_description)
    except Exception as exc:
        logger.warning(f"Gemini fehlgeschlagen für '{title}': {exc}")
        return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}


def _enhance_with_ai(ai_provider: str, title: str, employer: str, city: str, raw_description: str) -> dict:
    """Leitet an den konfigurierten KI-Anbieter weiter."""
    if ai_provider == "openai":
        return _enhance_with_openai(title, employer, city, raw_description)
    if ai_provider == "anthropic":
        return _enhance_with_anthropic(title, employer, city, raw_description)
    if ai_provider == "gemini":
        return _enhance_with_gemini(title, employer, city, raw_description)
    return {"description": raw_description, "tasks": "", "requirements": "", "benefits": ""}


def get_or_create_ba_system_company(db: Session) -> Company:
    """Holt oder erstellt die System-Company für BA-Jobs (einmalig)."""
    company = db.query(Company).filter(
        Company.is_scraped == True,
        Company.company_name == BA_COMPANY_NAME,
    ).first()
    if company:
        return company

    user = db.query(User).filter(User.email == BA_SYSTEM_EMAIL).first()
    if not user:
        from app.core.security import get_password_hash
        user = User(
            email=BA_SYSTEM_EMAIL,
            password_hash=get_password_hash(secrets.token_hex(32)),
            role=UserRole.COMPANY,
            is_active=False,
        )
        db.add(user)
        db.flush()

    company = Company(
        user_id=user.id,
        company_name=BA_COMPANY_NAME,
        is_scraped=True,
        description="Externe Stellenangebote der Bundesagentur für Arbeit",
        website="https://www.arbeitsagentur.de",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    logger.info(f"BA System-Company erstellt (ID: {company.id})")
    return company


def _build_external_url(job_data: dict) -> str:
    url = job_data.get("externeUrl") or ""
    if not url:
        hash_id = job_data.get("hashId", "")
        if hash_id:
            url = f"https://www.arbeitsagentur.de/jobsuche/jobdetail/{hash_id}"
    if not url:
        ref_nr = job_data.get("refnr", "").strip()
        if ref_nr:
            url = f"https://www.arbeitsagentur.de/jobsuche/jobdetail/{ref_nr}"
    return url


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str[:10])
    except Exception:
        return None


def scrape_ba_jobs(db: Session, config: dict) -> dict:
    """
    Importiert Jobs über die offizielle BA Jobsuche-API.

    config keys:
        keywords    – list[str], Suchbegriffe (leer = alle)
        location    – str, Ortsangabe
        radius      – int, Umkreis in km (default 50)
        max_jobs    – int, max. neue Jobs je Lauf (default 100)
        angebotsart – int, 1=Arbeit 2=Ausbildung (default 1)
        use_ai      – bool, OpenAI-Aufbereitung aktivieren (default True)
    """
    keywords: list[str] = config.get("keywords") or [""]
    location: str = config.get("location", "")
    radius: int = int(config.get("radius", 50))
    max_jobs: int = int(config.get("max_jobs", 100))
    angebotsart: int = int(config.get("angebotsart", 1))
    # ai_provider: "none" | "openai" | "anthropic"
    # Abwärtskompatibilität: altes use_ai=True → "openai" wenn Key vorhanden
    ai_provider: str = config.get("ai_provider", "none")
    if ai_provider == "none" and config.get("use_ai") and settings.OPENAI_API_KEY:
        ai_provider = "openai"

    ba_company = get_or_create_ba_system_company(db)
    headers = {"X-API-Key": BA_API_KEY}

    imported = skipped = errors = ai_enhanced = 0
    new_job_refs: list[tuple[str, int]] = []  # (slug, id) für Google Indexing
    new_job_ids: list[int] = []  # IDs für Bewerber-Benachrichtigungen

    for term in keywords:
        if imported >= max_jobs:
            break

        page = 1  # v5 API ist 1-basiert (page=0 → 400 Bad Request)
        while imported < max_jobs:
            batch_size = min(100, max_jobs - imported)
            params: dict = {
                "size": batch_size,
                "page": page,
                "angebotsart": angebotsart,
            }
            if term:
                params["was"] = term
            if location:
                params["wo"] = location
                params["umkreis"] = radius

            try:
                response = httpx.get(BA_JOBS_URL, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()
            except Exception as exc:
                logger.error(f"BA API Fehler (Seite {page}, Begriff '{term}'): {exc}")
                errors += 1
                break

            jobs_raw = data.get("stellenangebote") or []
            if not jobs_raw:
                break

            for job_data in jobs_raw:
                if imported >= max_jobs:
                    break

                ref_nr: str = job_data.get("refnr", "").strip()
                if not ref_nr:
                    continue

                # Duplikatsprüfung
                if db.query(JobPosting).filter(
                    JobPosting.external_id == ref_nr,
                    JobPosting.external_source == "bundesagentur",
                ).first():
                    skipped += 1
                    continue

                try:
                    title: str = job_data.get("titel", "").strip()
                    employer_name: str = job_data.get("arbeitgeber", "").strip()
                    arbeitsort: dict = job_data.get("arbeitsort") or {}
                    city: str = arbeitsort.get("ort", "").strip()
                    plz: str = arbeitsort.get("plz", "").strip()
                    external_url: str = _build_external_url(job_data)
                    start_date = _parse_date(job_data.get("eintrittsdatum"))
                    position_type = ANGEBOTSART_TO_POSITION.get(angebotsart, PositionType.GENERAL.value)
                    slug = generate_job_slug(title, city)

                    # Vollständige Beschreibung via Detail-Endpoint holen
                    detail = _fetch_job_detail(ref_nr, headers)
                    parsed = _parse_detail(detail)
                    raw_desc = parsed["raw_description"]
                    employment_type = parsed["employment_type"]
                    street = parsed["street"]

                    # KI-Aufbereitung
                    if ai_provider != "none":
                        enhanced = _enhance_with_ai(ai_provider, title, employer_name, city, raw_desc)
                        description = enhanced["description"]
                        tasks = enhanced["tasks"]
                        requirements = enhanced["requirements"]
                        benefits = enhanced["benefits"]
                        salary_min = enhanced.get("salary_min")
                        salary_max = enhanced.get("salary_max")
                        salary_type = enhanced.get("salary_type")
                        contact_person = enhanced.get("contact_person")
                        contact_phone = enhanced.get("contact_phone")
                        ai_enhanced += 1
                    else:
                        description = parsed["description"]
                        tasks = parsed["tasks"]
                        requirements = parsed["requirements"]
                        benefits = parsed["benefits"]
                        salary_min = parsed.get("salary_min")
                        salary_max = parsed.get("salary_max")
                        salary_type = parsed.get("salary_type")
                        contact_person = contact_phone = None

                    # Sprachanforderungen aus Beschreibung erkennen
                    full_text = f"{title} {raw_desc}"
                    lang_req = _detect_language_requirements(full_text)
                    from app.models.job_posting import RequiredLanguageLevel
                    german_req = None
                    english_req = None
                    if lang_req.get("german"):
                        try:
                            german_req = RequiredLanguageLevel(lang_req["german"])
                        except ValueError:
                            pass
                    if lang_req.get("english"):
                        try:
                            english_req = RequiredLanguageLevel(lang_req["english"])
                        except ValueError:
                            pass

                    job = JobPosting(
                        company_id=ba_company.id,
                        title=title,
                        description=description,
                        tasks=tasks,
                        requirements=requirements,
                        benefits=benefits,
                        location=city,
                        postal_code=plz,
                        address=street or None,
                        employment_type=employment_type,
                        position_type=position_type,
                        salary_min=salary_min,
                        salary_max=salary_max,
                        salary_type=salary_type,
                        contact_person=contact_person,
                        contact_phone=contact_phone,
                        start_date=start_date,
                        german_required=german_req,
                        english_required=english_req,
                        is_active=False,
                        is_draft=True,
                        slug=slug,
                        is_external=True,
                        external_source="bundesagentur",
                        external_url=external_url,
                        external_id=ref_nr,
                        external_employer_name=employer_name,
                    )
                    db.add(job)
                    db.flush()  # ID sofort vergeben (für Google Indexing)
                    new_job_refs.append((job.slug or slug, job.id))
                    new_job_ids.append(job.id)
                    imported += 1

                except Exception as exc:
                    logger.error(f"Fehler beim Import Job {ref_nr}: {exc}")
                    errors += 1

            db.commit()

            # KEINE Benachrichtigung hier — Jobs sind noch is_draft=True / is_active=False.
            # Benachrichtigung erfolgt erst beim manuellen Freigeben über approve_job().
            new_job_ids.clear()

            total = data.get("maxErgebnisse", 0)
            if page * batch_size >= total:
                break
            page += 1

    now_iso = datetime.utcnow().isoformat()
    set_setting(db, "ba_scraper_last_run", now_iso)
    set_setting(db, "ba_scraper_last_imported", imported)
    set_setting(db, "ba_scraper_last_skipped", skipped)
    set_setting(db, "ba_scraper_last_errors", errors)

    logger.info(
        f"BA Scrape: {imported} importiert, {skipped} übersprungen, "
        f"{errors} Fehler, {ai_enhanced} KI-aufbereitet"
    )
    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "ai_enhanced": ai_enhanced,
        "timestamp": now_iso,
        "new_job_refs": new_job_refs,
    }


def backfill_descriptions(db: Session, ai_provider: str = "none") -> dict:
    """Holt Beschreibungen für BA-Jobs nach und strukturiert sie (optional mit KI)."""
    headers = {"X-API-Key": BA_API_KEY}
    jobs = db.query(JobPosting).filter(
        JobPosting.external_source == "bundesagentur",
        JobPosting.external_id.isnot(None),
    ).all()

    updated = errors = ai_enhanced = 0
    for job in jobs:
        detail = _fetch_job_detail(job.external_id, headers)
        parsed = _parse_detail(detail)
        if not parsed["raw_description"]:
            errors += 1
            continue

        if ai_provider != "none":
            enhanced = _enhance_with_ai(
                ai_provider, job.title or "",
                job.external_employer_name or "", job.location or "",
                parsed["raw_description"]
            )
            job.description = enhanced["description"]
            job.tasks = enhanced["tasks"]
            job.requirements = enhanced["requirements"]
            job.benefits = enhanced["benefits"]
            if enhanced.get("salary_min") and not job.salary_min:
                job.salary_min = enhanced["salary_min"]
            if enhanced.get("salary_max") and not job.salary_max:
                job.salary_max = enhanced["salary_max"]
            if enhanced.get("salary_type") and not job.salary_type:
                job.salary_type = enhanced["salary_type"]
            if enhanced.get("contact_person") and not job.contact_person:
                job.contact_person = enhanced["contact_person"]
            if enhanced.get("contact_phone") and not job.contact_phone:
                job.contact_phone = enhanced["contact_phone"]
            ai_enhanced += 1
        else:
            job.description = parsed["description"]
            job.tasks = parsed["tasks"]
            job.requirements = parsed["requirements"]
            job.benefits = parsed["benefits"]

        if parsed["employment_type"] and not job.employment_type:
            job.employment_type = parsed["employment_type"]
        if parsed["street"] and not job.address:
            job.address = parsed["street"]
        if parsed.get("salary_min") and not job.salary_min:
            job.salary_min = parsed["salary_min"]
            job.salary_max = parsed.get("salary_max")
            job.salary_type = parsed.get("salary_type")
        updated += 1

    db.commit()
    return {"updated": updated, "ai_enhanced": ai_enhanced, "no_description": errors}


def check_configuration() -> dict:
    """Gibt den Konfigurationsstatus zurück (für Admin-UI)."""
    return {
        "ba_api_configured": True,
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
        "gemini_configured": bool(settings.GOOGLE_AI_API_KEY),
        "registration_url": "https://jobsuche.api.bund.dev/",
    }
