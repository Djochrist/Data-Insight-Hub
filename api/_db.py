from __future__ import annotations

import json
import os
import ssl
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse


@dataclass(frozen=True)
class DbConfig:
    host: str
    port: int
    user: str
    password: str
    database: str
    sslmode: str


_SCHEMA_READY = False


def _parse_database_url(database_url: str) -> DbConfig:
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL must be a Postgres URL")

    if not parsed.hostname or not parsed.username or parsed.password is None:
        raise ValueError("DATABASE_URL missing host/username/password")

    database = (parsed.path or "").lstrip("/")
    if not database:
        raise ValueError("DATABASE_URL missing database name")

    qs = parse_qs(parsed.query or "")
    sslmode = (qs.get("sslmode") or ["require"])[0]

    return DbConfig(
        host=parsed.hostname,
        port=int(parsed.port or 5432),
        user=parsed.username,
        password=parsed.password,
        database=database,
        sslmode=sslmode,
    )


def _connect(config: DbConfig):
    try:
        import pg8000.native  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "pg8000 is not installed. Ensure Vercel installs api/requirements.txt."
        ) from exc

    ssl_context = None
    if config.sslmode not in {"disable", "allow", "prefer"}:
        ssl_context = ssl.create_default_context()

    return pg8000.native.Connection(
        user=config.user,
        password=config.password,
        host=config.host,
        port=config.port,
        database=config.database,
        ssl_context=ssl_context,
        timeout=10,
    )


