"""Real PostgreSQL, no external payments. Always requires a scratch DB."""

import os
from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError

from app.db.models.catalog import Subject
from app.db.models.database import (
    Categories,
    CourseEnrollments,
    Courses,
    InstructorEarnings,
    PlatformSettings,
    PlatformWallets,
    PurchaseItems,
    User,
    Wallets,
)
from app.db.models.learning_paths import BundleOrderLine
from app.libs.formats.datetime import now
from app.schemas.learning_paths import (
    BundleCheckout,
    BundleInput,
    FrameworkInput,
    GroupInput,
    PathInput,
    ProficiencyInput,
    StageInput,
)
from app.services.bundle_settlement import BundleSettlement
from app.services.bundles import BundleService, allocate_price
from app.services.learning_paths import LearningPathService

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_ASYNC_URL"), reason="Explicit scratch DB required"
    ),
]


@pytest_asyncio.fixture
async def db_session(async_engine):
    from sqlalchemy.ext.asyncio import AsyncSession

    async with async_engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()


async def setup_fixture(db):
    subject = await db.scalar(select(Subject).where(Subject.code == "toan"))
    category = await db.scalar(select(Categories).where(Categories.slug == "lop-12"))
    users = []
    for _ in range(3):
        user = User(
            fullname="Bundle test",
            email=uuid4().hex + "@test.invalid",
            password="!disabled",
        )
        db.add(user)
        await db.flush()
        users.append(user)
        db.add(
            Wallets(
                user_id=user.id,
                balance=Decimal(1000000),
                total_in=1000000,
                total_out=0,
                currency="VND",
                is_locked=False,
            )
        )
    courses = []
    for index, price in enumerate([100000, 200000]):
        course = Courses(
            title="Bundle integration " + str(index),
            slug="bundle-test-" + uuid4().hex,
            category_id=category.id,
            subject_id=subject.id,
            instructor_id=users[index + 1].id,
            is_published=True,
            approval_status="approved",
            currency="VND",
            base_price=price,
            total_enrolls=0,
        )
        db.add(course)
        await db.flush()
        courses.append(course)
    treasury = await db.scalar(
        select(PlatformWallets)
        .where(PlatformWallets.currency == "VND")
        .order_by(PlatformWallets.id)
        .limit(1)
    )
    if not treasury:
        treasury = PlatformWallets(
            currency="VND",
            balance=10000000,
            total_in=10000000,
            total_out=0,
            holding_amount=0,
            platform_fee_total=0,
        )
        db.add(treasury)
    platform = await db.scalar(select(PlatformSettings).limit(1))
    if not platform:
        platform = PlatformSettings(
            platform_fee=Decimal("0.3"), hold_days=7
        )
        db.add(platform)
    platform.platform_fee = Decimal("0.3")
    platform.hold_days = 7
    await db.flush()
    return db, users, courses, subject, treasury


@pytest_asyncio.fixture
async def fixture(db_session):
    return await setup_fixture(db_session)


async def published_bundle(fixture):
    db, users, courses, _, _ = fixture
    service = BundleService(db)
    version = await service.create(
        BundleInput(
            slug="bundle-" + uuid4().hex,
            title="Combo integration",
            description="A sufficiently long bundle description.",
            price=150000,
            course_ids=[c.id for c in courses],
        ),
        users[1].id,
    )
    return service, await service.publish(version["id"])


async def checkout(service, version, user_id):
    quote = await service.quote(version["id"], user_id)
    request = BundleCheckout(
        version_id=version["id"],
        quote_hash=quote["quote_hash"],
        idempotency_key=uuid4(),
    )
    return request, await service.checkout(request, user_id)


async def test_allocation_exact():
    assert allocate_price(Decimal(".05"), [1, 1, 1]) == [
        Decimal(".02"),
        Decimal(".02"),
        Decimal(".01"),
    ]
    for cents in range(200):
        assert (
            sum(allocate_price(Decimal(cents) / 100, [0, 1, 2, 4, 7]))
            == Decimal(cents) / 100
        )


