"""
Anabin PDF Service - Holt PDFs on-demand von anabin.kmk.org

Verwendet Playwright für Browser-Automatisierung.
PDFs werden gecacht, damit sie nicht jedes Mal neu geholt werden müssen.
"""
import asyncio
import hashlib
import logging
import os
import re
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Konfiguration
DATA_DIR = Path(__file__).parent.parent / 'data'
PDF_CACHE_DIR = DATA_DIR / 'anabin_pdfs'
ANABIN_BASE_URL = "https://anabin.kmk.org/no_cache/filter/institutionen.html"


def sanitize_filename(name: str) -> str:
    """Erstellt einen sicheren Dateinamen aus dem Uni-Namen"""
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', '_', name)
    name_hash = hashlib.md5(name.encode()).hexdigest()[:8]
    return f"{name[:80]}_{name_hash}"


def get_cached_pdf_path(university_name: str) -> Path:
    """Gibt den Pfad zur gecachten PDF-Datei zurück"""
    filename = sanitize_filename(university_name) + ".pdf"
    return PDF_CACHE_DIR / filename


def is_pdf_cached(university_name: str) -> bool:
    """Prüft ob ein PDF bereits gecacht ist"""
    return get_cached_pdf_path(university_name).exists()


def get_cached_pdf(university_name: str) -> Optional[bytes]:
    """Lädt ein gecachtes PDF"""
    path = get_cached_pdf_path(university_name)
    if path.exists():
        return path.read_bytes()
    return None


