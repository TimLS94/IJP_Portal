from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
import bcrypt
import re
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validiert ein Passwort gegen die Security Policy.
    Returns: (is_valid, error_message)
    """
    errors = []
    
    # Mindestlänge
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        errors.append(f"mindestens {settings.MIN_PASSWORD_LENGTH} Zeichen")
    
    # Zahl erforderlich
    if settings.REQUIRE_PASSWORD_NUMBER and not re.search(r'\d', password):
        errors.append("mindestens eine Zahl")
    
    # Sonderzeichen erforderlich (optional)
    if settings.REQUIRE_PASSWORD_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("mindestens ein Sonderzeichen")
    
    if errors:
        return False, f"Passwort muss {', '.join(errors)} enthalten"
    
    return True, ""


def check_password_strength(password: str) -> None:
    """Wirft HTTPException wenn Passwort nicht den Anforderungen entspricht"""
    is_valid, error_msg = validate_password(password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Überprüft das Passwort gegen den Hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Erstellt einen Passwort-Hash"""
    return bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Erstellt einen JWT Access Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Dekodiert einen JWT Token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Holt den aktuellen Benutzer aus dem Token"""
    from app.models.user import User
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungültige Anmeldedaten",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # SICHERHEIT: Betrieb-Portal-Tokens sind KEINE Nutzer-Tokens und dürfen keine
    # regulären Endpunkte ansprechen (strikte Trennung der Zugangsarten).
    if payload.get("scope") == "betrieb_portal":
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id_int).first()
    if user is None:
        raise credentials_exception

    # SICHERHEIT: Deaktivierte Konten dürfen NICHTS tun – nicht nur der Login wird
    # gesperrt. Sonst bleibt ein einmal (z.B. via Invite-Token) ausgestellter JWT
    # bis zu 30 Tage gültig, auch nachdem ein Admin das Konto auf inaktiv gesetzt hat.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto ist deaktiviert",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_active_user(current_user = Depends(get_current_user)):
    """Stellt sicher, dass der Benutzer aktiv ist"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inaktiver Benutzer")
    return current_user


# ==================== BETRIEB-PORTAL (passwortgeschützter Link) ====================

def create_betrieb_token(betrieb_id: int, expires_hours: int = 12) -> str:
    """Erstellt einen kurzlebigen, gescopeten Token für den Betrieb-Portal-Zugang.
    Bewusst getrennt von Nutzer-Tokens (scope='betrieb_portal', sub='betrieb:<id>')."""
    return create_access_token(
        data={"sub": f"betrieb:{betrieb_id}", "scope": "betrieb_portal"},
        expires_delta=timedelta(hours=expires_hours),
    )


async def get_current_betrieb(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> int:
    """Validiert einen Betrieb-Portal-Token und gibt die betrieb_id zurück.

    Prüft scope + Format und dass der Zugriffslink noch existiert und aktiv ist
    (ein deaktivierter Link sperrt bestehende Tokens sofort)."""
    from app.models.betrieb_access import BetriebAccessLink

    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungültiger oder abgelaufener Zugang",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None or payload.get("scope") != "betrieb_portal":
        raise cred_exc

    sub = payload.get("sub") or ""
    if not isinstance(sub, str) or not sub.startswith("betrieb:"):
        raise cred_exc
    try:
        betrieb_id = int(sub.split(":", 1)[1])
    except (ValueError, IndexError):
        raise cred_exc

    link = db.query(BetriebAccessLink).filter(
        BetriebAccessLink.betrieb_id == betrieb_id,
        BetriebAccessLink.is_active == True,
    ).first()
    if not link:
        raise cred_exc

    return betrieb_id