async def test_exact_split_idempotency_and_already_owned(fixture):
    db, users, _, _, treasury = fixture
    service, version = await published_bundle(fixture)
    wallet = await db.scalar(select(Wallets).where(Wallets.user_id == users[0].id))
    before = wallet.balance
    held = treasury.holding_amount
    request, receipt = await checkout(service, version, users[0].id)
    assert (
        receipt["total_paid"] == 150000
        and wallet.balance == before - 150000
        and treasury.holding_amount == held + 150000
    )
    assert sorted(line["paid"] for line in receipt["lines"]) == [50000, 100000]
    earnings = (
        await db.scalars(
            select(InstructorEarnings).where(
                InstructorEarnings.id.in_([l["earning_id"] for l in receipt["lines"]])
            )
        )
    ).all()
    assert (
        sum(e.amount_instructor + e.amount_platform for e in earnings) == 150000
        and len({e.transaction_id for e in earnings}) == 2
    )
    assert (await service.checkout(request, users[0].id))["id"] == receipt["id"]
    assert wallet.balance == before - 150000
    _, second = await checkout(service, version, users[0].id)
    assert second["total_paid"] == 0 and wallet.balance == before - 150000


async def test_owned_credit_and_frozen_price(fixture):
    db, users, courses, _, _ = fixture
    service, version = await published_bundle(fixture)
    db.add(
        CourseEnrollments(user_id=users[0].id, course_id=courses[0].id, status="active")
    )
    await db.flush()
    courses[1].base_price = 999999
    quote = await service.quote(version["id"], users[0].id)
    assert Decimal(quote["total"]) == 100000 and Decimal(quote["owned_credit"]) == 50000
    _, receipt = await checkout(service, version, users[0].id)
    assert len([l for l in receipt["lines"] if l["purchase_item_id"]]) == 1


async def test_refund_exact_line(fixture):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    _, receipt = await checkout(service, version, users[0].id)
    first, second = (
        await db.scalars(
            select(BundleOrderLine)
            .where(BundleOrderLine.order_id == receipt["id"])
            .order_by(BundleOrderLine.paid)
        )
    ).all()
    settlement = BundleSettlement(db)
    request = await settlement.request(
        first, users[0].id, "Không phù hợp nhu cầu học tập"
    )
    assert Decimal(request["refund_amount"]) == first.paid
    wallet = await db.scalar(select(Wallets).where(Wallets.user_id == users[0].id))
    balance = wallet.balance
    result = await settlement.review(
        first, request["refund_id"], first.instructor_id, "LECTURER", "approve"
    )
    assert result["status"] == "refunded" and wallet.balance == balance + first.paid
    assert (await db.get(InstructorEarnings, second.earning_id)).status == "holding"
    assert (await db.get(PurchaseItems, second.purchase_item_id)).status == "completed"
    with pytest.raises(HTTPException):
        await settlement.review(
            first, request["refund_id"], first.instructor_id, "LECTURER", "approve"
        )
    assert wallet.balance == balance + first.paid


async def test_release_no_double_credit(fixture):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    _, receipt = await checkout(service, version, users[0].id)
    line = await db.scalar(
        select(BundleOrderLine)
        .where(BundleOrderLine.order_id == receipt["id"])
        .limit(1)
    )
    earning = await db.get(InstructorEarnings, line.earning_id)
    earning.hold_until = now() - timedelta(seconds=1)
    await db.flush()
    wallet = await db.scalar(
        select(Wallets).where(Wallets.user_id == line.instructor_id)
    )
    before = wallet.balance
    assert await BundleSettlement(db).release(line)
    assert wallet.balance == before + earning.amount_instructor
    assert not await BundleSettlement(db).release(line)


async def test_idor_and_snapshot_immutable(fixture):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    _, receipt = await checkout(service, version, users[0].id)
    with pytest.raises(HTTPException) as error:
        await service.receipt(receipt["id"], users[2].id)
    assert error.value.status_code == 404
    with pytest.raises(DBAPIError):
        async with db.begin_nested():
            await db.execute(
                text("UPDATE public.bundle_orders SET total_paid=0 WHERE id=:id"),
                {"id": receipt["id"]},
            )


async def test_path_labels_versions_following(fixture):
    db, users, courses, subject, _ = fixture
    service = LearningPathService(db)
    framework = await service.create_framework(
        FrameworkInput(
            code="test-" + uuid4().hex,
            name="Test progression",
            subject_id=subject.id,
            levels=["Start", "Next"],
        )
    )
    levels = next(
        f["levels"] for f in await service.frameworks() if f["id"] == framework["id"]
    )
    for course, level in zip(courses, levels):
        await service.label_course(
            course.id,
            ProficiencyInput(
                target_level_id=level["id"],
                skill="Tư duy",
                evidence="Đã kiểm tra nội dung và bài tập phù hợp.",
                status="approved",
            ),
            users[1].id,
        )
    data = PathInput(
        slug="path-" + uuid4().hex,
        subject_id=subject.id,
        title="Path integration",
        description="A sufficiently long learning path description.",
        stages=[
            StageInput(
                title=level["name"],
                description="Mục tiêu nội dung của chặng học",
                target_level_id=level["id"],
                groups=[GroupInput(title="Học phần", course_ids=[course.id])],
            )
            for course, level in zip(courses, levels)
        ],
    )
    version = await service.create(data, users[1].id)
    await service.publish(version["id"])
    assert (await service.follow(version["id"], users[0].id))["following"]
    new = await service.create(
        data.model_copy(update={"path_id": version["path_id"]}), users[1].id
    )
    assert (
        new["version"] == 2
        and (await service.detail(version["id"], user_id=users[0].id))["following"]
    )


