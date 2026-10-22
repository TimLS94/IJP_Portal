"""
Importiert eine Stellenanzeige aus einer beliebigen URL:
1. Seite laden + sichtbaren Text extrahieren (requests + BeautifulSoup)
2. Mit KI (OpenAI, Fallback Gemini) in strukturierte Stellenfelder überführen

Best effort: JavaScript-gerenderte Seiten oder Bot-Blocker können scheitern -> dann
manuelle Nacharbeit. Synchron -> nur aus Threadpool/Background-Task aufrufen.
"""
import json
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

ALLOWED_POSITION_TYPES = ["studentenferienjob", "saisonjob", "workandholiday", "fachkraft", "ausbildung"]
ALLOWED_EMPLOYMENT = ["fulltime", "parttime", "minijob", "temporary"]
ALLOWED_SALARY_TYPE = ["hourly", "monthly", "yearly"]

_PROMPT = """Du extrahierst eine Stellenanzeige in striktes JSON. Antworte NUR mit JSON, ohne Erklärung.
Nutze die Originalsprache der Anzeige für Freitext (title, description, tasks, requirements, benefits).
Wenn ein Feld unbekannt ist, setze null (bzw. [] für Listen).

Schema:
{
  "title": string|null,
  "description": string|null,          // Haupttext / Über die Stelle
  "tasks": string|null,                // Aufgaben
  "requirements": string|null,         // Anforderungen / Profil
  "benefits": string|null,             // Wir bieten / Benefits
  "location": string|null,             // Stadt/Ort
  "postal_code": string|null,
  "country": "DE"|"AT"|"CH"|null,
  "employment_type": one of %(emp)s|null,
  "position_types": array of %(pos)s,  // passende Kategorien, kann leer sein
  "salary_min": number|null,
  "salary_max": number|null,
  "salary_type": one of %(sal)s|null,
  "start_date": string|null,           // ISO JJJJ-MM-TT, sonst null
  "contact_email": string|null,
  "contact_phone": string|null
}

Stellenanzeige (Quelle: %(url)s):
---
%(text)s
---
"""


def fetch_page_text(url: str, max_chars: int = 14000) -> str:
    """Lädt die Seite und gibt den sichtbaren Text zurück (gekürzt)."""
    import requests
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; JobOnImporter/1.0; +https://www.jobonportal.de)",
        "Accept-Language": "de,en;q=0.8",
    }
    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "svg"]):
        tag.decompose()
    title = (soup.title.string.strip() if soup.title and soup.title.string else "")
    text = soup.get_text(separator="\n")
    # Mehrfache Leerzeilen/Whitespace reduzieren
    lines = [ln.strip() for ln in text.splitlines()]
    text = "\n".join(ln for ln in lines if ln)
    text = re.sub(r"\n{3,}", "\n\n", text)
    combined = (f"{title}\n\n{text}" if title else text)
    return combined[:max_chars]


def _extract_json(raw: str) -> Optional[dict]:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                return None
    return None


def extract_job_with_openai(text: str, url: str, api_key: str):
    """Gibt (dict|None, error_str|None) zurück."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=30.0, max_retries=1)
        prompt = _PROMPT % {
            "emp": ALLOWED_EMPLOYMENT, "pos": ALLOWED_POSITION_TYPES,
            "sal": ALLOWED_SALARY_TYPE, "url": url, "text": text,
        }
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du extrahierst strukturierte Stellendaten. Antworte immer mit validem JSON, ohne Erklärungen."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=3000,
        )
        raw = (resp.choices[0].message.content or "").strip()
        data = _extract_json(raw)
        if data is None:
            return None, "Antwort war kein gültiges JSON"
        return data, None
    except Exception as e:
        logger.error(f"OpenAI Job-Import fehlgeschlagen: {e}")
        return None, f"{type(e).__name__}: {e}"


def extract_job_with_gemini(text: str, url: str, api_key: str):
    """Gibt (dict|None, error_str|None) zurück."""
    try:
        from google import genai
        client = genai.Client(api_key=api_key, http_options={"timeout": 30000})
        prompt = _PROMPT % {
            "emp": ALLOWED_EMPLOYMENT, "pos": ALLOWED_POSITION_TYPES,
            "sal": ALLOWED_SALARY_TYPE, "url": url, "text": text,
        }
        resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        data = _extract_json(getattr(resp, "text", "") or "")
        if data is None:
            return None, "Antwort war kein gültiges JSON"
        return data, None
    except Exception as e:
        logger.error(f"Gemini Job-Import fehlgeschlagen: {e}")
        return None, f"{type(e).__name__}: {e}"


def extract_job_with_anthropic(text: str, url: str, api_key: str):
    """Claude (Anthropic). Gibt (dict|None, error_str|None) zurück."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        prompt = _PROMPT % {
            "emp": ALLOWED_EMPLOYMENT, "pos": ALLOWED_POSITION_TYPES,
            "sal": ALLOWED_SALARY_TYPE, "url": url, "text": text,
        }
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system="Du extrahierst strukturierte Stellendaten. Antworte NUR mit validem JSON, ohne Erklärungen.",
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (message.content[0].text or "").strip()
        data = _extract_json(raw)
        if data is None:
            return None, "Antwort war kein gültiges JSON"
        return data, None
    except Exception as e:
        logger.error(f"Anthropic Job-Import fehlgeschlagen: {e}")
        return None, f"{type(e).__name__}: {e}"


def _sanitize(data: dict) -> dict:
    out = dict(data or {})
    # Listen/Enums säubern
    pts = out.get("position_types") or []
    out["position_types"] = [p for p in pts if p in ALLOWED_POSITION_TYPES]
    if out.get("employment_type") not in ALLOWED_EMPLOYMENT:
        out["employment_type"] = None
    if out.get("salary_type") not in ALLOWED_SALARY_TYPE:
        out["salary_type"] = None
    if out.get("country") not in ("DE", "AT", "CH"):
        out["country"] = "DE"
    for k in ("salary_min", "salary_max"):
        v = out.get(k)
        try:
            out[k] = float(v) if v is not None and str(v) != "" else None
        except Exception:
            out[k] = None
    return out


def import_job_from_url(url: str, anthropic_key: str = "", openai_key: str = "", gemini_key: str = "") -> dict:
    """Lädt die URL + extrahiert die Stellenfelder (Claude -> OpenAI -> Gemini).
    Wirft bei Lade-/Parsefehlern."""
    text = fetch_page_text(url)
    if not text or len(text.strip()) < 40:
        raise ValueError("Seite enthielt keinen lesbaren Text (evtl. JavaScript-Seite oder Zugriff blockiert).")

    data = None
    errors = []
    if anthropic_key:
        data, err = extract_job_with_anthropic(text, url, anthropic_key)
        if err:
            errors.append(f"Claude: {err}")
    if not data and openai_key:
        data, err = extract_job_with_openai(text, url, openai_key)
        if err:
            errors.append(f"OpenAI: {err}")
    if not data and gemini_key:
        data, err = extract_job_with_gemini(text, url, gemini_key)
        if err:
            errors.append(f"Gemini: {err}")
    if not data and not (anthropic_key or openai_key or gemini_key):
        errors.append("Kein KI-Key konfiguriert (ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_AI_API_KEY)")
    if not data:
        detail = f" ({'; '.join(errors)})" if errors else ""
        raise ValueError(f"KI-Extraktion fehlgeschlagen{detail}. Bitte manuell anlegen.")

    return _sanitize(data)
