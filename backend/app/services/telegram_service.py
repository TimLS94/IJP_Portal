"""
Telegram Bot Service

Postet neue Stellen in eine Telegram-Gruppe (in einer im Admin gewählten Sprache)
und an einzelne Abonnenten in deren gewählter Sprache (de/en/es/ru), optional
gefiltert nach Stellenart & Ort.

Konfiguration über Environment-Variablen:
- TELEGRAM_BOT_TOKEN:       Bot-Token von @BotFather (Pflicht)
- TELEGRAM_WEBHOOK_SECRET:  Geheimnis zur Absicherung des Webhooks (optional, empfohlen)

Settings (GlobalSettings):
- telegram_group_chat_id:   Ziel-Gruppe (per /hier_posten gesetzt)
- telegram_group_language:  Sprache der Gruppen-Posts (Default "de")
"""
import os
import re
import json
import html
import logging
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.settings_service import get_setting
from app.services.position_groups import position_compatible

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

BASE_URL = "https://www.jobon.work"
GROUP_CHAT_SETTING = "telegram_group_chat_id"
GROUP_LANG_SETTING = "telegram_group_language"

SUPPORTED_LANGUAGES = ["de", "en", "es", "ru"]
DEFAULT_LANGUAGE = "de"


def _norm_lang(lang: Optional[str]) -> str:
    return lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE


# Anzeigenamen der Sprachen (für das Sprach-Keyboard)
LANGUAGE_NAMES = {
    "de": "🇩🇪 Deutsch",
    "en": "🇬🇧 English",
    "es": "🇪🇸 Español",
    "ru": "🇷🇺 Русский",
}

# Stellenart-Labels je Sprache
POSITION_LABELS = {
    "de": {
        "studentenferienjob": "Studentenferienjob", "saisonjob": "Saisonjob",
        "workandholiday": "Work & Holiday", "fachkraft": "Fachkraft",
        "ausbildung": "Ausbildung", "general": "Allgemein",
    },
    "en": {
        "studentenferienjob": "Student holiday job", "saisonjob": "Seasonal job",
        "workandholiday": "Work & Holiday", "fachkraft": "Skilled worker",
        "ausbildung": "Apprenticeship", "general": "General",
    },
    "es": {
        "studentenferienjob": "Trabajo de vacaciones", "saisonjob": "Trabajo de temporada",
        "workandholiday": "Work & Holiday", "fachkraft": "Profesional cualificado",
        "ausbildung": "Formación profesional", "general": "General",
    },
    "ru": {
        "studentenferienjob": "Студенческая подработка", "saisonjob": "Сезонная работа",
        "workandholiday": "Work & Holiday", "fachkraft": "Квалифицированный специалист",
        "ausbildung": "Профобучение (Ausbildung)", "general": "Разное",
    },
}

