"""
Notification Model - Benachrichtigungen für Bewerber über neue passende Stellen
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Notification(Base):
    """Benachrichtigung für Bewerber"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Typ der Benachrichtigung
    type = Column(String(50), nullable=False)  # new_job, application_update, interview, etc.
    
    # Referenz auf das Objekt (z.B. Job-ID)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)  # job, application, etc.
    
    # Inhalt
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)

    # i18n: key-based translation (e.g. "notifications.documentRequest")
    notification_key = Column(String(100), nullable=True)
    notification_params = Column(Text, nullable=True)  # JSON string with interpolation params
    
    # Status
    is_read = Column(Boolean, default=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", backref="notifications")