async def test_atomic_rollback_after_partial_writes(fixture):
    from sqlalchemy import event

    from app.db.models.learning_paths import BundleOrder

    db, users, _, _, treasury = fixture
    service, version = await published_bundle(fixture)
    uid, tid = users[0].id, treasury.id
    wallet = await db.scalar(select(Wallets).where(Wallets.user_id == uid))
    balance, held = wallet.balance, treasury.holding_amount
    quote = await service.quote(version["id"], uid)
    request = BundleCheckout(
        version_id=version["id"],
        quote_hash=quote["quote_hash"],
        idempotency_key=uuid4(),
    )

    def fail(*args):
        raise RuntimeError("Injected line insert failure")

    event.listen(BundleOrderLine, "before_insert", fail)
    try:
        with pytest.raises(RuntimeError):
            await service.checkout(request, uid)
    finally:
        event.remove(BundleOrderLine, "before_insert", fail)
    assert (
        await db.scalar(select(Wallets).where(Wallets.user_id == uid))
    ).balance == balance
    assert (await db.get(PlatformWallets, tid)).holding_amount == held
    assert not await db.scalar(
        select(BundleOrder.id).where(
            BundleOrder.idempotency_key == str(request.idempotency_key)
        )
    )


async def test_changed_quote(fixture):
    db, users, courses, _, _ = fixture
    service, version = await published_bundle(fixture)
    uid, cid = users[0].id, courses[0].id
    quote = await service.quote(version["id"], uid)
    db.add(CourseEnrollments(user_id=uid, course_id=cid, status="active"))
    await db.commit()
    with pytest.raises(HTTPException) as error:
        await service.checkout(
            BundleCheckout(
                version_id=version["id"],
                quote_hash=quote["quote_hash"],
                idempotency_key=uuid4(),
            ),
            uid,
        )
    assert error.value.status_code == 409


async def test_insufficient_wallet(fixture):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    uid = users[0].id
    wallet = await db.scalar(select(Wallets).where(Wallets.user_id == uid))
    wallet.balance = 1
    await db.commit()
    quote = await service.quote(version["id"], uid)
    with pytest.raises(HTTPException) as error:
        await service.checkout(
            BundleCheckout(
                version_id=version["id"],
                quote_hash=quote["quote_hash"],
                idempotency_key=uuid4(),
            ),
            uid,
        )
    assert error.value.status_code == 402
    assert (await db.scalar(select(Wallets).where(Wallets.user_id == uid))).balance == 1


async def test_pending_refund_blocks_release(fixture):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    _, receipt = await checkout(service, version, users[0].id)
    line = await db.scalar(
        select(BundleOrderLine)
        .where(BundleOrderLine.order_id == receipt["id"])
        .limit(1)
    )
    with pytest.raises(HTTPException):
        await BundleSettlement(db).request(line, users[2].id, "Unauthorized request")
    await BundleSettlement(db).request(
        line, users[0].id, "Không phù hợp với nhu cầu học"
    )
    earning = await db.get(InstructorEarnings, line.earning_id)
    earning.hold_until = now() - timedelta(seconds=1)
    await db.flush()
    assert not await BundleSettlement(db).release(line)


async def test_concurrent_retry_one_charge(async_engine):
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.db.models.learning_paths import BundleOrder

    factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with factory() as db:
        data = await setup_fixture(db)
        service, version = await published_bundle(data)
        uid = data[1][0].id
        quote = await service.quote(version["id"], uid)
        request = BundleCheckout(
            version_id=version["id"],
            quote_hash=quote["quote_hash"],
            idempotency_key=uuid4(),
        )
        wallet = await db.scalar(select(Wallets).where(Wallets.user_id == uid))
        before = wallet.balance
        await db.commit()

    async def purchase():
        async with factory() as db:
            return await BundleService(db).checkout(request, uid)

    a, b = await asyncio.gather(purchase(), purchase())
    assert a["id"] == b["id"]
    async with factory() as db:
        assert (
            await db.scalar(select(Wallets).where(Wallets.user_id == uid))
        ).balance == before - 150000
        assert (
            await db.scalar(
                select(func.count())
                .select_from(BundleOrder)
                .where(BundleOrder.user_id == uid)
            )
            == 1
        )


