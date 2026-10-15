from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base, utc_now


class SiteMetric(Base):
    """Einfacher Zaehler fuer Seitenaufrufe / Funktionsnutzung (leichtgewichtiges
    In-House-Tracking zusaetzlich zu Google Analytics). Ein Datensatz je Event-Key."""
    __tablename__ = "site_metrics"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
