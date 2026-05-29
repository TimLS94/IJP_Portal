"""
Automatische Blog-Post-Generierung mit Anthropic Claude.
Wählt wöchentlich ein passendes Thema und veröffentlicht es direkt.
"""
import os
import re
import random
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.blog import BlogPost, BlogCategory
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

# Themenpool — abwechslungsreich, SEO-relevant für das Portal
BLOG_TOPICS = [
    ("Bewerbung in Deutschland: So überzeugst du im Vorstellungsgespräch", BlogCategory.CAREER),
    ("Lebenslauf auf Deutsch: Was Arbeitgeber wirklich erwarten", BlogCategory.CAREER),
    ("Saisonarbeit in Deutschland: Chancen für internationale Arbeitnehmer", BlogCategory.CAREER),
    ("Gehalt verhandeln in Deutschland: Tipps für Berufseinsteiger und Fachkräfte", BlogCategory.CAREER),
    ("Probezeit in Deutschland: Rechte, Pflichten und häufige Fehler", BlogCategory.CAREER),
    ("Arbeiten in der Landwirtschaft: Erntejobs und Saisonarbeit", BlogCategory.CAREER),
    ("Hotel und Gastronomie: Jobs für internationale Arbeitnehmer in Deutschland", BlogCategory.CAREER),
    ("Pflegeberufe in Deutschland: Chancen für ausländische Fachkräfte", BlogCategory.CAREER),
    ("Arbeitsvisum Deutschland: Welches Visum brauche ich?", BlogCategory.VISA),
    ("Anerkennung ausländischer Berufsabschlüsse in Deutschland — So geht's", BlogCategory.VISA),
    ("Blue Card EU: Für wen lohnt sie sich und wie beantrage ich sie?", BlogCategory.VISA),
    ("Aufenthaltserlaubnis zur Arbeit: Schritt-für-Schritt-Anleitung", BlogCategory.VISA),
    ("Familiennachzug bei Arbeitsvisum: Was du wissen musst", BlogCategory.VISA),
    ("Anmeldung in Deutschland: Was ausländische Arbeitnehmer sofort erledigen müssen", BlogCategory.LIVING),
    ("Krankenversicherung in Deutschland: Gesetzlich oder privat?", BlogCategory.LIVING),
    ("Wohnung finden in Deutschland als Ausländer: Tipps und häufige Fallen", BlogCategory.LIVING),
    ("Deutsches Steuersystem für internationale Mitarbeiter einfach erklärt", BlogCategory.LIVING),
    ("Sozialversicherung in Deutschland: Was wird abgezogen und was bekomme ich dafür?", BlogCategory.LIVING),
    ("Deutsch am Arbeitsplatz: Die wichtigsten Begriffe für den Berufsalltag", BlogCategory.TIPS),
    ("So nutzt du LinkedIn in Deutschland richtig für deine Jobsuche", BlogCategory.TIPS),
    ("5 häufige Fehler bei der Jobsuche in Deutschland — und wie du sie vermeidest", BlogCategory.TIPS),
    ("Netzwerken in Deutschland: Wie Beziehungen deinen Jobwechsel beschleunigen", BlogCategory.TIPS),
    ("Fachkräftemangel in Deutschland: Warum internationale Mitarbeiter gefragt sind", BlogCategory.COMPANY),
    ("Mitarbeiter aus dem Ausland einstellen: Rechtliche Grundlagen für Unternehmen", BlogCategory.COMPANY),
    ("Mindestlohn in Deutschland 2024/2025: Was Arbeitgeber und Arbeitnehmer wissen müssen", BlogCategory.NEWS),
]

SYSTEM_PROMPT = """Du bist Redakteur bei JobOn (jobon.work), einem deutschen Jobportal das internationale Fachkräfte und Saisonarbeiter mit deutschen Unternehmen verbindet.

Schreibe praxisnahe, SEO-optimierte Blog-Artikel auf Deutsch. Deine Artikel:
- Sind klar strukturiert mit aussagekräftigen H2- und H3-Überschriften
- Enthalten konkrete Tipps, keine leeren Phrasen
- Haben einen freundlichen, professionellen Ton
- Sind 900–1300 Wörter lang
- Sind für internationale Fachkräfte und Saisonarbeiter in Deutschland geschrieben

Formatiere den Inhalt als reines HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong> — kein <html>, <head> oder <body>."""


