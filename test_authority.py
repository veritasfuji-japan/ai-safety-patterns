import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from authority import UnsafeAuthority, SingleUseAuthority

class AuthorityTests(unittest.TestCase):
    def test_unsafe_forced_race(self):
        authority = UnsafeAuthority()
        barrier = Barrier(32, timeout=10)
        with ThreadPoolExecutor(max_workers=32) as pool:
            results = list(pool.map(lambda _: authority.consume(barrier.wait), range(32)))
        self.assertEqual(sum(results), 32)
    def test_single_use(self):
        authority = SingleUseAuthority()
        barrier = Barrier(32, timeout=10)
        def attempt(_):
            barrier.wait()
            return authority.consume()
        with ThreadPoolExecutor(max_workers=32) as pool:
            results = list(pool.map(attempt, range(32)))
        self.assertEqual(sum(results), 1)
        self.assertEqual(results.count(False), 31)
    def test_replay(self):
        authority = SingleUseAuthority()
        self.assertTrue(authority.consume())
        self.assertFalse(authority.consume())

if __name__ == '__main__':
    unittest.main()
