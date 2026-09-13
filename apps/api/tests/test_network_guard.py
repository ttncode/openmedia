from collections.abc import Callable

import pytest

from app.errors import ApiError
from app.network_guard import ensure_public_url


def resolver_for(*addresses: str) -> Callable[[str], list[str]]:
    return lambda host: list(addresses)


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "10.1.2.3",
        "192.168.1.20",
        "169.254.169.254",
        "::1",
        "fd00::1",
        "::ffff:10.0.0.1",
        "0.0.0.0",
    ],
)
def test_private_addresses_are_blocked(address: str) -> None:
    with pytest.raises(ApiError) as caught:
        ensure_public_url("https://internal.example/x", resolver_for(address))
    assert caught.value.code == "private_network"


def test_any_private_address_blocks_the_host() -> None:
    with pytest.raises(ApiError):
        ensure_public_url(
            "https://mixed.example", resolver_for("142.250.1.1", "10.0.0.5")
        )


def test_public_addresses_pass() -> None:
    ensure_public_url(
        "https://www.youtube.com/watch?v=a",
        resolver_for("142.250.190.14", "2607:f8b0:4005:80b::200e"),
    )


def test_unresolvable_host_is_invalid() -> None:
    def failing(host: str) -> list[str]:
        raise OSError("no such host")

    with pytest.raises(ApiError) as caught:
        ensure_public_url("https://nope.invalid", failing)
    assert caught.value.code == "invalid_url"
