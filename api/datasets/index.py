from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, Optional, Tuple


_API_DIR = os.path.dirname(os.path.dirname(__file__))
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

from _datasets_repo import create_dataset, list_datasets  # noqa: E402
from _rate_limit import check as check_rate_limit  # noqa: E402

MAX_BODY_BYTES = 4_000_000
MAX_DATASETS_PER_USER = int(os.environ.get("MAX_DATASETS_PER_USER") or "50")
PUBLIC_READ = (os.environ.get("PUBLIC_READ") or "").lower() in {"1", "true", "yes"}


def _read_json(handler: BaseHTTPRequestHandler) -> Optional[Any]:
    length = int(handler.headers.get("content-length") or 0)
    if length <= 0:
        return None
    if length > MAX_BODY_BYTES:
        raise ValueError("Payload too large")
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))

def _send_json(
    handler: BaseHTTPRequestHandler,
    status: int,
    payload: Any,
    extra_headers: Optional[Dict[str, str]] = None,
) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("Referrer-Policy", "no-referrer")
    handler.send_header("X-Frame-Options", "DENY")
    handler.send_header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
    if extra_headers:
        for k, v in extra_headers.items():
            handler.send_header(k, v)
    handler.end_headers()
    handler.wfile.write(body)


def _send_status(handler: BaseHTTPRequestHandler, status: int) -> None:
    handler.send_response(status)
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()


def _client_ip(handler: BaseHTTPRequestHandler) -> str:
    fwd = handler.headers.get("x-forwarded-for") or ""
    if fwd:
        return fwd.split(",")[0].strip() or "unknown"
    return (handler.client_address[0] if handler.client_address else "unknown") or "unknown"


def _rate_limit(handler: BaseHTTPRequestHandler, kind: str) -> Tuple[bool, Dict[str, str]]:
    ip = _client_ip(handler)
    allowed, headers = check_rate_limit(ip, kind)
    return allowed, headers


def _token(handler: BaseHTTPRequestHandler) -> Optional[str]:
    auth = handler.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    return None


def _user(handler: BaseHTTPRequestHandler) -> Optional[Dict[str, Any]]:
    token = _token(handler)
    if not token:
        return None
    try:
        from _crypto import sha256_hex  # local import
        from _db import get_user_by_token_hash

        return get_user_by_token_hash(sha256_hex(token))
    except Exception:
        return None


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        allowed, rl_headers = _rate_limit(self, "read")
        if not allowed:
            _send_json(self, 429, {"message": "Too Many Requests"}, extra_headers=rl_headers)
            return
        user = _user(self)
        if not PUBLIC_READ and not user:
            _send_json(self, 401, {"message": "Unauthorized"}, extra_headers=rl_headers)
            return
        _send_json(self, 200, list_datasets(user_id=(user["id"] if user else None)), extra_headers=rl_headers)

    def do_POST(self) -> None:  # noqa: N802
        allowed, rl_headers = _rate_limit(self, "write")
        if not allowed:
            _send_json(self, 429, {"message": "Too Many Requests"}, extra_headers=rl_headers)
            return

        user = _user(self)
        if not user:
            _send_json(self, 401, {"message": "Unauthorized"}, extra_headers=rl_headers)
            return

        content_type = (self.headers.get("content-type") or "").lower()
        if "application/json" not in content_type:
            _send_json(self, 415, {"message": "Content-Type must be application/json"}, extra_headers=rl_headers)
            return

        try:
            payload = _read_json(self)
        except ValueError:
            _send_json(self, 413, {"message": "Payload too large"}, extra_headers=rl_headers)
            return
        except Exception:
            _send_json(self, 400, {"message": "Invalid JSON payload", "field": ""}, extra_headers=rl_headers)
            return

        created, error = create_dataset(
            payload,
            user_id=user["id"],
            max_datasets_per_user=MAX_DATASETS_PER_USER,
        )
        if error:
            status = 401 if error.get("message") == "Unauthorized" else 400
            _send_json(self, status, error, extra_headers=rl_headers)
            return

        _send_json(self, 201, created, extra_headers=rl_headers)

    def do_OPTIONS(self) -> None:  # noqa: N802
        _send_status(self, 204)

    def do_DELETE(self) -> None:  # noqa: N802
        _send_json(self, 405, {"message": "Method Not Allowed"})

    def do_PUT(self) -> None:  # noqa: N802
        _send_json(self, 405, {"message": "Method Not Allowed"})

    def do_PATCH(self) -> None:  # noqa: N802
        _send_json(self, 405, {"message": "Method Not Allowed"})
