from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..session import Base


class Mission(Base):
    __tablename__ = "missions"

    mission_id = Column(String, primary_key=True, index=True)
    mission_name = Column(String, nullable=True, index=True)

    device_uuid = Column(String, ForeignKey("devices.device_uuid"), nullable=False, index=True)

    profile_type = Column(String, nullable=True, index=True)
    profile_label = Column(String, nullable=True)

    created_at_epoch = Column(Integer, nullable=True)
    started_at_epoch = Column(Integer, nullable=True, index=True)
    ended_at_epoch = Column(Integer, nullable=True)

    status = Column(String, nullable=False)
    stop_reason = Column(String, nullable=True)

    profile_json = Column(Text, nullable=False)
    meta_json = Column(Text, nullable=False)

    location_mode = Column(String, nullable=True)
    start_lat = Column(Float, nullable=True)
    start_lon = Column(Float, nullable=True)
    start_alt_m = Column(Float, nullable=True)

    has_gps = Column(Integer, nullable=False, default=0)
    has_images = Column(Integer, nullable=False, default=0)

    raw_zip_path = Column(String, nullable=True)
    unpacked_path = Column(String, nullable=True)

    imported_at_epoch = Column(Integer, nullable=False)

    telemetry = relationship("TelemetryPoint", back_populates="mission", cascade="all, delete-orphan")
    images = relationship("MissionImage", back_populates="mission", cascade="all, delete-orphan")
    