def _get_admin_user_id(db: Session) -> Optional[int]:
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    return admin.id if admin else None


def _create_slug(title: str) -> str:
    slug = title.lower()
    for a, b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]:
        slug = slug.replace(a, b)
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    return slug


async def generate_and_publish_blog_post(
    db: Session,
    topic: Optional[str] = None,
    category: Optional[BlogCategory] = None,
    author_id: Optional[int] = None,
    auto_publish: bool = False,
) -> Optional[dict]:
    """
    Generiert einen Blog-Post mit Claude und veröffentlicht ihn sofort.
    Gibt ein dict mit den Post-Daten zurück oder None bei Fehler.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY nicht konfiguriert — Blog-Generierung übersprungen")
        return None

    if not author_id:
        author_id = _get_admin_user_id(db)
    if not author_id:
        logger.error("Kein Admin-User gefunden — Blog-Generierung übersprungen")
        return None

    # Thema wählen, Wiederholungen vermeiden
    if not topic:
        recent_titles = {
            r[0] for r in db.query(BlogPost.title).order_by(BlogPost.created_at.desc()).limit(12).all()
        }
        available = [(t, c) for t, c in BLOG_TOPICS if t not in recent_titles]
        if not available:
            available = BLOG_TOPICS
        topic, category = random.choice(available)

    logger.info(f"Generiere Blog-Post mit Claude: '{topic}'")

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": (
                    f"Schreibe einen vollständigen Blog-Artikel über dieses Thema: **{topic}**\n\n"
                    f"Verwende EXAKT dieses Format mit den === Trennern (kein Text davor oder danach):\n\n"
                    f"===TITEL===\n[Artikeltitel]\n\n"
                    f"===EXCERPT===\n[2-3 Sätze Teaser]\n\n"
                    f"===TAGS===\n[5-8 Tags, komma-getrennt]\n\n"
                    f"===META_DESCRIPTION===\n[Max. 160 Zeichen SEO-Beschreibung]\n\n"
                    f"===META_KEYWORDS===\n[5-8 Keywords, komma-getrennt]\n\n"
                    f"===INHALT===\n[Vollständiger HTML-Inhalt des Artikels]"
                )
            }]
        )

        raw = message.content[0].text.strip()

        # Delimiter-basiertes Parsen — kein JSON-Escaping-Problem
        def _extract(marker: str) -> str:
            pattern = rf'==={marker}===\s*\n(.*?)(?====|\Z)'
            m = re.search(pattern, raw, re.DOTALL)
            return m.group(1).strip() if m else ""

        data = {
            "title": _extract("TITEL") or topic,
            "excerpt": _extract("EXCERPT"),
            "content": _extract("INHALT"),
            "tags": _extract("TAGS"),
            "meta_description": _extract("META_DESCRIPTION"),
            "meta_keywords": _extract("META_KEYWORDS"),
        }

        if not data["content"]:
            logger.error(f"Kein Inhalt in Claude-Antwort: {raw[:300]}")
            return None

        slug = _create_slug(data["title"])
        if db.query(BlogPost).filter(BlogPost.slug == slug).first():
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

        post = BlogPost(
            title=data["title"],
            slug=slug,
            excerpt=data.get("excerpt", ""),
            content=data.get("content", ""),
            category=category or BlogCategory.TIPS,
            tags=data.get("tags", ""),
            meta_title=data["title"],
            meta_description=data.get("meta_description", ""),
            meta_keywords=data.get("meta_keywords", ""),
            is_published=auto_publish,
            is_featured=False,
            author_id=author_id,
            published_at=datetime.utcnow() if auto_publish else None,
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        logger.info(f"✅ Blog-Post veröffentlicht: '{post.title}' (ID: {post.id})")
        return {"id": post.id, "title": post.title, "slug": post.slug}

    except Exception as e:
        logger.error(f"Fehler beim Generieren des Blog-Posts: {e}")
        db.rollback()
        return None
