"""
HTML Sanitizer für sichere Content-Verarbeitung

Verwendet bleach um XSS-Angriffe zu verhindern, während
erlaubte HTML-Formatierungen erhalten bleiben.
"""
import bleach
from typing import List, Dict, Optional

# Erlaubte HTML-Tags für Blog-Content
ALLOWED_TAGS: List[str] = [
    # Strukturelle Tags
    'p', 'br', 'hr', 'div', 'span',
    # Überschriften
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    # Text-Formatierung
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
    'sub', 'sup', 'mark', 'small',
    # Listen
    'ul', 'ol', 'li',
    # Links und Bilder
    'a', 'img',
    # Tabellen
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    # Zitate und Code
    'blockquote', 'pre', 'code',
    # Semantische Tags
    'article', 'section', 'aside', 'figure', 'figcaption',
]

# Erlaubte Attribute pro Tag
ALLOWED_ATTRIBUTES: Dict[str, List[str]] = {
    '*': ['class', 'id', 'style'],  # Für alle Tags
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan', 'scope'],
}

# Erlaubte URL-Protokolle für Links
ALLOWED_PROTOCOLS: List[str] = ['http', 'https', 'mailto', 'tel']

# Erlaubte CSS-Properties in style-Attributen
ALLOWED_CSS_PROPERTIES: List[str] = [
    'color', 'background-color', 'font-size', 'font-weight', 'font-style',
    'text-align', 'text-decoration', 'margin', 'padding', 'border',
    'width', 'height', 'max-width', 'max-height',
]


def sanitize_html(content: str) -> str:
    """
    Sanitisiert HTML-Content und entfernt gefährliche Tags/Attribute.
    
    Args:
        content: Der zu bereinigende HTML-String
        
    Returns:
        Bereinigter HTML-String ohne XSS-Vektoren
    """
    if not content:
        return ""
    
    # Bleach clean() entfernt gefährliche Tags und Attribute
    cleaned = bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,  # Entfernt nicht erlaubte Tags komplett statt sie zu escapen
    )
    
    return cleaned


def sanitize_plain_text(text: str) -> str:
    """
    Sanitisiert reinen Text (entfernt ALLE HTML-Tags).
    
    Args:
        text: Der zu bereinigende Text
        
    Returns:
        Reiner Text ohne HTML
    """
    if not text:
        return ""
    
    # Entfernt alle Tags
    return bleach.clean(text, tags=[], strip=True)


def linkify_urls(text: str) -> str:
    """
    Konvertiert URLs im Text automatisch zu Links.
    
    Args:
        text: Text mit möglichen URLs
        
    Returns:
        Text mit verlinkten URLs
    """
    if not text:
        return ""
    
    return bleach.linkify(
        text,
        callbacks=[
            # Links in neuem Tab öffnen
            lambda attrs, new: {**attrs, (None, 'target'): '_blank', (None, 'rel'): 'noopener noreferrer'}
        ],
        parse_email=True
    )