def _ensure_schema(conn) -> None:
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return
    conn.run(
        """
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          window_start TIMESTAMPTZ NOT NULL,
          count INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS datasets (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          columns JSONB NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    conn.run("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS user_id BIGINT;")
    _SCHEMA_READY = True


def is_enabled() -> bool:
    return bool(os.environ.get("DATABASE_URL"))


def list_datasets(*, user_id: Optional[int]) -> List[Dict[str, Any]]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        if user_id is None:
            rows = conn.run(
                """
                SELECT id, name, columns::text, data::text, created_at
                FROM datasets
                ORDER BY id DESC;
                """
            )
        else:
            rows = conn.run(
                """
                SELECT id, name, columns::text, data::text, created_at
                FROM datasets
                WHERE user_id = :user_id
                ORDER BY id DESC;
                """,
                user_id=user_id,
            )
        result: List[Dict[str, Any]] = []
        for dataset_id, name, columns_text, data_text, created_at in rows:
            result.append(
                {
                    "id": int(dataset_id),
                    "name": name,
                    "columns": json.loads(columns_text),
                    "data": json.loads(data_text),
                    "createdAt": created_at.isoformat().replace("+00:00", "Z"),
                }
            )
        return result
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_dataset(dataset_id: int, *, user_id: Optional[int]) -> Optional[Dict[str, Any]]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        if user_id is None:
            rows = conn.run(
                """
                SELECT id, name, columns::text, data::text, created_at
                FROM datasets
                WHERE id = :id
                LIMIT 1;
                """,
                id=dataset_id,
            )
        else:
            rows = conn.run(
                """
                SELECT id, name, columns::text, data::text, created_at
                FROM datasets
                WHERE id = :id AND user_id = :user_id
                LIMIT 1;
                """,
                id=dataset_id,
                user_id=user_id,
            )
        if not rows:
            return None
        (dataset_id, name, columns_text, data_text, created_at) = rows[0]
        return {
            "id": int(dataset_id),
            "name": name,
            "columns": json.loads(columns_text),
            "data": json.loads(data_text),
            "createdAt": created_at.isoformat().replace("+00:00", "Z"),
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass


def create_dataset(name: str, columns: Any, data: Any, *, user_id: Optional[int]) -> Dict[str, Any]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        columns_text = json.dumps(columns, separators=(",", ":"), ensure_ascii=False)
        data_text = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        rows = conn.run(
            """
            INSERT INTO datasets (user_id, name, columns, data)
            VALUES (:user_id, :name, :columns::jsonb, :data::jsonb)
            RETURNING id, created_at;
            """,
            user_id=user_id,
            name=name,
            columns=columns_text,
            data=data_text,
        )
        dataset_id, created_at = rows[0]
        return {
            "id": int(dataset_id),
            "name": name,
            "columns": columns,
            "data": data,
            "createdAt": created_at.isoformat().replace("+00:00", "Z"),
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass


def delete_dataset(dataset_id: int) -> bool:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run(
            """
            DELETE FROM datasets
            WHERE id = :id
            RETURNING id;
            """,
            id=dataset_id,
        )
        return bool(rows)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def count_users() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run("SELECT COUNT(*) FROM users;")
        return int(rows[0][0]) if rows else 0
    finally:
        try:
            conn.close()
        except Exception:
            pass


def create_user(email: str, password_hash: str) -> Dict[str, Any]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run(
            """
            INSERT INTO users (email, password_hash)
            VALUES (:email, :password_hash)
            RETURNING id, email, created_at;
            """,
            email=email,
            password_hash=password_hash,
        )
        user_id, email, created_at = rows[0]
        return {"id": int(user_id), "email": email, "createdAt": created_at.isoformat().replace("+00:00", "Z")}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run(
            "SELECT id, email, password_hash, created_at FROM users WHERE email = :email LIMIT 1;",
            email=email,
        )
        if not rows:
            return None
        user_id, email, password_hash, created_at = rows[0]
        return {
            "id": int(user_id),
            "email": email,
            "passwordHash": password_hash,
            "createdAt": created_at.isoformat().replace("+00:00", "Z"),
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass


def create_session(*, user_id: int, token_hash: str, ttl_seconds: int) -> Dict[str, Any]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run(
            """
            INSERT INTO sessions (user_id, token_hash, expires_at)
            VALUES (:user_id, :token_hash, now() + (:ttl_seconds || ' seconds')::interval)
            RETURNING id, expires_at;
            """,
            user_id=user_id,
            token_hash=token_hash,
            ttl_seconds=ttl_seconds,
        )
        session_id, expires_at = rows[0]
        return {"id": int(session_id), "expiresAt": expires_at.isoformat().replace("+00:00", "Z")}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_user_by_token_hash(token_hash: str) -> Optional[Dict[str, Any]]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run(
            """
            SELECT u.id, u.email, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = :token_hash AND s.expires_at > now()
            LIMIT 1;
            """,
            token_hash=token_hash,
        )
        if not rows:
            return None
        user_id, email, created_at = rows[0]
        return {"id": int(user_id), "email": email, "createdAt": created_at.isoformat().replace("+00:00", "Z")}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def delete_session(token_hash: str) -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        conn.run("DELETE FROM sessions WHERE token_hash = :token_hash;", token_hash=token_hash)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def rate_limit(key: str, *, limit: int, window_seconds: int) -> Tuple[bool, int, int]:
    """
    Returns (allowed, remaining, reset_epoch_seconds).
    Uses a DB table for durability across serverless instances.
    """
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    config = _parse_database_url(database_url)
    conn = _connect(config)
    try:
        _ensure_schema(conn)
        rows = conn.run(
            """
            WITH upsert AS (
              INSERT INTO rate_limits (key, window_start, count)
              VALUES (:key, now(), 1)
              ON CONFLICT (key) DO UPDATE
              SET
                count = CASE
                  WHEN rate_limits.window_start < now() - (:window_seconds || ' seconds')::interval THEN 1
                  ELSE rate_limits.count + 1
                END,
                window_start = CASE
                  WHEN rate_limits.window_start < now() - (:window_seconds || ' seconds')::interval THEN now()
                  ELSE rate_limits.window_start
                END
              RETURNING window_start, count
            )
            SELECT
              count,
              EXTRACT(EPOCH FROM (window_start + (:window_seconds || ' seconds')::interval))::bigint AS reset_epoch
            FROM upsert;
            """,
            key=key,
            window_seconds=window_seconds,
        )
        count, reset_epoch = int(rows[0][0]), int(rows[0][1])
        remaining = max(0, limit - count)
        return (count <= limit), remaining, reset_epoch
    finally:
        try:
            conn.close()
        except Exception:
            pass
