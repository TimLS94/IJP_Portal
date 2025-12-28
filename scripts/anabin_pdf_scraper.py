#!/usr/bin/env python3
"""
Anabin PDF Scraper - Lädt automatisch PDFs aller Universitäten herunter.

Installation:
    pip install playwright
    playwright install chromium

Verwendung:
    python anabin_pdf_scraper.py --country "Usbekistan"
    python anabin_pdf_scraper.py --country "Kirgisistan"
    python anabin_pdf_scraper.py --all
"""

import asyncio
import argparse
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# Konfiguration
OUTPUT_DIR = Path(__file__).parent / "anabin_pdfs"
ANABIN_URL = "https://anabin.kmk.org/no_cache/filter/institutionen.html"
HEADLESS = False  # Auf True setzen für unsichtbaren Browser


def sanitize_filename(name: str) -> str:
    """Entfernt ungültige Zeichen aus Dateinamen"""
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', '_', name)
    return name[:100]  # Max 100 Zeichen


async def wait_and_click(page, selector, timeout=10000):
    """Wartet auf Element und klickt"""
    await page.wait_for_selector(selector, timeout=timeout)
    await page.click(selector)


async def scrape_country(page, country: str, output_dir: Path):
    """Scraped alle Unis eines Landes"""
    print(f"\n{'='*60}")
    print(f"Starte Scraping für: {country}")
    print(f"{'='*60}")
    
    # Gehe zur Institutionen-Seite
    await page.goto(ANABIN_URL)
    await page.wait_for_load_state('networkidle')
    await asyncio.sleep(2)
    
    # Cookie-Banner akzeptieren falls vorhanden
    try:
        accept_btn = await page.query_selector('#acceptAll, .cookie-accept, [data-action="accept"]')
        if accept_btn:
            await accept_btn.click()
            await asyncio.sleep(1)
    except:
        pass
    
    # Land auswählen
    print(f"Wähle Land: {country}")
    
    # Finde das Land-Dropdown und wähle das Land
    try:
        # Klicke auf "Land" Filter
        await page.click('text=Land')
        await asyncio.sleep(0.5)
        
        # Wähle das spezifische Land
        await page.click(f'text={country}')
        await asyncio.sleep(1)
        
        # Klicke auf "Suchen" oder warte auf Ergebnisse
        search_btn = await page.query_selector('button:has-text("Suchen"), input[type="submit"]')
        if search_btn:
            await search_btn.click()
        
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)
    except Exception as e:
        print(f"⚠️ Filter-Fehler: {e}")
        print("Bitte manuell das Land auswählen...")
        input("Drücke Enter wenn bereit...")
    
    # Zähle Ergebnisse
    rows = await page.query_selector_all('tr.pointer')
    total = len(rows)
    print(f"Gefunden: {total} Institutionen")
    
    if total == 0:
        print("Keine Ergebnisse gefunden. Bitte prüfe den Filter.")
        return
    
    # Erstelle Output-Verzeichnis
    country_dir = output_dir / sanitize_filename(country)
    country_dir.mkdir(parents=True, exist_ok=True)
    
    # Iteriere durch alle Unis
    success = 0
    errors = []
    
    for i in range(total):
        try:
            # Hole aktuelle Zeilen (DOM kann sich ändern)
            rows = await page.query_selector_all('tr.pointer')
            if i >= len(rows):
                break
            
            row = rows[i]
            
            # Hole Uni-Namen aus der Zeile
            name_cell = await row.query_selector('td[aria-label="Institution"]')
            uni_name = await name_cell.inner_text() if name_cell else f"uni_{i}"
            uni_name = uni_name.split('\n')[0].strip()  # Nur erste Zeile
            
            print(f"\n[{i+1}/{total}] {uni_name[:50]}...")
            
            # Klicke auf die Zeile um Modal zu öffnen
            await row.click()
            
            # Warte auf Modal
            await page.wait_for_selector('.openInstitutionModal', state='visible', timeout=10000)
            await asyncio.sleep(1)  # Warte bis Inhalt geladen
            
            # Hole Modal-Element
            modal = await page.query_selector('.openInstitutionModal')
            
            if modal:
                # Erstelle PDF vom Modal
                filename = f"{sanitize_filename(uni_name)}.pdf"
                filepath = country_dir / filename
                
                # Methode 1: Screenshot als PDF (einfacher)
                # await modal.screenshot(path=str(filepath).replace('.pdf', '.png'))
                
                # Methode 2: Drucke die ganze Seite mit nur dem Modal sichtbar
                # Verstecke alles außer dem Modal
                await page.evaluate('''() => {
                    document.querySelectorAll('body > *:not(#modalDrawer)').forEach(el => {
                        el.style.display = 'none';
                    });
                    document.querySelector('#modalDrawer').style.position = 'static';
                    document.querySelector('.openInstitutionModal').style.position = 'static';
                    document.querySelector('.openInstitutionModal').style.width = '100%';
                }''')
                
                await page.pdf(
                    path=str(filepath),
                    format='A4',
                    print_background=True,
                    margin={'top': '20px', 'bottom': '20px', 'left': '20px', 'right': '20px'}
                )
                
                # Stelle Seite wieder her
                await page.evaluate('''() => {
                    document.querySelectorAll('body > *').forEach(el => {
                        el.style.display = '';
                    });
                }''')
                
                print(f"   ✓ Gespeichert: {filename}")
                success += 1
            
            # Schließe Modal
            close_btn = await page.query_selector('#removeModalButton')
            if close_btn:
                await close_btn.click()
                await asyncio.sleep(0.5)
            
        except PlaywrightTimeout:
            print(f"   ✗ Timeout")
            errors.append((i, uni_name, "Timeout"))
        except Exception as e:
            print(f"   ✗ Fehler: {e}")
            errors.append((i, uni_name if 'uni_name' in dir() else f"uni_{i}", str(e)))
            
            # Versuche Modal zu schließen
            try:
                await page.keyboard.press('Escape')
                await asyncio.sleep(0.5)
            except:
                pass
    
    # Zusammenfassung
    print(f"\n{'='*60}")
    print(f"Fertig: {country}")
    print(f"Erfolgreich: {success}/{total}")
    if errors:
        print(f"Fehler: {len(errors)}")
        for idx, name, err in errors[:5]:
            print(f"  - [{idx}] {name[:30]}: {err}")
    print(f"Gespeichert in: {country_dir}")
    print(f"{'='*60}")


async def main():
    parser = argparse.ArgumentParser(description='Anabin PDF Scraper')
    parser.add_argument('--country', type=str, help='Land (z.B. "Usbekistan" oder "Kirgisistan")')
    parser.add_argument('--all', action='store_true', help='Alle Länder (Usbekistan + Kirgisistan)')
    parser.add_argument('--output', type=str, default=str(OUTPUT_DIR), help='Output-Verzeichnis')
    parser.add_argument('--headless', action='store_true', help='Unsichtbarer Browser')
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    countries = []
    if args.all:
        countries = ['Usbekistan', 'Kirgisistan']
    elif args.country:
        countries = [args.country]
    else:
        print("Bitte --country oder --all angeben")
        print("Beispiel: python anabin_pdf_scraper.py --country 'Usbekistan'")
        return
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=args.headless or HEADLESS,
            args=['--disable-web-security']  # Für CORS
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            locale='de-DE'
        )
        
        page = await context.new_page()
        
        for country in countries:
            await scrape_country(page, country, output_dir)
        
        await browser.close()
    
    print("\n✅ Alle Downloads abgeschlossen!")


if __name__ == '__main__':
    asyncio.run(main())

