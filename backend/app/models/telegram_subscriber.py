from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from datetime import datetime

from app.core.database import Base
from app.models.applicant import PositionType


class TelegramSubscriber(Base):
    """Ein Telegram-Nutzer, der neue Stellen per Bot abonniert hat."""
    __tablename__ = "telegram_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    # Telegram chat_id (als String gespeichert, da es sehr große Zahlen sein können)
    chat_id = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    # Optionale Filter des Abonnenten
    position_type = Column(
        Enum(PositionType, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )  # None = alle Stellenarten
    location = Column(String, nullable=True)  # None = alle Orte (Teilstring-Match)

    # Zustand für den /start-Filter-Dialog: None | "awaiting_position" | "awaiting_location"
    state = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
