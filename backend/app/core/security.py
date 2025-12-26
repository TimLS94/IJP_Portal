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
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(current_user = Depends(get_current_user)):
    """Stellt sicher, dass der Benutzer aktiv ist"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inaktiver Benutzer")
    return current_user
