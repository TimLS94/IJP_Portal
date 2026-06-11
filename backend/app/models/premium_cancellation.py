from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime

from app.core.database import Base


class PremiumCancellation(Base):
    """Erfasst Kündigungen des Premium-Abos inkl. (optionalem) Stripe-Kündigungsgrund."""
    __tablename__ = "premium_cancellations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=True)
    company_name = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True, index=True)
    feedback = Column(String(100), nullable=True)   # Stripe cancellation_details.feedback (enum)
    comment = Column(Text, nullable=True)            # Freitext des Kunden
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
