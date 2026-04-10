"""
Per-user/per-IP rate limiting middleware using Redis sliding window counters.

Nginx handles IP-level limits at the edge.
This middleware adds per-authenticated-user limits to catch bot accounts
that rotate IPs to bypass nginx zones.

Rules (path_pattern, max_requests, window_seconds):
  - /orders/checkout  →  5 req / 60s per user
  - /api/v1/          →  120 req / 60s per user
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from jose import jwt, JWTError
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-CHANGEME')
ALGORITHM = 'HS256'

# Rules: (path_substring, max_requests, window_seconds)
# More specific paths must come first.
RATE_RULES = [
    ('/orders/checkout', 5, 60),
    ('/api/v1/', 120, 60),
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        identifier = self._get_identifier(request)

        # Redis is set on app.state during startup; skip rate limiting if not ready
        redis = getattr(request.app.state, 'redis', None)
        if redis is None:
            return await call_next(request)

        for pattern, limit, window in RATE_RULES:
            if pattern in path:
                key = f"rl:{identifier}:{pattern}"
                try:
                    count = await redis.incr(key)
                    if count == 1:
                        await redis.expire(key, window)
                    if count > limit:
                        return JSONResponse(
                            status_code=429,
                            content={
                                'detail': f'Too many requests. Limit: {limit} per {window}s. Please slow down.'
                            },
                            headers={'Retry-After': str(window)},
                        )
                except Exception:
                    # Redis error → never block legitimate traffic
                    pass
                break

        return await call_next(request)

    def _get_identifier(self, request: Request) -> str:
        """Use authenticated user ID when available, fall back to IP."""
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            try:
                payload = jwt.decode(
                    auth[7:], SECRET_KEY, algorithms=[ALGORITHM],
                    options={'verify_exp': False}  # expiry checked by auth dependency
                )
                user_id = payload.get('sub')
                if user_id:
                    return f"user:{user_id}"
            except JWTError:
                pass
        # Respect X-Forwarded-For set by nginx so we get the real IP
        forwarded_for = request.headers.get('X-Forwarded-For')
        ip = forwarded_for.split(',')[0].strip() if forwarded_for else request.client.host
        return f"ip:{ip}"
