"""Browser-only auth fixture over the real provider API and disposable DB.

Start only with PROVIDER_BROWSER_TEST=1 and TEST_DATABASE_ASYNC_URL pointing to
an explicit scratch database. Production authentication is not modified.
"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

if os.environ.get("PROVIDER_BROWSER_TEST") != "1" or not os.environ.get("TEST_DATABASE_ASYNC_URL"):
    raise RuntimeError("This fixture requires an explicit disposable test database")
os.environ["DATABASE_ASYNC_URL"] = os.environ["TEST_DATABASE_ASYNC_URL"]
from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.engine import make_url
from app.core.deps import AuthorizationService
from app.core.ws_manager import ws_manager
from app.db.sesson import AsyncSessionLocal
from app.db.models.database import Role, User, UserRoles
from app.api.v1.catalog import router
from app.api.v1.shares.notification import router as notification_router

if not make_url(os.environ["TEST_DATABASE_ASYNC_URL"]).database.endswith("_test"):
    raise RuntimeError("Refusing to run browser fixture outside a test database")
actors = {}
@asynccontextmanager
async def lifespan(app):
    async with AsyncSessionLocal() as db:
        for label, role_name in [("admin", "ADMIN"), ("lecturer", "LECTURER"), ("other", "LECTURER")]:
            email = f"provider-browser-{label}@example.test"
            user = await db.scalar(select(User).where(User.email == email))
            role = await db.scalar(select(Role).where(Role.role_name == role_name))
            if not user:
                user = User(id=uuid4(), fullname=f"Kiểm thử đơn vị {label}", email=email, password="disabled-test-account", is_banned=False)
                db.add(user)
                await db.flush()
                db.add(UserRoles(user_id=user.id, role_id=role.id))
            actors[label] = {"id": user.id, "fullname": user.fullname, "email": email, "roles": [role_name], "is_banned": False, "avatar": None}
        await db.commit()
    yield

app = FastAPI(lifespan=lifespan)
class Auth:
    def __init__(self, request: Request): self.label = request.cookies.get("access_token")
    async def get_current_user(self):
        if self.label not in actors: raise HTTPException(401, "Login required")
        from types import SimpleNamespace
        return SimpleNamespace(**actors[self.label])
    async def get_current_user_if_any(self):
        return await self.get_current_user() if self.label in actors else None
    async def get_list_role_in_user(self, user): return user.roles
    async def require_role(self, roles):
        user = await self.get_current_user()
        if not set(roles) & set(user.roles): raise HTTPException(403, "Forbidden")
        return user
app.dependency_overrides[AuthorizationService] = Auth

@app.get("/api/v1/auth/me")
async def me(request: Request):
    if request.cookies.get("access_token") not in actors: raise HTTPException(401)
    return actors[request.cookies["access_token"]]

@app.websocket("/api/v1/notifications/ws/notifications")
async def websocket(websocket: WebSocket):
    label = websocket.query_params.get("access_token")
    role = websocket.query_params.get("role_name")
    if label not in actors or role not in actors[label]["roles"]:
        await websocket.close(code=4403); return
    await websocket.accept()
    channel = "ADMIN" if role == "ADMIN" else f"{role}_{actors[label]['id']}"
    await ws_manager.connect(websocket, channel)
    await websocket.send_json({"type": "fixture.ready", "role": role})
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect: pass
    finally: ws_manager.disconnect(websocket, channel)

@app.get("/api/v1/lecturer/transactions/earnings/holding")
async def holdings(): return {"items": [], "total": 0}

app.include_router(router, prefix="/api/v1")
app.include_router(notification_router, prefix="/api/v1")
from app.api.v1.shares.storage import router as storage_router
app.include_router(storage_router, prefix="/api/v1")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=18008, log_level="warning")
