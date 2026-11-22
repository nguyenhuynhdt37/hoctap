"""Task-local credential used only by fixed-host GitHub GET requests."""
from contextvars import ContextVar

github_access_token: ContextVar[str | None] = ContextVar('github_access_token', default=None)
