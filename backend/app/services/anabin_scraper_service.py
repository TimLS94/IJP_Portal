"""
Anabin Scraper Service
======================
Scrapt Universitätsdaten von anabin.kmk.org und aktualisiert die lokale Datenbank.
"""

import json
import time
import re
import os
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# Pfad zur lokalen Datenbank
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
ANABIN_DB_FILE = os.path.join(DATA_DIR, 'anabin_universities.json')

# Verfügbare Länder-Gruppen
COUNTRY_GROUPS = {
    "zentralasien": ["Kasachstan", "Kirgisistan", "Tadschikistan", "Turkmenistan", "Usbekistan"],
    "mongolei": ["Mongolei"],
    "philippinen": ["Philippinen"],
    "suedamerika": ["Argentinien", "Bolivien", "Brasilien", "Chile", "Kolumbien", "Ecuador", "Paraguay", "Peru", "Uruguay", "Venezuela"],
    "mexiko": ["Mexiko"],
    "tuerkei": ["Türkei"],
    "russland": ["Russland", "Russische Föderation"],
    "ukraine": ["Ukraine"],
    "indien": ["Indien"],
    "china": ["China"],
    "vietnam": ["Vietnam"],
    "indonesien": ["Indonesien"],
}

# Standard-Länder für IJP
DEFAULT_COUNTRIES = [
    "Kasachstan", "Kirgisistan", "Tadschikistan", "Turkmenistan", "Usbekistan",
    "Mongolei", "Philippinen",
    "Argentinien", "Bolivien", "Brasilien", "Chile", "Kolumbien",
    "Ecuador", "Paraguay", "Peru", "Uruguay", "Venezuela",
    "Mexiko",
]


class ScrapeStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class ScrapeProgress:
    status: ScrapeStatus = ScrapeStatus.IDLE
    current_country: str = ""
    current_country_index: int = 0
    total_countries: int = 0
    universities_found: int = 0
    countries_completed: List[str] = field(default_factory=list)
    countries_failed: List[Dict[str, str]] = field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "current_country": self.current_country,
            "current_country_index": self.current_country_index,
            "total_countries": self.total_countries,
            "universities_found": self.universities_found,
            "countries_completed": self.countries_completed,
            "countries_failed": self.countries_failed,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
            "progress_percent": round((self.current_country_index / self.total_countries * 100) if self.total_countries > 0 else 0, 1),
        }