async def test_path_progress_requires_one_option_per_group(fixture):
    from app.db.models.database import LessonProgress, Lessons, LessonTypeEnum

    db, users, courses, subject, _ = fixture
    service = LearningPathService(db)
    data = PathInput(
        slug="progress-" + uuid4().hex,
        subject_id=subject.id,
        title="Progress path",
        description="Progress reflects real lesson completion only.",
        stages=[
            StageInput(
                title="Stage",
                description="Choose one course in each group",
                groups=[
                    GroupInput(
                        title="Choose either", course_ids=[c.id for c in courses]
                    )
                ],
            )
        ],
    )
    version = await service.create(data, users[1].id)
    await service.publish(version["id"])
    lesson = Lessons(
        title="Real lesson",
        lesson_type=LessonTypeEnum.ARTICLE,
        position=1,
        course_id=courses[0].id,
    )
    db.add(lesson)
    await db.flush()
    db.add(
        CourseEnrollments(user_id=users[0].id, course_id=courses[0].id, status="active")
    )
    db.add(
        LessonProgress(
            user_id=users[0].id,
            course_id=courses[0].id,
            lesson_id=lesson.id,
            is_completed=True,
        )
    )
    await db.flush()
    result = await service.detail(version["id"], user_id=users[0].id)
    assert result["completed_stages"] == 1
    assert len(result["stages"][0]["groups"][0]["options"]) == 2


async def test_http_authorization_and_client_amount_rejected(fixture):
    import httpx
    from fastapi import FastAPI

    from app.api.v1.learning_paths import router
    from app.core.deps import AuthorizationService
    from app.db.sesson import get_session

    db, users, _, _, _ = fixture
    _service, version = await published_bundle(fixture)
    app = FastAPI()
    app.include_router(router)

    async def session():
        yield db

    class Visitor:
        async def get_current_user_if_any(self):
            return None

        async def get_current_user(self):
            raise HTTPException(401, "Login required")

        async def require_role(self, roles):
            raise HTTPException(403, "Permission denied")

    app.dependency_overrides[get_session] = session
    app.dependency_overrides[AuthorizationService] = Visitor
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.get("/admin/bundles")).status_code == 403
        assert (
            await client.get("/admin/bundles/" + str(version["bundle_id"]) + "/coupons")
        ).status_code == 403
        assert (
            await client.get("/bundles/versions/" + str(version["id"]) + "/quote")
        ).status_code == 200
        assert (
            await client.post(
                "/bundles/checkout",
                json={
                    "version_id": str(version["id"]),
                    "quote_hash": "0" * 64,
                    "idempotency_key": str(uuid4()),
                },
            )
        ).status_code == 401
        assert (
            await client.post("/learning-paths/versions/" + str(uuid4()) + "/follow")
        ).status_code == 401

    class Member(Visitor):
        async def get_current_user(self):
            return users[0]

    app.dependency_overrides[AuthorizationService] = Member
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (
            await client.post(
                "/bundles/checkout",
                json={
                    "version_id": str(version["id"]),
                    "quote_hash": "0" * 64,
                    "idempotency_key": str(uuid4()),
                    "amount": 1,
                },
            )
        ).status_code == 422


async def test_published_children_and_versions_cannot_change(fixture):
    db, _, _, _, _ = fixture
    _service, version = await published_bundle(fixture)
    with pytest.raises(DBAPIError):
        async with db.begin_nested():
            await db.execute(
                text(
                    "UPDATE public.course_bundle_items SET allocated_price=1 WHERE version_id=:id"
                ),
                {"id": version["id"]},
            )
    with pytest.raises(DBAPIError):
        async with db.begin_nested():
            await db.execute(
                text("DELETE FROM public.course_bundle_versions WHERE id=:id"),
                {"id": version["id"]},
            )


async def test_banned_buyer_cannot_checkout(fixture):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    uid = users[0].id
    quote = await service.quote(version["id"], uid)
    users[0].is_banned = True
    await db.commit()
    with pytest.raises(HTTPException) as error:
        await service.checkout(
            BundleCheckout(
                version_id=version["id"],
                quote_hash=quote["quote_hash"],
                idempotency_key=uuid4(),
            ),
            uid,
        )
    assert error.value.status_code == 403


