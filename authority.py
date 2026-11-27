from threading import Lock

class UnsafeAuthority:
    def __init__(self):
        self.consumed = False
    def consume(self, after_check=lambda: None):
        if self.consumed:
            return False
        after_check()
        self.consumed = True
        return True

class SingleUseAuthority:
    def __init__(self):
        self.consumed = False
        self._lock = Lock()
    def consume(self):
        with self._lock:
            if self.consumed:
                return False
            self.consumed = True
            return True
