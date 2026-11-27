"""Toy models for nine execution-boundary properties. No external actions."""
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



def injection(content, authorized, improved):
    if type(content) is not str or content not in ("injected-command", "ordinary-data") or type(authorized) is not bool or type(improved) is not bool:
        return "DENY"
    return "ALLOW" if authorized or (not improved and content == "injected-command") else "DENY"


def replay(valid, consumed, improved):
    if any(type(v) is not bool for v in (valid, consumed, improved)):
        return "DENY"
    return "ALLOW" if valid and (not improved or not consumed) else "DENY"


def policy_drift(approved_version, current_version, approved, improved):
    if any(type(v) is not str or v not in ("v1", "v2") for v in (approved_version, current_version)) or type(approved) is not bool or type(improved) is not bool:
        return "DENY"
    return "ALLOW" if approved and (not improved or approved_version == current_version) else "DENY"


def trust_boundary(signature_valid, trusted_issuer, improved):
    if any(type(v) is not bool for v in (signature_valid, trusted_issuer, improved)):
        return "DENY"
    return "ALLOW" if signature_valid and (not improved or trusted_issuer) else "DENY"


def effect_uncertainty(state, fresh_authorization, improved):
    if type(state) is not str or state not in ("unknown", "applied", "not-applied") or type(fresh_authorization) is not bool or type(improved) is not bool:
        return "HOLD"
    if state == "applied":
        return "STOP"
    return "RETRY" if fresh_authorization and (not improved or state == "not-applied") else "HOLD"
