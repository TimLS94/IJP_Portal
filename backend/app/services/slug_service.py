"""
SEO Slug Service - Generiert URL-freundliche Slugs für Jobs
"""
import re
import unicodedata


def generate_job_slug(title: str, location: str = None, accommodation: bool = False) -> str:
    """
    Generiert einen SEO-freundlichen Slug aus Jobtitel und Ort.
    
    Beispiel: "Housekeeping / Zimmerreinigung (m/w/d)" + "Hallenberg" + accommodation=True
    -> "housekeeping-zimmerreinigung-hallenberg-unterkunft"
    """
    parts = []
    
    # Titel verarbeiten
    if title:
        # Entferne (m/w/d), (h/m/d), etc.
        clean_title = re.sub(r'\([mwdhfx/]+\)', '', title, flags=re.IGNORECASE)
        # Entferne Sonderzeichen außer Buchstaben, Zahlen, Leerzeichen
        clean_title = re.sub(r'[^\w\s-]', ' ', clean_title)
        parts.append(clean_title)
    
    # Ort hinzufügen
    if location:
        parts.append(location)
    
    # Unterkunft-Keyword für SEO
    if accommodation:
        parts.append("unterkunft")
    
    # Zusammenfügen
    text = ' '.join(parts)
    
    # Normalisieren (Umlaute -> ae, oe, ue, etc.)
    slug = slugify(text)
    
    # Maximal 80 Zeichen für den Slug
    if len(slug) > 80:
        slug = slug[:80].rsplit('-', 1)[0]
    
    return slug


def slugify(text: str) -> str:
    """
    Konvertiert Text in einen URL-freundlichen Slug.
    - Umlaute werden ersetzt (ä->ae, ö->oe, ü->ue, ß->ss)
    - Sonderzeichen werden entfernt
    - Leerzeichen werden zu Bindestrichen
    - Alles lowercase
    """
    if not text:
        return ""
    
    # Deutsche Umlaute ersetzen
    replacements = {
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        'Ä': 'ae', 'Ö': 'oe', 'Ü': 'ue',
        'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u',
        'ñ': 'n', 'ç': 'c',
    }
    
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    
    # Unicode normalisieren
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # Lowercase
    text = text.lower()
    
    # Nur alphanumerische Zeichen und Bindestriche behalten
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    
    # Mehrfache Leerzeichen/Bindestriche zu einem Bindestrich
    text = re.sub(r'[-\s]+', '-', text)
    
    # Führende/trailing Bindestriche entfernen
    text = text.strip('-')
    
    return text


def extract_id_from_slug(slug_with_id: str) -> tuple[str, int]:
    """
    Extrahiert Slug und ID aus einer URL wie "housekeeping-hallenberg-12"
    
    Returns: (slug, id) oder (None, id) wenn nur ID
    """
    if not slug_with_id:
        return None, None
    
    # Prüfen ob es nur eine Zahl ist (alte URL-Struktur)
    if slug_with_id.isdigit():
        return None, int(slug_with_id)
    
    # Versuche ID am Ende zu extrahieren (nach letztem Bindestrich)
    match = re.match(r'^(.+)-(\d+)$', slug_with_id)
    if match:
        return match.group(1), int(match.group(2))
    
    # Fallback: Vielleicht ist es nur eine ID ohne Bindestrich
    try:
        return None, int(slug_with_id)
    except ValueError:
        return slug_with_id, None
