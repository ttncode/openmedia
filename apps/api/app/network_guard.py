import ipaddress
import socket
from collections.abc import Callable
from urllib.parse import urlsplit

from .errors import ApiError

Resolver = Callable[[str], list[str]]


def resolve_host(host: str) -> list[str]:
    return sorted({str(info[4][0]) for info in socket.getaddrinfo(host, None)})


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%", 1)[0])
    mapped = ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) else None
    return (mapped or ip).is_global


def ensure_public_url(url: str, resolver: Resolver = resolve_host) -> None:
    host = urlsplit(url).hostname
    if not host:
        raise ApiError(400, "invalid_url", "The link has no host name.")
    try:
        addresses = resolver(host)
    except OSError as error:
        raise ApiError(400, "invalid_url", f"Could not resolve {host}.") from error
    if not addresses or not all(_is_public(address) for address in addresses):
        raise ApiError(
            400,
            "private_network",
            "Links to private or local network addresses are not allowed.",
        )
