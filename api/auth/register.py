from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, Optional


_API_DIR = os.path.dirname(os.path.dirname(__file__))
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

from _crypto import hash_password, validate_email_password  # noqa: E402
from _db import count_users, create_user, get_user_by_email  # noqa: E402

MAX_BODY_BYTES = 64_000


def _read_json(handler: BaseHTTPRequestHandler) -> Optional[Any]:
    length = int(handler.headers.get("content-length") or 0)
    if length <= 0:
        return None
    if length > MAX_BODY_BYTES:
        raise ValueError("Payload too large")
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


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


def _allow_signup() -> bool:
    # Allow if explicitly enabled OR bootstrapping first account (when no users exist).
    allow = (os.environ.get("ALLOW_SIGNUP") or "").lower() in {"1", "true", "yes"}
    if allow:
        return True
    try:
        return count_users() == 0
    except Exception:
        return False


class handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        if not os.environ.get("DATABASE_URL"):
            _send_json(self, 503, {"message": "DATABASE_URL is not configured"})
            return

        if not _allow_signup():
            _send_json(self, 403, {"message": "Sign up is disabled"})
            return

        content_type = (self.headers.get("content-type") or "").lower()
        if "application/json" not in content_type:
            _send_json(self, 415, {"message": "Content-Type must be application/json"})
            return

        try:
            payload = _read_json(self)
        except ValueError:
            _send_json(self, 413, {"message": "Payload too large"})
            return
        except Exception:
            _send_json(self, 400, {"message": "Invalid JSON payload"})
            return

        if not isinstance(payload, dict):
            _send_json(self, 400, {"message": "Invalid JSON payload"})
            return

        email = payload.get("email") or ""
        password = payload.get("password") or ""
        ok, email_n, err = validate_email_password(email, password)
        if not ok:
            _send_json(self, 400, {"message": err})
            return

        existing = get_user_by_email(email_n)
        if existing:
            _send_json(self, 409, {"message": "Email already registered"})
            return

        user = create_user(email_n, hash_password(password))
        _send_json(self, 201, {"user": {"id": user["id"], "email": user["email"]}})

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()
