from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Tuple

from _datasets_store import (
    create_dataset as create_mem,
    delete_dataset as delete_mem,
    get_dataset as get_mem,
    list_datasets as list_mem,
    validate_insert,
)


def list_datasets(*, user_id: Optional[int]) -> List[Dict[str, Any]]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return list_mem()

    from _db import list_datasets as list_db  # local import to avoid hard dep in dev

    return list_db(user_id=user_id)


def get_dataset(dataset_id: int, *, user_id: Optional[int]) -> Optional[Dict[str, Any]]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return get_mem(dataset_id)

    from _db import get_dataset as get_db  # local import to avoid hard dep in dev

    return get_db(dataset_id, user_id=user_id)


def create_dataset(
    payload: Any,
    *,
    user_id: Optional[int],
    max_datasets_per_user: int,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, str]]]:
    validated, error = validate_insert(payload)
    if error:
        return None, error

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        # In-memory mode: still requires a user_id to avoid "global public" writes in prod.
        if user_id is None:
            return None, {"message": "Unauthorized"}
        return create_mem(validated), None

    from _db import (
        count_datasets_for_user,
        create_dataset as create_db,
    )  # local import to avoid hard dep in dev

    if user_id is None:
        return None, {"message": "Unauthorized"}

    current = count_datasets_for_user(user_id)
    if current >= max_datasets_per_user:
        return None, {"message": "Dataset quota exceeded"}

    created = create_db(
        validated["name"],
        validated["columns"],
        validated["data"],
        user_id=user_id,
    )
    return created, None


def delete_dataset(dataset_id: int, *, user_id: Optional[int]) -> bool:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        if user_id is None:
            return False
        return delete_mem(dataset_id)

    from _db import delete_dataset as delete_db  # local import to avoid hard dep in dev

    if user_id is None:
        return False
    return delete_db(dataset_id, user_id=user_id)
