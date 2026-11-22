from starlette.types import ASGIApp, Receive, Scope, Send
from uuid import UUID, uuid4

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
            try:
                request_id = str(UUID(request.headers.get("x-request-id", "")))
            except ValueError:
                request_id = str(uuid4())
            scope.setdefault("state", {})["request_id"] = request_id
            async def correlated_send(message):
                if message["type"] == "http.response.start":
                    headers = [(key, value) for key, value in message.get("headers", []) if key.lower() != b"x-request-id"]
                    message = {**message, "headers": [*headers, (b"x-request-id", request_id.encode())]}
                await send(message)
            token = current_request.set(request)
            try:
                await self.app(scope, receive, correlated_send)
            finally:
                current_request.reset(token)
        else:
            # WebSocket và lifespan → passthrough không chặn
            await self.app(scope, receive, send)
