"""
Automatische Blog-Post-Generierung mit Anthropic Claude.
Unterstützt Deutsch (de), Englisch (en) und Spanisch (es).
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

# ── Themenpool Deutsch ────────────────────────────────────────────────────────
BLOG_TOPICS_DE = [
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
    ("Mindestlohn in Deutschland 2025: Was Arbeitgeber und Arbeitnehmer wissen müssen", BlogCategory.NEWS),
]

# ── Themenpool Spanisch ───────────────────────────────────────────────────────
BLOG_TOPICS_ES = [
    ("Cómo encontrar trabajo en Alemania como hispanohablante", BlogCategory.CAREER),
    ("Trabajo temporal en Alemania: guía completa para hispanohablantes", BlogCategory.CAREER),
    ("Trabajos de temporada en Alemania: cosecha, hostelería y logística", BlogCategory.CAREER),
    ("Cómo escribir un currículum alemán (Lebenslauf) que destaque", BlogCategory.CAREER),
    ("Entrevista de trabajo en Alemania: qué esperar y cómo prepararse", BlogCategory.CAREER),
    ("Trabajos en hoteles y restaurantes en Alemania para hispanohablantes", BlogCategory.CAREER),
    ("Salario mínimo en Alemania 2025: todo lo que necesitas saber", BlogCategory.NEWS),
    ("Visa de trabajo para Alemania: tipos y cómo solicitarla", BlogCategory.VISA),
    ("Permiso de trabajo en Alemania: guía paso a paso para latinos", BlogCategory.VISA),
    ("Blue Card Europa: ¿quién puede solicitarla y cómo?", BlogCategory.VISA),
    ("Reconocimiento de títulos extranjeros en Alemania", BlogCategory.VISA),
    ("Reagrupación familiar con visa de trabajo en Alemania", BlogCategory.VISA),
    ("Registro de empadronamiento en Alemania (Anmeldung): guía completa", BlogCategory.LIVING),
    ("Seguro médico en Alemania: público o privado, ¿cuál elegir?", BlogCategory.LIVING),
    ("Cómo encontrar piso en Alemania como extranjero", BlogCategory.LIVING),
    ("Sistema fiscal alemán explicado para trabajadores internacionales", BlogCategory.LIVING),
    ("Seguridad social en Alemania: qué se descuenta y qué se recibe", BlogCategory.LIVING),
    ("Alemán básico para el trabajo: frases y vocabulario esencial", BlogCategory.TIPS),
    ("5 errores frecuentes al buscar trabajo en Alemania y cómo evitarlos", BlogCategory.TIPS),
    ("LinkedIn en Alemania: cómo usarlo para encontrar empleo", BlogCategory.TIPS),
    ("Escasez de trabajadores en Alemania: oportunidad para trabajadores latinos", BlogCategory.COMPANY),
    ("Work & Holiday en Alemania: qué es y cómo conseguirlo", BlogCategory.CAREER),
    ("Trabajo agrícola en Alemania: temporadas, salarios y condiciones", BlogCategory.CAREER),
    ("Derechos laborales en Alemania que todo trabajador extranjero debe conocer", BlogCategory.TIPS),
]

# ── Themenpool Englisch ───────────────────────────────────────────────────────
BLOG_TOPICS_EN = [
    ("How to find a job in Germany as a foreigner: complete guide", BlogCategory.CAREER),
    ("Seasonal work in Germany: agriculture, hospitality and logistics jobs", BlogCategory.CAREER),
    ("Writing a German CV (Lebenslauf): what employers really expect", BlogCategory.CAREER),
    ("Job interview in Germany: how to prepare and what to expect", BlogCategory.CAREER),
    ("Hotel and restaurant jobs in Germany for international workers", BlogCategory.CAREER),
    ("Salary negotiation in Germany: tips for expats and newcomers", BlogCategory.CAREER),
    ("Work and Holiday visa Germany: eligibility and how to apply", BlogCategory.CAREER),
    ("Germany work visa: which one do you need?", BlogCategory.VISA),
    ("EU Blue Card Germany: who qualifies and how to apply", BlogCategory.VISA),
    ("Getting your foreign qualifications recognised in Germany", BlogCategory.VISA),
    ("Family reunification with a German work visa: what you need to know", BlogCategory.VISA),
    ("Residence permit for work in Germany: step-by-step guide", BlogCategory.VISA),
    ("Anmeldung in Germany: how to register your address as a foreigner", BlogCategory.LIVING),
    ("Health insurance in Germany: public vs private explained", BlogCategory.LIVING),
    ("Finding an apartment in Germany as an expat: tips and pitfalls", BlogCategory.LIVING),
    ("German tax system explained for international employees", BlogCategory.LIVING),
    ("Social security contributions in Germany: what you pay and what you get", BlogCategory.LIVING),
    ("Essential German phrases for the workplace", BlogCategory.TIPS),
    ("5 common mistakes when job hunting in Germany and how to avoid them", BlogCategory.TIPS),
    ("How to use LinkedIn effectively to find a job in Germany", BlogCategory.TIPS),
    ("Germany's skilled worker shortage: why international talent is in demand", BlogCategory.COMPANY),
    ("Minimum wage in Germany 2025: what workers and employers must know", BlogCategory.NEWS),
    ("Agricultural work in Germany: harvest seasons, pay and conditions", BlogCategory.CAREER),
    ("Employee rights in Germany every foreign worker should know", BlogCategory.TIPS),
]

TOPICS_BY_LANG = {"de": BLOG_TOPICS_DE, "en": BLOG_TOPICS_EN, "es": BLOG_TOPICS_ES}

# ── System Prompts ────────────────────────────────────────────────────────────
SYSTEM_PROMPT_DE = """Du bist Redakteur bei JobOn (jobon.work), einem deutschen Jobportal das internationale Fachkräfte und Saisonarbeiter mit deutschen Unternehmen verbindet.