# Bot-Texte je Sprache
TEXTS = {
    "de": {
        "welcome": "👋 <b>Willkommen beim JobOn-Stellen-Bot!</b>\n\nBitte wähle zuerst deine Sprache:",
        "choose_language": "🌍 Bitte wähle deine Sprache:",
        "choose_position": "🏷️ Welche <b>Stellenart</b> interessiert dich?",
        "all_positions": "🌐 Alle Stellenarten",
        "choose_location": "📍 In welchem <b>Ort</b> suchst du?\nSende mir einen Ort (z.B. <i>Berlin</i>) – oder tippe /alle für alle Orte.",
        "confirm": "✅ <b>Abo aktiv!</b>\n\n🏷️ Stellenart: {pos}\n📍 Ort: {loc}\n\nDu bekommst ab jetzt passende neue Stellen. Ändern mit /filter, pausieren mit /stop.",
        "all_positions_label": "Alle Stellenarten",
        "all_locations_label": "Alle Orte",
        "stop": "🛑 Abo pausiert. Mit /start bekommst du jederzeit wieder Stellen.",
        "help": "ℹ️ <b>JobOn-Stellen-Bot</b>\n\n/start – Abo starten / neu einstellen\n/filter – Sprache, Stellenart &amp; Ort ändern\n/stop – keine Stellen mehr erhalten\n/hilfe – diese Hilfe",
        "external": "Externe Stelle",
        "cta": "Jetzt ansehen &amp; bewerben",
        "group_registered": "✅ Diese Gruppe erhält ab jetzt neue Stellen von JobOn.",
    },
    "en": {
        "welcome": "👋 <b>Welcome to the JobOn jobs bot!</b>\n\nPlease choose your language first:",
        "choose_language": "🌍 Please choose your language:",
        "choose_position": "🏷️ Which <b>job type</b> are you interested in?",
        "all_positions": "🌐 All job types",
        "choose_location": "📍 Which <b>location</b> are you looking in?\nSend me a place (e.g. <i>Berlin</i>) – or type /alle for all locations.",
        "confirm": "✅ <b>Subscription active!</b>\n\n🏷️ Job type: {pos}\n📍 Location: {loc}\n\nYou'll now receive matching new jobs. Change with /filter, pause with /stop.",
        "all_positions_label": "All job types",
        "all_locations_label": "All locations",
        "stop": "🛑 Subscription paused. Send /start anytime to resume.",
        "help": "ℹ️ <b>JobOn jobs bot</b>\n\n/start – start / reconfigure subscription\n/filter – change language, job type &amp; location\n/stop – stop receiving jobs\n/hilfe – this help",
        "external": "External job",
        "cta": "View &amp; apply now",
        "group_registered": "✅ This group will now receive new jobs from JobOn.",
    },
    "es": {
        "welcome": "👋 <b>¡Bienvenido/a al bot de empleos de JobOn!</b>\n\nPor favor, elige primero tu idioma:",
        "choose_language": "🌍 Por favor, elige tu idioma:",
        "choose_position": "🏷️ ¿Qué <b>tipo de empleo</b> te interesa?",
        "all_positions": "🌐 Todos los tipos",
        "choose_location": "📍 ¿En qué <b>lugar</b> buscas?\nEnvíame una ciudad (p. ej. <i>Berlin</i>) – o escribe /alle para todos los lugares.",
        "confirm": "✅ <b>¡Suscripción activa!</b>\n\n🏷️ Tipo: {pos}\n📍 Lugar: {loc}\n\nA partir de ahora recibirás nuevas ofertas que coincidan. Cambia con /filter, pausa con /stop.",
        "all_positions_label": "Todos los tipos",
        "all_locations_label": "Todos los lugares",
        "stop": "🛑 Suscripción en pausa. Envía /start cuando quieras para reanudar.",
        "help": "ℹ️ <b>Bot de empleos JobOn</b>\n\n/start – iniciar / reconfigurar suscripción\n/filter – cambiar idioma, tipo &amp; lugar\n/stop – dejar de recibir ofertas\n/hilfe – esta ayuda",
        "external": "Oferta externa",
        "cta": "Ver y postularse",
        "group_registered": "✅ Este grupo recibirá ahora nuevas ofertas de JobOn.",
    },
    "ru": {
        "welcome": "👋 <b>Добро пожаловать в бот вакансий JobOn!</b>\n\nСначала выберите язык:",
        "choose_language": "🌍 Пожалуйста, выберите язык:",
        "choose_position": "🏷️ Какой <b>тип вакансии</b> вас интересует?",
        "all_positions": "🌐 Все типы",
        "choose_location": "📍 В каком <b>городе</b> ищете?\nОтправьте город (например, <i>Berlin</i>) – или напишите /alle для всех городов.",
        "confirm": "✅ <b>Подписка активна!</b>\n\n🏷️ Тип: {pos}\n📍 Город: {loc}\n\nТеперь вы будете получать подходящие новые вакансии. Изменить — /filter, пауза — /stop.",
        "all_positions_label": "Все типы",
        "all_locations_label": "Все города",
        "stop": "🛑 Подписка приостановлена. Отправьте /start, чтобы возобновить.",
        "help": "ℹ️ <b>Бот вакансий JobOn</b>\n\n/start – начать / перенастроить подписку\n/filter – изменить язык, тип и город\n/stop – не получать вакансии\n/hilfe – эта справка",
        "external": "Внешняя вакансия",
        "cta": "Смотреть и откликнуться",
        "group_registered": "✅ Эта группа будет получать новые вакансии от JobOn.",
    },
}


def t(lang: str, key: str) -> str:
    lang = _norm_lang(lang)
    return TEXTS.get(lang, TEXTS[DEFAULT_LANGUAGE]).get(key, TEXTS[DEFAULT_LANGUAGE][key])


def is_configured() -> bool:
    return bool(TELEGRAM_BOT_TOKEN)


