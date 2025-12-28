#!/usr/bin/env python3
"""
Anabin Scraper - Extrahiert alle Universitäten aus anabin.kmk.org

VERWENDUNG:
1. Installiere Selenium: pip install selenium webdriver-manager
2. Führe das Skript aus: python scripts/scrape_anabin.py
3. Das Skript öffnet Chrome, navigiert zu anabin und extrahiert alle Unis
4. Ergebnis wird in backend/app/data/anabin_universities.json gespeichert

HINWEIS: 
- Benötigt Chrome Browser
- Kann 2-5 Minuten dauern (4 Seiten à 100 Einträge)
"""

import json
import time
import os
from datetime import datetime

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait, Select
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    print("❌ Selenium nicht installiert!")
    print("   Bitte installieren mit: pip install selenium webdriver-manager")
    exit(1)

# Konfiguration
ANABIN_URL = "https://anabin.kmk.org/no_cache/filter/institutionen.html"
COUNTRIES = ["Usbekistan", "Kirgisistan"]
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                           "backend", "app", "data", "anabin_universities.json")

def setup_driver():
    """Chrome WebDriver einrichten"""
    print("🚀 Starte Chrome Browser...")
    options = webdriver.ChromeOptions()
    # options.add_argument('--headless')  # Auskommentieren um Browser zu sehen
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def wait_for_table(driver, timeout=30):
    """Warte bis die Tabelle geladen ist"""
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, "tableBody"))
    )
    time.sleep(1)  # Zusätzliche Wartezeit für vollständiges Laden

def select_country(driver, country_name):
    """Land auswählen"""
    print(f"   Wähle Land: {country_name}")
    
    # Suchfeld für Länder finden und Text eingeben
    search_input = driver.find_element(By.ID, "searchCountriesInput")
    search_input.clear()
    search_input.send_keys(country_name)
    time.sleep(0.5)
    
    # Auf den Länder-Link klicken
    country_links = driver.find_elements(By.CSS_SELECTOR, "#filteredCountriesList a.p-contextual-menu__link")
    for link in country_links:
        if country_name.lower() in link.text.lower():
            link.click()
            time.sleep(1)
            return True
    return False

def set_page_size(driver, size=100):
    """Seitengröße auf 100 setzen"""
    try:
        select = Select(driver.find_element(By.CSS_SELECTOR, ".limit-select"))
        select.select_by_value(str(size))
        time.sleep(2)
    except:
        pass

def extract_universities_from_page(driver):
    """Extrahiere alle Unis von der aktuellen Seite"""
    universities = []
    
    rows = driver.find_elements(By.CSS_SELECTOR, "#tableBody tr.pointer")
    
    for row in rows:
        try:
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 6:
                # Namen extrahieren (können mehrere spans sein)
                name_spans = cells[0].find_elements(By.CSS_SELECTOR, "span.d-block")
                name_original = name_spans[0].text.strip() if name_spans else cells[0].text.strip()
                
                # Deutscher Name
                german_spans = cells[1].find_elements(By.CSS_SELECTOR, "span.d-block")
                name_german = german_spans[0].text.strip() if german_spans else cells[1].text.strip()
                
                uni = {
                    "name_original": name_original,
                    "name_german": name_german,
                    "city": cells[2].text.strip(),
                    "type": cells[3].text.strip(),
                    "status": cells[4].text.strip(),
                    "country": cells[5].text.strip(),
                }
                universities.append(uni)
        except Exception as e:
            print(f"   ⚠️ Fehler bei Zeile: {e}")
    
    return universities

def get_total_pages(driver):
    """Anzahl der Seiten ermitteln"""
    try:
        pagination = driver.find_elements(By.CSS_SELECTOR, ".p-pagination__item button")
        page_numbers = []
        for btn in pagination:
            try:
                num = int(btn.text)
                page_numbers.append(num)
            except:
                pass
        return max(page_numbers) if page_numbers else 1
    except:
        return 1

def go_to_next_page(driver):
    """Zur nächsten Seite navigieren"""
    try:
        next_btn = driver.find_element(By.CSS_SELECTOR, ".p-pagination__link--next:not(.is-disabled)")
        next_btn.click()
        time.sleep(2)
        return True
    except:
        return False

def scrape_anabin():
    """Hauptfunktion: Alle Unis von anabin scrapen"""
    driver = setup_driver()
    all_universities = []
    
    try:
        print(f"\n📡 Öffne anabin: {ANABIN_URL}")
        driver.get(ANABIN_URL)
        time.sleep(3)
        
        for country in COUNTRIES:
            print(f"\n🌍 Verarbeite {country}...")
            
            # Zur Hauptseite zurück
            driver.get(ANABIN_URL)
            time.sleep(2)
            
            # Land auswählen
            if not select_country(driver, country):
                print(f"   ❌ Land {country} nicht gefunden")
                continue
            
            wait_for_table(driver)
            
            # 100 pro Seite
            set_page_size(driver, 100)
            wait_for_table(driver)
            
            # Anzahl Seiten
            total_pages = get_total_pages(driver)
            print(f"   📄 {total_pages} Seiten gefunden")
            
            # Alle Seiten durchgehen
            for page in range(1, total_pages + 1):
                print(f"   📖 Seite {page}/{total_pages}...")
                
                universities = extract_universities_from_page(driver)
                all_universities.extend(universities)
                print(f"      ✓ {len(universities)} Unis extrahiert")
                
                if page < total_pages:
                    if not go_to_next_page(driver):
                        break
                    wait_for_table(driver)
        
        # Duplikate entfernen (basierend auf name_original)
        seen = set()
        unique_universities = []
        for uni in all_universities:
            key = uni['name_original']
            if key not in seen:
                seen.add(key)
                unique_universities.append(uni)
        
        print(f"\n✅ Insgesamt {len(unique_universities)} eindeutige Unis gefunden!")
        
        # JSON speichern
        output_data = {
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "source": "anabin.kmk.org - Automatisch gescraped",
            "countries": COUNTRIES,
            "total_count": len(unique_universities),
            "universities": unique_universities
        }
        
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Gespeichert in: {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        driver.quit()
        print("\n🏁 Browser geschlossen")

if __name__ == "__main__":
    print("=" * 60)
    print("   ANABIN UNIVERSITY SCRAPER")
    print("=" * 60)
    scrape_anabin()

