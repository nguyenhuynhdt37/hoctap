"""The assistant serves students and lecturers only, never admins."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.agent.runtime import AgentService


class FakeScalars:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class FakeDb:
    def __init__(self, roles):
        self.roles = roles
        self.user = SimpleNamespace(id=uuid4(), is_banned=False, deleted_at=None, fullname='A', learning_goals=None, daily_goal_minutes=None)
        self.auth = SimpleNamespace(expired_at=datetime.now(timezone.utc) + timedelta(hours=1))
        self.calls = 0

    async def scalar(self, _stmt):
        self.calls += 1
        return self.user if self.calls == 1 else self.auth

    async def scalars(self, _stmt):
        return FakeScalars(self.roles)


async def principal(roles):
    db = FakeDb(roles)
    service = AgentService(db, db.user, str(uuid4()))
    return await service.principal_async()


@pytest.mark.asyncio
@pytest.mark.parametrize('roles', [['USER'], ['LECTURER'], ['USER', 'LECTURER'], ['USER', 'LECTURER', 'ADMIN']])
async def test_students_and_lecturers_are_served(roles):
    assert await principal(roles)


@pytest.mark.asyncio
@pytest.mark.parametrize('roles', [['ADMIN'], []])
async def test_admin_only_and_roleless_accounts_are_refused(roles):
    with pytest.raises(HTTPException) as error:
        await principal(roles)
    assert error.value.status_code == 403


def test_admin_area_is_refused():
    for route in ['/admin', '/admin/users', '/admin?tab=1']:
        with pytest.raises(HTTPException) as error:
            AgentService._refuse_admin_area(route)
        assert error.value.status_code == 403
    for route in ['/', '/courses', '/lecturer/courses', '/administrator-guide']:
        AgentService._refuse_admin_area(route)
