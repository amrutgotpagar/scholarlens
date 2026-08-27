import logging
import time
import uuid
from collections import defaultdict, deque

from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.request_context import set_request_id

access_logger = logging.getLogger("app.access")


class RequestContextMiddleware:
    """Assigns a request ID (reusing an inbound X-Request-ID if present, e.g. from a
    load balancer) and logs one structured access line per request with its duration.

    Implemented as raw ASGI rather than BaseHTTPMiddleware: BaseHTTPMiddleware's call_next
    returns as soon as a StreamingResponse is constructed, before its body has actually been
    sent, which would log a misleadingly small duration for /query/stream. Hooking `send`
    directly lets us log after the *last* body chunk goes out, streamed or not.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        request_id = headers.get(b"x-request-id", b"").decode() or str(uuid.uuid4())
        set_request_id(request_id)

        start = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message).append("x-request-id", request_id)
            elif message["type"] == "http.response.body" and not message.get("more_body", False):
                duration_ms = round((time.perf_counter() - start) * 1000, 2)
                access_logger.info(
                    "request completed",
                    extra={
                        "http_method": scope["method"],
                        "path": scope["path"],
                        "status_code": status_code,
                        "duration_ms": duration_ms,
                    },
                )
            await send(message)

        await self.app(scope, receive, send_wrapper)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window-via-sliding-log rate limit, per client IP.

    In-memory and per-process: fine at the traffic this portfolio project actually sees,
    but the state does not span multiple backend replicas. A shared store (Redis) is the
    natural upgrade if this ever runs behind more than one instance — see README roadmap.

    Limits by IP rather than by user because there is no auth/user identity in this build.
    """

    def __init__(
        self,
        app: ASGIApp,
        requests_per_window: int,
        window_seconds: float,
        exempt_paths: set[str] | None = None,
    ) -> None:
        super().__init__(app)
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.exempt_paths = exempt_paths or set()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        client_key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        hits = self._hits[client_key]

        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()

        if len(hits) >= self.requests_per_window:
            retry_after = max(1, int(self.window_seconds - (now - hits[0])) + 1)
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down and try again."},
                headers={"Retry-After": str(retry_after)},
            )

        hits.append(now)
        return await call_next(request)
