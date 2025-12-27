"""
Anabin University Verification Service

Sucht Universitäten in der anabin-Datenbank (anabin.kmk.org) und
prüft die Anerkennung für ausländische Hochschulen.

WICHTIG: Dieses Scraping sollte verantwortungsvoll genutzt werden.
Nicht für Massenabfragen verwenden!
"""
import logging
import re
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

import requests
from bs4 import BeautifulSoup
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

# Anabin URLs
ANABIN_BASE_URL = "https://anabin.kmk.org"
ANABIN_SEARCH_URL = f"{ANABIN_BASE_URL}/db/institutionen"

# Länder-Mapping (deutsch -> anabin-Code)
COUNTRY_MAPPING = {
    "usbekistan": "Usbekistan",
    "uzbekistan": "Usbekistan",
    "kirgisistan": "Kirgisistan",
    "kyrgyzstan": "Kirgisistan",
    "kirgisien": "Kirgisistan",
    "kasachstan": "Kasachstan",
    "kazakhstan": "Kasachstan",
    "tadschikistan": "Tadschikistan",
    "tajikistan": "Tadschikistan",
    "turkmenistan": "Turkmenistan",
    "russland": "Russische Föderation",
    "russia": "Russische Föderation",
    "ukraine": "Ukraine",
    "belarus": "Belarus",
    "weißrussland": "Belarus",
}


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
    institution_name: str = ""
    german_name: str = ""
    city: str = ""
    country: str = ""
    institution_type: str = ""
    status: str = ""  # H+, H+/-, H- etc.
    match_score: float = 0.0
    anabin_id: Optional[str] = None
    details_url: Optional[str] = None
    raw_data: Optional[Dict] = None


