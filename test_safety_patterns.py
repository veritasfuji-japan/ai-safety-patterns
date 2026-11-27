import unittest
from dataclasses import replace
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from safety_patterns import (
    Operation, unsafe_bound, bound, RevocableReservation,
    unsafe_approval, human_approval, unsafe_outcome, outcome,
)


class SafetyPatternTests(unittest.TestCase):
    def test_binding_positive(self):
        op = Operation("agent-a", "transfer", "account-a", 100)
        self.assertTrue(bound(op, op))

    def test_binding_substitutions(self):
        op = Operation("agent-a", "transfer", "account-a", 100)
        for field, value in (("actor", "agent-b"), ("action", "delete"),
                             ("target", "account-b"), ("amount", 1000)):
            with self.subTest(field=field):
                requested = replace(op, **{field: value})
                self.assertTrue(unsafe_bound(op, requested))
                self.assertFalse(bound(op, requested))
        self.assertFalse(bound(None, op))

    def test_revocation_first(self):
        r = RevocableReservation()
        stale = True
        self.assertTrue(r.revoke())
        self.assertTrue(stale)  # unsafe cached check
        self.assertFalse(r.reserve())

    def test_reservation_first(self):
        r = RevocableReservation()
        self.assertTrue(r.reserve())
        self.assertFalse(r.revoke())
        self.assertFalse(r.reserve())

    def test_concurrent_ordering(self):
        for _ in range(32):
            r = RevocableReservation()
            barrier = Barrier(2, timeout=10)
            def attempt(fn):
                barrier.wait()
                return fn()
            with ThreadPoolExecutor(max_workers=2) as pool:
                a = pool.submit(attempt, r.revoke)
                b = pool.submit(attempt, r.reserve)
                self.assertEqual(sum((a.result(), b.result())), 1)

    def test_approval_separation(self):
        self.assertTrue(unsafe_approval(True, False))
        self.assertFalse(human_approval(True, False))
        self.assertTrue(human_approval(True, True))
        self.assertFalse(human_approval(False, False))
        self.assertTrue(human_approval(False, True))

    def test_outcome_evidence(self):
        for observation in ("missing", "mismatched"):
            with self.subTest(observation=observation):
                self.assertEqual(unsafe_outcome(True, observation), "CONFIRMED")
                self.assertEqual(outcome(True, observation), "UNKNOWN")
        self.assertEqual(outcome(True, "matching"), "CONFIRMED")
        self.assertEqual(outcome(False, "missing"), "UNKNOWN")
        self.assertEqual(outcome(False, "matching"), "CONFIRMED")

    def test_malformed_inputs(self):
        op = Operation("agent-a", "transfer", "account-a", 100)
        for invalid in (None, {}, replace(op, amount=True),
                        replace(op, amount=0), replace(op, amount=2**53),
                        replace(op, target="")):
            with self.subTest(invalid=invalid):
                self.assertFalse(bound(invalid, op))
                self.assertFalse(bound(op, invalid))
                self.assertFalse(unsafe_bound(invalid, op))
        self.assertFalse(human_approval(True, "false"))
        self.assertFalse(unsafe_approval(True, None))
        self.assertEqual(outcome("true", "matching"), "UNKNOWN")
        self.assertEqual(unsafe_outcome(True, "invalid"), "UNKNOWN")