Schreibe praxisnahe, SEO-optimierte Blog-Artikel auf Deutsch. Deine Artikel:
- Sind klar strukturiert mit aussagekräftigen H2- und H3-Überschriften
- Enthalten konkrete Tipps, keine leeren Phrasen
- Haben einen freundlichen, professionellen Ton
- Sind 900–1300 Wörter lang
- Sind für internationale Fachkräfte und Saisonarbeiter in Deutschland geschrieben

Formatiere den Inhalt als reines HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong> — kein <html>, <head> oder <body>."""

SYSTEM_PROMPT_ES = """Eres redactor de JobOn (jobon.work), un portal de empleo alemán que conecta trabajadores internacionales hispanohablantes con empresas alemanas.

Escribe artículos de blog prácticos y optimizados para SEO en español. Tus artículos:
- Están estructurados con encabezados H2 y H3 descriptivos
- Contienen consejos concretos orientados a hispanohablantes que buscan trabajo en Alemania
- Usan un tono amigable y profesional
- Tienen entre 900 y 1300 palabras
- Incluyen palabras clave relevantes en español: trabajo en Alemania, empleo Alemania, visa trabajo Alemania, trabajo temporal Alemania, buscar trabajo en Alemania, etc.
- Los meta_keywords deben ser términos que buscan hispanohablantes en Google

Formatea el contenido como HTML puro: <h2>, <h3>, <p>, <ul>, <li>, <strong> — sin <html>, <head> ni <body>."""

SYSTEM_PROMPT_EN = """You are an editor at JobOn (jobon.work), a German job portal connecting international English-speaking workers with German companies.

Write practical, SEO-optimised blog articles in English. Your articles:
- Are clearly structured with descriptive H2 and H3 headings
- Contain concrete, actionable advice for English-speakers seeking work in Germany
- Use a friendly, professional tone
- Are 900–1300 words long
- Include relevant English-language keywords: work in Germany, jobs in Germany, seasonal work Germany, work visa Germany, find a job in Germany, etc.
- Meta keywords should target what English-speaking job seekers search on Google

