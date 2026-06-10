"""
KI-gestütztes Ausfüllen von Stellenanzeigen mit Anthropic Claude.

Der Arbeitgeber gibt ein paar Stichpunkte / Freitext ein, Claude erzeugt
daraus eine vollständige, AGG-konforme Stellenanzeige passend zum JobOn-
Datenmodell. Es wird NICHTS erfunden (Gehalt, Kontakt, Adresse nur wenn
angegeben) und das Ergebnis bleibt vollständig editierbar.
"""
import os
import json
import logging
import re

logger = logging.getLogger(__name__)

VALID_POSITION_TYPES = ["studentenferienjob", "saisonjob", "workandholiday", "fachkraft", "ausbildung", "general"]
VALID_EMPLOYMENT_TYPES = ["fulltime", "parttime", "both", "mini_job", "seasonal", "internship"]
VALID_LANGUAGE_LEVELS = ["not_required", "a1", "a2", "b1", "b2", "c1", "c2"]
VALID_SALARY_TYPES = ["hourly", "monthly", "yearly"]

SYSTEM_PROMPT = """Du bist ein Experte für deutsche Stellenanzeigen und hilfst Arbeitgebern auf der Plattform JobOn (Vermittlung internationaler Fach- und Saisonkräfte nach Deutschland).

Aus den Stichpunkten des Arbeitgebers erstellst du eine vollständige, professionelle Stellenanzeige auf DEUTSCH.

ABSOLUTE REGELN:
1. RECHTSKONFORM (AGG): Keine diskriminierende Sprache (kein Bezug auf Geschlecht, Alter, Herkunft, Religion, Behinderung). Ergänze im Titel immer "(m/w/d)".
2. NICHTS ERFINDEN: Gehalt, Kontaktdaten, Adresse, PLZ, Daten NUR übernehmen, wenn der Arbeitgeber sie nennt. Sonst das Feld leer lassen (null) bzw. nicht erwähnen.
3. Schreibe klar, einladend und strukturiert. Zielgruppe sind auch Menschen mit einfachen Deutschkenntnissen – verständliche Sprache.
4. tasks, requirements, benefits als kurze Aufzählungen (jede Zeile mit "- " beginnen).

Gib AUSSCHLIESSLICH gültiges JSON zurück, ohne Markdown, ohne Erklärungen, in genau dieser Struktur:
{
  "title": "Stellentitel inkl. (m/w/d)",
  "description": "2-4 Sätze einleitende Beschreibung der Stelle und des Arbeitgebers",
  "tasks": "- Aufgabe 1\\n- Aufgabe 2\\n- Aufgabe 3",
  "requirements": "- Anforderung 1\\n- Anforderung 2",
  "benefits": "- Vorteil 1\\n- Vorteil 2",
  "position_types": ["einer von: studentenferienjob, saisonjob, workandholiday, fachkraft, ausbildung, general"],
  "employment_type": "einer von: fulltime, parttime, both, mini_job, seasonal, internship oder null",
  "german_required": "einer von: not_required, a1, a2, b1, b2, c1, c2",
  "english_required": "einer von: not_required, a1, a2, b1, b2, c1, c2",
  "salary_min": Zahl oder null,
  "salary_max": Zahl oder null,
  "salary_type": "hourly, monthly, yearly oder null",
  "location": "Stadt oder null",
  "postal_code": "PLZ oder null",
  "accommodation_provided": true/false,
  "remote_possible": true/false
}

Wenn keine Sprachkenntnisse genannt werden, setze beide auf "not_required".
Wähle position_types und employment_type sinnvoll anhand des Kontexts (z.B. Erntehelfer/Saison -> saisonjob + seasonal)."""


def _coerce(data: dict) -> dict:
    """Validiert/säubert die KI-Ausgabe gegen die erlaubten Enum-Werte."""
    def _enum(value, allowed, default=None):
        return value if value in allowed else default

    # position_types: Liste auf gültige Werte filtern
    pts = data.get("position_types") or []
    if isinstance(pts, str):
        pts = [pts]
    pts = [p for p in pts if p in VALID_POSITION_TYPES] or ["general"]

    def _num(v):
        try:
            return float(v) if v is not None and v != "" else None
        except (ValueError, TypeError):
            return None

    return {
        "title": (data.get("title") or "").strip(),
        "description": (data.get("description") or "").strip(),
        "tasks": (data.get("tasks") or "").strip(),
        "requirements": (data.get("requirements") or "").strip(),
        "benefits": (data.get("benefits") or "").strip(),
        "position_types": pts,
        "employment_type": _enum(data.get("employment_type"), VALID_EMPLOYMENT_TYPES),
        "german_required": _enum(data.get("german_required"), VALID_LANGUAGE_LEVELS, "not_required"),
        "english_required": _enum(data.get("english_required"), VALID_LANGUAGE_LEVELS, "not_required"),
        "salary_min": _num(data.get("salary_min")),
        "salary_max": _num(data.get("salary_max")),
        "salary_type": _enum(data.get("salary_type"), VALID_SALARY_TYPES),
        "location": (data.get("location") or None) or None,
        "postal_code": (data.get("postal_code") or None) or None,
        "accommodation_provided": bool(data.get("accommodation_provided", False)),
        "remote_possible": bool(data.get("remote_possible", False)),
    }


def generate_job_posting(prompt: str) -> dict | None:
    """Erzeugt aus Freitext-Stichpunkten eine strukturierte Stellenanzeige.
    Gibt None zurück, wenn kein API-Key konfiguriert ist oder ein Fehler auftritt."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY nicht konfiguriert")
        return None

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Stichpunkte des Arbeitgebers:\n\n{prompt}"}],
        )

        raw = message.content[0].text.strip()

        # JSON robust extrahieren (falls doch Markdown-Fences kommen)
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            logger.error(f"Job-Writer: kein JSON in der Antwort: {raw[:200]}")
            return None

        data = json.loads(m.group(0))
        return _coerce(data)

    except Exception as e:
        logger.error(f"Fehler im Job-Writer: {e}")
        return None
