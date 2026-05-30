"""
In-Memory Rate Limiter mit IP-Spoofing-Schutz

Schützt kritische Endpoints vor Brute-Force-Angriffen.
Wichtig: In Produktion mit mehreren Workern sollte Redis verwendet werden.
"""
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import HTTPException, Request, status
import asyncio
import logging
import re

logger = logging.getLogger(__name__)

# In-Memory Storage: {key: [(timestamp, endpoint), ...]}
_rate_limit_storage: Dict[str, list] = {}
_storage_lock = asyncio.Lock()

# Render.com und typische Reverse-Proxy-IPs (bekannte vertrauenswürdige Proxy-Ranges)
# Wenn diese nicht gesetzt sind, vertrauen wir X-Forwarded-For NICHT
_TRUST_PROXY = True  # Render.com setzt X-Forwarded-For korrekt


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Zu viele Anfragen. Bitte versuchen Sie es in {retry_after} Sekunden erneut.",
            headers={"Retry-After": str(retry_after)}
        )


def _is_valid_ip(ip: str) -> bool:
    """Prüft ob eine IP-Adresse syntaktisch valide ist."""
    ipv4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
    ipv6 = re.compile(r"^[0-9a-fA-F:]{2,39}$")
    return bool(ipv4.match(ip) or ipv6.match(ip))


def get_client_ip(request: Request) -> str:
    """
    Ermittelt die echte Client-IP.
    X-Forwarded-For wird nur verwendet wenn _TRUST_PROXY=True,
    und nur die LETZTE (d. h. vom Proxy eingetragene) IP wird genutzt,
    nicht die erste (die vom Angreifer gefälscht werden kann).
    """
    if _TRUST_PROXY:
        # Render.com trägt die echte Client-IP als letzten Eintrag in X-Forwarded-For ein
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            ips = [ip.strip() for ip in forwarded_for.split(",")]
            # Letzter Eintrag = vom vertrauenswürdigen Proxy gesetzt
            candidate = ips[-1] if ips else ""
            if candidate and _is_valid_ip(candidate):
                return candidate

        real_ip = request.headers.get("X-Real-IP", "").strip()
        if real_ip and _is_valid_ip(real_ip):
            return real_ip

    return request.client.host if request.client else "unknown"


async def cleanup_old_entries(max_age_minutes: int = 15):
    """Entfernt veraltete Rate-Limit-Einträge."""
    cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
    async with _storage_lock:
        for key in list(_rate_limit_storage.keys()):
            _rate_limit_storage[key] = [
                entry for entry in _rate_limit_storage[key]
                if entry[0] > cutoff
            ]
            if not _rate_limit_storage[key]:
                del _rate_limit_storage[key]


async def check_rate_limit(
    key: str,
    endpoint: str,
    max_requests: int,
    window_seconds: int,
) -> bool:
    """
    Prüft ob das Rate Limit für einen bestimmten Key überschritten wurde.
    Key kann IP-Adresse oder E-Mail sein – beide werden getrennt geprüft.
    """
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=window_seconds)

    async with _storage_lock:
        if key not in _rate_limit_storage:
            _rate_limit_storage[key] = []

        # Alte Einträge für diesen Endpoint entfernen
        _rate_limit_storage[key] = [
            e for e in _rate_limit_storage[key]
            if e[0] > window_start or e[1] != endpoint
        ]

        endpoint_requests = [e for e in _rate_limit_storage[key] if e[1] == endpoint]

        if len(endpoint_requests) >= max_requests:
            oldest = min(e[0] for e in endpoint_requests)
            retry_after = max(1, int((oldest + timedelta(seconds=window_seconds) - now).total_seconds()))
            logger.warning(f"Rate limit exceeded: key={key[:20]}... endpoint={endpoint}")
            raise RateLimitExceeded(retry_after=retry_after)

        _rate_limit_storage[key].append((now, endpoint))

    return True


async def rate_limit_login(request: Request, email: Optional[str] = None):
    """
    Rate Limit für Login: 5 Versuche pro Minute pro IP UND pro E-Mail.
    Doppelter Schutz verhindert IP-Spoofing-Bypass.
    """
    ip = get_client_ip(request)
    await check_rate_limit(f"ip:{ip}", "login", max_requests=5, window_seconds=60)
    # Zusätzlich: Limit pro E-Mail-Adresse (nicht umgehbar durch IP-Wechsel)
    if email:
        await check_rate_limit(f"email:{email.lower()}", "login", max_requests=5, window_seconds=60)


async def rate_limit_password_reset(request: Request, email: Optional[str] = None):
    """Rate Limit für Passwort-Reset: 3 Versuche pro 5 Minuten"""
    ip = get_client_ip(request)
    await check_rate_limit(f"ip:{ip}", "password_reset", max_requests=3, window_seconds=300)
    if email:
        await check_rate_limit(f"email:{email.lower()}", "password_reset", max_requests=3, window_seconds=300)


async def rate_limit_registration(request: Request):
    """Rate Limit für Registrierung: 3 pro Stunde pro IP"""
    ip = get_client_ip(request)
    await check_rate_limit(f"ip:{ip}", "registration", max_requests=3, window_seconds=3600)


async def rate_limit_contact(request: Request):
    """Rate Limit für Kontaktformular: 5 pro Stunde"""
    ip = get_client_ip(request)
    await check_rate_limit(f"ip:{ip}", "contact", max_requests=5, window_seconds=3600)
