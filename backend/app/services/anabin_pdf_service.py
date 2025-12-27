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
    # Entferne ungültige Zeichen
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = re.sub(r'\s+', '_', name)
    # Hash für Eindeutigkeit bei langen Namen
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
    timeout: int = 30000
) -> Tuple[bool, Optional[bytes], str]:
    """
    Holt ein PDF von Anabin für eine bestimmte Universität.
    
    Args:
        university_name: Name der Universität (Original oder Deutsch)
        country: Land (Usbekistan oder Kirgisistan)
        headless: Browser unsichtbar laufen lassen
        timeout: Timeout in Millisekunden
        
    Returns:
        Tuple[success, pdf_bytes, message]
    """
    try:
        from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
    except ImportError:
        return False, None, "Playwright nicht installiert. Bitte 'pip install playwright && playwright install chromium' ausführen."
    
    # Prüfe Cache zuerst
    if is_pdf_cached(university_name):
        logger.info(f"PDF aus Cache geladen: {university_name}")
        pdf_bytes = get_cached_pdf(university_name)
        return True, pdf_bytes, "PDF aus Cache geladen"
    
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
            
            logger.info(f"Öffne Anabin für: {university_name}")
            
            # Gehe zur Institutionen-Seite
            await page.goto(ANABIN_BASE_URL, timeout=timeout)
            await page.wait_for_load_state('networkidle', timeout=timeout)
            await asyncio.sleep(1)
            
            # Cookie-Banner akzeptieren falls vorhanden
            try:
                accept_btn = await page.query_selector('#acceptAll, .cookie-accept, [data-action="accept"]')
                if accept_btn:
                    await accept_btn.click()
                    await asyncio.sleep(0.5)
            except:
                pass
            
            # Land-Filter setzen
            logger.info(f"Setze Land-Filter: {country}")
            try:
                # Finde das Land-Dropdown
                land_select = await page.query_selector('select[name="country"], #country, [aria-label="Land"]')
                if land_select:
                    await land_select.select_option(label=country)
                else:
                    # Versuche Text-Klick
                    await page.click(f'text={country}')
                
                await asyncio.sleep(1)
            except Exception as e:
                logger.warning(f"Land-Filter Fehler: {e}")
            
            # Suche nach der Universität
            logger.info(f"Suche nach: {university_name}")
            
            # Finde Suchfeld
            search_input = await page.query_selector('input[type="search"], input[name="search"], #searchInput, input[placeholder*="Suche"]')
            if search_input:
                await search_input.fill(university_name[:50])  # Nur erste 50 Zeichen
                await page.keyboard.press('Enter')
                await asyncio.sleep(2)
            
            # Warte auf Ergebnisse
            await page.wait_for_selector('tr.pointer', timeout=timeout)
            
            # Finde die passende Zeile (erste oder beste Übereinstimmung)
            rows = await page.query_selector_all('tr.pointer')
            
            if not rows:
                return False, None, f"Keine Ergebnisse für '{university_name}' gefunden"
            
            # Suche nach bester Übereinstimmung
            target_row = None
            uni_name_lower = university_name.lower()
            
            for row in rows:
                cell = await row.query_selector('td[aria-label="Institution"]')
                if cell:
                    cell_text = (await cell.inner_text()).lower()
                    if uni_name_lower[:30] in cell_text or cell_text[:30] in uni_name_lower:
                        target_row = row
                        break
            
            # Falls keine genaue Übereinstimmung, nimm die erste
            if not target_row:
                target_row = rows[0]
                logger.warning(f"Keine exakte Übereinstimmung, verwende erstes Ergebnis")
            
            # Klicke auf die Zeile um Modal zu öffnen
            logger.info("Öffne Modal...")
            await target_row.click()
            
            # Warte auf Modal
            await page.wait_for_selector('.openInstitutionModal', state='visible', timeout=timeout)
            await asyncio.sleep(1.5)  # Warte bis Inhalt vollständig geladen
            
            # Expandiere alle Accordion-Panels
            accordions = await page.query_selector_all('.p-accordion__tab--with-title')
            for acc in accordions:
                expanded = await acc.get_attribute('aria-expanded')
                if expanded != 'true':
                    await acc.click()
                    await asyncio.sleep(0.2)
            
            # Erstelle PDF vom Modal
            logger.info("Erstelle PDF...")
            
            # Verstecke alles außer dem Modal für sauberen PDF-Export
            await page.evaluate('''() => {
                // Verstecke Header-Buttons (Drucken, Schließen, etc.)
                document.querySelectorAll('.modal-header-buttons button').forEach(btn => {
                    btn.style.display = 'none';
                });
                // Verstecke Hintergrund
                document.querySelectorAll('body > *:not(#modalDrawer)').forEach(el => {
                    if (el.id !== 'modalDrawer') {
                        el.style.visibility = 'hidden';
                    }
                });
                // Modal auf volle Breite
                const modal = document.querySelector('.openInstitutionModal');
                if (modal) {
                    modal.style.position = 'relative';
                    modal.style.top = '0';
                    modal.style.left = '0';
                    modal.style.width = '100%';
                    modal.style.maxWidth = '100%';
                    modal.style.boxShadow = 'none';
                }
                const drawer = document.querySelector('#modalDrawer');
                if (drawer) {
                    drawer.style.position = 'relative';
                }
            }''')
            
            # PDF generieren
            pdf_bytes = await page.pdf(
                format='A4',
                print_background=True,
                margin={'top': '15mm', 'bottom': '15mm', 'left': '15mm', 'right': '15mm'}
            )
            
            # PDF im Cache speichern
            cache_path = get_cached_pdf_path(university_name)
            cache_path.write_bytes(pdf_bytes)
            logger.info(f"PDF gespeichert: {cache_path}")
            
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
    headless: bool = True
) -> Tuple[bool, Optional[bytes], str]:
    """
    Synchrone Wrapper-Funktion für fetch_anabin_pdf.
    Für Verwendung in nicht-async Kontexten.
    """
    return asyncio.run(fetch_anabin_pdf(university_name, country, headless))


# Hilfsfunktion zum Auflisten gecachter PDFs
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
