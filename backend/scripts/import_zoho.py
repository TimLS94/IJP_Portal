#!/usr/bin/env python3
"""
Einmaliger Import: Zoho Accounts + Contacts → CRM-Datenbank
Aufruf: cd backend && python scripts/import_zoho.py
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.ijp import IJPBetrieb, CRMContact

ACCOUNTS_CSV = Path.home() / "Downloads/Accounts_2026_05_31.csv"
CONTACTS_CSV = Path.home() / "Downloads/Contacts_2026_05_31.csv"


def clean(val: str) -> str | None:
    v = val.strip()
    return v if v else None


def main():
    db = SessionLocal()
    try:
        # ── 1. Firmen importieren ──────────────────────────────────────────────
        zoho_to_id: dict[str, int] = {}

        with open(ACCOUNTS_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = clean(row["Kunde-Name"])
                if not name:
                    continue
                b = IJPBetrieb(
                    name=name,
                    phone=clean(row["Tel."]),
                    website=clean(row["Webseite"]),
                    industry=clean(row["Branche"]),
                    status=clean(row["Bewertung"]),
                    street=clean(row["Rechnungsadresse - Straße"]),
                    postal_code=clean(row["Rechnungsadresse - PLZ"]),
                    city=clean(row["Rechnungsadresse - Stadt"]),
                    country=clean(row["Rechnungsadresse - Land"]),
                )
                db.add(b)
                db.flush()
                zoho_to_id[row["Eintrag-ID"].strip()] = b.id

        db.commit()
        print(f"✓ {len(zoho_to_id)} Firmen importiert")

        # ── 2. Kontakte importieren ────────────────────────────────────────────
        contact_count = 0
        skipped = 0

        with open(CONTACTS_CSV, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                zoho_cid = row["Kunde-Name.id"].strip()
                company_id = zoho_to_id.get(zoho_cid)
                if not company_id:
                    print(f"  SKIP {row['Contact Name']} — Firma nicht gefunden ({zoho_cid})")
                    skipped += 1
                    continue
                c = CRMContact(
                    company_id=company_id,
                    first_name=clean(row["Vorname"]),
                    last_name=clean(row["Nachname"]),
                    salutation=clean(row["Anrede"]),
                    title=clean(row["Titel"]),
                    department=clean(row["Abteilung"]),
                    email=clean(row["E-Mail"]),
                    phone=clean(row["Tel."]),
                    mobile=clean(row["Mobil"]),
                    is_primary=False,
                )
                db.add(c)
                contact_count += 1

        db.commit()
        print(f"✓ {contact_count} Kontakte importiert, {skipped} übersprungen")

        # ── 3. Primärkontakt setzen + contact_person befüllen ─────────────────
        for company_id in zoho_to_id.values():
            contacts = (
                db.query(CRMContact)
                .filter(CRMContact.company_id == company_id)
                .all()
            )
            if not contacts:
                continue
            for i, c in enumerate(contacts):
                c.is_primary = (i == 0)
            first = contacts[0]
            betrieb = db.query(IJPBetrieb).filter(IJPBetrieb.id == company_id).first()
            if betrieb:
                parts = [first.first_name, first.last_name]
                betrieb.contact_person = " ".join(p for p in parts if p)

        db.commit()
        print("✓ Primärkontakte gesetzt, contact_person aktualisiert")
        print("\nImport abgeschlossen!")

    except Exception as e:
        db.rollback()
        print(f"FEHLER: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
