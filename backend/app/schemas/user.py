from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: UserRole


class UserRegister(UserBase):
    """Schema für Registrierung ohne Role (Role wird vom Endpoint gesetzt)"""
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    portal: Optional[str] = None  # "jobon" | "ijp" (nur für Bewerber, sonst None)
    preferred_language: Optional[str] = None  # de|en|es|ru; None = noch nicht gewählt

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
