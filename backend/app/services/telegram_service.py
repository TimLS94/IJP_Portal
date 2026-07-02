"""
Telegram Bot Service

Postet neue Stellen in eine Telegram-Gruppe und an einzelne Abonnenten,
die den Bot per /start abonniert haben (optional gefiltert nach Stellenart & Ort).

Konfiguration über Environment-Variablen:
- TELEGRAM_BOT_TOKEN:       Bot-Token von @BotFather (Pflicht)
- TELEGRAM_WEBHOOK_SECRET:  Geheimnis zur Absicherung des Webhooks (optional, empfohlen)

Die Ziel-Gruppe wird in den GlobalSettings unter "telegram_group_chat_id"
gespeichert (per /hier_posten im Gruppen-Chat gesetzt).
"""
import os
import html
import logging
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.services.settings_service import get_setting
from app.services.position_groups import position_compatible

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

BASE_URL = "https://www.jobon.work"
GROUP_CHAT_SETTING = "telegram_group_chat_id"

# Deutsche Labels für Stellenarten (Enum-Value -> Anzeige)
POSITION_LABELS = {
    "studentenferienjob": "Studentenferienjob",
    "saisonjob": "Saisonjob",
    "workandholiday": "Work & Holiday",
    "fachkraft": "Fachkraft",
    "ausbildung": "Ausbildung",
    "general": "Allgemein",
}


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


def position_keyboard() -> dict:
    """Inline-Keyboard zur Auswahl der Stellenart."""
    buttons = [[{"text": label, "callback_data": f"pos:{value}"}]
               for value, label in POSITION_LABELS.items()]
    buttons.append([{"text": "🌐 Alle Stellenarten", "callback_data": "pos:all"}])
    return {"inline_keyboard": buttons}


def _employer_name(job) -> str:
    if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
        return job.external_employer_name
    company = getattr(job, "company", None)
    return company.company_name if company else "Unbekannt"


def _job_url(job) -> str:
    slug = job.slug or "job"
    return f"{BASE_URL}/jobs/{slug}-{job.id}"


def format_job_message(job) -> str:
    """Formatiert eine Stelle als HTML-Telegram-Nachricht."""
    title = html.escape(job.title or "Neue Stelle")
    employer = html.escape(_employer_name(job))
    location = html.escape(job.location or "Deutschland")
    pos_label = POSITION_LABELS.get(
        job.position_type.value if job.position_type else "", ""
    )

    lines = [f"💼 <b>{title}</b>"]
    lines.append(f"🏢 {employer}")
    lines.append(f"📍 {location}")
    if pos_label:
        lines.append(f"🏷️ {pos_label}")
    if getattr(job, "is_external", False):
        lines.append("ℹ️ <i>Externe Stelle</i>")
    lines.append("")
    lines.append(f'👉 <a href="{_job_url(job)}">Jetzt ansehen &amp; bewerben</a>')
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
    """Postet eine neue Stelle in die Gruppe und an alle passenden Abonnenten."""
    if not is_configured():
        return {"sent_group": False, "sent_subscribers": 0, "reason": "not_configured"}

    # Nicht für inaktive/Entwurf-Stellen
    if not getattr(job, "is_active", False) or getattr(job, "is_draft", False):
        return {"sent_group": False, "sent_subscribers": 0, "reason": "inactive"}

    text = format_job_message(job)

    # 1) In die Gruppe posten
    sent_group = False
    group_chat_id = get_setting(db, GROUP_CHAT_SETTING, None)
    if group_chat_id:
        result = send_message(group_chat_id, text)
        sent_group = result is not None

    # 2) An Abonnenten senden (gefiltert)
    from app.models.telegram_subscriber import TelegramSubscriber
    subscribers = db.query(TelegramSubscriber).filter(
        TelegramSubscriber.is_active == True  # noqa: E712
    ).all()

    sent_count = 0
    for sub in subscribers:
        if not _subscriber_matches(sub, job):
            continue
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
