from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from typing import Any, Optional


_API_DIR = os.path.dirname(os.path.dirname(__file__))
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

from _crypto import sha256_hex  # noqa: E402
from _db import delete_session  # noqa: E402


def _send_json(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("Referrer-Policy", "no-referrer")
    handler.send_header("X-Frame-Options", "DENY")
    handler.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
    handler.end_headers()
    handler.wfile.write(body)


def _token(handler: BaseHTTPRequestHandler) -> Optional[str]:
    auth = handler.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    return None


class handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        if not os.environ.get("DATABASE_URL"):
            _send_json(self, 200, {"ok": True})
            return
        token = _token(self)
        if not token:
            _send_json(self, 200, {"ok": True})
            return
        try:
            delete_session(sha256_hex(token))
        except Exception:
            pass
        _send_json(self, 200, {"ok": True})

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()
