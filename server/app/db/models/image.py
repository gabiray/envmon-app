from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from ..session import Base


class MissionImage(Base):
    __tablename__ = "mission_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(String, ForeignKey("missions.mission_id"), nullable=False, index=True)

    ts_epoch = Column(Float, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    alt_m = Column(Float, nullable=True)

    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)

    mission = relationship("Mission", back_populates="images")
    