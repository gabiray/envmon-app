import requests
from .device_store import load_store, get_base_url_for


class DeviceNotSelected(Exception):
    pass


def get_active_base_url() -> str:
    store = load_store()
    du = store.get("active_device_uuid")
    if not du:
        raise DeviceNotSelected("No active device selected. Select a device first.")
    base = get_base_url_for(du)
    if not base:
        raise DeviceNotSelected("Active device not found in store. Run scan again.")
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

    def post(
        self,
        path: str,
        payload: dict | None = None,
        timeout: float = 8.0,
    ) -> requests.Response:
        return requests.post(self._url(path), json=(payload or {}), timeout=timeout)

    def patch(
        self,
        path: str,
        payload: dict | None = None,
        timeout: float = 8.0,
    ) -> requests.Response:
        return requests.patch(self._url(path), json=(payload or {}), timeout=timeout)

    def delete(self, path: str, timeout: float = 8.0) -> requests.Response:
        return requests.delete(self._url(path), timeout=timeout)


def get(path: str, timeout: float = 5.0, base_url: str | None = None) -> requests.Response:
    return DeviceClient(base_url=base_url).get(path, timeout=timeout)


def post(
    path: str,
    payload: dict | None = None,
    timeout: float = 8.0,
    base_url: str | None = None,
) -> requests.Response:
    return DeviceClient(base_url=base_url).post(path, payload=payload, timeout=timeout)


def patch(
    path: str,
    payload: dict | None = None,
    timeout: float = 8.0,
    base_url: str | None = None,
) -> requests.Response:
    return DeviceClient(base_url=base_url).patch(path, payload=payload, timeout=timeout)


def delete(path: str, timeout: float = 8.0, base_url: str | None = None) -> requests.Response:
    return DeviceClient(base_url=base_url).delete(path, timeout=timeout)
