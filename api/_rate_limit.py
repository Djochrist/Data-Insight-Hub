from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from time import time
from typing import Dict, Tuple

import os


@dataclass
class Counter:
    count: int
    reset_at: float


_lock = Lock()
_counters: Dict[str, Counter] = {}

WINDOW_SECONDS = 60
READ_LIMIT = 120
WRITE_LIMIT = 30


def _now() -> float:
    return time()


def check(ip: str, kind: str) -> Tuple[bool, Dict[str, str]]:
    limit = READ_LIMIT if kind == "read" else WRITE_LIMIT
    key = f"{kind}:{ip}"
    now = _now()

    if os.environ.get("DATABASE_URL"):
        try:
            from _db import rate_limit as db_rate_limit  # local import

            allowed, remaining, reset_epoch = db_rate_limit(
                key,
                limit=limit,
                window_seconds=WINDOW_SECONDS,
            )
            headers = {
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_epoch),
            }
            return allowed, headers
        except Exception:
            # fall back to memory
            pass

    with _lock:
        # Best-effort cleanup
        if len(_counters) > 10_000:
            for k, v in list(_counters.items()):
                if now >= v.reset_at:
                    _counters.pop(k, None)

        c = _counters.get(key)
        if not c or now >= c.reset_at:
            c = Counter(count=0, reset_at=now + WINDOW_SECONDS)
            _counters[key] = c

        c.count += 1
        remaining = max(0, limit - c.count)
        headers = {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(c.reset_at)),
        }
        return (c.count <= limit), headers
