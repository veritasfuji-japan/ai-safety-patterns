"""Toy models for four execution-boundary properties. No external actions."""
from dataclasses import dataclass
from threading import Lock


@dataclass(frozen=True)
class Operation:
    actor: str
    action: str
    target: str
    amount: int


def unsafe_bound(approved, requested):
    return approved is not None


def bound(approved, requested):
    return approved is not None and approved == requested


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
    return recommended or approved


def human_approval(recommended, approved):
    return approved


def unsafe_outcome(report, observation):
    return "CONFIRMED" if report else "UNKNOWN"


def outcome(report, observation):
    # Assumes an independently authenticated and matching observation.
    return "CONFIRMED" if observation == "matching" else "UNKNOWN"
