import time
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..session import Base


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)

    mission_id = Column(
        String,
        ForeignKey("missions.mission_id"),
        nullable=False,
        index=True,
    )

    analysis_type = Column(String, nullable=False, default="mission_summary")
    model = Column(String, nullable=False)

    input_hash = Column(String, nullable=False, index=True)

    input_summary_json = Column(Text, nullable=False)
    result_json = Column(Text, nullable=False)

    created_at_epoch = Column(
        Integer,
        nullable=False,
        default=lambda: int(time.time()),
    )

    updated_at_epoch = Column(
        Integer,
        nullable=False,
        default=lambda: int(time.time()),
    )

    mission = relationship("Mission")
    