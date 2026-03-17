import os


class Config:
    # device URL default 
    DEFAULT_DEVICE_URL = os.getenv("DEFAULT_DEVICE_URL", "http://192.168.137.92:8000")
