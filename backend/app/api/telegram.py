"""
Telegram-Bot-Endpunkte.

- POST /telegram/webhook : Empfängt Updates von Telegram (öffentlich, per Secret-Header abgesichert).
- Admin-Endpunkte        : Status, Webhook setzen, Testnachricht, Gruppen-Sprache.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.user import User, UserRole
from app.core.security import get_current_user
from app.models.applicant import PositionType
from app.models.telegram_subscriber import TelegramSubscriber
from app.services.settings_service import get_setting, set_setting
from app.services import telegram_service as tg

router = APIRouter(prefix="/telegram", tags=["Telegram"])


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin-Rechte erforderlich")
    return current_user


# ---------------- Webhook / Bot-Dialog ----------------

def _get_or_create_subscriber(db: Session, chat_id: str, from_user: dict) -> TelegramSubscriber:
    sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
    from_user = from_user or {}
    if not sub:
        sub = TelegramSubscriber(
            chat_id=chat_id,
            username=from_user.get("username"),
            first_name=from_user.get("first_name"),
        )
        db.add(sub)
    else:
        sub.username = from_user.get("username") or sub.username
        sub.first_name = from_user.get("first_name") or sub.first_name
    return sub


def _sub_lang(db: Session, chat_id: str) -> str:
    sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
    return sub.language if sub and sub.language else tg.DEFAULT_LANGUAGE


def _send_confirmation(chat_id: str, sub: TelegramSubscriber) -> None:
    lang = sub.language or tg.DEFAULT_LANGUAGE
    pos = (tg.POSITION_LABELS[tg._norm_lang(lang)].get(sub.position_type.value)
           if sub.position_type else tg.t(lang, "all_positions_label"))
    ort = sub.location if sub.location else tg.t(lang, "all_locations_label")
    tg.send_message(chat_id, tg.t(lang, "confirm").format(pos=pos, loc=ort))


def _handle_message(db: Session, message: dict) -> None:
    chat = message.get("chat", {}) or {}
    chat_id = str(chat.get("id"))
    chat_type = chat.get("type")
    text = (message.get("text") or "").strip()

    command = text.split()[0].split("@")[0].lower() if text else ""

    # --- Gruppen-/Kanal-Chat: nur /hier_posten zum Registrieren der Ziel-Gruppe ---
    if chat_type in ("group", "supergroup", "channel"):
        if command == "/hier_posten":
            set_setting(db, tg.GROUP_CHAT_SETTING, chat_id)
            db.commit()
            group_lang = tg._norm_lang(get_setting(db, tg.GROUP_LANG_SETTING, tg.DEFAULT_LANGUAGE))
            tg.send_message(chat_id, tg.t(group_lang, "group_registered"))
        return

    # --- Privat-Chat: Abo-Dialog ---
    if command in ("/start", "/filter"):
        sub = _get_or_create_subscriber(db, chat_id, message.get("from", {}))
        sub.is_active = True
        sub.state = "awaiting_language"
        db.commit()
        greeting = tg.t(sub.language or tg.DEFAULT_LANGUAGE, "welcome" if command == "/start" else "choose_language")
        tg.send_message(chat_id, greeting, reply_markup=tg.language_keyboard())
        return

    if command == "/stop":
        sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
        lang = sub.language if sub else tg.DEFAULT_LANGUAGE
        if sub:
            sub.is_active = False
            sub.state = None
            db.commit()
        tg.send_message(chat_id, tg.t(lang, "stop"))
        return

    if command in ("/hilfe", "/help"):
        tg.send_message(chat_id, tg.t(_sub_lang(db, chat_id), "help"))
        return

    # Freitext: als Ort-Antwort werten, wenn wir gerade darauf warten
    sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
    if sub and sub.state == "awaiting_location":
        sub.location = None if command == "/alle" else text
        sub.state = None
        sub.is_active = True
        db.commit()
        _send_confirmation(chat_id, sub)
        return

    tg.send_message(chat_id, tg.t(_sub_lang(db, chat_id), "help"))


def _handle_callback(db: Session, callback: dict) -> None:
    callback_id = callback.get("id")
    data = callback.get("data") or ""
    message = callback.get("message", {}) or {}
    chat = message.get("chat", {}) or {}
    chat_id = str(chat.get("id"))

    sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
    if not sub:
        sub = _get_or_create_subscriber(db, chat_id, callback.get("from", {}))

    if data.startswith("lang:"):
        code = data.split(":", 1)[1]
        sub.language = tg._norm_lang(code)
        sub.state = "awaiting_position"
        sub.is_active = True
        db.commit()
        tg.answer_callback_query(callback_id)
        tg.send_message(chat_id, tg.t(sub.language, "choose_position"),
                        reply_markup=tg.position_keyboard(sub.language))
        return

    if data.startswith("pos:"):
        value = data.split(":", 1)[1]
        if value == "all":
            sub.position_type = None
        else:
            try:
                sub.position_type = PositionType(value)
            except ValueError:
                sub.position_type = None
        sub.state = "awaiting_location"
        sub.is_active = True
        db.commit()
        tg.answer_callback_query(callback_id)
        tg.send_message(chat_id, tg.t(sub.language or tg.DEFAULT_LANGUAGE, "choose_location"))
        return

    tg.answer_callback_query(callback_id)


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_telegram_bot_api_secret_token: str = Header(None),
):
    """Empfängt Updates von Telegram. Antwortet immer mit 200, damit Telegram nicht retryt."""
    if tg.TELEGRAM_WEBHOOK_SECRET and x_telegram_bot_api_secret_token != tg.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ungültiges Secret")

    try:
        update = await request.json()
    except Exception:
        return {"ok": True}

    try:
        if "message" in update:
            _handle_message(db, update["message"])
        elif "callback_query" in update:
            _handle_callback(db, update["callback_query"])
    except Exception as exc:
        logger.error(f"Telegram-Webhook Fehler: {exc}")
        db.rollback()

    return {"ok": True}


# ---------------- Admin ----------------

@router.get("/status")
def telegram_status(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    total = db.query(TelegramSubscriber).count()
    active = db.query(TelegramSubscriber).filter(TelegramSubscriber.is_active == True).count()  # noqa: E712
    return {
        "configured": tg.is_configured(),
        "group_chat_id": get_setting(db, tg.GROUP_CHAT_SETTING, None),
        "group_language": tg._norm_lang(get_setting(db, tg.GROUP_LANG_SETTING, tg.DEFAULT_LANGUAGE)),
        "supported_languages": tg.SUPPORTED_LANGUAGES,
        "subscribers_total": total,
        "subscribers_active": active,
        "webhook": tg.get_webhook_info() if tg.is_configured() else None,
    }


@router.post("/set-webhook")
def telegram_set_webhook(current_user: User = Depends(require_admin)):
    if not tg.is_configured():
        raise HTTPException(status_code=400, detail="TELEGRAM_BOT_TOKEN nicht gesetzt")
    result = tg.set_webhook("https://ijp-portal.onrender.com")
    if result is None:
        raise HTTPException(status_code=502, detail="Webhook konnte nicht gesetzt werden")
    return {"ok": True, "result": result}


class GroupLanguageRequest(BaseModel):
    language: str


@router.post("/group-language")
def telegram_set_group_language(
    data: GroupLanguageRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Setzt die Sprache, in der in die Gruppe gepostet wird."""
    if data.language not in tg.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Sprache nicht unterstützt")
    set_setting(db, tg.GROUP_LANG_SETTING, data.language)
    db.commit()
    return {"ok": True, "group_language": data.language}


@router.post("/test")
def telegram_test(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Sendet eine Testnachricht in die konfigurierte Gruppe."""
    group_chat_id = get_setting(db, tg.GROUP_CHAT_SETTING, None)
    if not group_chat_id:
        raise HTTPException(status_code=400, detail="Keine Gruppe gesetzt (/hier_posten im Gruppen-Chat senden)")
    result = tg.send_message(group_chat_id, "✅ Test: Der JobOn-Bot ist mit dieser Gruppe verbunden.")
    return {"ok": result is not None}
