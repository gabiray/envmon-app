import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  
DEFAULT_SQLITE = f"sqlite:///{(BASE_DIR / 'data' / 'envmon.sqlite').as_posix()}"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE)