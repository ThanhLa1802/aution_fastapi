import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class MyAdvancedMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        print(f"API {request.url.path} take: {process_time:.4f} seconds")
        return response
        # async def dispatch(self, request, call_next):
        #     # Logic của bạn ở đây
        #     response = await call_next(request)
        #     return response