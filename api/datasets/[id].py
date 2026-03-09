from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, Optional, Tuple


_API_DIR = os.path.dirname(os.path.dirname(__file__))
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

from _datasets_repo import delete_dataset, get_dataset  # noqa: E402
from _rate_limit import check as check_rate_limit  # noqa: E402


def _parse_id(path: str) -> Optional[int]:
    # Expected: /api/datasets/<id>
    parts = [p for p in path.split("?")[0].split("/") if p]
    if not parts:
        return None
    try:
        return int(parts[-1])
    except Exception:
        return None


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


ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN") or ""


def _is_admin(handler: BaseHTTPRequestHandler) -> bool:
    if not ADMIN_TOKEN:
        return True
    auth = (handler.headers.get("authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        return token == ADMIN_TOKEN
    return False


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        allowed, rl_headers = _rate_limit(self, "read")
        if not allowed:
            _send_json(self, 429, {"message": "Too Many Requests"}, extra_headers=rl_headers)
            return
        dataset_id = _parse_id(self.path)
        if dataset_id is None:
            _send_json(self, 404, {"message": "Dataset not found"}, extra_headers=rl_headers)
            return
        dataset = get_dataset(dataset_id, user_id=None)
        if not dataset:
            _send_json(self, 404, {"message": "Dataset not found"}, extra_headers=rl_headers)
            return
        _send_json(self, 200, dataset, extra_headers=rl_headers)

    def do_DELETE(self) -> None:  # noqa: N802
        allowed, rl_headers = _rate_limit(self, "write")
        if not allowed:
            _send_json(self, 429, {"message": "Too Many Requests"}, extra_headers=rl_headers)
            return
        if not _is_admin(self):
            _send_json(self, 401, {"message": "Unauthorized"}, extra_headers=rl_headers)
            return
        dataset_id = _parse_id(self.path)
        if dataset_id is None:
            _send_json(self, 404, {"message": "Dataset not found"}, extra_headers=rl_headers)
            return
        deleted = delete_dataset(dataset_id)
        if not deleted:
            _send_json(self, 404, {"message": "Dataset not found"}, extra_headers=rl_headers)
            return

        self.send_response(204)
        self.send_header("Cache-Control", "no-store")
        for k, v in rl_headers.items():
            self.send_header(k, v)
        self.end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        _send_status(self, 204)

    def do_POST(self) -> None:  # noqa: N802
        _send_json(self, 405, {"message": "Method Not Allowed"})

    def do_PUT(self) -> None:  # noqa: N802
        _send_json(self, 405, {"message": "Method Not Allowed"})

    def do_PATCH(self) -> None:  # noqa: N802
        _send_json(self, 405, {"message": "Method Not Allowed"})
