"""
Rendert eine JobOn-Anleitung (HTML) per Playwright/Chromium zu PDF –
gleicher Look wie die Unternehmens-Anleitung (weißer Hintergrund, Seitenfooter).

Aufruf:
    python render_pdf.py <input.html> <output.pdf> [company|applicant]

Die Rolle steuert nur den Fußzeilen-Text. Standard: company.
"""
import sys, os
from playwright.sync_api import sync_playwright

FOOTERS = {
    "company": "JobOn – Internationale Fachkräfte  ·  Husemannstr. 9, 10435 Berlin  ·  business@jobon.work  ·  jobon.work  ·  Vertraulich – nur für Partnerunternehmen",
    "applicant": "JobOn – Internationale Fachkräfte  ·  Husemannstr. 9, 10435 Berlin  ·  service@internationaljobplacement.com  ·  jobon.work",
}


def render(input_html: str, output_pdf: str, role: str = "company"):
    input_html = os.path.abspath(input_html)
    output_pdf = os.path.abspath(output_pdf)
    footer_text = FOOTERS.get(role, FOOTERS["company"])
    footer_template = (
        f'<div style="font-size:8px;color:#9ca3af;width:100%;text-align:center;'
        f'padding:0 12mm;font-family:Arial,sans-serif;">{footer_text}</div>'
    )
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f"file://{input_html}", wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(
            path=output_pdf,
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template="<div></div>",
            footer_template=footer_template,
            margin={"top": "10mm", "bottom": "16mm", "left": "0", "right": "0"},
        )
        browser.close()
    print("PDF gespeichert:", output_pdf)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    render(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "company")
