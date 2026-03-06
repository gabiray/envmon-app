import ipaddress
import socket
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests


def guess_local_ip() -> str | None:
    # Try UDP trick (no packets are actually sent)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    # Fallback: gethostbyname_ex
    try:
        host = socket.gethostname()
        ips = socket.gethostbyname_ex(host)[2]
        for ip in ips:
            if ip and not ip.startswith("127."):
                return ip
    except Exception:
        pass

    return None


def default_cidr() -> str:
    ip = guess_local_ip()
    if not ip:
        # Safe fallback: typical hotspot subnet
        return "192.168.137.0/24"
    # Common assumption: /24 for hotspot/LAN
    net = ipaddress.ip_network(f"{ip}/24", strict=False)
    return str(net)


def _tcp_port_open(ip: str, port: int, timeout_s: float) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=timeout_s):
            return True
    except Exception:
        return False


def _probe(ip: str, port: int, http_timeout_s: float) -> dict | None:
    base_url = f"http://{ip}:{port}"

    t_info = (1.0, 3.0)  # (connect_timeout, read_timeout)

    try:
        ri = requests.get(f"{base_url}/info", timeout=t_info)
        if ri.status_code != 200:
            return None

        info = ri.json() or {}
        device_uuid = str(info.get("device_uuid") or "").strip()
        if not device_uuid:
            return None

        name = (info.get("hostname") or info.get("name") or f"EnvMon @ {ip}")

        return {
            "device_uuid": device_uuid,
            "name": name,
            "base_url": base_url,
            "last_seen_epoch": int(time.time()),
            "info": info,
        }
    except Exception:
        return None


def scan_network(cidr: str | None = None, port: int = 8000, max_workers: int = 64) -> list[dict]:
    tcp_timeout = 0.6
    http_timeout = 3.0

    if cidr and "/" not in str(cidr):
        ip = str(cidr).strip()
        try:
            ipaddress.ip_address(ip)  # validate
        except Exception:
            return []

        if _tcp_port_open(ip, port, tcp_timeout):
            d = _probe(ip, port, http_timeout)
            return [d] if d else []
        return []

    cidr = cidr or default_cidr()
    net = ipaddress.ip_network(cidr, strict=False)

    local_ip = guess_local_ip()

    hosts = []
    for ip in net.hosts():
        s = str(ip)
        if local_ip and s == local_ip:
            continue
        hosts.append(s)

    found: list[dict] = []

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = {ex.submit(_tcp_port_open, ip, port, tcp_timeout): ip for ip in hosts}

        open_ips = []
        for fut in as_completed(futs):
            ip = futs[fut]
            try:
                if fut.result():
                    open_ips.append(ip)
            except Exception:
                pass

        futs2 = {ex.submit(_probe, ip, port, http_timeout): ip for ip in open_ips}
        for fut in as_completed(futs2):
            try:
                d = fut.result()
                if d:
                    found.append(d)
            except Exception:
                pass

    found.sort(key=lambda x: x.get("last_seen_epoch", 0), reverse=True)
    return found
