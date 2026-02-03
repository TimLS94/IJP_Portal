"""
Simple In-Memory Rate Limiter + Account Lockout

Schützt kritische Endpoints vor Brute-Force-Angriffen.
Hinweis: In Produktion mit mehreren Workern sollte Redis verwendet werden.
"""
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from fastapi import HTTPException, Request, status
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)

# In-Memory Storage für Rate Limits
# Format: {ip_address: [(timestamp, endpoint), ...]}
_rate_limit_storage: Dict[str, list] = {}
_storage_lock = asyncio.Lock()

# Account Lockout Storage
# Format: {email: {"failed_attempts": int, "locked_until": datetime, "last_attempt": datetime}}
_account_lockout_storage: Dict[str, dict] = {}
_lockout_lock = asyncio.Lock()

# Lockout Konfiguration
LOCKOUT_THRESHOLD = 5  # Fehlversuche bis Sperre
LOCKOUT_DURATION_MINUTES = 15  # Sperrdauer in Minuten
FAILED_ATTEMPT_WINDOW_MINUTES = 30  # Zeitfenster für Fehlversuche


class RateLimitExceeded(HTTPException):
    """Exception für überschrittenes Rate Limit"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Zu viele Anfragen. Bitte versuchen Sie es in {retry_after} Sekunden erneut.",
            headers={"Retry-After": str(retry_after)}
        )


def get_client_ip(request: Request) -> str:
    """Ermittelt die Client-IP-Adresse"""
    # Prüfe X-Forwarded-For Header (bei Reverse Proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Nimm die erste IP (Original-Client)
        return forwarded_for.split(",")[0].strip()
    
    # Prüfe X-Real-IP Header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback auf Client-Host
    return request.client.host if request.client else "unknown"


async def cleanup_old_entries(max_age_minutes: int = 15):
    """Entfernt alte Rate-Limit-Einträge"""
    cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
    
    async with _storage_lock:
        for ip in list(_rate_limit_storage.keys()):
            _rate_limit_storage[ip] = [
                entry for entry in _rate_limit_storage[ip]
                if entry[0] > cutoff
            ]
            # Leere Einträge entfernen
            if not _rate_limit_storage[ip]:
                del _rate_limit_storage[ip]


async def check_rate_limit(
    request: Request,
    endpoint: str,
    max_requests: int,
    window_seconds: int
) -> bool:
    """
    Prüft ob das Rate Limit überschritten wurde.
    
    Args:
        request: FastAPI Request
        endpoint: Name des Endpoints (für Logging)
        max_requests: Maximale Anfragen im Zeitfenster
        window_seconds: Zeitfenster in Sekunden
        
    Returns:
        True wenn Request erlaubt, False wenn Limit überschritten
        
    Raises:
        RateLimitExceeded: Wenn das Limit überschritten wurde
    """
    ip = get_client_ip(request)
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=window_seconds)
    
    async with _storage_lock:
        # Initialisiere wenn nötig
        if ip not in _rate_limit_storage:
            _rate_limit_storage[ip] = []
        
        # Filtere alte Einträge für diesen Endpoint
        _rate_limit_storage[ip] = [
            entry for entry in _rate_limit_storage[ip]
            if entry[0] > window_start or entry[1] != endpoint
        ]
        
        # Zähle Anfragen für diesen Endpoint
        endpoint_requests = [
            entry for entry in _rate_limit_storage[ip]
            if entry[1] == endpoint
        ]
        
        if len(endpoint_requests) >= max_requests:
            # Rate limit überschritten
            oldest_request = min(entry[0] for entry in endpoint_requests)
            retry_after = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
            retry_after = max(1, retry_after)  # Mindestens 1 Sekunde
            
            logger.warning(f"Rate limit exceeded for {ip} on {endpoint}")
            raise RateLimitExceeded(retry_after=retry_after)
        
        # Request erlaubt - hinzufügen
        _rate_limit_storage[ip].append((now, endpoint))
    
    return True


# Vordefinierte Rate Limits
async def rate_limit_login(request: Request):
    """Rate Limit für Login: 5 Versuche pro Minute"""
    await check_rate_limit(request, "login", max_requests=5, window_seconds=60)


async def rate_limit_password_reset(request: Request):
    """Rate Limit für Passwort-Reset: 3 Versuche pro 5 Minuten"""
    await check_rate_limit(request, "password_reset", max_requests=3, window_seconds=300)


async def rate_limit_registration(request: Request):
    """Rate Limit für Registrierung: 3 pro Stunde"""
    await check_rate_limit(request, "registration", max_requests=3, window_seconds=3600)


async def rate_limit_contact(request: Request):
    """Rate Limit für Kontaktformular: 5 pro Stunde"""
    await check_rate_limit(request, "contact", max_requests=5, window_seconds=3600)


# ========== ACCOUNT LOCKOUT ==========

class AccountLockedException(HTTPException):
    """Exception für gesperrten Account"""
    def __init__(self, locked_until: datetime):
        remaining_minutes = max(1, int((locked_until - datetime.utcnow()).total_seconds() / 60))
        super().__init__(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account vorübergehend gesperrt wegen zu vieler Fehlversuche. Bitte versuchen Sie es in {remaining_minutes} Minuten erneut.",
            headers={"Retry-After": str(remaining_minutes * 60)}
        )


async def check_account_lockout(email: str) -> None:
    """
    Prüft ob ein Account gesperrt ist.
    
    Args:
        email: E-Mail-Adresse des Accounts
        
    Raises:
        AccountLockedException: Wenn der Account gesperrt ist
    """
    email_lower = email.lower()
    
    async with _lockout_lock:
        if email_lower not in _account_lockout_storage:
            return
        
        account_data = _account_lockout_storage[email_lower]
        
        # Prüfe ob Sperre noch aktiv
        if account_data.get("locked_until"):
            if datetime.utcnow() < account_data["locked_until"]:
                logger.warning(f"Login attempt on locked account: {email_lower}")
                raise AccountLockedException(account_data["locked_until"])
            else:
                # Sperre abgelaufen - zurücksetzen
                del _account_lockout_storage[email_lower]


async def record_failed_login(email: str) -> None:
    """
    Zeichnet einen fehlgeschlagenen Login-Versuch auf.
    Sperrt den Account nach LOCKOUT_THRESHOLD Fehlversuchen.
    
    Args:
        email: E-Mail-Adresse des Accounts
    """
    email_lower = email.lower()
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=FAILED_ATTEMPT_WINDOW_MINUTES)
    
    async with _lockout_lock:
        if email_lower not in _account_lockout_storage:
            _account_lockout_storage[email_lower] = {
                "failed_attempts": 0,
                "locked_until": None,
                "last_attempt": None
            }
        
        account_data = _account_lockout_storage[email_lower]
        
        # Reset wenn letzter Versuch außerhalb des Zeitfensters
        if account_data["last_attempt"] and account_data["last_attempt"] < window_start:
            account_data["failed_attempts"] = 0
        
        # Fehlversuch zählen
        account_data["failed_attempts"] += 1
        account_data["last_attempt"] = now
        
        logger.info(f"Failed login attempt {account_data['failed_attempts']}/{LOCKOUT_THRESHOLD} for {email_lower}")
        
        # Account sperren wenn Schwelle erreicht
        if account_data["failed_attempts"] >= LOCKOUT_THRESHOLD:
            account_data["locked_until"] = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            logger.warning(f"Account locked: {email_lower} until {account_data['locked_until']}")


async def reset_failed_logins(email: str) -> None:
    """
    Setzt die Fehlversuche nach erfolgreichem Login zurück.
    
    Args:
        email: E-Mail-Adresse des Accounts
    """
    email_lower = email.lower()
    
    async with _lockout_lock:
        if email_lower in _account_lockout_storage:
            del _account_lockout_storage[email_lower]
            logger.info(f"Failed login attempts reset for {email_lower}")


async def get_locked_accounts() -> list:
    """
    Gibt alle aktuell gesperrten Accounts zurück.
    
    Returns:
        Liste mit gesperrten Account-Infos
    """
    now = datetime.utcnow()
    locked = []
    
    async with _lockout_lock:
        for email, data in _account_lockout_storage.items():
            if data.get("locked_until") and data["locked_until"] > now:
                remaining_minutes = max(1, int((data["locked_until"] - now).total_seconds() / 60))
                locked.append({
                    "email": email,
                    "failed_attempts": data.get("failed_attempts", 0),
                    "locked_until": data["locked_until"].isoformat(),
                    "remaining_minutes": remaining_minutes
                })
    
    return locked


async def unlock_account(email: str) -> bool:
    """
    Entsperrt einen Account manuell.
    
    Args:
        email: E-Mail-Adresse des Accounts
        
    Returns:
        True wenn erfolgreich entsperrt, False wenn nicht gefunden
    """
    email_lower = email.lower()
    
    async with _lockout_lock:
        if email_lower in _account_lockout_storage:
            del _account_lockout_storage[email_lower]
            logger.info(f"Account manually unlocked: {email_lower}")
            return True
    return False

