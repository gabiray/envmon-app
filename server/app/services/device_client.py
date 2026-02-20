import requests

from .device_store import load_store


class DeviceNotSelected(Exception):
    pass


def get_active_base_url() -> str:
    store = load_store()
    base = store.get("active_base_url")
    if not base:
        raise DeviceNotSelected("No active device selected. Select a device first.")
    return str(base).rstrip("/")


class DeviceClient:
    """
    Simple HTTP client for the currently selected device.
    Reads active_base_url from store by default.
    """

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or get_active_base_url()).rstrip("/")

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return self.base_url + path

    def get(self, path: str, timeout: float = 5.0) -> requests.Response:
        return requests.get(self._url(path), timeout=timeout)

    def post(self, path: str, payload: dict | None = None, timeout: float = 8.0) -> requests.Response:
        return requests.post(self._url(path), json=(payload or {}), timeout=timeout)


# Module-level helpers (compatibility with: from device_client import get, post)
def get(path: str, timeout: float = 5.0, base_url: str | None = None) -> requests.Response:
    return DeviceClient(base_url=base_url).get(path, timeout=timeout)


def post(path: str, payload: dict | None = None, timeout: float = 8.0, base_url: str | None = None) -> requests.Response:
    return DeviceClient(base_url=base_url).post(path, payload=payload, timeout=timeout)
