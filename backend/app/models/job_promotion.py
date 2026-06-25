"""
Job-Promotions: protokolliert von Firmen ausgelöste Hervorhebungen ("feature")
und Booster-Aktivierungen ("boost"). Dient der Monatslimit-Prüfung und der
Admin-Übersicht (Admin postet Booster-Stellen manuell in Gruppen).

Premium-Firmen lösen Promotions im Rahmen ihres Monatskontingents aus
(source="premium"). Nicht-Premium-Firmen können einzelne Promotions per
Stripe-Einmalzahlung kaufen (source="paid", verknüpft über stripe_session_id).
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base, utc_now


class JobPromotion(Base):
    __tablename__ = "job_promotions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False, index=True)
    kind = Column(String(20), nullable=False)  # "feature" | "boost"
    # Herkunft: "premium" = im Rahmen des Abos (Monatslimit), "paid" = einmalig bezahlt (Stripe)
    source = Column(String(20), nullable=False, default="premium")
    # Stripe Checkout-Session der Einmalzahlung – dient der Idempotenz im Webhook (nur bei source="paid")
    stripe_session_id = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    job = relationship("JobPosting")
    company = relationship("Company")
