"""
Simple In-Memory Rate Limiter

Schützt kritische Endpoints vor Brute-Force-Angriffen.
Hinweis: In Produktion mit mehreren Workern sollte Redis verwendet werden.
"""
from datetime import datetime, timedelta
from typing import Dict, Tuple
from fastapi import HTTPException, Request, status
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)

# In-Memory Storage für Rate Limits
# Format: {ip_address: [(timestamp, endpoint), ...]}
_rate_limit_storage: Dict[str, list] = {}
_storage_lock = asyncio.Lock()


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