async def test_legacy_ambiguous_refund_cannot_pick_arbitrary_earning(fixture):
    from app.db.models.database import Transactions
    from app.services.shares.refund import RefundService

    db, users, courses, _, _ = fixture
    tx = Transactions(
        user_id=users[0].id,
        amount=300000,
        type="purchase",
        status="completed",
        direction="out",
    )
    db.add(tx)
    await db.flush()
    items = []
    for course in courses:
        item = PurchaseItems(
            transaction_id=tx.id,
            user_id=users[0].id,
            course_id=course.id,
            original_price=course.base_price,
            discounted_price=course.base_price,
            status="completed",
        )
        db.add(item)
        items.append(item)
    await db.flush()
    with pytest.raises(HTTPException) as error:
        await RefundService(db).create_refund_request(
            users[0].id, items[0].id, "Yêu cầu đối soát thử nghiệm", None
        )
    assert error.value.status_code == 409


async def test_cannot_delete_course_referenced_by_bundle(fixture):
    from app.services.lecturer.course import CourseService

    db, users, courses, _, _ = fixture
    await published_bundle(fixture)
    courses[0].is_published = False
    await db.flush()
    with pytest.raises(HTTPException) as error:
        await CourseService(db=db, storage=None, embedding=None).delete_course_async(
            courses[0].id, users[1].id
        )
    assert error.value.status_code == 409


async def make_coupon(db, version, admin_id, **changes):
    from datetime import UTC, datetime

    from app.schemas.learning_paths import BundleCouponInput
    from app.services.bundle_coupons import BundleCouponService

    policy = {
        "code": "COMBO_" + uuid4().hex[:10].upper(),
        "discount_type": "percent",
        "value": 20,
        "min_total": 0,
        "max_discount": 25000,
        "starts_at": datetime.now(UTC) - timedelta(days=1),
        "ends_at": datetime.now(UTC) + timedelta(days=30),
        "max_uses": 10,
        "per_user_limit": 1,
    }
    policy.update(changes)
    return await BundleCouponService(db).save(
        version["bundle_id"], BundleCouponInput(**policy), admin_id
    )


async def test_official_inputs_and_slug_collision(fixture):
    from pydantic import ValidationError

    db, users, _, subject, _ = fixture
    service = LearningPathService(db)
    data = PathInput(subject_id=subject.id, title="Toán Tiểu học")
    a = await service.create(data, users[1].id)
    b = await service.create(data, users[1].id)
    assert a["slug"] == "toan-tieu-hoc"
    assert (
        b["slug"].startswith("toan-tieu-hoc-") and len(b["slug"].rsplit("-", 1)[1]) == 8
    )
    assert a["path_id"] != b["path_id"] and b["version"] == 1
    revision = await service.create(
        data.model_copy(update={"path_id": a["path_id"]}), users[1].id
    )
    assert revision["slug"] == a["slug"] and revision["version"] == 2
    listing = await service.listing(admin=True, keyword="Toán Tiểu học")
    assert len([v for v in listing["items"] if v["path_id"] == a["path_id"]]) == 1
    history = await service.listing(admin=True, history_id=a["path_id"])
    assert [v["version"] for v in history["items"]] == [2, 1]
    with pytest.raises(ValidationError):
        PathInput(subject_id=subject.id, title="Không có demo", is_demo=True)
    with pytest.raises(ValidationError):
        BundleInput(title="Không có demo", price=0, is_demo=True)


@pytest.mark.parametrize("prefix", ["demo-catalog-", "seed-shop-"])
@pytest.mark.parametrize("kind", ["path", "bundle"])
async def test_retired_courses_cannot_enter_official_drafts(fixture, prefix, kind):
    db, users, courses, subject, _ = fixture
    courses[0].slug = prefix + uuid4().hex
    await db.flush()
    with pytest.raises(HTTPException) as error:
        if kind == "path":
            await LearningPathService(db).create(
                PathInput(
                    title="Lộ trình chính thức",
                    subject_id=subject.id,
                    stages=[
                        StageInput(
                            title="Cơ bản",
                            groups=[
                                GroupInput(title="Học phần", course_ids=[courses[0].id])
                            ],
                        )
                    ],
                ),
                users[1].id,
            )
        else:
            await BundleService(db).create(
                BundleInput(
                    title="Combo chính thức", price=0, course_ids=[courses[0].id]
                ),
                users[1].id,
            )
    assert error.value.status_code == 409


