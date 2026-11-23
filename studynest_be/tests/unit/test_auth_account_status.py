from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from app.services.shares.auth import revoke_user_sessions_async


async def test_account_revocation_flushes_account_state_before_updating_sessions():
    order = []

    async def flush():
        order.append("account")

    async def execute(statement):
        order.append("sessions")
        params = statement.compile().params
        assert params["user_id_1"] == user_id
        assert params["is_revoked"] is True
        assert "UPDATE public.sessions" in str(statement)

    user_id = uuid4()
    db = SimpleNamespace(flush=flush, execute=execute, commit=AsyncMock())
    await revoke_user_sessions_async(db, user_id)
    assert order == ["account", "sessions"]
    db.commit.assert_not_awaited()
