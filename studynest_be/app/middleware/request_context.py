from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.context import current_request


class RequestContextMiddleware:
    """
    Pure ASGI middleware — lưu Request vào context cho HTTP requests.
    Khác BaseHTTPMiddleware: không block WebSocket (WS sẽ passthrough bình thường).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            # Chỉ set context cho HTTP request
            from starlette.requests import Request
            request = Request(scope, receive, send)
            token = current_request.set(request)
            try:
                await self.app(scope, receive, send)
            finally:
                current_request.reset(token)
        else:
            # WebSocket và lifespan → passthrough không chặn
            await self.app(scope, receive, send)
