from django.db import OperationalError, transaction


RETRYABLE_SQLSTATES = {'40001', '40P01'}


def _sqlstate(error):
    current = error
    visited = set()
    while current is not None and id(current) not in visited:
        visited.add(id(current))
        code = getattr(current, 'pgcode', None)
        if code:
            return code
        sqlstate = getattr(current, 'sqlstate', None)
        if callable(sqlstate):
            code = sqlstate()
            if code:
                return code
        elif sqlstate:
            return sqlstate
        current = getattr(current, '__cause__', None) or getattr(current, '__context__', None)
    return None


def run_in_transaction(operation, max_attempts=3):
    """Retry a complete atomic unit after CockroachDB serialization/deadlock errors."""
    for attempt in range(max_attempts):
        try:
            with transaction.atomic():
                return operation()
        except OperationalError as exc:
            if _sqlstate(exc) not in RETRYABLE_SQLSTATES or attempt + 1 >= max_attempts:
                raise
