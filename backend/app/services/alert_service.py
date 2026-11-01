"""
Fehler-Alerts via Telegram.

Bei unbehandelten Server-Fehlern (HTTP 500) wird – falls konfiguriert – eine
Telegram-Nachricht an die Alert-Chat-ID geschickt. Mit Throttling/Dedup, damit
eine fehlerhafte Schleife den Chat nicht flutet. Enthaelt bewusst KEINE
Request-Bodies/PII, nur Fehlertyp, Meldung, HTTP-Methode+Pfad und einen kurzen
Traceback.

Konfiguration (Env):
- TELEGRAM_ALERT_CHAT_ID: Ziel-Chat-ID (z.B. deine persoenliche Telegram-ID,
  die der Bot anschreiben darf). Nicht gesetzt -> Alert wird nur geloggt.
"""
import os
import html
import logging
import time
import traceback
from typing import Dict, List

logger = logging.getLogger(__name__)

# Throttling: pro identischer Fehler-Signatur max. 1 Alert je COOLDOWN Sekunden,
# zusaetzlich globale Obergrenze je Zeitfenster (Schutz vor Alert-Fluten).
_COOLDOWN_SECONDS = 300   # 5 min pro identischem Fehler
_GLOBAL_WINDOW = 60       # 1 min
_GLOBAL_MAX = 8           # max. Alerts pro Minute (gesamt)

_last_sent: Dict[str, float] = {}
_global_times: List[float] = []


def _allowed(signature: str) -> bool:
    now = time.time()
    while _global_times and now - _global_times[0] > _GLOBAL_WINDOW:
        _global_times.pop(0)
    if len(_global_times) >= _GLOBAL_MAX:
        return False
    if now - _last_sent.get(signature, 0.0) < _COOLDOWN_SECONDS:
        return False
    _last_sent[signature] = now
    _global_times.append(now)
    if len(_last_sent) > 500:  # Speicher begrenzen
        _last_sent.clear()
    return True


def _resolve_alert_chat_id() -> str:
    """Ziel-Chat-ID fuer Alerts: zuerst DB-Setting (per /alerts_hier gesetzt),
    sonst Env TELEGRAM_ALERT_CHAT_ID. Darf nie werfen."""
    try:
        from app.core.database import SessionLocal
        from app.services.settings_service import get_setting
        from app.services.telegram_service import ALERT_CHAT_SETTING
        db = SessionLocal()
        try:
            val = (get_setting(db, ALERT_CHAT_SETTING, "") or "").strip()
            if val:
                return val
        finally:
            db.close()
    except Exception:
        pass
    return os.getenv("TELEGRAM_ALERT_CHAT_ID", "").strip()


def notify_exception(method: str, path: str, exc: BaseException) -> None:
    """Best effort: Telegram-Alert zu einem 500er. Darf selbst NIE werfen."""
    try:
        exc_type = type(exc).__name__
        exc_msg = str(exc)[:300]
        signature = f"{exc_type}:{method}:{path}"
        if not _allowed(signature):
            return

        chat_id = _resolve_alert_chat_id()
        if not chat_id:
            logger.error(
                "500 %s %s -> %s: %s (kein TELEGRAM_ALERT_CHAT_ID gesetzt)",
                method, path, exc_type, exc_msg,
            )
            return

        tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        tb_tail = tb[-1200:]
        text = (
            "\U0001F6A8 <b>JobOn Backend-Fehler (500)</b>\n"
            f"<b>{html.escape(method)}</b> <code>{html.escape(path)}</code>\n"
            f"<b>{html.escape(exc_type)}</b>: {html.escape(exc_msg)}\n\n"
            f"<pre>{html.escape(tb_tail)}</pre>"
        )

        from app.services import telegram_service
        telegram_service.send_message(chat_id, text, disable_preview=True)
    except Exception as e:  # noqa: BLE001 - Alerting darf die App nie crashen lassen
        logger.warning("Alert-Versand fehlgeschlagen: %s", e)
