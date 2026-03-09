from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class Dataset:
    id: int
    name: str
    columns: List[Dict[str, Any]]
    data: List[Dict[str, Any]]
    createdAt: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "columns": self.columns,
            "data": self.data,
            "createdAt": self.createdAt,
        }


_lock = Lock()
_datasets: Dict[int, Dataset] = {}
_next_id = 1

MAX_NAME_CHARS = 120
MAX_COLUMNS = 60
MAX_ROWS = 5000
MAX_CELL_CHARS = 4000
FORBIDDEN_KEYS = {"__proto__", "constructor", "prototype"}


def seed_if_empty() -> None:
    global _next_id
    with _lock:
        if _datasets:
            return
        sample = Dataset(
            id=_next_id,
            name="Sample Analytics Data",
            columns=[
                {"key": "month", "name": "Month", "type": "string"},
                {"key": "revenue", "name": "Revenue ($)", "type": "number"},
                {"key": "users", "name": "Active Users", "type": "number"},
                {"key": "bounceRate", "name": "Bounce Rate (%)", "type": "number"},
            ],
            data=[
                {"month": "Jan", "revenue": 10500, "users": 1200, "bounceRate": 45},
                {"month": "Feb", "revenue": 12000, "users": 1400, "bounceRate": 42},
                {"month": "Mar", "revenue": 11000, "users": 1350, "bounceRate": 48},
                {"month": "Apr", "revenue": 15000, "users": 1800, "bounceRate": 35},
                {"month": "May", "revenue": 16500, "users": 2100, "bounceRate": 32},
                {"month": "Jun", "revenue": 19000, "users": 2400, "bounceRate": 28},
            ],
            createdAt=_now_iso(),
        )
        _datasets[sample.id] = sample
        _next_id += 1


def list_datasets() -> List[Dict[str, Any]]:
    seed_if_empty()
    with _lock:
        return [d.to_dict() for d in _datasets.values()]


def get_dataset(dataset_id: int) -> Optional[Dict[str, Any]]:
    seed_if_empty()
    with _lock:
        d = _datasets.get(dataset_id)
        return d.to_dict() if d else None


def delete_dataset(dataset_id: int) -> bool:
    seed_if_empty()
    with _lock:
        return _datasets.pop(dataset_id, None) is not None


def validate_insert(payload: Any) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, str]]]:
    if not isinstance(payload, dict):
        return None, {"message": "Invalid JSON payload", "field": ""}
    name = payload.get("name")
    columns = payload.get("columns")
    data = payload.get("data")

    if not isinstance(name, str) or not name.strip():
        return None, {"message": "Name is required", "field": "name"}
    name = name.strip()
    if len(name) > MAX_NAME_CHARS:
        return None, {"message": "Name is too long", "field": "name"}

    if not isinstance(columns, list):
        return None, {"message": "Columns must be an array", "field": "columns"}
    if len(columns) == 0:
        return None, {"message": "Columns are required", "field": "columns"}
    if len(columns) > MAX_COLUMNS:
        return None, {"message": "Too many columns", "field": "columns"}

    seen_keys: set[str] = set()
    for i, col in enumerate(columns):
        if not isinstance(col, dict):
            return None, {"message": "Invalid column entry", "field": f"columns.{i}"}
        key = col.get("key")
        if not isinstance(key, str) or not key:
            return None, {"message": "Column key is required", "field": f"columns.{i}.key"}
        if key in FORBIDDEN_KEYS:
            return None, {"message": "Invalid column key", "field": f"columns.{i}.key"}
        if key in seen_keys:
            return None, {"message": "Duplicate column key", "field": f"columns.{i}.key"}
        seen_keys.add(key)

        col_name = col.get("name")
        if not isinstance(col_name, str) or not col_name:
            return None, {"message": "Column name is required", "field": f"columns.{i}.name"}
        col_type = col.get("type")
        if not isinstance(col_type, str) or not col_type:
            return None, {"message": "Column type is required", "field": f"columns.{i}.type"}

        if len(key) > 80:
            return None, {"message": "Column key is too long", "field": f"columns.{i}.key"}
        if len(col_name) > 120:
            return None, {"message": "Column name is too long", "field": f"columns.{i}.name"}
        if len(col_type) > 40:
            return None, {"message": "Column type is too long", "field": f"columns.{i}.type"}

    if not isinstance(data, list):
        return None, {"message": "Data must be an array of records", "field": "data"}
    if len(data) > MAX_ROWS:
        return None, {"message": "Too many rows", "field": "data"}

    for i, row in enumerate(data):
        if not isinstance(row, dict):
            return None, {"message": "Invalid data row", "field": f"data.{i}"}
        for k, v in row.items():
            if k in FORBIDDEN_KEYS:
                return None, {"message": "Invalid data key", "field": f"data.{i}.{k}"}
            if not isinstance(k, str):
                return None, {"message": "Invalid data key", "field": f"data.{i}"}
            if len(k) > 80:
                return None, {"message": "Data key is too long", "field": f"data.{i}.{k}"}
            if isinstance(v, str) and len(v) > MAX_CELL_CHARS:
                return None, {"message": "Cell value is too long", "field": f"data.{i}.{k}"}
            if isinstance(v, (dict, list)):
                return None, {"message": "Nested values are not allowed", "field": f"data.{i}.{k}"}

    return {"name": name, "columns": columns, "data": data}, None


def create_dataset(validated: Dict[str, Any]) -> Dict[str, Any]:
    global _next_id
    with _lock:
        dataset_id = _next_id
        _next_id += 1
        d = Dataset(
            id=dataset_id,
            name=validated["name"],
            columns=validated["columns"],
            data=validated["data"],
            createdAt=_now_iso(),
        )
        _datasets[dataset_id] = d
        return d.to_dict()
