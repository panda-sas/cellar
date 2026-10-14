"""Export domain events — the audit trail of data leaving the system.

Both carry ``user_id`` = the requester, so the audit handler attributes them
correctly even when dispatched from the Temporal worker (no request actor).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from cellar.domain.shared.events import DomainEvent


@dataclass(frozen=True, kw_only=True)
class ExportRequested(DomainEvent):
    user_id: uuid.UUID
    source: str
    format: str

    def audit_changes(self) -> list[tuple[str, str | None, str | None]]:
        return [("source", None, self.source), ("format", None, self.format)]


@dataclass(frozen=True, kw_only=True)
class ExportCompleted(DomainEvent):
    user_id: uuid.UUID
    format: str
    row_count: int | None
    byte_size: int

    def audit_changes(self) -> list[tuple[str, str | None, str | None]]:
        rows = None if self.row_count is None else str(self.row_count)
        return [
            ("format", None, self.format),
            ("row_count", None, rows),
            ("byte_size", None, str(self.byte_size)),
        ]
