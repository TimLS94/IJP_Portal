"""
Generiert aus einer (geboosteten) Stelle einen fertigen Facebook-Gruppen-Post
auf Deutsch UND Spanisch im JobOn-Stil (mit Emojis), plus den Kommentar-Link
zur Stelle.

Nutzt Gemini (kostenloser Tier). Erfindet keine Infos – nutzt nur Stellendaten.
"""
import json
import logging
import re

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://www.jobon.work"


def _strip_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<li[^>]*>", "\n• ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&amp;", "&").replace("&nbsp;", " ")
    return re.sub(r"[ \t]+", " ", text).strip()


def _salary_str(job) -> str:
    smin, smax, stype = job.salary_min, job.salary_max, job.salary_type
    if not smin and not smax:
        return ""
    unit = {"hourly": "/Std.", "monthly": "/Monat", "yearly": "/Jahr"}.get(stype or "", "")
    if smin and smax:
        return f"{int(smin)}–{int(smax)} €{unit}"
    return f"{int(smin or smax)} €{unit}"


def _job_url(job) -> str:
    if job.slug:
        return f"{BASE_URL}/jobs/{job.slug}-{job.id}"
    return f"{BASE_URL}/jobs/{job.id}"


def build_comment_text(job) -> str:
    return f"👉 Jetzt direkt bewerben: {_job_url(job)}"


_PROMPT = """Du bist Social-Media-Experte für die Jobplattform jobon.work und wirbst in Facebook-Gruppen für eine Stelle.

Erstelle einen ansprechenden Werbe-Post für diese Stelle – einmal auf DEUTSCH und einmal auf SPANISCH.

Stellendaten (nutze NUR diese Infos, erfinde nichts):
- Jobtitel: {title}
- Arbeitgeber: {employer}
- Ort: {location}
- Gehalt: {salary}
- Unterkunft gestellt: {accommodation}
- Arbeitszeit/Anstellung: {employment}
- Deutsch erforderlich: {german}
- Englisch erforderlich: {english}
- Aufgaben:
{tasks}
- Anforderungen/Profil:
{requirements}

Stil (wichtig, halte dich genau daran):
- Mit Emojis, locker und motivierend, wie eine Job-Anzeige in einer Facebook-Gruppe.
- Struktur: Titelzeile mit passendem Emoji + "| jobon.work 🚀", kurze Ansprache ("Du suchst einen Job als ...?"), 2-4 Vorteile mit ✔️ (nur die vorhandenen: Gehalt, Unterkunft, Arbeitszeit), "👉 Deine Aufgaben:" mit •-Punkten, "👉 Dein Profil:" mit •-Punkten, dann CTA "📲 👉 Jetzt direkt über jobon.work bewerben!", abschließend "👉 Link & weitere Infos in den Kommentaren! 👇".
- KEIN konkreter Link im Post-Text (der kommt in die Kommentare).
- Spanische Version: gleiche Struktur, natürliches Spanisch, "| jobon.work 🚀".

Antworte NUR mit gültigem JSON (keine Codeblöcke), exakt:
{{"de": "<kompletter deutscher Post>", "es": "<kompletter spanischer Post>"}}"""


def _parse_json(raw: str) -> dict:
    raw = (raw or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
    try:
        return json.loads(raw)
    except Exception:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(raw[start:end + 1])
        raise


def generate_job_post(job) -> dict:
    """Gibt {'de': ..., 'es': ..., 'comment': ...} zurück. Wirft bei KI-Fehler."""
    if not settings.GOOGLE_AI_API_KEY:
        raise RuntimeError("GOOGLE_AI_API_KEY nicht konfiguriert")

    company_name = job.company.company_name if getattr(job, "company", None) else "Arbeitgeber"
    if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
        company_name = job.external_employer_name

    german = job.german_required.value if getattr(job, "german_required", None) else "nicht erforderlich"
    english = job.english_required.value if getattr(job, "english_required", None) else "nicht erforderlich"
    employment = job.employment_type.value if getattr(job, "employment_type", None) else "nicht angegeben"

    prompt = _PROMPT.format(
        title=job.title or "Stelle",
        employer=company_name,
        location=job.location or "Deutschland",
        salary=_salary_str(job) or "nicht angegeben",
        accommodation="Ja" if getattr(job, "accommodation_provided", False) else "Nein",
        employment=employment,
        german=german,
        english=english,
        tasks=_strip_html(getattr(job, "tasks", "")) or "nicht angegeben",
        requirements=_strip_html(getattr(job, "requirements", "")) or "nicht angegeben",
    )

    from google import genai
    from google.genai import types
    client = genai.Client(api_key=settings.GOOGLE_AI_API_KEY)
    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.6,
        ),
    )
    result = _parse_json(resp.text)
    return {
        "de": (result.get("de") or "").strip(),
        "es": (result.get("es") or "").strip(),
        "comment": build_comment_text(job),
    }


def generate_and_store_job_post(job_id: int) -> None:
    """Generiert den FB-Post für eine Stelle und speichert ihn (eigene DB-Session,
    für Background-Tasks bei Boost/Hervorheben). Best effort – Fehler werden nur geloggt."""
    from app.core.database import SessionLocal
    from app.models.job_posting import JobPosting
    from app.models.facebook_post import FacebookJobPost

    db = SessionLocal()
    try:
        job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
        if not job:
            return
        result = generate_job_post(job)
        cached = db.query(FacebookJobPost).filter(FacebookJobPost.job_id == job_id).first()
        if not cached:
            cached = FacebookJobPost(job_id=job_id)
            db.add(cached)
        cached.content_de = result["de"]
        cached.content_es = result["es"]
        cached.comment_text = result["comment"]
        db.commit()
        logger.info(f"FB-Post automatisch generiert für Job {job_id}")
    except Exception as e:
        db.rollback()
        logger.warning(f"FB-Post Auto-Generierung fehlgeschlagen (Job {job_id}): {e}")
    finally:
        db.close()