async def test_bundle_explicit_slug_collision_creates_independent_roots(fixture):
    db, users, _, _, _ = fixture
    service = BundleService(db)
    slug = "combo-chinh-thuc-" + uuid4().hex[:8]
    data = BundleInput(title="Combo chính thức", slug=slug, price=0)
    first = await service.create(data, users[1].id)
    second = await service.create(data, users[1].id)
    assert first["slug"] == slug
    assert second["slug"].startswith(slug + "-")
    suffix = second["slug"][len(slug) + 1 :]
    assert len(suffix) == 8 and all(c in "0123456789abcdef" for c in suffix)
    assert first["bundle_id"] != second["bundle_id"]
    assert first["version"] == second["version"] == 1


async def test_edit_drafts_in_place_and_publish_guard(fixture):
    db, users, courses, subject, _ = fixture
    path_service = LearningPathService(db)
    data = PathInput(
        subject_id=subject.id,
        title="Draft editable",
        description="Nội dung đủ dài để được xuất bản.",
        stages=[
            StageInput(
                title="Chặng một",
                groups=[GroupInput(title="Cơ bản", course_ids=[courses[0].id])],
            )
        ],
    )
    initial = await path_service.create(data, users[1].id)
    edited_data = data.model_copy(
        update={
            "path_id": initial["path_id"],
            "stages": [
                StageInput(
                    title="Chặng hai",
                    groups=[GroupInput(title="Tổng hợp", course_ids=[courses[1].id])],
                )
            ],
        }
    )
    edited = await path_service.create(
        edited_data, users[1].id, version_id=initial["id"]
    )
    assert edited["id"] == initial["id"] and edited["version"] == 1
    assert edited["stages"][0]["groups"][0]["options"][0]["course_id"] == courses[1].id
    await path_service.publish(edited["id"])
    with pytest.raises(HTTPException) as error:
        await path_service.create(edited_data, users[1].id, version_id=edited["id"])
    assert error.value.status_code == 409
    service = BundleService(db)
    bundle = await service.create(
        BundleInput(title="Draft combo", price=0), users[1].id
    )
    with pytest.raises(HTTPException):
        await service.publish(bundle["id"])
    updated = await service.create(
        BundleInput(
            bundle_id=bundle["bundle_id"],
            title="Updated combo",
            description="Giới thiệu combo chính thức để xuất bản.",
            price=50000,
            course_ids=[courses[0].id],
        ),
        users[1].id,
        version_id=bundle["id"],
    )
    assert updated["id"] == bundle["id"] and len(updated["items"]) == 1
    await service.publish(updated["id"])
    with pytest.raises(HTTPException):
        await service.create(
            BundleInput(bundle_id=bundle["bundle_id"], title="Cannot edit", price=0),
            users[1].id,
            version_id=bundle["id"],
        )


async def test_coupon_exact_allocation_receipt_retry_and_refund(fixture):
    from app.db.models.learning_paths import BundleOrder

    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    coupon = await make_coupon(db, version, users[1].id)
    quote = await service.quote(
        version["id"], users[0].id, coupon_code=coupon["code"].lower()
    )
    assert Decimal(quote["discount_amount"]) == 25000
    assert Decimal(quote["total"]) == 125000
    assert sum(Decimal(i["payable"]) for i in quote["items"]) == 125000
    request = BundleCheckout(
        version_id=version["id"],
        quote_hash=quote["quote_hash"],
        idempotency_key=uuid4(),
        coupon_code=coupon["code"],
    )
    receipt = await service.checkout(request, users[0].id)
    assert (
        receipt["coupon_code"] == coupon["code"] and receipt["discount_amount"] == 25000
    )
    assert sum(line["paid"] for line in receipt["lines"]) == receipt["total_paid"]
    assert (await service.checkout(request, users[0].id))["id"] == receipt["id"]
    assert (
        await db.scalar(
            select(func.count())
            .select_from(BundleOrder)
            .where(BundleOrder.coupon_id == coupon["id"])
        )
        == 1
    )
    line = await db.scalar(
        select(BundleOrderLine)
        .where(BundleOrderLine.order_id == receipt["id"], BundleOrderLine.paid > 0)
        .limit(1)
    )
    wallet = await db.scalar(select(Wallets).where(Wallets.user_id == users[0].id))
    before_refund = wallet.balance
    settlement = BundleSettlement(db)
    refund = await settlement.request(
        line, users[0].id, "Khóa học không phù hợp với nhu cầu"
    )
    await settlement.review(
        line, refund["refund_id"], line.instructor_id, "LECTURER", "approve"
    )
    await db.refresh(wallet)
    assert wallet.balance == before_refund + line.paid
    from app.services.bundle_coupons import BundleCouponService

    with pytest.raises(HTTPException):
        await BundleCouponService(db).resolve(
            version["bundle_id"], coupon["code"], Decimal(150000), users[0].id
        )
    assert (
        await db.scalar(
            select(func.count())
            .select_from(BundleOrder)
            .where(BundleOrder.coupon_id == coupon["id"])
        )
        == 1
    )


