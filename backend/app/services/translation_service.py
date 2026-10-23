"""
Translation Service für DeepL API
"""
import os
import html
import httpx
from typing import Optional, Dict, Any

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")
DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"  # Free API, für Pro: https://api.deepl.com/v2/translate


def get_deepl_status() -> Dict[str, Any]:
    """Prüft ob DeepL konfiguriert ist"""
    return {
        "configured": bool(DEEPL_API_KEY),
        "api_key_set": bool(DEEPL_API_KEY)
    }


async def translate_text(text: str, target_lang: str, source_lang: str = "DE", is_html: bool = True) -> Optional[str]:
    """
    Übersetzt einen Text mit DeepL API.

    Args:
        text: Der zu übersetzende Text
        target_lang: Zielsprache (EN, ES, RU, etc.)
        source_lang: Quellsprache (default: DE)
        is_html: Ob der Text HTML enthält (default: True). Bei Klartext-Feldern
                 wie dem Titel auf False setzen, damit DeepL keine HTML-Entities
                 (z.B. &#x27; für ') in die Ausgabe schreibt.

    Returns:
        Übersetzter Text oder None bei Fehler
    """
    if not DEEPL_API_KEY:
        raise ValueError("DEEPL_API_KEY nicht konfiguriert")
    
    if not text or not text.strip():
        return text
    
    # DeepL Sprachcodes mapping
    lang_map = {
        "en": "EN",
        "es": "ES", 
        "ru": "RU",
        "de": "DE"
    }
    
    target = lang_map.get(target_lang.lower(), target_lang.upper())
    source = lang_map.get(source_lang.lower(), source_lang.upper())
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            DEEPL_API_URL,
            headers={
                "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "text": [text],
                "target_lang": target,
                "source_lang": source,
                # tag_handling nur bei echtem HTML: sonst escaped DeepL Sonderzeichen
                # (z.B. Apostroph -> &#x27;), was in Klartext-Feldern sichtbar bliebe.
                **({"tag_handling": "html"} if is_html else {}),
                "preserve_formatting": True
            },
            timeout=30.0
        )

        if response.status_code == 200:
            result = response.json()
            translations = result.get("translations", [])
            if translations:
                translated = translations[0].get("text")
                # Klartext-Felder: eventuelle HTML-Entities wieder auflösen
                if translated and not is_html:
                    translated = html.unescape(translated)
                return translated
        else:
            raise Exception(f"DeepL API Error: {response.status_code} - {response.text}")
    
    return None


async def translate_job_fields(
    title: str,
    description: str,
    tasks: Optional[str],
    requirements: Optional[str],
    benefits: Optional[str],
    target_lang: str,
    source_lang: str = "de"
) -> Dict[str, str]:
    """
    Übersetzt alle Felder einer Stellenanzeige.
    
    Returns:
        Dictionary mit übersetzten Feldern
    """
    result = {}
    
    # Titel übersetzen (Klartext, kein HTML)
    if title:
        result["title"] = await translate_text(title, target_lang, source_lang, is_html=False)
    
    # Beschreibung übersetzen
    if description:
        result["description"] = await translate_text(description, target_lang, source_lang)
    
    # Aufgaben übersetzen
    if tasks:
        result["tasks"] = await translate_text(tasks, target_lang, source_lang)
    
    # Anforderungen übersetzen
    if requirements:
        result["requirements"] = await translate_text(requirements, target_lang, source_lang)
    
    # Benefits übersetzen
    if benefits:
        result["benefits"] = await translate_text(benefits, target_lang, source_lang)

    return result


async def auto_translate_job_to_english(job_id: int) -> None:
    """Background-Task: Übersetzt eine EIGENE, veröffentlichte Stelle automatisch
    nach Englisch (DeepL) und speichert das Ergebnis in job.translations["en"].

    Wird beim Veröffentlichen eigener Stellen angestoßen und liefert so die Inhalte
    für die englische SEO-URL /en/jobs/<slug>. Best effort – Fehler werden geloggt.

    Idempotent: bereits vorhandene brauchbare EN-Übersetzungen werden NICHT überschrieben
    (damit manuelle Korrekturen der Firma erhalten bleiben). Eigene DB-Session, da der
    Task nach dem Response läuft.
    """
    import logging
    from sqlalchemy.orm.attributes import flag_modified
    from app.core.database import SessionLocal
    from app.models.job_posting import JobPosting

    logger = logging.getLogger(__name__)

    if not DEEPL_API_KEY:
        logger.info("Auto-EN-Übersetzung übersprungen (kein DEEPL_API_KEY), Job %s", job_id)
        return

    db = SessionLocal()
    try:
        job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
        if not job:
            return
        # Nur eigene, aktive, veröffentlichte Stellen (keine externen BA-Stellen, keine Entwürfe)
        if getattr(job, "is_external", False):
            return
        if not job.is_active or job.is_draft or job.is_archived:
            return

        translations = job.translations if isinstance(job.translations, dict) else {}
        existing = translations.get("en") if isinstance(translations, dict) else None
        if existing and (str(existing.get("title") or "").strip() or str(existing.get("description") or "").strip()):
            # Schon übersetzt (ggf. manuell korrigiert) -> nichts tun
            return

        translated = await translate_job_fields(
            title=job.title,
            description=job.description,
            tasks=job.tasks,
            requirements=job.requirements,
            benefits=job.benefits,
            target_lang="en",
            source_lang="de",
        )

        if not (translated and translated.get("title")):
            logger.warning("Auto-EN-Übersetzung ohne Ergebnis für Job %s", job_id)
            return

        translations["en"] = translated
        available = job.available_languages or ["de"]
        if "en" not in available:
            available.append("en")

        job.translations = translations
        job.available_languages = available
        flag_modified(job, "translations")
        flag_modified(job, "available_languages")
        db.commit()
        logger.info("Auto-EN-Übersetzung gespeichert für Job %s", job_id)
    except Exception as e:  # noqa: BLE001
        db.rollback()
        logger.warning("Auto-EN-Übersetzung fehlgeschlagen (Job %s): %s", job_id, e)
    finally:
        db.close()
