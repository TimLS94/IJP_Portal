"""
Translation Service für DeepL API
"""
import os
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


async def translate_text(text: str, target_lang: str, source_lang: str = "DE") -> Optional[str]:
    """
    Übersetzt einen Text mit DeepL API.
    
    Args:
        text: Der zu übersetzende Text
        target_lang: Zielsprache (EN, ES, RU, etc.)
        source_lang: Quellsprache (default: DE)
    
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
                "tag_handling": "html",
                "preserve_formatting": True
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            result = response.json()
            translations = result.get("translations", [])
            if translations:
                return translations[0].get("text")
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
    
    # Titel übersetzen
    if title:
        result["title"] = await translate_text(title, target_lang, source_lang)
    
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