async def test_coupon_owned_credit_precedes_discount(fixture):
    db, users, courses, _, _ = fixture
    service, version = await published_bundle(fixture)
    db.add(
        CourseEnrollments(
            user_id=users[0].id,
            course_id=courses[0].id,
            status="active",
            progress=0,
            enrolled_at=now(),
        )
    )
    await db.flush()
    coupon = await make_coupon(
        db,
        version,
        users[1].id,
        discount_type="fixed",
        value=20000,
        max_discount=None,
        min_total=100000,
    )
    quote = await service.quote(version["id"], users[0].id, coupon_code=coupon["code"])
    assert Decimal(quote["owned_credit"]) == 50000
    assert Decimal(quote["subtotal"]) == 100000 and Decimal(quote["total"]) == 80000
    assert (
        quote["items"][0]["already_owned"]
        and Decimal(quote["items"][0]["payable"]) == 0
    )
    request = BundleCheckout(
        version_id=version["id"],
        quote_hash=quote["quote_hash"],
        idempotency_key=uuid4(),
        coupon_code=coupon["code"],
    )
    receipt = await service.checkout(request, users[0].id)
    assert receipt["total_paid"] == 80000


async def test_coupon_scope_expiry_pause_minimum_and_quote_tampering(fixture):
    from datetime import UTC, datetime

    from app.services.bundle_coupons import BundleCouponService

    db, users, _, _, _ = fixture
    uid, admin_id = users[0].id, users[1].id
    service, version = await published_bundle(fixture)
    coupon_service = BundleCouponService(db)
    coupon = await make_coupon(db, version, admin_id)
    quote = await service.quote(version["id"], uid, coupon_code=coupon["code"])
    request = BundleCheckout(
        version_id=version["id"],
        quote_hash=quote["quote_hash"],
        idempotency_key=uuid4(),
    )
    with pytest.raises(HTTPException) as error:
        await service.checkout(request, uid)
    assert error.value.status_code == 409
    await coupon_service.active(version["bundle_id"], coupon["id"], False)
    with pytest.raises(HTTPException):
        await service.quote(version["id"], uid, coupon_code=coupon["code"])
    await coupon_service.active(version["bundle_id"], coupon["id"], True)
    other = await service.create(BundleInput(title="Other combo", price=0), admin_id)
    with pytest.raises(HTTPException):
        await coupon_service.resolve(
            other["bundle_id"], coupon["code"], Decimal(150000), uid
        )
    expired = await make_coupon(
        db,
        version,
        admin_id,
        starts_at=datetime.now(UTC) - timedelta(days=2),
        ends_at=datetime.now(UTC) - timedelta(days=1),
    )
    with pytest.raises(HTTPException):
        await service.quote(version["id"], uid, coupon_code=expired["code"])
    minimum = await make_coupon(db, version, admin_id, min_total=200000)
    with pytest.raises(HTTPException):
        await service.quote(version["id"], uid, coupon_code=minimum["code"])


async def test_last_coupon_use_concurrent_buyers(async_engine):
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.db.models.learning_paths import BundleOrder

    factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with factory() as db:
        fixture = await setup_fixture(db)
        service, version = await published_bundle(fixture)
        second = User(
            fullname="Second buyer",
            email=uuid4().hex + "@test.invalid",
            password="!disabled",
        )
        db.add(second)
        await db.flush()
        db.add(
            Wallets(
                user_id=second.id,
                balance=1000000,
                total_in=1000000,
                total_out=0,
                currency="VND",
                is_locked=False,
            )
        )
        coupon = await make_coupon(db, version, fixture[1][1].id, max_uses=1)
        users = [fixture[1][0].id, second.id]
        requests = []
        for uid in users:
            quote = await service.quote(version["id"], uid, coupon_code=coupon["code"])
            requests.append(
                BundleCheckout(
                    version_id=version["id"],
                    quote_hash=quote["quote_hash"],
                    idempotency_key=uuid4(),
                    coupon_code=coupon["code"],
                )
            )
        await db.commit()

    async def buy(request, uid):
        async with factory() as db:
            return await BundleService(db).checkout(request, uid)

    results = await asyncio.gather(
        *(buy(req, uid) for req, uid in zip(requests, users)), return_exceptions=True
    )
    assert sum(isinstance(r, dict) for r in results) == 1
    assert (
        sum(isinstance(r, HTTPException) and r.status_code == 422 for r in results) == 1
    )
    async with factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(BundleOrder)
                .where(BundleOrder.coupon_id == coupon["id"])
            )
            == 1
        )