class AnabinScraperService:
    """Service zum Scrapen von anabin.kmk.org"""
    
    BASE_URL = "https://anabin.kmk.org/db/institutionen"
    PAGE_SIZE = 100
    
    def __init__(self):
        self.progress = ScrapeProgress()
        self._cancel_requested = False
        self._is_running = False
    
    def get_progress(self) -> Dict[str, Any]:
        """Gibt den aktuellen Fortschritt zurück"""
        return self.progress.to_dict()
    
    def _sleep(self, seconds: float) -> None:
        """Unterbrechbares Sleep — prüft alle 0.1s ob Cancel angefordert wurde."""
        steps = int(seconds / 0.1)
        for _ in range(max(1, steps)):
            if self._cancel_requested:
                return
            time.sleep(0.1)

    def cancel_scrape(self) -> bool:
        """Bricht den laufenden Scrape ab"""
        if self._is_running:
            self._cancel_requested = True
            return True
        return False
    
    def is_running(self) -> bool:
        return self._is_running
    
    def get_available_country_groups(self) -> Dict[str, List[str]]:
        """Gibt verfügbare Ländergruppen zurück"""
        return COUNTRY_GROUPS
    
    def get_default_countries(self) -> List[str]:
        """Gibt Standard-Länder zurück"""
        return DEFAULT_COUNTRIES
    
    @staticmethod
    def _clean(text: str) -> str:
        """Bereinigt Text"""
        return " ".join((text or "").split()).strip()
    
    @staticmethod
    def _normalize_status(raw: str) -> str:
        """Normalisiert Anabin-Status"""
        raw = AnabinScraperService._clean(raw)
        if "+/-" in raw:
            return "H +/-"
        if re.search(r"H\s*\+", raw):
            return "H+"
        if re.search(r"H\s*-", raw):
            return "H-"
        return raw
    
    def _get_cell_text(self, cell) -> str:
        """Extrahiert Text aus Tabellenzelle"""
        spans = cell.query_selector_all("span.table--cell--list--item")
        if spans:
            return self._clean(spans[0].inner_text())
        return self._clean(cell.inner_text())
    
    def _get_all_names(self, cell) -> List[str]:
        """Extrahiert alle Namen aus Tabellenzelle"""
        spans = cell.query_selector_all("span.table--cell--list--item")
        if spans:
            return [self._clean(s.inner_text()) for s in spans if self._clean(s.inner_text())]
        text = self._clean(cell.inner_text())
        return [text] if text else []
    
    def _scrape_table(self, page, country_name: str) -> List[Dict[str, Any]]:
        """Scrapt eine Tabellenseite"""
        unis = []
        rows = page.query_selector_all("#tableBody tr")
        
        for row in rows:
            try:
                cells = row.query_selector_all("td")
                if len(cells) < 5:
                    continue
                
                data = {}
                for cell in cells:
                    label = (cell.get_attribute("aria-label") or "").strip().lower()
                    
                    if "institution" in label and "typ" not in label:
                        data["name_original"] = self._get_cell_text(cell)
                        data["name_alternatives"] = self._get_all_names(cell)
                    elif "übersetzung" in label or "deutsch" in label:
                        data["name_german"] = self._get_cell_text(cell)
                    elif label == "ort":
                        data["city"] = self._get_cell_text(cell)
                    elif "typ" in label:
                        data["type"] = self._get_cell_text(cell)
                    elif "status" in label:
                        data["status"] = self._normalize_status(cell.inner_text())
                    elif label == "land":
                        data["country_from_table"] = self._get_cell_text(cell)
                
                name = data.get("name_original", "")
                if name:
                    unis.append({
                        "name_original": name,
                        "name_german": data.get("name_german", ""),
                        "city": data.get("city", ""),
                        "type": data.get("type", ""),
                        "status": data.get("status", ""),
                        "country": data.get("country_from_table", country_name),
                    })
            except Exception as e:
                logger.debug(f"Fehler beim Parsen einer Zeile: {e}")
                continue
        
        return unis
    
    def _wait_for_table(self, page, timeout: int = 20000):
        """Wartet auf Tabelle"""
        try:
            page.wait_for_selector("#tableBody tr", timeout=timeout)
        except Exception:
            pass
        self._sleep(0.8)
    
    def _set_page_size(self, page, size: int = 100):
        """Setzt Seitengröße"""
        try:
            page.wait_for_selector("select.limit-select", timeout=10000)
            page.evaluate(f"""
                const sel = document.querySelector('select.limit-select');
                if (sel) {{
                    sel.value = '{size}';
                    sel.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
            """)
            self._sleep(1.5)
        except Exception:
            pass
    
    def _click_next_page(self, page) -> bool:
        """Klickt auf nächste Seite"""
        next_btn = page.query_selector("button.p-pagination__link--next")
        if not next_btn:
            return False
        
        cls = next_btn.get_attribute("class") or ""
        disabled = next_btn.get_attribute("disabled")
        if "is-disabled" in cls or disabled is not None:
            return False
        
        try:
            first_row_text = page.query_selector("#tableBody tr td").inner_text()
        except Exception:
            first_row_text = ""
        
        next_btn.scroll_into_view_if_needed()
        self._sleep(0.3)
        page.evaluate("btn => btn.click()", next_btn)
        
        for _ in range(20):
            self._sleep(0.5)
            try:
                new_text = page.query_selector("#tableBody tr td").inner_text()
                if new_text != first_row_text:
                    break
            except Exception:
                break
        
        self._sleep(0.5)
        return True
    
    def _select_country(self, page, country_name: str) -> bool:
        """Wählt ein Land aus"""
        search = page.query_selector("#searchCountriesInput")
        search.click()
        search.fill(country_name)
        self._sleep(0.6)
        
        all_links = page.query_selector_all("#filteredCountriesList li a.p-contextual-menu__link")
        for link in all_links:
            if self._clean(link.inner_text()) == country_name:
                link.click()
                return True
        
        if all_links:
            all_links[0].click()
            return True
        
        return False
    
    def _remove_country_chip(self, page):
        """Entfernt den aktiven Länder-Chip"""
        chip_dismiss = page.query_selector("#countriesSelectedList .p-chip__dismiss")
        if chip_dismiss:
            chip_dismiss.click()
            self._sleep(0.5)
        else:
            reset = page.query_selector("#resetAllButton")
            if reset:
                reset.click()
                self._sleep(0.8)
    
    async def scrape_countries(
        self, 
        countries: Optional[List[str]] = None,
        merge_with_existing: bool = True,
        headless: bool = True,
        progress_callback: Optional[Callable[[Dict], None]] = None
    ) -> Dict[str, Any]:
        """
        Scrapt Universitäten für die angegebenen Länder.
        
        Args:
            countries: Liste der Länder (None = Standard-Länder)
            merge_with_existing: Bestehende Daten beibehalten und ergänzen
            headless: Browser unsichtbar ausführen
            progress_callback: Callback für Fortschrittsupdates
            
        Returns:
            Dictionary mit Ergebnis
        """
        if self._is_running:
            return {
                "success": False,
                "message": "Ein Scrape-Vorgang läuft bereits"
            }
        
        # Synchronen Scrape in separatem Thread ausführen
        result = await asyncio.to_thread(
            self._scrape_countries_sync,
            countries,
            merge_with_existing,
            headless,
            progress_callback
        )
        
        # Daten speichern wenn erfolgreich
        if result.get("success") and result.get("_unis"):
            await self._save_database(result["_unis"], merge_with_existing)
            del result["_unis"]
        
        return result
    
    def _scrape_countries_sync(
        self,
        countries: Optional[List[str]] = None,
        merge_with_existing: bool = True,
        headless: bool = True,
        progress_callback: Optional[Callable[[Dict], None]] = None
    ) -> Dict[str, Any]:
        """Synchrone Scrape-Methode (wird in separatem Thread ausgeführt)"""
        
        self._is_running = True
        self._cancel_requested = False
        
        # Länder bestimmen
        target_countries = countries if countries else DEFAULT_COUNTRIES
        
        # Progress initialisieren
        self.progress = ScrapeProgress(
            status=ScrapeStatus.RUNNING,
            total_countries=len(target_countries),
            started_at=datetime.now()
        )
        
        all_unis = []
        page_size_set = False
        
        try:
            from playwright.sync_api import sync_playwright
            
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=headless)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1440, "height": 900}
                )
                page = context.new_page()
                
                logger.info("Lade anabin.kmk.org...")
                page.goto(self.BASE_URL, wait_until="networkidle", timeout=30000)
                self._sleep(2)
                
                # Verfügbare Länder prüfen
                country_els = page.query_selector_all("#filteredCountriesList li a.p-contextual-menu__link")
                available_countries = [self._clean(el.inner_text()) for el in country_els if self._clean(el.inner_text())]
                
                # Nur Länder scrapen die verfügbar sind
                countries_to_scrape = [c for c in target_countries if c in available_countries]
                self.progress.total_countries = len(countries_to_scrape)
                
                logger.info(f"Scrape {len(countries_to_scrape)} Länder von {len(target_countries)} angeforderten")
                
                for i, country_name in enumerate(countries_to_scrape, 1):
                    if self._cancel_requested:
                        self.progress.status = ScrapeStatus.CANCELLED
                        break
                    
                    self.progress.current_country = country_name
                    self.progress.current_country_index = i
                    
                    if progress_callback:
                        progress_callback(self.progress.to_dict())
                    
                    logger.info(f"[{i}/{len(countries_to_scrape)}] Scrape {country_name}...")
                    
                    try:
                        self._select_country(page, country_name)
                        self._wait_for_table(page)
                        
                        if not page_size_set:
                            self._set_page_size(page, self.PAGE_SIZE)
                            self._wait_for_table(page)
                            page_size_set = True
                        
                        page_num = 1
                        page_unis = []
                        
                        while True:
                            if self._cancel_requested:
                                break
                            
                            batch = self._scrape_table(page, country_name)
                            page_unis.extend(batch)
                            
                            if not self._click_next_page(page):
                                break
                            page_num += 1
                        
                        all_unis.extend(page_unis)
                        self.progress.universities_found = len(all_unis)
                        self.progress.countries_completed.append(country_name)
                        
                        logger.info(f"  ✓ {country_name}: {len(page_unis)} Unis auf {page_num} Seite(n)")
                        
                        self._remove_country_chip(page)
                        
                    except Exception as e:
                        logger.error(f"  ✗ {country_name}: {e}")
                        self.progress.countries_failed.append({
                            "country": country_name,
                            "error": str(e)
                        })
                        
                        try:
                            reset = page.query_selector("#resetAllButton")
                            if reset:
                                reset.click()
                                self._sleep(1)
                            else:
                                page.goto(self.BASE_URL, wait_until="networkidle", timeout=20000)
                                self._sleep(2)
                                page_size_set = False
                        except Exception:
                            pass
                
                browser.close()
            
            self.progress.status = ScrapeStatus.COMPLETED if not self._cancel_requested else ScrapeStatus.CANCELLED
            self.progress.completed_at = datetime.now()
            
            return {
                "success": True,
                "message": f"Scrape abgeschlossen: {len(all_unis)} Universitäten aus {len(self.progress.countries_completed)} Ländern",
                "universities_count": len(all_unis),
                "countries_completed": self.progress.countries_completed,
                "countries_failed": self.progress.countries_failed,
                "_unis": all_unis,  # Wird von der async Methode verarbeitet
            }
            
        except Exception as e:
            logger.error(f"Scrape fehlgeschlagen: {e}")
            self.progress.status = ScrapeStatus.ERROR
            self.progress.error_message = str(e)
            self.progress.completed_at = datetime.now()
            
            return {
                "success": False,
                "message": f"Scrape fehlgeschlagen: {str(e)}",
                "error": str(e)
            }
        
        finally:
            self._is_running = False
    
    async def _save_database(self, new_unis: List[Dict], merge: bool = True):
        """Speichert die Datenbank"""
        existing_unis = []
        
        if merge and os.path.exists(ANABIN_DB_FILE):
            try:
                with open(ANABIN_DB_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    existing_unis = data.get('universities', [])
            except Exception as e:
                logger.warning(f"Konnte bestehende Datenbank nicht laden: {e}")
        
        if merge and existing_unis:
            # Bestehende Unis nach Land gruppieren
            existing_by_country = {}
            for uni in existing_unis:
                country = uni.get('country', '')
                if country not in existing_by_country:
                    existing_by_country[country] = []
                existing_by_country[country].append(uni)
            
            # Neue Unis nach Land gruppieren
            new_by_country = {}
            for uni in new_unis:
                country = uni.get('country', '')
                if country not in new_by_country:
                    new_by_country[country] = []
                new_by_country[country].append(uni)
            
            # Für jedes neue Land: bestehende ersetzen
            for country in new_by_country:
                existing_by_country[country] = new_by_country[country]
            
            # Wieder zusammenführen
            merged_unis = []
            for country_unis in existing_by_country.values():
                merged_unis.extend(country_unis)
            
            final_unis = merged_unis
        else:
            final_unis = new_unis
        
        # Speichern
        data = {
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "source": "anabin.kmk.org",
            "total_count": len(final_unis),
            "universities": final_unis
        }
        
        os.makedirs(DATA_DIR, exist_ok=True)
        
        with open(ANABIN_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Datenbank gespeichert: {len(final_unis)} Universitäten -> {ANABIN_DB_FILE}")
    
    def get_database_info(self) -> Dict[str, Any]:
        """Gibt Informationen über die aktuelle Datenbank zurück"""
        if not os.path.exists(ANABIN_DB_FILE):
            return {
                "exists": False,
                "path": ANABIN_DB_FILE
            }
        
        try:
            with open(ANABIN_DB_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Länder zählen
            countries = {}
            for uni in data.get('universities', []):
                country = uni.get('country', 'Unbekannt')
                countries[country] = countries.get(country, 0) + 1
            
            return {
                "exists": True,
                "path": ANABIN_DB_FILE,
                "last_updated": data.get('last_updated'),
                "total_count": data.get('total_count', 0),
                "countries": countries,
                "countries_count": len(countries),
            }
        except Exception as e:
            return {
                "exists": True,
                "path": ANABIN_DB_FILE,
                "error": str(e)
            }


# Singleton
anabin_scraper_service = AnabinScraperService()
