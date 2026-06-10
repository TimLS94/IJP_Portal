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

Aus den Stichpunkten des Arbeitgebers UND den bereitgestellten Unternehmensdaten erstellst du eine vollständige, ansprechende und AUSFÜHRLICHE Stellenanzeige auf DEUTSCH.

ABSOLUTE REGELN:
1. RECHTSKONFORM (AGG): Keine diskriminierende Sprache (kein Bezug auf Geschlecht, Alter, Herkunft, Religion, Behinderung). Ergänze im Titel immer "(m/w/d)".
2. NICHTS ERFINDEN: Gehalt, Kontaktdaten, Adresse, PLZ, Daten NUR übernehmen, wenn sie in den Stichpunkten oder Unternehmensdaten stehen. Sonst das Feld leer lassen (null).
3. Schreibe klar, einladend und verständlich – Zielgruppe sind auch Menschen mit einfachen Deutschkenntnissen.
4. UNTERNEHMENSDATEN NUTZEN: Beziehe Firmenname, Branche, Standort und die Firmenbeschreibung in die Stellenbeschreibung ein, damit die Anzeige fülliger und glaubwürdiger wird. Stelle das Unternehmen kurz vor.

FORMATIERUNG (sehr wichtig – die Felder werden in einem HTML-Editor angezeigt):
- "description": AUSFÜHRLICH, 2–3 Absätze, jeweils in <p>…</p>. Erster Absatz: kurze Vorstellung des Unternehmens. Danach: worum geht es bei der Stelle, warum ist sie attraktiv, Rahmenbedingungen (Standort, Zeitraum, Unterkunft falls genannt).
- "tasks", "requirements", "benefits": als HTML-Liste im Format <ul><li>Punkt</li><li>Punkt</li></ul>. Jeweils 4–6 aussagekräftige Punkte (ganze Sätze, nicht nur Stichworte).
- Verwende NUR die Tags <p>, <ul>, <li>, <strong>. Kein Markdown, keine "-" Striche.

Gib AUSSCHLIESSLICH gültiges JSON zurück, ohne Markdown-Fences, in genau dieser Struktur:
{
  "title": "Stellentitel inkl. (m/w/d)",
  "description": "<p>…</p><p>…</p>",
  "tasks": "<ul><li>…</li><li>…</li></ul>",
  "requirements": "<ul><li>…</li><li>…</li></ul>",
  "benefits": "<ul><li>…</li><li>…</li></ul>",
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
  "remote_possible": true/false,
  "start_immediate": true/false,
  "start_date": "YYYY-MM-DD oder null"
}

REGELN FÜR EINZELNE FELDER:
- "accommodation_provided": true, wenn von Unterkunft, Wohnung, Zimmer, "housing", "Unterkunft gestellt" o.ä. die Rede ist.
- "remote_possible": true, wenn Homeoffice/Remote möglich ist.
- "start_immediate": true, wenn "ab sofort", "sofort", "immediately", "asap" o.ä. genannt wird.
- "start_date": konkretes Startdatum im Format YYYY-MM-DD, falls genannt (z.B. "ab Mai" -> erster des Monats). Sonst null.
- Wenn keine Sprachkenntnisse genannt werden, setze german_required und english_required auf "not_required".
- Wähle position_types und employment_type sinnvoll anhand des Kontexts (z.B. Erntehelfer/Saison -> saisonjob + seasonal)."""


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
        "start_immediate": bool(data.get("start_immediate", False)),
        "start_date": (data.get("start_date") or None) or None,
    }


def _company_block(ctx: dict | None) -> str:
    """Baut den Unternehmensdaten-Block für den Prompt."""
    if not ctx:
        return ""
    lines = []
    if ctx.get("company_name"): lines.append(f"Firmenname: {ctx['company_name']}")
    if ctx.get("industry"): lines.append(f"Branche: {ctx['industry']}")
    if ctx.get("city"): lines.append(f"Standort: {ctx['city']}")
    if ctx.get("website"): lines.append(f"Website: {ctx['website']}")
    if ctx.get("description"): lines.append(f"Über das Unternehmen: {ctx['description']}")
    if not lines:
        return ""
    return "\n\nUnternehmensdaten (zur Anreicherung der Beschreibung nutzen):\n" + "\n".join(lines)


def generate_job_posting(prompt: str, company_context: dict | None = None) -> dict | None:
    """Erzeugt aus Freitext-Stichpunkten + Unternehmensdaten eine strukturierte Stellenanzeige.
    Gibt None zurück, wenn kein API-Key konfiguriert ist oder ein Fehler auftritt."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY nicht konfiguriert")
        return None

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        user_content = f"Stichpunkte des Arbeitgebers:\n\n{prompt}{_company_block(company_context)}"

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )

        raw = message.content[0].text.strip()

        # JSON robust extrahieren (falls doch Markdown-Fences kommen)
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            logger.error(f"Job-Writer: kein JSON in der Antwort: {raw[:200]}")
            return None

        # strict=False erlaubt echte Zeilenumbrüche in Strings (das HTML kann welche enthalten)
        try:
            data = json.loads(m.group(0), strict=False)
        except json.JSONDecodeError as je:
            # Fallback: Steuerzeichen entfernen und erneut versuchen
            cleaned = re.sub(r"[\x00-\x1f]+", " ", m.group(0))
            logger.warning(f"Job-Writer: JSON-Reparatur nötig ({je})")
            data = json.loads(cleaned, strict=False)
        result = _coerce(data)
        # Token-Verbrauch für Auswertung anhängen (vom Endpoint ausgewertet)
        try:
            result["_usage"] = {
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens,
            }
        except Exception:
            result["_usage"] = {"input_tokens": 0, "output_tokens": 0}
        return result

    except Exception as e:
        logger.error(f"Fehler im Job-Writer: {e}")
        return None