async def fetch_anabin_pdf(
    university_name: str,
    country: str = "Usbekistan",
    headless: bool = True,
    timeout: int = 60000,
    force_refresh: bool = False
) -> Tuple[bool, Optional[bytes], str]:
    """
    Holt ein PDF von Anabin für eine bestimmte Universität.
    
    Ablauf:
    1. Öffne Anabin Institutionen-Seite
    2. Wähle Land aus (Usbekistan/Kirgisistan)
    3. Suche nach der Universität
    4. Klicke auf die Zeile → Modal öffnet sich
    5. Alle Accordion-Panels aufklappen
    6. CSS injizieren um nur Modal-Inhalt zu zeigen
    7. PDF erstellen
    
    Args:
        university_name: Name der Universität
        country: Land (Usbekistan oder Kirgisistan)
        headless: Browser unsichtbar laufen lassen
        timeout: Timeout in Millisekunden
        force_refresh: Cache ignorieren und PDF neu holen
        
    Returns:
        Tuple[success, pdf_bytes, message]
    """
    try:
        from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
    except ImportError:
        return False, None, "Playwright nicht installiert. Bitte 'pip install playwright && playwright install chromium' ausführen."
    
    # Prüfe Cache (wenn nicht force_refresh)
    if not force_refresh and is_pdf_cached(university_name):
        logger.info(f"PDF aus Cache geladen: {university_name}")
        pdf_bytes = get_cached_pdf(university_name)
        return True, pdf_bytes, "PDF aus Cache geladen"
    
    if force_refresh:
        logger.info(f"Force Refresh - ignoriere Cache für: {university_name}")
    
    # Erstelle Cache-Verzeichnis
    PDF_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    pdf_bytes = None
    message = ""
    
    async with async_playwright() as p:
        browser = None
        try:
            browser = await p.chromium.launch(headless=headless)
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                locale='de-DE'
            )
            page = await context.new_page()
            page.set_default_timeout(timeout)
            
            logger.info(f"Öffne Anabin für: {university_name}")
            
            # 1. Gehe zur Institutionen-Seite
            await page.goto(ANABIN_BASE_URL, timeout=timeout)
            await page.wait_for_load_state('networkidle', timeout=timeout)
            await asyncio.sleep(2)
            
            # 2. Land auswählen über das Suchfeld
            logger.info(f"Setze Land-Filter: {country}")
            try:
                country_input = await page.query_selector('#searchCountriesInput')
                if country_input:
                    await country_input.click()
                    await asyncio.sleep(0.5)
                    await country_input.fill(country)
                    await asyncio.sleep(1.5)
                    
                    # Klicke auf das Land im Dropdown
                    country_option = await page.query_selector(f'text={country}')
                    if country_option:
                        is_visible = await country_option.is_visible()
                        if is_visible:
                            await country_option.click()
                            await asyncio.sleep(2)
                            logger.info(f"Land '{country}' ausgewählt")
            except Exception as e:
                logger.warning(f"Land-Filter Warnung: {e}")
            
            # 3. Suche nach der Universität - verwende charakteristische Wörter
            logger.info(f"Suche nach: {university_name}")
            search_input = await page.query_selector('#tableSearchInput')
            
            # Extrahiere die charakteristischsten Wörter aus dem Uni-Namen
            # Filtere kurze/generische Wörter wie "der", "in", "und", "für"
            stop_words = {'der', 'die', 'das', 'in', 'und', 'für', 'von', 'zu', 'im', 'am', 'an', 'den', 'des'}
            words = [w for w in university_name.split() if w.lower() not in stop_words and len(w) > 3]
            # Nimm die ersten 3-4 charakteristischen Wörter
            search_term = ' '.join(words[:4]) if len(words) >= 3 else university_name[:50]
            
            logger.info(f"Suchbegriff: '{search_term}'")
            if search_input:
                await search_input.fill(search_term)
                await asyncio.sleep(2)
            
            # 4. Warte auf Tabellen-Ergebnisse und finde die beste Übereinstimmung
            rows = await page.query_selector_all('table tbody tr')
            logger.info(f"Gefundene Zeilen: {len(rows)}")
            
            if not rows:
                return False, None, f"Keine Ergebnisse für '{university_name}' gefunden"
            
            # Versuche die beste Zeile zu finden (nicht blind die erste nehmen!)
            best_row = None
            best_score = 0
            target_words = set(w.lower() for w in university_name.split() if len(w) > 2)
            
            for row in rows[:10]:  # Prüfe nur die ersten 10 Zeilen
                try:
                    row_text = await row.inner_text()
                    row_text_lower = row_text.lower()
                    
                    # Zähle wie viele Wörter des Uni-Namens in der Zeile vorkommen
                    score = sum(1 for word in target_words if word in row_text_lower)
                    
                    logger.info(f"Zeile: '{row_text[:60]}...' - Score: {score}")
                    
                    if score > best_score:
                        best_score = score
                        best_row = row
                except:
                    pass
            
            if not best_row:
                best_row = rows[0]  # Fallback auf erste Zeile
                logger.warning("Keine gute Übereinstimmung gefunden, verwende erste Zeile")
            
            # Klicke auf die beste Zeile → Modal öffnet sich
            logger.info(f"Öffne Detail-Modal (Score: {best_score})...")
            await best_row.click()
            await asyncio.sleep(3)
            
            # 5. Warte auf Modal
            logger.info("Warte auf Modal...")
            modal = await page.wait_for_selector('.p-modal', state='visible', timeout=10000)
            if not modal:
                return False, None, "Modal konnte nicht geöffnet werden"
            
            # 6. Alle Accordion-Panels aufklappen (falls zugeklappt)
            logger.info("Klappe alle Accordion-Panels auf...")
            accordion_buttons = await page.query_selector_all('.p-accordion__tab--with-title')
            for btn in accordion_buttons:
                try:
                    aria_expanded = await btn.get_attribute('aria-expanded')
                    if aria_expanded == 'false':
                        await btn.click()
                        await asyncio.sleep(0.3)
                except:
                    pass
            
            await asyncio.sleep(1)
            
            # 7. Modal für Druck vorbereiten - Buttons ausblenden
            logger.info("Bereite Modal für Druck vor...")
            await page.evaluate("""
                () => {
                    // Buttons im Modal-Header ausblenden
                    const buttons = document.querySelectorAll('.modal-header-buttons, .u-no-print, .draggable, #printModalButton, #minimizeModalButton, #maximizeModalButton, #removeModalButton');
                    buttons.forEach(el => el.style.display = 'none');
                    
                    // Modal maximieren für besseren Druck
                    const modal = document.querySelector('.p-modal');
                    if (modal) {
                        modal.style.position = 'static';
                        modal.style.width = '100%';
                        modal.style.maxWidth = 'none';
                        modal.style.height = 'auto';
                        modal.style.top = '0';
                        modal.style.left = '0';
                    }
                    
                    // Dialog scrollbar entfernen
                    const dialog = document.querySelector('.p-modal__dialog');
                    if (dialog) {
                        dialog.style.maxHeight = 'none';
                        dialog.style.overflow = 'visible';
                    }
                }
            """)
            
            await asyncio.sleep(0.5)
            
            # 8. Screenshot vom Modal als PNG machen
            logger.info("Erstelle Screenshot vom Modal...")
            modal_element = await page.query_selector('.p-modal')
            if not modal_element:
                return False, None, "Modal nicht gefunden"
            
            screenshot_bytes = await modal_element.screenshot(type='png')
            
            # 9. PNG in PDF umwandeln
            logger.info("Konvertiere Screenshot zu PDF...")
            from io import BytesIO
            
            # Neue Seite mit dem Screenshot-Bild erstellen
            clean_page = await context.new_page()
            
            # Screenshot als base64 für inline-Bild
            import base64
            img_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Anabin - Institutionsbericht</title>
                <style>
                    @page {{
                        size: A4;
                        margin: 10mm;
                    }}
                    body {{
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                    }}
                    img {{
                        max-width: 100%;
                        height: auto;
                    }}
                </style>
            </head>
            <body>
                <img src="data:image/png;base64,{img_base64}" />
            </body>
            </html>
            """
            
            await clean_page.set_content(html_content)
            await asyncio.sleep(0.3)
            
            pdf_bytes = await clean_page.pdf(
                format='A4',
                print_background=True,
                margin={'top': '10mm', 'bottom': '10mm', 'left': '10mm', 'right': '10mm'}
            )
            
            await clean_page.close()
            
            # PDF im Cache speichern
            cache_path = get_cached_pdf_path(university_name)
            cache_path.write_bytes(pdf_bytes)
            logger.info(f"PDF gespeichert: {cache_path} ({len(pdf_bytes)} bytes)")
            
            message = f"PDF erfolgreich erstellt ({len(pdf_bytes)} bytes)"
            return True, pdf_bytes, message
            
        except PlaywrightTimeout:
            message = "Timeout beim Laden der Anabin-Seite"
            logger.error(message)
            return False, None, message
            
        except Exception as e:
            message = f"Fehler beim PDF-Abruf: {str(e)}"
            logger.error(message, exc_info=True)
            return False, None, message
            
        finally:
            if browser:
                await browser.close()


def fetch_anabin_pdf_sync(
    university_name: str,
    country: str = "Usbekistan",
    headless: bool = True,
    force_refresh: bool = False
) -> Tuple[bool, Optional[bytes], str]:
    """Synchrone Wrapper-Funktion für fetch_anabin_pdf."""
    return asyncio.run(fetch_anabin_pdf(university_name, country, headless, force_refresh=force_refresh))


def list_cached_pdfs() -> list:
    """Listet alle gecachten PDFs auf"""
    if not PDF_CACHE_DIR.exists():
        return []
    
    pdfs = []
    for pdf_file in PDF_CACHE_DIR.glob('*.pdf'):
        pdfs.append({
            'filename': pdf_file.name,
            'size': pdf_file.stat().st_size,
            'created': datetime.fromtimestamp(pdf_file.stat().st_ctime).isoformat(),
        })
    
    return pdfs


def clear_pdf_cache() -> int:
    """Löscht alle gecachten PDFs. Gibt Anzahl gelöschter Dateien zurück."""
    if not PDF_CACHE_DIR.exists():
        return 0
    
    count = 0
    for pdf_file in PDF_CACHE_DIR.glob('*.pdf'):
        pdf_file.unlink()
        count += 1
    
    return count
