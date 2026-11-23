from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import PlatformSettings, Role, User, UserPeakBalances, UserRoles
from app.services.coin_service import CoinService
from app.services.user.lecturer import LecturerService

pytestmark = pytest.mark.asyncio


class Notifier:
    async def create_notification_async(self, *args, **kwargs):
        return None


async def learner(db, *, paid, bonus=0):
    user = User(fullname="Người muốn dạy", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    db.add_all([UserPaidCoinBalances(user_id=user.id, balance=paid),
                UserPeakBalances(user_id=user.id, current_balance=bonus, total_earned=bonus)])
    await db.execute(update(PlatformSettings).values(coin_vnd_rate=10000, bonus_coin_max_share=0.3))
    await db.commit()
    return await db.scalar(select(User).where(User.id == user.id).options(
        selectinload(User.user_roles).selectinload(UserRoles.role)))


async def test_becoming_a_lecturer_costs_one_hundred_coin(db_session):
    user = await learner(db_session, paid=100)
    await LecturerService(db_session).become_instructor_async(user, Notifier())
    assert (await CoinService(db_session).get_balances_async(user.id)).paid == 0
    assert await db_session.scalar(select(UserRoles.user_id).join(Role, Role.id == UserRoles.role_id).where(
        UserRoles.user_id == user.id, Role.role_name == "LECTURER")) == user.id


async def test_not_enough_coin_blocks_the_upgrade(db_session):
    user = await learner(db_session, paid=50)
    user_id = user.id
    with pytest.raises(HTTPException) as error:
        await LecturerService(db_session).become_instructor_async(user, Notifier())
    assert error.value.status_code == 400
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 50
    assert await db_session.scalar(select(UserRoles.user_id).join(Role, Role.id == UserRoles.role_id).where(
        UserRoles.user_id == user_id, Role.role_name == "LECTURER")) is None
