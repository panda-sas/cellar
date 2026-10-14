from __future__ import annotations

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from cellar.interface.middleware.security_headers import SecurityHeadersMiddleware


def _client() -> TestClient:
    async def ok(request):
        return JSONResponse({"ok": True})

    app = Starlette(routes=[Route("/api/x", ok), Route("/docs", ok)])
    app.add_middleware(SecurityHeadersMiddleware)
    return TestClient(app)


def test_api_responses_carry_baseline_headers_and_csp() -> None:
    res = _client().get("/api/x")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers["permissions-policy"]
    assert res.headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'"


def test_docs_is_exempt_from_csp_only() -> None:
    res = _client().get("/docs")
    assert "content-security-policy" not in res.headers
    assert res.headers["x-frame-options"] == "DENY"
