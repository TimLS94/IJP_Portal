"""
Anabin University Verification Service

Durchsucht eine lokale Kopie der anabin-Datenbank (Usbekistan & Kirgisistan)
mit Fuzzy-Matching für Universitätsnamen.
"""
import json
import logging
import os
import re
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

# Pfad zur lokalen Datenbank
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
ANABIN_DB_FILE = os.path.join(DATA_DIR, 'anabin_universities.json')


class VerificationStatus(str, Enum):
    """Status der Uni-Verifizierung"""
    NOT_CHECKED = "not_checked"
    VERIFIED = "verified"
    NOT_FOUND = "not_found"
    UNCERTAIN = "uncertain"
    ERROR = "error"


@dataclass
class AnabinResult:
    """Ergebnis einer Anabin-Suche"""
    found: bool
    name_original: str = ""
    name_german: str = ""
    city: str = ""
    country: str = ""
    institution_type: str = ""
    status: str = ""  # H+, H+/-, H-
    match_score: float = 0.0


class AnabinService:
    """Service für lokale Anabin-Datenbankabfragen"""
    
    def __init__(self):
        self.universities = []
        self.loaded = False
        self._load_database()
    
    def _load_database(self):
        """Lädt die lokale Datenbank"""
        try:
            if os.path.exists(ANABIN_DB_FILE):
                with open(ANABIN_DB_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.universities = data.get('universities', [])
                    self.loaded = True
                    logger.info(f"Anabin-Datenbank geladen: {len(self.universities)} Universitäten")
            else:
                logger.warning(f"Anabin-Datenbank nicht gefunden: {ANABIN_DB_FILE}")
        except Exception as e:
            logger.error(f"Fehler beim Laden der Anabin-Datenbank: {e}")
    
    def normalize_text(self, text: str) -> str:
        """Normalisiert Text für besseres Matching"""
        if not text:
            return ""
        
        # Kleinbuchstaben
        text = text.lower()
        
        # Häufige Variationen normalisieren
        replacements = {
            "ü": "u",
            "ö": "o",
            "ä": "a",
            "ß": "ss",
            "'": "",
            "'": "",
            "`": "",
            "´": "",
            "-": " ",
            "_": " ",
            "  ": " ",
            "universität": "universitat",
            "university": "universitat",
            "universiteti": "universitat",
            "universitet": "universitat",
            "institut": "institut",
            "institute": "institut",
            "instituti": "institut",
            "staatliche": "staatlich",
            "staatliches": "staatlich",
            "staatlicher": "staatlich",
            "davlat": "staatlich",
            "mamlekettik": "staatlich",
            "technische": "technisch",
            "texnika": "technisch",
            "texnologiya": "technisch",
            "technologische": "technisch",
            "pädagogische": "padagogisch",
            "pedagogika": "padagogisch",
            "pedagogik": "padagogisch",
            "medizinische": "medizinisch",
            "tibbiyot": "medizinisch",
            "medicinalyk": "medizinisch",
            "filiale": "filial",
            "filiali": "filial",
            "taschkent": "tashkent",
            "toshkent": "tashkent",
            "bischkek": "bishkek",
            "biskek": "bishkek",
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Mehrfache Leerzeichen entfernen
        text = ' '.join(text.split())
        
        return text
    
    def search_university(
        self, 
        query: str, 
        country: Optional[str] = None,
        city: Optional[str] = None,
        limit: int = 5
    ) -> List[AnabinResult]:
        """
        Sucht eine Universität in der lokalen Datenbank.
        
        Args:
            query: Suchbegriff (Universitätsname)
            country: Land (optional, zur Filterung)
            city: Stadt (optional, für Bonus-Score)
            limit: Maximale Anzahl Ergebnisse
            
        Returns:
            Liste von AnabinResult-Objekten, sortiert nach Match-Score
        """
        if not self.loaded or not self.universities:
            logger.warning("Anabin-Datenbank nicht geladen")
            return []
        
        if not query:
            return []
        
        results = []
        normalized_query = self.normalize_text(query)
        normalized_city = self.normalize_text(city) if city else ""
        
        # Land normalisieren
        country_filter = None
        if country:
            country_lower = country.lower()
            if 'usbek' in country_lower or 'uzbek' in country_lower:
                country_filter = 'Usbekistan'
            elif 'kirgis' in country_lower or 'kyrgyz' in country_lower:
                country_filter = 'Kirgisistan'
        
        for uni in self.universities:
            # Land-Filter anwenden
            if country_filter and uni.get('country') != country_filter:
                continue
            
            # Verschiedene Felder zum Matching verwenden
            name_original = uni.get('name_original', '')
            name_german = uni.get('name_german', '')
            uni_city = uni.get('city', '')
            
            # Normalisierte Versionen
            norm_original = self.normalize_text(name_original)
            norm_german = self.normalize_text(name_german)
            norm_uni_city = self.normalize_text(uni_city)
            
            # Verschiedene Matching-Strategien
            scores = []
            
            # Original-Name Matching
            if norm_original:
                scores.extend([
                    fuzz.ratio(normalized_query, norm_original),
                    fuzz.partial_ratio(normalized_query, norm_original),
                    fuzz.token_sort_ratio(normalized_query, norm_original),
                    fuzz.token_set_ratio(normalized_query, norm_original),
                ])
            
            # Deutscher Name Matching
            if norm_german:
                scores.extend([
                    fuzz.ratio(normalized_query, norm_german),
                    fuzz.partial_ratio(normalized_query, norm_german),
                    fuzz.token_sort_ratio(normalized_query, norm_german),
                    fuzz.token_set_ratio(normalized_query, norm_german),
                ])
            
            if not scores:
                continue
            
            # Bester Score
            best_score = max(scores)
            
            # Stadt-Bonus
            if normalized_city and norm_uni_city:
                city_score = fuzz.ratio(normalized_city, norm_uni_city)
                if city_score > 70:
                    best_score = min(100, best_score + 5)
            
            # Nur relevante Ergebnisse
            if best_score >= 40:
                results.append(AnabinResult(
                    found=True,
                    name_original=name_original,
                    name_german=name_german,
                    city=uni_city,
                    country=uni.get('country', ''),
                    institution_type=uni.get('type', ''),
                    status=uni.get('status', ''),
                    match_score=best_score,
                ))
        
        # Nach Score sortieren
        results.sort(key=lambda x: x.match_score, reverse=True)
        
        return results[:limit]
    
    def verify_university(
        self,
        university_name: str,
        country: Optional[str] = None,
        city: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verifiziert eine Universität und gibt das beste Ergebnis zurück.
        
        Args:
            university_name: Name der Universität
            country: Land
            city: Stadt
            
        Returns:
            Dictionary mit Verifizierungsergebnis
        """
        result = {
            'status': VerificationStatus.NOT_CHECKED.value,
            'match_score': 0,
            'best_match': None,
            'all_matches': [],
            'message': '',
            'database_loaded': self.loaded,
            'database_count': len(self.universities),
        }
        
        if not university_name:
            result['status'] = VerificationStatus.ERROR.value
            result['message'] = 'Kein Universitätsname angegeben'
            return result
        
        if not self.loaded:
            result['status'] = VerificationStatus.ERROR.value
            result['message'] = 'Anabin-Datenbank nicht geladen'
            return result
        
        try:
            matches = self.search_university(university_name, country, city)
            
            if not matches:
                result['status'] = VerificationStatus.NOT_FOUND.value
                result['message'] = f'Keine Übereinstimmung für "{university_name}" gefunden'
                return result
            
            # Beste Übereinstimmung
            best = matches[0]
            display_name = best.name_german if best.name_german else best.name_original
            
            result['best_match'] = {
                'name_original': best.name_original,
                'name_german': best.name_german,
                'display_name': display_name,
                'city': best.city,
                'country': best.country,
                'type': best.institution_type,
                'status': best.status,
                'match_score': round(best.match_score, 1),
            }
            result['match_score'] = round(best.match_score, 1)
            
            # Alle Matches
            result['all_matches'] = [
                {
                    'name_original': m.name_original,
                    'name_german': m.name_german,
                    'display_name': m.name_german if m.name_german else m.name_original,
                    'city': m.city,
                    'country': m.country,
                    'status': m.status,
                    'match_score': round(m.match_score, 1),
                }
                for m in matches
            ]
            
            # Status bestimmen
            if best.match_score >= 85:
                result['status'] = VerificationStatus.VERIFIED.value
                result['message'] = f'✅ Hohe Übereinstimmung ({best.match_score:.0f}%): {display_name}'
            elif best.match_score >= 60:
                result['status'] = VerificationStatus.UNCERTAIN.value
                result['message'] = f'⚠️ Mögliche Übereinstimmung ({best.match_score:.0f}%): {display_name}'
            else:
                result['status'] = VerificationStatus.NOT_FOUND.value
                result['message'] = f'❌ Niedrige Übereinstimmung ({best.match_score:.0f}%): {display_name}'
            
        except Exception as e:
            logger.error(f"Verifizierung fehlgeschlagen: {e}")
            result['status'] = VerificationStatus.ERROR.value
            result['message'] = f'Fehler bei der Verifizierung: {str(e)}'
        
        return result
    
    def get_database_info(self) -> Dict[str, Any]:
        """Gibt Informationen über die Datenbank zurück"""
        return {
            'loaded': self.loaded,
            'count': len(self.universities),
            'file_path': ANABIN_DB_FILE,
            'file_exists': os.path.exists(ANABIN_DB_FILE),
        }


# Singleton
anabin_service = AnabinService()

