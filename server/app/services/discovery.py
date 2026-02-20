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
    try:
        r = requests.get(f"{base_url}/health", timeout=http_timeout_s)
        if r.status_code != 200:
            return None
        data = r.json()

        # Minimal validation: looks like your device health JSON
        if not isinstance(data, dict) or "checks" not in data:
            return None

        return {
            "id": f"{ip}:{port}",
            "name": f"EnvMon @ {ip}",
            "base_url": base_url,
            "last_seen_epoch": int(time.time()),
            "health": data,
        }
    except Exception:
        return None


def scan_network(cidr: str | None = None, port: int = 8000, max_workers: int = 64) -> list[dict]:
    cidr = cidr or default_cidr()
    net = ipaddress.ip_network(cidr, strict=False)

    local_ip = guess_local_ip()

    # Tight timeouts so scan is fast
    tcp_timeout = 0.15
    http_timeout = 0.6

    hosts = []
    for ip in net.hosts():
        s = str(ip)
        if local_ip and s == local_ip:
            continue
        hosts.append(s)

    found: list[dict] = []

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = {}

        for ip in hosts:
            futs[ex.submit(_tcp_port_open, ip, port, tcp_timeout)] = ip

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