Format content as plain HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong> — no <html>, <head> or <body>."""

SYSTEM_PROMPTS = {"de": SYSTEM_PROMPT_DE, "en": SYSTEM_PROMPT_EN, "es": SYSTEM_PROMPT_ES}

USER_PROMPT_TEMPLATE = (
    "Schreibe einen vollständigen Blog-Artikel über dieses Thema: **{topic}**\n\n"
    "Verwende EXAKT dieses Format mit den === Trennern (kein Text davor oder danach):\n\n"
    "===TITEL===\n[Artikeltitel]\n\n"
    "===EXCERPT===\n[2-3 Sätze Teaser]\n\n"
    "===TAGS===\n[5-8 Tags, komma-getrennt]\n\n"
    "===META_DESCRIPTION===\n[Max. 160 Zeichen SEO-Beschreibung]\n\n"
    "===META_KEYWORDS===\n[5-8 Keywords, komma-getrennt]\n\n"
    "===INHALT===\n[Vollständiger HTML-Inhalt des Artikels]"
)


def _get_admin_user_id(db: Session) -> Optional[int]:
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    return admin.id if admin else None


def _create_slug(title: str, language: str = "de") -> str:
    slug = title.lower()
    for a, b in [('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss'),
                 ('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u'),
                 ('ñ', 'n'), ('ü', 'u'), ('ï', 'i'), ('ë', 'e')]:
        slug = slug.replace(a, b)
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    return slug


async def generate_and_publish_blog_post(
    db: Session,
    topic: Optional[str] = None,
    category: Optional[BlogCategory] = None,
    author_id: Optional[int] = None,
    auto_publish: bool = False,
    language: str = "de",
) -> Optional[dict]:
    """
    Generiert einen Blog-Post mit Claude in der gewünschten Sprache.
    language: 'de' | 'en' | 'es'
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY nicht konfiguriert")
        return None

    if not author_id:
        author_id = _get_admin_user_id(db)
    if not author_id:
        logger.error("Kein Admin-User gefunden")
        return None

    lang = language if language in ("de", "en", "es") else "de"
    topics = TOPICS_BY_LANG[lang]

    # Thema wählen — nur aus der gewünschten Sprache, Wiederholungen vermeiden
    if not topic:
        recent_titles = {
            r[0] for r in db.query(BlogPost.title)
            .filter(BlogPost.language == lang)
            .order_by(BlogPost.created_at.desc())
            .limit(12).all()
        }
        # Falls Kategorie vorgegeben: nur aus dieser Kategorie wählen
        pool = [(t, c) for t, c in topics if t not in recent_titles]
        if category:
            pool = [(t, c) for t, c in pool if c == category]
        if not pool:
            pool = [(t, c) for t, c in topics if (not category or c == category)]
        if not pool:
            pool = topics
        topic, category = random.choice(pool)

    logger.info(f"Generiere Blog-Post [{lang}] mit Claude: '{topic}'")

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=SYSTEM_PROMPTS[lang],
            messages=[{"role": "user", "content": USER_PROMPT_TEMPLATE.format(topic=topic)}]
        )

        raw = message.content[0].text.strip()

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

        slug = _create_slug(data["title"], lang)
        # Slug muss global eindeutig sein
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
            language=lang,
            is_published=auto_publish,
            is_featured=False,
            author_id=author_id,
            published_at=datetime.utcnow() if auto_publish else None,
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        logger.info(f"✅ Blog-Post [{lang}] erstellt: '{post.title}' (ID: {post.id})")

        if auto_publish:
            try:
                from app.services.google_indexing_service import google_indexing_service
                import asyncio
                path = f"/blog/{post.slug}" if lang == "de" else f"/blog/{lang}/{post.slug}"
                asyncio.create_task(google_indexing_service.request_indexing(
                    f"https://www.jobon.work{path}", "URL_UPDATED"
                ))
            except Exception:
                pass

        return {"id": post.id, "title": post.title, "slug": post.slug, "language": lang}

    except Exception as e:
        logger.error(f"Fehler beim Generieren des Blog-Posts: {e}")
        db.rollback()
        return None
