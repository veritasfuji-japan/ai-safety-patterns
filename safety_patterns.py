"""Toy models for four execution-boundary properties. No external actions."""
from dataclasses import dataclass
from threading import Lock


@dataclass(frozen=True)
class Operation:
    actor: str
    action: str
    target: str
    amount: int


def valid_operation(op):
    return (type(op) is Operation
            and all(type(v) is str and len(v) > 0
                    for v in (op.actor, op.action, op.target))
            and type(op.amount) is int
            and 0 < op.amount <= 2**53 - 1)


def unsafe_bound(approved, requested):
    return valid_operation(approved) and valid_operation(requested)


def bound(approved, requested):
    return unsafe_bound(approved, requested) and approved == requested


class RevocableReservation:
    """Single-process reservation ordering, not external dispatch."""
    def __init__(self):
        self._lock = Lock()
        self._state = "ACTIVE"

    def revoke(self):
        with self._lock:
            if self._state != "ACTIVE":
                return False
            self._state = "REVOKED"
            return True

    def reserve(self):
        with self._lock:
            if self._state != "ACTIVE":
                return False
            self._state = "RESERVED"
            return True


def unsafe_approval(recommended, approved):
    return type(recommended) is bool and type(approved) is bool and (recommended or approved)


def human_approval(recommended, approved):
    return type(recommended) is bool and type(approved) is bool and approved


def unsafe_outcome(report, observation):
    return "CONFIRMED" if type(report) is bool and report and observation in ("matching", "missing", "mismatched") else "UNKNOWN"


def outcome(report, observation):
    # Assumes an independently authenticated and matching observation.
    return "CONFIRMED" if type(report) is bool and observation == "matching" else "UNKNOWN"
