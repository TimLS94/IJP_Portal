"""
Job-Promotions: protokolliert von Firmen ausgelöste Hervorhebungen ("feature")
und Booster-Aktivierungen ("boost"). Dient der Monatslimit-Prüfung und der
Admin-Übersicht (Admin postet Booster-Stellen manuell in Gruppen).
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
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    job = relationship("JobPosting")
    company = relationship("Company")
