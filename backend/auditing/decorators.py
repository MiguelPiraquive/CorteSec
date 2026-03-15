import functools
import logging

logger = logging.getLogger('audit')


def audit_user_operation(action):
    """Decorador simple para auditoría de operaciones de usuario."""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                request = args[1] if len(args) > 1 else None
                user = getattr(request, 'user', None) if request else None
                logger.info(f"AUDIT: {action} user={getattr(user, 'id', None)}")
            except Exception:
                pass
            return func(*args, **kwargs)
        return wrapper

    return decorator