def _api(method: str, payload: dict) -> Optional[dict]:
    """Ruft eine Telegram-Bot-API-Methode auf (synchron). Gibt result-dict oder None zurück."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram: TELEGRAM_BOT_TOKEN nicht gesetzt")
        return None
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(url, json=payload)
            data = resp.json()
            if not data.get("ok"):
                logger.warning(f"Telegram API {method} Fehler: {data}")
                return None
            return data.get("result")
    except Exception as exc:
        logger.warning(f"Telegram API {method} Exception: {exc}")
        return None


def send_message(chat_id, text: str, reply_markup: Optional[dict] = None,
                 disable_preview: bool = False) -> Optional[dict]:
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": disable_preview,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return _api("sendMessage", payload)


def answer_callback_query(callback_query_id: str, text: Optional[str] = None) -> None:
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    _api("answerCallbackQuery", payload)


def language_keyboard() -> dict:
    """Inline-Keyboard zur Sprachwahl."""
    buttons = [[{"text": name, "callback_data": f"lang:{code}"}]
               for code, name in LANGUAGE_NAMES.items()]
    return {"inline_keyboard": buttons}


def position_keyboard(lang: str) -> dict:
    """Inline-Keyboard zur Auswahl der Stellenart (lokalisiert)."""
    lang = _norm_lang(lang)
    labels = POSITION_LABELS[lang]
    buttons = [[{"text": labels[value], "callback_data": f"pos:{value}"}]
               for value in POSITION_LABELS["de"].keys()]
    buttons.append([{"text": t(lang, "all_positions"), "callback_data": "pos:all"}])
    return {"inline_keyboard": buttons}


def _employer_name(job) -> str:
    if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
        return job.external_employer_name
    company = getattr(job, "company", None)
    return company.company_name if company else "Unbekannt"


def _job_url(job) -> str:
    slug = job.slug or "job"
    return f"{BASE_URL}/jobs/{slug}-{job.id}"


def _strip_html(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"<[^>]*>", " ", text).strip()


def generate_teaser(job) -> dict:
    """Erzeugt per OpenAI einen knackigen 1-Satz-Teaser je Sprache (de/en/es/ru).

    Ein einziger API-Call gibt JSON mit allen 4 Sprachen zurück. Bei fehlendem
    Key oder Fehler wird {} zurückgegeben (Post funktioniert dann ohne Teaser).
    """
    if not settings.OPENAI_API_KEY:
        return {}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        context = (
            f"Titel: {job.title}\n"
            f"Arbeitgeber: {_employer_name(job)}\n"
            f"Ort: {job.location or ''}\n"
            f"Beschreibung: {_strip_html(getattr(job, 'description', ''))[:600]}\n"
            f"Benefits: {_strip_html(getattr(job, 'benefits', ''))[:300]}"
        )
        prompt = (
            "Du schreibst kurze, knackige Teaser für einen Telegram-Job-Kanal. "
            "Fasse die folgende Stelle in EINEM attraktiven, konkreten Satz zusammen "
            "(max. ~90 Zeichen, keine Emojis, kein Titel-Wiederholen, kein Ort-Wiederholen, "
            "hebe das Interessanteste hervor, z.B. Benefits/Unterkunft/Trinkgeld). "
            "Antworte als JSON mit den Schlüsseln de, en, es, ru (Übersetzungen desselben Satzes).\n\n"
            f"{context}"
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return {k: str(v).strip() for k, v in data.items() if k in SUPPORTED_LANGUAGES and v}
    except Exception as exc:
        logger.warning(f"Teaser-Generierung fehlgeschlagen für Job {getattr(job, 'id', '?')}: {exc}")
        return {}


def ensure_teaser(job, db: Session) -> dict:
    """Gibt den gespeicherten Teaser zurück oder erzeugt ihn einmalig und speichert ihn."""
    existing = getattr(job, "telegram_teaser", None)
    if existing:
        return existing
    teaser = generate_teaser(job)
    if teaser:
        job.telegram_teaser = teaser
        try:
            db.commit()
        except Exception:
            db.rollback()
    return teaser


def _teaser_line(job, lang: str) -> Optional[str]:
    teaser = getattr(job, "telegram_teaser", None) or {}
    if not isinstance(teaser, dict):
        return None
    text = teaser.get(_norm_lang(lang)) or teaser.get(DEFAULT_LANGUAGE)
    return html.escape(text) if text else None


def _localized_title(job, lang: str) -> str:
    """Titel der Stelle in der Zielsprache (Fallback: deutsches Basisfeld)."""
    lang = _norm_lang(lang)
    if lang != "de":
        translations = getattr(job, "translations", None) or {}
        translated = translations.get(lang) if isinstance(translations, dict) else None
        if isinstance(translated, dict) and translated.get("title"):
            return translated["title"]
    return job.title or "Neue Stelle"


def format_job_message(job, lang: str = DEFAULT_LANGUAGE) -> str:
    """Formatiert eine Stelle als HTML-Telegram-Nachricht in der gewählten Sprache."""
    lang = _norm_lang(lang)
    title = html.escape(_localized_title(job, lang))
    employer = html.escape(_employer_name(job))
    location = html.escape(job.location or "Deutschland")
    pos_value = job.position_type.value if job.position_type else ""
    pos_label = POSITION_LABELS[lang].get(pos_value, "")

    lines = [f"💼 <b>{title}</b>"]
    lines.append(f"🏢 {employer}")
    lines.append(f"📍 {location}")
    if pos_label:
        lines.append(f"🏷️ {pos_label}")
    teaser = _teaser_line(job, lang)
    if teaser:
        lines.append(f"✨ {teaser}")
    if getattr(job, "is_external", False):
        lines.append(f"ℹ️ <i>{t(lang, 'external')}</i>")
    lines.append("")
    lines.append(f'👉 <a href="{_job_url(job)}">{t(lang, "cta")}</a>')
    return "\n".join(lines)


def _subscriber_matches(subscriber, job) -> bool:
    """Prüft, ob eine Stelle zu den Filtern eines Abonnenten passt."""
    job_type = job.position_type.value if job.position_type else None
    if subscriber.position_type is not None:
        if not position_compatible([subscriber.position_type.value], job_type):
            return False
    if subscriber.location:
        job_location = (job.location or "").lower()
        if subscriber.location.lower().strip() not in job_location:
            return False
    return True


def broadcast_new_job(job, db: Session) -> dict:
    """Postet eine neue Stelle in die Gruppe (Gruppen-Sprache) und an passende Abonnenten (deren Sprache)."""
    if not is_configured():
        return {"sent_group": False, "sent_subscribers": 0, "reason": "not_configured"}

    if not getattr(job, "is_active", False) or getattr(job, "is_draft", False):
        return {"sent_group": False, "sent_subscribers": 0, "reason": "inactive"}

    # KI-Teaser einmalig erzeugen/laden (für alle Empfänger wiederverwendet)
    ensure_teaser(job, db)

    # 1) In die Gruppe posten (in der konfigurierten Gruppen-Sprache)
    sent_group = False
    group_chat_id = get_setting(db, GROUP_CHAT_SETTING, None)
    if group_chat_id:
        group_lang = _norm_lang(get_setting(db, GROUP_LANG_SETTING, DEFAULT_LANGUAGE))
        result = send_message(group_chat_id, format_job_message(job, group_lang))
        sent_group = result is not None

    # 2) An Abonnenten senden (gefiltert, in deren Sprache)
    from app.models.telegram_subscriber import TelegramSubscriber
    subscribers = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.is_active == True  # noqa: E712
    ).all()

    sent_count = 0
    for sub in subscribers:
        if not _subscriber_matches(sub, job):
            continue
        text = format_job_message(job, sub.language)
        result = send_message(sub.chat_id, text)
        if result is not None:
            sent_count += 1
        else:
            # Wahrscheinlich hat der Nutzer den Bot blockiert -> deaktivieren
            sub.is_active = False
    if subscribers:
        db.commit()

    logger.info(
        f"Telegram-Broadcast Job {job.id}: Gruppe={sent_group}, Abonnenten={sent_count}"
    )
    return {"sent_group": sent_group, "sent_subscribers": sent_count}


# ---- Webhook-Verwaltung (Admin) ----

def set_webhook(base_public_url: str) -> Optional[dict]:
    """Setzt den Telegram-Webhook auf <base_public_url>/api/v1/telegram/webhook."""
    webhook_url = base_public_url.rstrip("/") + "/api/v1/telegram/webhook"
    payload = {
        "url": webhook_url,
        "allowed_updates": ["message", "callback_query"],
    }
    if TELEGRAM_WEBHOOK_SECRET:
        payload["secret_token"] = TELEGRAM_WEBHOOK_SECRET
    return _api("setWebhook", payload)


def delete_webhook() -> Optional[dict]:
    return _api("deleteWebhook", {})


def get_webhook_info() -> Optional[dict]:
    return _api("getWebhookInfo", {})
