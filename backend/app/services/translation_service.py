"""
Translation Service - DeepL Free API Integration

Ermöglicht automatische Übersetzung von Stellenanzeigen.
DeepL Free: 500.000 Zeichen/Monat kostenlos.

API Key wird über Umgebungsvariable DEEPL_API_KEY gesetzt.
"""

import os
import httpx
from typing import Optional
import logging

logger = logging.getLogger(__name__)

DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"

# Sprach-Mapping für DeepL
LANGUAGE_MAP = {
    'de': 'DE',
    'en': 'EN',
    'es': 'ES',
    'ru': 'RU',
}


async def translate_text(
    text: str,
    target_lang: str,
    source_lang: str = 'DE'
) -> Optional[str]:
    """
    Übersetzt Text mit DeepL Free API.
    
    Args:
        text: Zu übersetzender Text
        target_lang: Zielsprache (de, en, es, ru)
        source_lang: Quellsprache (default: DE)
    
    Returns:
        Übersetzter Text oder None bei Fehler
    """
    api_key = os.getenv('DEEPL_API_KEY')
    
    if not api_key:
        logger.warning("DEEPL_API_KEY nicht gesetzt - Übersetzung nicht möglich")
        return None
    
    if not text or not text.strip():
        return text
    
    # Sprach-Code normalisieren
    target = LANGUAGE_MAP.get(target_lang.lower(), target_lang.upper())
    source = LANGUAGE_MAP.get(source_lang.lower(), source_lang.upper())
    
    # Nicht übersetzen wenn Quell- und Zielsprache gleich
    if target == source:
        return text
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DEEPL_API_URL,
                headers={
                    'Authorization': f'DeepL-Auth-Key {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'text': [text],
                    'source_lang': source,
                    'target_lang': target,
                    'preserve_formatting': True,
                },
            )
            
            if response.status_code == 200:
                result = response.json()
                translations = result.get('translations', [])
                if translations:
                    return translations[0].get('text', text)
            else:
                logger.error(f"DeepL API Fehler: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Übersetzungsfehler: {e}")
        return None
    
    return None


async def translate_job_fields(
    title: str,
    description: str,
    tasks: Optional[str],
    requirements: Optional[str],
    benefits: Optional[str],
    target_lang: str,
    source_lang: str = 'de'
) -> dict:
    """
    Übersetzt alle Felder einer Stellenanzeige.
    
    Returns:
        Dict mit übersetzten Feldern
    """
    result = {
        'title': await translate_text(title, target_lang, source_lang) if title else '',
        'description': await translate_text(description, target_lang, source_lang) if description else '',
        'tasks': await translate_text(tasks, target_lang, source_lang) if tasks else '',
        'requirements': await translate_text(requirements, target_lang, source_lang) if requirements else '',
        'benefits': await translate_text(benefits, target_lang, source_lang) if benefits else '',
    }
    
    return result


def get_deepl_status() -> dict:
    """
    Prüft ob DeepL API konfiguriert ist.
    """
    api_key = os.getenv('DEEPL_API_KEY')
    return {
        'configured': bool(api_key),
        'provider': 'DeepL Free',
        'languages': list(LANGUAGE_MAP.keys()),
    }
