"""Pure-ASGI middleware: baseline security response headers on every response."""

from __future__ import annotations

from typing import Any

_HEADERS: tuple[tuple[bytes, bytes], ...] = (
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
)
# A JSON API serves no documents, so nothing may load from it or frame it. Swagger UI
# under /docs pulls its scripts from a CDN and is the one exemption.
_CSP = (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'")
_CSP_EXEMPT_PREFIXES = ("/docs",)
# ponytail: no HSTS here — it belongs on the TLS terminator in front of the app.


class SecurityHeadersMiddleware:
    """Add the baseline headers unless the app already set one explicitly."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        extra = list(_HEADERS)
        if not scope.get("path", "").startswith(_CSP_EXEMPT_PREFIXES):
            extra.append(_CSP)

        async def send_wrapper(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                present = {k.lower() for k, _ in headers}
                headers.extend((k, v) for k, v in extra if k not in present)
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)
