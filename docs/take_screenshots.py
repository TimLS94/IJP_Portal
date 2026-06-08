"""
Screenshot-Script für die IJP Unternehmens-Anleitung.
Loggt sich auf jobon.work ein und fotografiert alle Company-Dashboard-Seiten.
"""
from playwright.sync_api import sync_playwright
import time, os, sys

BASE = "https://www.jobon.work"
OUT  = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

# Zugangsdaten: Umgebungsvariablen JOBON_EMAIL / JOBON_PASSWORD setzen
# oder beim Start interaktiv eingeben
EMAIL    = os.environ.get("JOBON_EMAIL")    or input("E-Mail: ")
PASSWORD = os.environ.get("JOBON_PASSWORD") or input("Passwort: ")

PAGES = [
    ("dashboard",     "/company/dashboard",            "Dashboard – Übersicht"),
    ("applications",  "/company/applications",          "Bewerbungen"),
    ("jobs",          "/company/jobs",                  "Stellenanzeigen"),
    ("profile",       "/company/profile",               "Unternehmensprofil"),
    ("team",          "/company/team",                  "Team"),
    ("calendar",      "/company/calendar",              "Kalender"),
    ("settings",      "/company/settings",              "Einstellungen"),
]

def dismiss_cookie_banner(page):
    try:
        btn = page.get_by_role("button", name="Akzeptieren")
        if btn.is_visible(timeout=1500):
            btn.click()
            time.sleep(0.3)
    except Exception:
        pass

def take(page, name, url, title):
    print(f"  → {title} ({url})")
    page.goto(BASE + url, wait_until="networkidle", timeout=30000)
    dismiss_cookie_banner(page)
    time.sleep(1.5)  # kurz warten bis alles gerendert ist
    page.screenshot(path=f"{OUT}/{name}.png", full_page=False)
    print(f"     ✓ {OUT}/{name}.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # ── Login ──────────────────────────────────────────────────────
    print("Logge ein ...")
    page.goto(BASE + "/login", wait_until="networkidle")
    time.sleep(1)

    # Cookie-Banner wegklicken falls sichtbar
    try:
        btn = page.get_by_role("button", name="Akzeptieren")
        if btn.is_visible():
            btn.click()
            time.sleep(0.5)
            print("  Cookie-Banner akzeptiert")
    except Exception:
        pass

    page.fill('input[type="email"]', EMAIL)
    page.fill('input[type="password"]', PASSWORD)
    page.keyboard.press("Enter")
    page.wait_for_url(lambda u: "/dashboard" in u or "/admin" in u or "/company" in u, timeout=15000)
    time.sleep(2)

    current = page.url
    print(f"Eingeloggt, aktuelle URL: {current}")

    # Falls Admin-Dashboard → Company-Seiten trotzdem direkt aufrufen
    print("\nMache Screenshots ...")
    for name, url, title in PAGES:
        try:
            take(page, name, url, title)
        except Exception as e:
            print(f"     ✗ Fehler bei {title}: {e}")

    browser.close()
    print("\nFertig!")
