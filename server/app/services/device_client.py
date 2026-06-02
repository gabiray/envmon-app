import requests
from .device_store import load_store, get_base_url_for


class DeviceNotSelected(Exception):
    pass


class DeviceIdentityMismatch(Exception):
    def __init__(self, expected_uuid: str, actual_uuid: str | None, base_url: str):
        self.expected_uuid = expected_uuid
        self.actual_uuid = actual_uuid
        self.base_url = base_url
        super().__init__("Device UUID mismatch")

    def to_dict(self) -> dict:
        return {
            "ok": False,
            "error": "Device UUID mismatch",
            "connection_state": "uuid_mismatch",
            "expected_uuid": self.expected_uuid,
            "actual_uuid": self.actual_uuid,
            "base_url": self.base_url,
        }


class DeviceUnreachable(Exception):
    def __init__(self, base_url: str, detail: str):
        self.base_url = base_url
        self.detail = detail
        super().__init__(detail)


def _log_device_event(event: str, details: dict | None = None) -> None:
    payload = {"event": event}
    if details:
        payload.update(details)
    print("[device_client]", payload)


def _active_device_context() -> tuple[str, str]:
    store = load_store()
    du = store.get("active_device_uuid")
    if not du:
        _log_device_event("no_active_device")
        raise DeviceNotSelected("No active device selected. Select a device first.")

    base = get_base_url_for(du)
    if not base:
        _log_device_event("no_active_device", {"device_uuid": du, "reason": "missing_base_url"})
        raise DeviceNotSelected("Active device not found in store. Run scan again.")

    base_url = str(base).rstrip("/")
    duplicate_count = sum(
        1
        for d in store.get("devices", [])
        if str(d.get("base_url") or "").rstrip("/") == base_url
    )
    if duplicate_count > 1:
        _log_device_event(
            "duplicate_base_url",
            {
                "device_uuid": du,
                "base_url": base_url,
                "duplicate_count": duplicate_count,
            },
        )

    return du, base_url


def get_active_base_url() -> str:
    _, base_url = _active_device_context()
    return base_url


class DeviceClient:
    """
    Simple HTTP client for the currently selected device.
    Reads active_base_url from store by default.
    """

    def __init__(
        self,
        base_url: str | None = None,
        expected_uuid: str | None = None,
        validate_identity: bool | None = None,
    ):
        if base_url is None:
            active_uuid, active_base_url = _active_device_context()
            self.active_device_uuid = active_uuid
            self.base_url = active_base_url
            self.validate_identity = True if validate_identity is None else validate_identity
        else:
            self.active_device_uuid = expected_uuid
            self.base_url = str(base_url).rstrip("/")
            self.validate_identity = bool(expected_uuid) if validate_identity is None else validate_identity

        self.info: dict | None = None
        self.actual_device_uuid: str | None = None
        self._identity_validated = False

        if self.validate_identity:
            self.validate_active_identity()

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return self.base_url + path

    def validate_active_identity(self) -> dict:
        if self._identity_validated:
            return self.info or {}

        expected_uuid = str(self.active_device_uuid or "").strip()
        if not expected_uuid:
            raise DeviceNotSelected("No active device selected. Select a device first.")

        try:
            response = requests.get(self._url("/info"), timeout=(1.0, 3.0))
            response.raise_for_status()
            info = response.json() or {}
        except Exception as e:
            _log_device_event(
                "device_unreachable",
                {
                    "device_uuid": expected_uuid,
                    "base_url": self.base_url,
                    "error": str(e),
                },
            )
            raise DeviceUnreachable(self.base_url, f"Device unreachable: {e}")

        actual_uuid = str(info.get("device_uuid") or "").strip()
        self.info = info
        self.actual_device_uuid = actual_uuid or None

        if actual_uuid != expected_uuid:
            _log_device_event(
                "uuid_mismatch",
                {
                    "expected_uuid": expected_uuid,
                    "actual_uuid": actual_uuid or None,
                    "base_url": self.base_url,
                },
            )
            raise DeviceIdentityMismatch(
                expected_uuid=expected_uuid,
                actual_uuid=actual_uuid or None,
                base_url=self.base_url,
            )

        self._identity_validated = True
        _log_device_event(
            "online_uuid_match",
            {
                "device_uuid": expected_uuid,
                "base_url": self.base_url,
            },
        )
        return info

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


def get(
    path: str,
    timeout: float = 5.0,
    base_url: str | None = None,
    expected_uuid: str | None = None,
) -> requests.Response:
    return DeviceClient(base_url=base_url, expected_uuid=expected_uuid).get(path, timeout=timeout)


def post(
    path: str,
    payload: dict | None = None,
    timeout: float = 8.0,
    base_url: str | None = None,
    expected_uuid: str | None = None,
) -> requests.Response:
    return DeviceClient(base_url=base_url, expected_uuid=expected_uuid).post(path, payload=payload, timeout=timeout)


def patch(
    path: str,
    payload: dict | None = None,
    timeout: float = 8.0,
    base_url: str | None = None,
    expected_uuid: str | None = None,
) -> requests.Response:
    return DeviceClient(base_url=base_url, expected_uuid=expected_uuid).patch(path, payload=payload, timeout=timeout)


def delete(
    path: str,
    timeout: float = 8.0,
    base_url: str | None = None,
    expected_uuid: str | None = None,
) -> requests.Response:
    return DeviceClient(base_url=base_url, expected_uuid=expected_uuid).delete(path, timeout=timeout)
