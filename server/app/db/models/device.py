from sqlalchemy import Column, String, Integer
from ..session import Base


class Device(Base):
    __tablename__ = "devices"

    device_uuid = Column(String, primary_key=True, index=True)
    nickname = Column(String, nullable=True)
    hostname = Column(String, nullable=True)
    first_seen_epoch = Column(Integer, nullable=False)
    last_seen_epoch = Column(Integer, nullable=False)
    last_base_url = Column(String, nullable=True)
    