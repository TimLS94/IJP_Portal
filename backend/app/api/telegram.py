"""
Telegram-Bot-Endpunkte.

- POST /telegram/webhook : Empfängt Updates von Telegram (öffentlich, per Secret-Header abgesichert).
- Admin-Endpunkte        : Status, Webhook setzen/löschen, Testnachricht.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
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


# ---------------- Webhook ----------------

WELCOME = (
    "👋 <b>Willkommen beim JobOn-Stellen-Bot!</b>\n\n"
    "Du bekommst neue Stellen direkt hier. Wähle zuerst eine Stellenart, "
    "die dich interessiert:"
)

HELP = (
    "ℹ️ <b>JobOn-Stellen-Bot</b>\n\n"
    "/start – Abo starten / Filter neu einstellen\n"
    "/filter – Stellenart &amp; Ort ändern\n"
    "/stop – keine Stellen mehr erhalten\n"
    "/hilfe – diese Hilfe\n"
)


def _get_or_create_subscriber(db: Session, chat_id: str, message: dict) -> TelegramSubscriber:
    sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
    from_user = message.get("from", {}) or {}
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


def _handle_message(db: Session, message: dict) -> None:
    chat = message.get("chat", {}) or {}
    chat_id = str(chat.get("id"))
    chat_type = chat.get("type")
    text = (message.get("text") or "").strip()

    # Kommando von möglichem "@botname"-Suffix befreien
    command = text.split()[0].split("@")[0].lower() if text else ""

    # --- Gruppen-/Kanal-Chat: nur /hier_posten zum Registrieren der Ziel-Gruppe ---
    if chat_type in ("group", "supergroup", "channel"):
        if command == "/hier_posten":
            set_setting(db, tg.GROUP_CHAT_SETTING, chat_id)
            db.commit()
            tg.send_message(chat_id, "✅ Diese Gruppe erhält ab jetzt neue Stellen von JobOn.")
        return

    # --- Privat-Chat: Abo-Dialog ---
    if command in ("/start", "/filter"):
        sub = _get_or_create_subscriber(db, chat_id, message)
        sub.is_active = True
        sub.state = "awaiting_position"
        db.commit()
        greeting = WELCOME if command == "/start" else "🔧 Stellenart wählen:"
        tg.send_message(chat_id, greeting, reply_markup=tg.position_keyboard())
        return

    if command == "/stop":
        sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
        if sub:
            sub.is_active = False
            sub.state = None
            db.commit()
        tg.send_message(chat_id, "🛑 Abo pausiert. Mit /start bekommst du jederzeit wieder Stellen.")
        return

    if command in ("/hilfe", "/help"):
        tg.send_message(chat_id, HELP)
        return

    # Freitext: als Ort-Antwort werten, wenn wir gerade darauf warten
    sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
    if sub and sub.state == "awaiting_location":
        if command == "/alle":
            sub.location = None
        else:
            sub.location = text
        sub.state = None
        sub.is_active = True
        db.commit()
        _send_confirmation(chat_id, sub)
        return

    tg.send_message(chat_id, HELP)


def _handle_callback(db: Session, callback: dict) -> None:
    callback_id = callback.get("id")
    data = callback.get("data") or ""
    message = callback.get("message", {}) or {}
    chat = message.get("chat", {}) or {}
    chat_id = str(chat.get("id"))

    if data.startswith("pos:"):
        value = data.split(":", 1)[1]
        sub = db.query(TelegramSubscriber).filter(TelegramSubscriber.chat_id == chat_id).first()
        if not sub:
            sub = _get_or_create_subscriber(db, chat_id, {"from": callback.get("from", {})})
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
        tg.send_message(
            chat_id,
            "📍 In welchem <b>Ort</b> suchst du?\n"
            "Sende mir einen Ort (z.B. <i>Berlin</i>) – oder tippe /alle für alle Orte.",
        )
        return

    tg.answer_callback_query(callback_id)


def _send_confirmation(chat_id: str, sub: TelegramSubscriber) -> None:
    pos = tg.POSITION_LABELS.get(sub.position_type.value, "Alle Stellenarten") if sub.position_type else "Alle Stellenarten"
    ort = sub.location if sub.location else "Alle Orte"
    tg.send_message(
        chat_id,
        f"✅ <b>Abo aktiv!</b>\n\n🏷️ Stellenart: {pos}\n📍 Ort: {ort}\n\n"
        "Du bekommst ab jetzt passende neue Stellen. Ändern mit /filter, pausieren mit /stop.",
    )


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_telegram_bot_api_secret_token: str = Header(None),
):
    """Empfängt Updates von Telegram. Antwortet immer mit 200, damit Telegram nicht retryt."""
    # Secret-Header prüfen (falls konfiguriert)
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


@router.post("/test")
def telegram_test(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Sendet eine Testnachricht in die konfigurierte Gruppe."""
    group_chat_id = get_setting(db, tg.GROUP_CHAT_SETTING, None)
    if not group_chat_id:
        raise HTTPException(status_code=400, detail="Keine Gruppe gesetzt (/hier_posten im Gruppen-Chat senden)")
    result = tg.send_message(group_chat_id, "✅ Test: Der JobOn-Bot ist mit dieser Gruppe verbunden.")
    return {"ok": result is not None}
