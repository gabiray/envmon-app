import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    # device URL default 
    DEFAULT_DEVICE_URL = os.getenv("DEFAULT_DEVICE_URL", "http://192.168.137.92:8000")
    # polling fallback (sec)
    POLL_SECONDS = float(os.getenv("POLL_SECONDS", "2"))