class AnabinService:
    """Service für Anabin-Datenbankabfragen"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        })
    
    def normalize_country(self, country: str) -> str:
        """Normalisiert Ländernamen für anabin"""
        if not country:
            return ""
        country_lower = country.lower().strip()
        return COUNTRY_MAPPING.get(country_lower, country)
    
    def normalize_university_name(self, name: str) -> str:
        """Normalisiert Universitätsnamen für besseres Matching"""
        if not name:
            return ""
        
        # Kleinbuchstaben
        name = name.lower()
        
        # Häufige Abkürzungen expandieren
        replacements = {
            "uni ": "university ",
            "univ ": "university ",
            "univ.": "university",
            "u.": "university",
            "nat.": "national",
            "nat ": "national ",
            "tech.": "technical",
            "tech ": "technical ",
            "inst.": "institute",
            "inst ": "institute ",
            "polytech": "polytechnic",
            "staatl.": "state",
            "staatl ": "state ",
            "state ": "state ",
        }
        
        for old, new in replacements.items():
            name = name.replace(old, new)
        
        # Sonderzeichen entfernen
        name = re.sub(r'[^\w\s]', ' ', name)
        
        # Mehrfache Leerzeichen entfernen
        name = ' '.join(name.split())
        
        return name
    
    def search_institution(
        self, 
        university_name: str, 
        country: Optional[str] = None,
        city: Optional[str] = None
    ) -> List[AnabinResult]:
        """
        Sucht eine Institution in der anabin-Datenbank.
        
        Args:
            university_name: Name der Universität
            country: Land (optional, verbessert Suche)
            city: Stadt (optional, für Matching)
            
        Returns:
            Liste von AnabinResult-Objekten, sortiert nach Match-Score
        """
        results = []
        
        try:
            # Land normalisieren
            normalized_country = self.normalize_country(country) if country else ""
            
            # Suchseite laden
            response = self.session.get(ANABIN_SEARCH_URL, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # CSRF-Token oder Session-Daten extrahieren falls nötig
            # (anabin verwendet möglicherweise Formulare)
            
            # Such-Request vorbereiten
            search_params = {
                'search': university_name[:50],  # Begrenzen
            }
            
            if normalized_country:
                search_params['country'] = normalized_country
            
            # POST-Request für Suche (falls anabin das erwartet)
            # Oder GET mit Parametern
            search_response = self.session.get(
                ANABIN_SEARCH_URL,
                params=search_params,
                timeout=30
            )
            
            if search_response.status_code != 200:
                logger.warning(f"Anabin-Suche fehlgeschlagen: {search_response.status_code}")
                return results
            
            search_soup = BeautifulSoup(search_response.text, 'lxml')
            
            # Ergebnisse parsen (HTML-Struktur von anabin analysieren)
            # Die genaue Struktur muss möglicherweise angepasst werden
            result_table = search_soup.find('table', {'class': 'table'}) or search_soup.find('table')
            
            if not result_table:
                logger.info(f"Keine Tabelle gefunden für: {university_name}")
                return results
            
            rows = result_table.find_all('tr')[1:]  # Erste Zeile ist Header
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) < 4:
                    continue
                
                inst_name = cells[0].get_text(strip=True)
                german_name = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                inst_city = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                inst_type = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                inst_status = cells[4].get_text(strip=True) if len(cells) > 4 else ""
                inst_country = cells[5].get_text(strip=True) if len(cells) > 5 else ""
                
                # Link zur Detail-Seite extrahieren
                link = row.find('a')
                detail_url = None
                anabin_id = None
                if link and link.get('href'):
                    detail_url = ANABIN_BASE_URL + link['href']
                    # ID aus URL extrahieren
                    id_match = re.search(r'/(\d+)$', link['href'])
                    if id_match:
                        anabin_id = id_match.group(1)
                
                # Fuzzy-Matching Score berechnen
                normalized_search = self.normalize_university_name(university_name)
                normalized_found = self.normalize_university_name(inst_name)
                
                # Verschiedene Matching-Strategien kombinieren
                scores = [
                    fuzz.ratio(normalized_search, normalized_found),
                    fuzz.partial_ratio(normalized_search, normalized_found),
                    fuzz.token_sort_ratio(normalized_search, normalized_found),
                    fuzz.token_set_ratio(normalized_search, normalized_found),
                ]
                match_score = max(scores)
                
                # Bonus für Stadt-Match
                if city and inst_city:
                    city_score = fuzz.ratio(city.lower(), inst_city.lower())
                    if city_score > 80:
                        match_score = min(100, match_score + 10)
                
                results.append(AnabinResult(
                    found=True,
                    institution_name=inst_name,
                    german_name=german_name,
                    city=inst_city,
                    country=inst_country,
                    institution_type=inst_type,
                    status=inst_status,
                    match_score=match_score,
                    anabin_id=anabin_id,
                    details_url=detail_url,
                    raw_data={
                        'cells': [c.get_text(strip=True) for c in cells]
                    }
                ))
            
            # Nach Match-Score sortieren
            results.sort(key=lambda x: x.match_score, reverse=True)
            
        except requests.RequestException as e:
            logger.error(f"Anabin-Request fehlgeschlagen: {e}")
        except Exception as e:
            logger.error(f"Anabin-Suche Fehler: {e}")
        
        return results
    
    def get_institution_details(self, anabin_id: str) -> Optional[Dict[str, Any]]:
        """
        Lädt Detail-Informationen zu einer Institution.
        
        Args:
            anabin_id: Anabin-ID der Institution
            
        Returns:
            Dictionary mit Details oder None
        """
        try:
            detail_url = f"{ANABIN_BASE_URL}/db/institutionen/{anabin_id}"
            response = self.session.get(detail_url, timeout=30)
            
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            details = {
                'id': anabin_id,
                'url': detail_url,
            }
            
            # Detail-Felder extrahieren (muss an HTML-Struktur angepasst werden)
            # Typische Felder: Name, Land, Ort, Typ, Status, Anmerkungen
            
            # Versuche verschiedene HTML-Strukturen
            info_table = soup.find('table', {'class': 'detail-table'}) or soup.find('dl')
            
            if info_table:
                if info_table.name == 'dl':
                    dts = info_table.find_all('dt')
                    dds = info_table.find_all('dd')
                    for dt, dd in zip(dts, dds):
                        key = dt.get_text(strip=True).lower().replace(':', '')
                        value = dd.get_text(strip=True)
                        details[key] = value
                else:
                    rows = info_table.find_all('tr')
                    for row in rows:
                        cells = row.find_all(['th', 'td'])
                        if len(cells) >= 2:
                            key = cells[0].get_text(strip=True).lower().replace(':', '')
                            value = cells[1].get_text(strip=True)
                            details[key] = value
            
            return details
            
        except Exception as e:
            logger.error(f"Fehler beim Laden der Details: {e}")
            return None
    
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
        }
        
        if not university_name:
            result['status'] = VerificationStatus.ERROR.value
            result['message'] = 'Kein Universitätsname angegeben'
            return result
        
        try:
            matches = self.search_institution(university_name, country, city)
            
            if not matches:
                result['status'] = VerificationStatus.NOT_FOUND.value
                result['message'] = f'Keine Ergebnisse für "{university_name}" gefunden'
                return result
            
            # Beste Übereinstimmung
            best = matches[0]
            result['best_match'] = {
                'name': best.institution_name,
                'german_name': best.german_name,
                'city': best.city,
                'country': best.country,
                'type': best.institution_type,
                'status': best.status,
                'match_score': best.match_score,
                'anabin_id': best.anabin_id,
                'details_url': best.details_url,
            }
            result['match_score'] = best.match_score
            
            # Alle Matches (Top 5)
            result['all_matches'] = [
                {
                    'name': m.institution_name,
                    'german_name': m.german_name,
                    'city': m.city,
                    'country': m.country,
                    'match_score': m.match_score,
                    'anabin_id': m.anabin_id,
                }
                for m in matches[:5]
            ]
            
            # Status bestimmen
            if best.match_score >= 90:
                result['status'] = VerificationStatus.VERIFIED.value
                result['message'] = f'Hohe Übereinstimmung ({best.match_score}%): {best.institution_name}'
            elif best.match_score >= 70:
                result['status'] = VerificationStatus.UNCERTAIN.value
                result['message'] = f'Mögliche Übereinstimmung ({best.match_score}%): {best.institution_name}'
            else:
                result['status'] = VerificationStatus.NOT_FOUND.value
                result['message'] = f'Niedrige Übereinstimmung ({best.match_score}%)'
            
        except Exception as e:
            logger.error(f"Verifizierung fehlgeschlagen: {e}")
            result['status'] = VerificationStatus.ERROR.value
            result['message'] = f'Fehler bei der Verifizierung: {str(e)}'
        
        return result


# Singleton
anabin_service = AnabinService()
