from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from typing import Tuple


def new_token() -> str:
    return secrets.token_urlsafe(32)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64d(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def hash_password(password: str, *, iterations: int = 210_000) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=32)
    return f"pbkdf2_sha256${iterations}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iters_s, salt_s, hash_s = stored.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iters_s)
        salt = _b64d(salt_s)
        expected = _b64d(hash_s)
    except Exception:
        return False

    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=len(expected))
    return hmac.compare_digest(digest, expected)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email_password(email: str, password: str) -> Tuple[bool, str, str]:
    email_n = normalize_email(email)
    if not email_n or "@" not in email_n or len(email_n) > 254:
        return False, "", "Invalid email"
    if not isinstance(password, str) or len(password) < 10:
        return False, email_n, "Password must be at least 10 characters"
    if len(password) > 200:
        return False, email_n, "Password is too long"
    return True, email_n, ""

