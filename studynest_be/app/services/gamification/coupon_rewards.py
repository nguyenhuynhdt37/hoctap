"""Issue, redeem and revoke personal, platform-funded coupons."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from secrets import token_hex
from uuid import UUID, uuid4

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from app.core.auth_encryption import seal_auth_payload
from app.db.models.database import Discounts, RewardInstances, Rewards, UserMissions, UserRewardInventory
from app.libs.formats.datetime import VIETNAM_TIMEZONE

REWARD_CODE_PREFIX = "MMR-"
REWARD_DIGEST_PREFIX = "mm-reward:"
REWARD_CATALOG_ID = UUID("962dd5ba-a6de-48f8-a4ec-6d75f196ba9f")


def reward_discount_key(code: str) -> str:
    return REWARD_DIGEST_PREFIX + sha256(code.upper().encode("ascii")).hexdigest()


async def issue_coupon(
    db, user_id, fee: Decimal, max_percent: int, valid_days: int, *,
    mission_id=None, course_id=None, timestamp=None,
) -> RewardInstances | None:
    percent = min(max_percent, int(fee * 50))
    if percent <= 0:
        return None
    timestamp = timestamp or datetime.now(UTC)
    expires_at = timestamp + timedelta(days=min(30, max(14, valid_days)))
    code = REWARD_CODE_PREFIX + token_hex(16).upper()
    instance_id, discount_id = uuid4(), uuid4()
    local_start = timestamp.astimezone(VIETNAM_TIMEZONE).replace(tzinfo=None)
    local_end = expires_at.astimezone(VIETNAM_TIMEZONE).replace(tzinfo=None)
    # The recipient is the audit actor for a self-claimed system reward.
    # Only the digest of the code is saved in the checkout discount table.
    db.add(Discounts(
        id=discount_id, name="Mã thưởng Mây Mây", created_by=user_id, created_role="ADMIN",
        applies_to="specific", discount_type="percent", discount_code=reward_discount_key(code),
        percent_value=percent, start_at=local_start, end_at=local_end,
        usage_limit=1, usage_count=0, per_user_limit=1, is_hidden=True, is_active=True,
    ))
    await db.execute(insert(Rewards).values(
        id=REWARD_CATALOG_ID, title="Mã thưởng Mây Mây", reward_type="coupon",
    ).on_conflict_do_nothing(index_elements=[Rewards.id]))
    await db.flush()
    instance = RewardInstances(
        id=instance_id, reward_id=REWARD_CATALOG_ID, discount_id=discount_id, status="available",
        code_encrypted=seal_auth_payload({"code": code}, f"reward-coupon:{user_id}:{instance_id}"),
        code_masked=f"{REWARD_CODE_PREFIX}••••{code[-4:]}", max_percent=percent,
        source_mission_id=mission_id, source_course_id=course_id,
        assigned_at=timestamp, expires_at=expires_at,
    )
    db.add(instance)
    await db.flush()
    db.add(UserRewardInventory(
        user_id=user_id, reward_type="coupon", reward_id=REWARD_CATALOG_ID,
        reward_instance_id=instance_id, status="active", expires_at=expires_at,
    ))
    return instance


async def find_discount(db, code: str, *, lock: bool = False, reward_only: bool = False):
    code = code.strip()
    if not code:
        return None
    if code.upper().startswith(REWARD_CODE_PREFIX):
        try:
            key = reward_discount_key(code)
        except UnicodeEncodeError:
            return None
        stmt = select(Discounts).where(Discounts.discount_code == key)
    elif reward_only or code.lower().startswith(REWARD_DIGEST_PREFIX):
        return None
    else:
        try:
            identity = UUID(code)
        except ValueError:
            identity = None
        stmt = select(Discounts).where(func.lower(Discounts.discount_code) == code.lower())
        if identity is not None:
            stmt = stmt.where(~Discounts.discount_code.startswith(REWARD_DIGEST_PREFIX)).union(
                select(Discounts).where(
                    Discounts.id == identity,
                    or_(Discounts.discount_code.is_(None), ~Discounts.discount_code.startswith(REWARD_DIGEST_PREFIX)),
                )
            )
            # Lock an outer real table row, rather than the UNION.
            stmt = select(Discounts).where(Discounts.id.in_(select(stmt.subquery().c.id)))
    if lock:
        stmt = stmt.with_for_update()
    return await db.scalar(stmt.order_by(Discounts.id).limit(1).execution_options(populate_existing=True))


async def reward_inventory_entry(db, discount_id, user_id):
    return await db.scalar(
        select(UserRewardInventory)
        .join(RewardInstances, RewardInstances.id == UserRewardInventory.reward_instance_id)
        .where(
            RewardInstances.discount_id == discount_id,
            RewardInstances.status == "available",
            RewardInstances.expires_at > func.now(),
            UserRewardInventory.user_id == user_id,
            UserRewardInventory.reward_type == "coupon",
            UserRewardInventory.status == "active",
            UserRewardInventory.used_at.is_(None),
        )
    )


async def consume_discount(db, discount, user_id):
    discount.usage_count = (discount.usage_count or 0) + 1
    if (discount.discount_code or "").startswith(REWARD_DIGEST_PREFIX):
        owned = await reward_inventory_entry(db, discount.id, user_id)
        if owned is None:
            from fastapi import HTTPException
            raise HTTPException(422, "Mã thưởng đã hết hạn hoặc không còn hiệu lực.")
        owned.status = "used"
        owned.used_at = datetime.now(UTC)
        instance = await db.get(RewardInstances, owned.reward_instance_id)
        instance.status = "used"


async def revoke_course_coupons(db, user_id, course_id):
    ids = (await db.execute(
        select(RewardInstances.id, RewardInstances.discount_id)
        .join(UserRewardInventory, UserRewardInventory.reward_instance_id == RewardInstances.id)
        .outerjoin(UserMissions, UserMissions.id == RewardInstances.source_mission_id)
        .where(
            UserRewardInventory.user_id == user_id,
            UserRewardInventory.reward_type == "coupon",
            UserRewardInventory.status.in_(["active", "available"]),
            UserRewardInventory.used_at.is_(None),
            RewardInstances.status.in_(["available", "assigned"]),
            or_(RewardInstances.source_course_id == course_id, UserMissions.course_id == course_id),
        )
    )).all()
    if not ids:
        return
    discounts = [discount_id for _, discount_id in ids if discount_id]
    await db.execute(update(Discounts).where(Discounts.id.in_(discounts)).values(is_active=False))
    instances = [instance_id for instance_id, _ in ids]
    await db.execute(update(RewardInstances).where(RewardInstances.id.in_(instances)).values(status="revoked"))
    await db.execute(update(UserRewardInventory).where(
        UserRewardInventory.reward_instance_id.in_(instances),
        UserRewardInventory.user_id == user_id,
    ).values(status="revoked"))