@pytest.mark.parametrize("discount_type,value", [("percent", 100), ("fixed", 999999)])
async def test_coupon_can_reduce_total_to_zero_without_negative_lines(
    fixture, discount_type, value
):
    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    coupon = await make_coupon(
        db,
        version,
        users[1].id,
        discount_type=discount_type,
        value=value,
        max_discount=None,
    )
    quote = await service.quote(version["id"], users[0].id, coupon_code=coupon["code"])
    assert Decimal(quote["total"]) == 0 and Decimal(quote["discount_amount"]) == 150000
    receipt = await service.checkout(
        BundleCheckout(
            version_id=version["id"],
            quote_hash=quote["quote_hash"],
            idempotency_key=uuid4(),
            coupon_code=coupon["code"],
        ),
        users[0].id,
    )
    assert receipt["total_paid"] == 0
    assert all(
        line["paid"] == 0
        and line["earning_id"] is None
        and line["purchase_item_id"] is None
        for line in receipt["lines"]
    )


async def test_archived_roots_and_hidden_sales_preserve_existing_rights(fixture):
    from datetime import UTC, datetime

    from app.db.models.learning_paths import CourseBundle

    db, users, _, _, _ = fixture
    service, version = await published_bundle(fixture)
    _, receipt = await checkout(service, version, users[0].id)
    root = await db.get(CourseBundle, version["bundle_id"])
    root.is_active = False
    await db.flush()
    assert all(v["bundle_id"] != root.id for v in (await service.listing())["items"])
    assert (await service.receipt(receipt["id"], users[0].id))["total_paid"] == 150000
    with pytest.raises(HTTPException):
        await service.quote(version["id"], users[0].id)
    root.deleted_at = datetime.now(UTC)
    await db.flush()
    assert all(
        v["bundle_id"] != root.id for v in (await service.listing(admin=True))["items"]
    )


async def test_student_analytics_uses_actual_activity_and_no_placeholder_rate(fixture):
    from app.db.models.database import LessonActive, Lessons, LessonTypeEnum
    from app.services.lecturer.statistics import LecturerStatisticsService

    db, users, courses, _, _ = fixture
    db.add(
        CourseEnrollments(
            user_id=users[0].id, course_id=courses[0].id, status="active", progress=0
        )
    )
    await db.flush()
    analytics = LecturerStatisticsService(db)
    initial = await analytics.get_student_analytics_async(users[1])
    assert initial.total_new_students == 1 and initial.active_students == 0
    assert "retention_rate" not in initial.model_dump()
    lesson = Lessons(
        course_id=courses[0].id,
        title="Actual lesson",
        lesson_type=LessonTypeEnum.ARTICLE,
        position=1,
    )
    db.add(lesson)
    await db.flush()
    db.add(
        LessonActive(
            user_id=users[0].id,
            course_id=courses[0].id,
            lesson_id=lesson.id,
            activated_at=now(),
        )
    )
    await db.flush()
    assert (await analytics.get_student_analytics_async(users[1])).active_students == 1


@pytest.mark.parametrize("all_free", [False, True])
async def test_free_courses_in_bundle_do_not_create_zero_value_transactions(
    fixture, all_free
):
    db, users, courses, _, _ = fixture
    courses[0].base_price = 0
    if all_free:
        courses[1].base_price = 0
    await db.flush()
    service = BundleService(db)
    draft = await service.create(
        BundleInput(
            title="Free course bundle",
            price=0 if all_free else 150000,
            description="Nội dung đủ dài của combo chính thức.",
            course_ids=[c.id for c in courses],
        ),
        users[1].id,
    )
    version = await service.publish(draft["id"])
    _, receipt = await checkout(service, version, users[0].id)
    assert len(receipt["lines"]) == 2
    assert sum(line["paid"] for line in receipt["lines"]) == (0 if all_free else 150000)
    assert len([line for line in receipt["lines"] if line["purchase_item_id"]]) == (
        0 if all_free else 1
    )
    assert (
        await db.scalar(
            select(func.count())
            .select_from(CourseEnrollments)
            .where(
                CourseEnrollments.user_id == users[0].id,
                CourseEnrollments.status == "active",
            )
        )
        == 2
    )
