from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from ..session import Base


class TelemetryPoint(Base):
    __tablename__ = "telemetry_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(String, ForeignKey("missions.mission_id"), nullable=False, index=True)

    ts_epoch = Column(Float, nullable=False, index=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    alt_m = Column(Float, nullable=True)

    fix_quality = Column(Integer, nullable=True)
    satellites = Column(Integer, nullable=True)
    hdop = Column(Float, nullable=True)

    temp_c = Column(Float, nullable=True)
    hum_pct = Column(Float, nullable=True)
    press_hpa = Column(Float, nullable=True)
    gas_ohms = Column(Float, nullable=True)

    mission = relationship("Mission", back_populates="telemetry")
    