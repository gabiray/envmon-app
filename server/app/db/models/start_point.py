import time
import uuid
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..session import Base


class StartPoint(Base):
    __tablename__ = "start_points"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_uuid = Column(String, ForeignKey("devices.device_uuid"), nullable=False, index=True)

    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    alt_m = Column(Float, nullable=True)

    source = Column(String, nullable=False, default="manual")

    tags_json = Column(Text, nullable=False, default="[]")

    created_at_epoch = Column(Integer, nullable=False, default=lambda: int(time.time()))
    updated_at_epoch = Column(Integer, nullable=False, default=lambda: int(time.time()))

    device = relationship("Device")
    