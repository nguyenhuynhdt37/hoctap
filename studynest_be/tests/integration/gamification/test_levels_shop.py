import asyncio
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from app.db.models.database import (
    PeakTransactions,
    RewardGrants,
    User,
    UserGamificationProfiles,
    UserPeakBalances,
    UserRoles,
    XpTransactions,
)
from app.db.models.shop import ShopItemRow, UserItem
from app.schemas.gamification.shop import EquipRequest
from app.services.gamification.level_rewards import level_reward
from app.services.gamification.profile_service import GamificationProfileService
from app.services.gamification.shop_service import ShopService

pytestmark = pytest.mark.asyncio


async def make_learner(db, *, level=1, balance=0):
    user = User(fullname="Người học Mây", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    db.add_all([
        UserGamificationProfiles(user_id=user.id, level=level),
        UserPeakBalances(user_id=user.id, current_balance=balance, total_earned=balance),
    ])
    await db.flush()
    return user.id


async def item_id(db, key):
    result = await db.scalar(select(ShopItemRow.id).where(ShopItemRow.key == key))
    assert result is not None
    return result


async def test_backfill_preserves_legacy_credit_and_grants_missing_items_once(db_session):
    db = db_session
    user_id = await make_learner(db, level=10, balance=900)
    event_id = uuid4()
    db.add_all([
        XpTransactions(user_id=user_id, amount=5100, before_xp=0, after_xp=5100,
                       source="mission", event_id=event_id, event_type="mission.claimed",
                       metadata_={"previous_level": 1, "current_level": 9}),
        PeakTransactions(user_id=user_id, amount=900, before_balance=0, after_balance=900,
                         source="level_up", type="credit", event_id=event_id, event_type="level.up"),
    ])
    await db.flush()
    service = ShopService(db)
    first = await service.levels(user_id, start=5, count=3)
    second = await service.levels(user_id, start=5, count=3)
    assert first == second
    assert first.current.peak_balance == 900 + 225
    assert [reward.level for reward in first.rewards] == [5, 6, 7, 20]
    assert first.rewards[0].granted and first.rewards[0].items[0].owned
    assert first.rewards[-1].milestone == "ten" and not first.rewards[-1].reached
    inventory = await service.inventory(user_id)
    assert {item.kind for item in inventory.items if item.unlock_level == 10} == {
        "avatar_frame", "title", "emblem",
    }
    grants = dict((await db.execute(select(RewardGrants.level, RewardGrants.amount).where(
        RewardGrants.user_id == user_id,
    ))).all())
    assert grants == {level: 0 if level < 10 else 225 for level in range(2, 11)}


async def test_award_xp_creates_and_owns_milestone_items_beyond_seed_range(db_session):
    db = db_session
    user_id = await make_learner(db, level=54)
    service = GamificationProfileService(db)
    profile, result = await service.award_xp(user_id, uuid4(), 3450 + 3500)
    assert (profile.level, profile.current_xp) == (56, 0)
    assert [(row.level, row.coins) for row in result.rewards] == [(55, 1600), (56, 500)]
    assert result.rewards[0].items[0].owned
    await db.commit()
    assert (await service.xp_state(user_id)).peak_balance == 2100
    owned = await db.scalars(select(UserItem.item_id).where(UserItem.user_id == user_id))
    assert owned.all() == [level_reward(55).items[0].catalog_values()["id"]]


@pytest.mark.parametrize(("key", "balance", "status", "message"), [
    ("sky-gradient", 179, 402, "Bạn không có đủ Coin."),
    ("moon-ring", 3000, 409, "Bạn cần đạt cấp 10 để mua vật phẩm này."),
    ("level-10-title", 3000, 409, "Đây là vật phẩm đặc quyền theo cấp và không bán bằng Coin."),
])
async def test_purchase_rejection_keeps_coin_balance(db_session, key, balance, status, message):
    db = db_session
    user = await make_learner(db, balance=balance)
    product = await item_id(db, key)
    await db.commit()
    with pytest.raises(HTTPException) as error:
        await ShopService(db).purchase(user, product, "first")
    assert (error.value.status_code, error.value.detail) == (status, message)
    assert (await db.get(UserPeakBalances, user)).current_balance == balance
    assert await db.get(UserItem, (user, product)) is None


async def test_purchase_replay_and_equip(db_session):
    db = db_session
    user = await make_learner(db, balance=400)
    frame = await item_id(db, "sky-gradient")
    other_frame = await item_id(db, "soft-cloud")
    service = ShopService(db)
    purchase = await service.purchase(user, frame, "shared")
    assert purchase.balance == 220 and purchase.item.owned
    with pytest.raises(HTTPException, match="đã sở hữu"):
        await service.purchase(user, frame, "new-attempt")
    with pytest.raises(HTTPException, match="yêu cầu mua khác"):
        await service.purchase(user, other_frame, "shared")

    with pytest.raises(HTTPException, match="chưa sở hữu"):
        await service.equip(user, EquipRequest(slot="avatar_frame", item_id=other_frame))
    with pytest.raises(HTTPException, match="không phù hợp"):
        await service.equip(user, EquipRequest(slot="title", item_id=frame))
    equipment = await service.equip(user, EquipRequest(slot="avatar_frame", item_id=frame))
    assert equipment.avatar_frame.id == frame and equipment.avatar_frame.equipped
    assert (await service.inventory(user)).equipment == equipment
    assert await service.purchase(user, frame, "shared") == purchase
    assert (await service.equip(user, EquipRequest(slot="avatar_frame", item_id=None))).avatar_frame is None

    transaction = (await db.scalars(select(PeakTransactions).where(PeakTransactions.user_id == user))).one()
    assert (transaction.type, transaction.amount, transaction.before_balance, transaction.after_balance) == (
        "debit", 180, 400, 220,
    )
    assert (await db.get(UserPeakBalances, user)).total_spent == 180


@pytest.mark.parametrize("same_key", [True, False])
async def test_concurrent_purchase_debits_only_once(async_engine, same_key):
    sessions = async_sessionmaker(async_engine, expire_on_commit=False)
    async with sessions() as db:
        user = await make_learner(db, balance=400)
        frame = await item_id(db, "sky-gradient")
        await db.commit()

    async def purchase(key):
        async with sessions() as db:
            return await ShopService(db).purchase(user, frame, key)

    try:
        first, second = await asyncio.gather(purchase("one"), purchase("one" if same_key else "two"),
                                            return_exceptions=True)
        if same_key:
            assert first == second
            assert first.balance == 220
        else:
            results = [first, second]
            error, = (result for result in results if isinstance(result, HTTPException))
            success, = (result for result in results if not isinstance(result, Exception))
            assert error.status_code == 409 and success.balance == 220
        async with sessions() as db:
            assert (await db.get(UserPeakBalances, user)).current_balance == 220
            assert await db.scalar(select(func.count()).select_from(PeakTransactions).where(
                PeakTransactions.user_id == user,
            )) == 1
    finally:
        async with sessions() as db:
            await db.execute(delete(User).where(User.id == user))
            await db.commit()


async def test_profiles_expose_equipment_without_wallet_or_inventory(db_session, monkeypatch):
    from httpx import ASGITransport, AsyncClient

    from app.core.deps import AuthorizationService
    from app.db.sesson import get_session
    from app.main import app

    db = db_session
    user_id = await make_learner(db, balance=500)
    frame = await item_id(db, "sky-gradient")
    service = ShopService(db)
    await service.purchase(user_id, frame, "first")
    await service.equip(user_id, EquipRequest(slot="avatar_frame", item_id=frame))
    user = await db.scalar(select(User).options(
        selectinload(User.user_roles).selectinload(UserRoles.role),
    ).where(User.id == user_id))

    class SessionUser:
        async def get_current_user(self):
            return user

    async def test_db():
        yield db

    monkeypatch.setitem(app.dependency_overrides, get_session, test_db)
    monkeypatch.setitem(app.dependency_overrides, AuthorizationService, SessionUser)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for path in ("/api/v1/auth/me", f"/api/v1/profile/{user_id}"):
            response = await client.get(path)
            assert response.status_code == 200
            equipment = response.json()["equipment"]
            assert equipment["avatar_frame"]["id"] == str(frame)
            assert equipment["avatar_frame"]["equipped"]
            assert equipment["title"] is equipment["emblem"] is None
            assert "balance" not in equipment
