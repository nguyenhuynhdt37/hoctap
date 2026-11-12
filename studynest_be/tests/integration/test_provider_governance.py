"""Provider governance against an explicit disposable PostgreSQL database."""

import asyncio
import os
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from app.api.v1.catalog import router
from app.api.v1.shares.notification import router as notifications_router
from app.core.deps import AuthorizationService
from app.db.models.catalog import Provider, ProviderCreationRequest, ProviderMember
from app.db.models.database import Notifications, Role, User, UserRoles
from app.db.sesson import get_session
from app.schemas.catalog import (
    MemberInput,
    ProviderAdminInput,
    ProviderCreationRequestInput,
    ProviderRequestDecision,
)
from app.services.catalog import CatalogService
from app.services.providers import ProviderService
from app.services.shares.notification import NotificationService
from fastapi import FastAPI, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("TEST_DATABASE_ASYNC_URL"),
        reason="Requires explicit disposable DB",
    ),
]


def proposal(name=None):
    return ProviderCreationRequestInput(
        name=name or f"Trung tâm {uuid4().hex}",
        description="Đơn vị giáo dục phục vụ học sinh phổ thông.",
        contact_email="contact@example.com",
        reason="Tôi là giảng viên phụ trách và đề nghị xác minh đơn vị.",
        website_url="https://example.com",
    )


@pytest_asyncio.fixture
async def ctx(async_engine, monkeypatch):
    factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with factory() as db:
        roles = {}
        for label in ["ADMIN", "LECTURER", "USER"]:
            role = await db.scalar(select(Role).where(Role.role_name == label))
            if not role:
                role = Role(id=uuid4(), role_name=label)
                db.add(role)
                await db.flush()
            roles[label] = role
        actors = {}
        for label, role in [
            ("lecturer", "LECTURER"),
            ("other", "LECTURER"),
            ("admin", "ADMIN"),
            ("admin2", "ADMIN"),
            ("learner", "USER"),
        ]:
            user = User(
                id=uuid4(),
                fullname=f"Governance {label}",
                email=f"{uuid4().hex}@example.com",
                password="test-only",
                is_banned=False,
                is_verified_email=True,
            )
            db.add(user)
            await db.flush()
            db.add(UserRoles(user_id=user.id, role_id=roles[role].id))
            actors[label] = user
        await db.commit()
        sent = []

        async def publish(service, notification):
            # Every realtime event must already be durable to another connection.
            async with factory() as observer:
                assert await observer.get(Notifications, notification.id)
            sent.append(notification)
            return notification

        monkeypatch.setattr(NotificationService, "publish_notification_async", publish)
        app = FastAPI()
        app.include_router(router)
        app.include_router(notifications_router)

        async def session():
            async with factory() as request_db:
                yield request_db

        class Auth:
            def __init__(self, request: Request):
                self.actor = request.headers.get("x-test-actor")

            async def get_current_user(self):
                if self.actor not in actors:
                    raise HTTPException(401, "Login required")
                return actors[self.actor]

            async def get_list_role_in_user(self, user):
                return (
                    ["ADMIN"]
                    if user.id in [actors["admin"].id, actors["admin2"].id]
                    else ["USER"]
                    if user.id == actors["learner"].id
                    else ["LECTURER"]
                )

            async def require_role(self, allowed):
                user = await self.get_current_user()
                if not set(allowed) & set(await self.get_list_role_in_user(user)):
                    raise HTTPException(403, "Forbidden")
                return user

        app.dependency_overrides[get_session] = session
        app.dependency_overrides[AuthorizationService] = Auth
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield SimpleNamespace(
                db=db,
                service=ProviderService(db),
                factory=factory,
                actors=actors,
                client=client,
                sent=sent,
            )


def as_actor(actor):
    return {"x-test-actor": actor}


async def test_directory_filters_sort_and_verified_visibility(ctx):
    province = f"Tỉnh kiểm thử {uuid4().hex}"
    prefix = f"Filter {uuid4().hex}"
    rows = [Provider(name=f"{prefix} {letter}", slug=f"filter-{uuid4().hex}", province=province, school_code=f"code-{letter}", provider_type=kind, verification_status=verification, is_active=True) for letter, kind, verification in [("A", "school", "verified"), ("B", "exam_center", "verified"), ("C", "school", "pending")]]
    ctx.db.add_all(rows)
    await ctx.db.commit()
    url = "/lecturer/provider-directory"
    response = await ctx.client.get(url, headers=as_actor("lecturer"), params={"province": province, "sort": "name_desc"})
    assert response.status_code == 200
    assert [row["name"] for row in response.json()["items"]] == [f"{prefix} B", f"{prefix} A"]
    response = await ctx.client.get(url, headers=as_actor("lecturer"), params={"province": province, "provider_type": "school", "verification_status": "pending"})
    assert response.json()["total"] == 1 and response.json()["items"][0]["verification_status"] == "verified"
    response = await ctx.client.get(url, headers=as_actor("lecturer"), params={"province": province, "search": "code-A"})
    assert response.json()["total"] == 1
    response = await ctx.client.get("/admin/providers", headers=as_actor("admin"), params={"province": province, "verification_status": "pending"})
    assert response.json()["total"] == 1 and response.json()["items"][0]["name"] == f"{prefix} C"
    assert (await ctx.client.get(url, headers=as_actor("lecturer"), params={"sort": "invalid"})).status_code == 422


async def test_lecturer_can_join_multiple_units_independently(ctx):
    from app.services.provider_joins import ProviderJoinService, JoinInput, JoinDecision
    service = ProviderJoinService(ctx.db)
    ids = []
    for _ in range(2):
        row = Provider(name=f"THPT multi {uuid4().hex}", slug=f"multi-{uuid4().hex}", provider_type="school", verification_status="verified", is_active=True)
        ctx.db.add(row)
        await ctx.db.commit()
        ids.append(str(row.id))
        request = await service.submit_join(JoinInput(provider_id=row.id, position="Giáo viên Toán", evidence="Giảng viên đang công tác tại tổ Toán; đề nghị kiểm tra danh sách nhân sự của đơn vị.", current_employment_confirmed=True), ctx.actors["lecturer"].id)
        await service.decide_join(request["id"], JoinDecision(decision="approved", employment_checked=True, review_note="Đã kiểm tra thông tin nhân sự và công tác."), ctx.actors["admin"].id)
    own = await ctx.client.get("/lecturer/providers", headers=as_actor("lecturer"))
    assert set(ids).issubset({row["id"] for row in own.json()["items"]})
    await ctx.service.member(__import__('uuid').UUID(ids[0]), MemberInput(user_id=ctx.actors["lecturer"].id, status="inactive", reason="Ngừng công tác tại đơn vị thứ nhất"), ctx.actors["admin"].id, admin=True)
    own = await ctx.client.get("/lecturer/providers", headers=as_actor("lecturer"))
    remaining = {row["id"] for row in own.json()["items"]}
    assert ids[0] not in remaining and ids[1] in remaining


async def test_join_notification_failure_rolls_back_access_and_decision(ctx, monkeypatch):
    from app.services.provider_joins import ProviderJoinService, JoinInput, JoinDecision
    from app.db.models.catalog import ProviderJoinRequest
    school = Provider(name=f"THPT atomic {uuid4().hex}", slug=f"join-atomic-{uuid4().hex}", provider_type="school", verification_status="verified", is_active=True)
    ctx.db.add(school)
    await ctx.db.commit()
    school_id, user_id, admin_id = school.id, ctx.actors["lecturer"].id, ctx.actors["admin"].id
    service = ProviderJoinService(ctx.db)
    request = await service.submit_join(JoinInput(provider_id=school_id, position="Giáo viên Toán", evidence="Đề nghị đối chiếu tên giảng viên trên trang nhân sự chính thức của nhà trường.", current_employment_confirmed=True), user_id)
    original = service.join_notice
    async def fail_notice(*args, **kwargs):
        raise RuntimeError("simulated durable notification failure")
    monkeypatch.setattr(service, "join_notice", fail_notice)
    with pytest.raises(RuntimeError):
        await service.decide_join(request["id"], JoinDecision(decision="approved", employment_checked=True, review_note="Đã kiểm tra danh sách nhân sự chính thức."), admin_id)
    async with ctx.factory() as observer:
        assert (await observer.get(ProviderJoinRequest, request["id"])).status == "pending"
        assert not await observer.get(ProviderMember, (school_id, user_id))
    monkeypatch.setattr(service, "join_notice", original)
    rejected = await service.decide_join(request["id"], JoinDecision(decision="rejected", review_note="Chưa đủ căn cứ xác minh công tác tại trường."), admin_id)
    assert rejected["status"] == "rejected"
    assert not await ctx.db.get(ProviderMember, (school_id, user_id))


async def test_employment_join_requires_admin_verification_and_is_atomic(ctx):
    from app.db.models.catalog import ProviderJoinRequest, ProviderMembershipEvent
    school = Provider(name=f"THPT join {uuid4().hex}", slug=f"join-{uuid4().hex}", provider_type="school", verification_status="verified", is_active=True)
    ctx.db.add(school)
    await ctx.db.commit()
    payload = {"provider_id": str(school.id), "position": "Giảng viên Toán", "work_email": "teacher@example.com", "evidence": "Tôi đang công tác tại tổ Toán, có tên trên danh sách nhân sự chính thức của đơn vị.", "current_employment_confirmed": True}
    submit = await ctx.client.post("/lecturer/provider-join-requests", json=payload, headers=as_actor("lecturer"))
    assert submit.status_code == 200
    request_id = submit.json()["id"]
    assert not await ctx.db.get(ProviderMember, (school.id, ctx.actors["lecturer"].id))
    duplicate = await ctx.client.post("/lecturer/provider-join-requests", json=payload, headers=as_actor("lecturer"))
    assert duplicate.status_code == 409
    other = await ctx.client.get("/lecturer/provider-join-requests", headers=as_actor("other"))
    assert request_id not in [row["id"] for row in other.json()["items"]]
    decision_url = f"/admin/provider-join-requests/{request_id}/decision"
    decision = {"decision": "approved", "review_note": "Đã đối chiếu danh sách nhân sự chính thức.", "employment_checked": False}
    forbidden = await ctx.client.post(decision_url, json=decision, headers=as_actor("lecturer"))
    assert forbidden.status_code == 403
    unchecked = await ctx.client.post(decision_url, json=decision, headers=as_actor("admin"))
    assert unchecked.status_code == 422
    decision["employment_checked"] = True
    school.verification_status = "pending"
    await ctx.db.commit()
    unverified = await ctx.client.post(decision_url, json=decision, headers=as_actor("admin"))
    assert unverified.status_code == 409
    school.verification_status = "verified"
    await ctx.db.commit()
    results = await asyncio.gather(*[ctx.client.post(decision_url, json=decision, headers=as_actor(actor)) for actor in ["admin", "admin2"]])
    assert sorted(row.status_code for row in results) == [200, 409]
    async with ctx.factory() as observer:
        row = await observer.get(ProviderJoinRequest, request_id)
        assert row.status == "approved" and row.reviewed_by is not None
        member = await observer.get(ProviderMember, (school.id, ctx.actors["lecturer"].id))
        assert member.status == "active"
        events = (await observer.scalars(select(ProviderMembershipEvent).where(ProviderMembershipEvent.provider_id == school.id))).all()
        assert len(events) == 1 and events[0].details["request_id"] == request_id
    assert any(n.title == "Đã duyệt gia nhập đơn vị" for n in ctx.sent)


async def test_employment_join_cancel_is_private_and_not_reusable(ctx):
    school = Provider(name=f"Trường join cancel {uuid4().hex}", slug=f"join-cancel-{uuid4().hex}", provider_type="school", verification_status="verified", is_active=True)
    ctx.db.add(school)
    await ctx.db.commit()
    payload = {"provider_id": str(school.id), "position": "Giáo viên Hóa", "evidence": "Tôi là giáo viên tổ Hóa đang công tác, đề nghị admin đối chiếu thông tin.", "current_employment_confirmed": True}
    denied = await ctx.client.post("/lecturer/provider-join-requests", json=payload, headers=as_actor("learner"))
    assert denied.status_code == 403
    response = await ctx.client.post("/lecturer/provider-join-requests", json=payload, headers=as_actor("lecturer"))
    request_id = response.json()["id"]
    url = f"/lecturer/provider-join-requests/{request_id}/cancel"
    assert (await ctx.client.post(url, headers=as_actor("other"))).status_code == 404
    assert (await ctx.client.post(url, headers=as_actor("lecturer"))).status_code == 200
    assert (await ctx.client.post(url, headers=as_actor("lecturer"))).status_code == 409
    decision = {"decision": "approved", "review_note": "Đã đối chiếu thông tin công tác.", "employment_checked": True}
    assert (await ctx.client.post(f"/admin/provider-join-requests/{request_id}/decision", json=decision, headers=as_actor("admin"))).status_code == 409
    assert not await ctx.db.get(ProviderMember, (school.id, ctx.actors["lecturer"].id))


async def test_provider_images_admin_only_and_decoded(ctx, monkeypatch):
    from io import BytesIO
    from unittest.mock import AsyncMock
    from PIL import Image
    from app.services.shares import file_storage

    storage = AsyncMock()
    storage.upload_file.return_value = {"url": "/api/storage/files/public/providers/catalog/avatars/test.webp", "provider": "r2"}
    monkeypatch.setattr(file_storage, "get_file_storage_service", lambda: storage)
    image = BytesIO()
    Image.new("RGB", (64, 64), "blue").save(image, "PNG")
    for actor in ["lecturer", "learner"]:
        response = await ctx.client.post("/admin/providers/assets/avatar", headers=as_actor(actor), files={"file": ("x.png", image.getvalue(), "image/png")})
        assert response.status_code == 403
    response = await ctx.client.post("/admin/providers/assets/avatar", headers=as_actor("admin"), files={"file": ("x.png", b"<svg/>", "image/png")})
    assert response.status_code == 422
    storage.upload_file.assert_not_called()
    response = await ctx.client.post("/admin/providers/assets/avatar", headers=as_actor("admin"), files={"file": ("x.png", image.getvalue(), "image/png")})
    assert response.status_code == 200 and response.json()["provider"] == "r2"
    assert storage.upload_file.call_args.args[0] == ["providers", "catalog", "avatars"]


async def test_pending_school_directory_visibility(ctx):
    school = Provider(name=f"THPT {uuid4().hex}", slug=f"directory-{uuid4().hex}", provider_type="school", province="Hà Nội", verification_status="pending", is_active=True)
    ctx.db.add(school)
    await ctx.db.commit()
    directory = await ctx.client.get("/lecturer/provider-directory", headers=as_actor("lecturer"), params={"search": school.name})
    assert directory.status_code == 200 and directory.json()["total"] == 0
    public = await ctx.client.get("/providers", params={"search": school.name})
    assert public.json()["total"] == 0
    own = await ctx.client.get("/lecturer/providers", headers=as_actor("lecturer"))
    assert str(school.id) not in [row["id"] for row in own.json()["items"]]


async def test_submission_is_not_a_provider_and_notifications_are_atomic(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    assert request["status"] == "pending" and request["provider_id"] is None
    assert not await ctx.db.scalar(
        select(Provider.id).where(Provider.name == request["name"])
    )
    notices = [n for n in ctx.sent if n.metadata_["request_id"] == str(request["id"])]
    assert len(notices) == 2
    assert any(n.user_id is None and n.role_target == ["ADMIN"] for n in notices)
    assert any(n.user_id == ctx.actors["lecturer"].id for n in notices)
    assert "normalized_name" not in request


async def test_private_requests_and_admin_only_mutations(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    payload = {"name": "Illegal center", "slug": "", "provider_type": "center"}
    cases = [
        ("post", "/lecturer/providers", payload),
        ("put", f"/lecturer/providers/{uuid4()}", payload),
        ("post", "/admin/providers", payload),
        (
            "post",
            f"/admin/provider-requests/{request['id']}/decision",
            {"decision": "approved"},
        ),
        (
            "put",
            f"/providers/{uuid4()}/members",
            {"user_id": str(ctx.actors["lecturer"].id), "status": "active"},
        ),
    ]
    for method, url, data in cases:
        response = await getattr(ctx.client, method)(
            url, json=data, headers=as_actor("lecturer")
        )
        assert response.status_code == 403, response.text
    for url in [
        f"/lecturer/provider-requests/{request['id']}",
        f"/lecturer/provider-requests/{request['id']}/cancel",
    ]:
        response = await (
            ctx.client.post(url, headers=as_actor("other"))
            if url.endswith("/cancel")
            else ctx.client.get(url, headers=as_actor("other"))
        )
        assert response.status_code == 404
    other = await ctx.client.get(
        "/lecturer/provider-requests", headers=as_actor("other")
    )
    assert other.json()["total"] == 0
    for actor in ["learner", None]:
        response = await ctx.client.post(
            "/lecturer/provider-requests",
            json=proposal().model_dump(),
            headers=as_actor(actor) if actor else {},
        )
        assert response.status_code == (403 if actor else 401)


async def test_approval_creates_verified_provider_and_instructor_not_owner(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    result = await ctx.service.decide_request(
        request["id"],
        ProviderRequestDecision(decision="approved", note="Đã xác minh"),
        ctx.actors["admin"].id,
    )
    assert (
        result["status"] == "approved"
        and result["reviewed_by"] == ctx.actors["admin"].id
    )
    provider = await ctx.db.get(Provider, result["provider_id"])
    member = await ctx.db.get(ProviderMember, (provider.id, ctx.actors["lecturer"].id))
    assert (
        provider.verification_status == "verified"
        and member.status == "active"
        and member.granted_by == ctx.actors["admin"].id
    )
    own = await ctx.client.get("/lecturer/providers", headers=as_actor("lecturer"))
    assert any(p["id"] == str(provider.id) for p in own.json()["items"])
    directory = await ctx.client.get(
        "/lecturer/provider-directory",
        params={"search": provider.name},
        headers=as_actor("other"),
    )
    assert directory.json()["items"][0]["is_member"] is False
    with pytest.raises(HTTPException) as denied:
        await CatalogService(ctx.db).provider_permission(
            provider.id, ctx.actors["other"].id
        )
    assert denied.value.status_code == 403
    again = await ctx.client.post(
        f"/admin/provider-requests/{request['id']}/decision",
        json={"decision": "approved"},
        headers=as_actor("admin"),
    )
    assert again.status_code == 409


async def test_reject_reason_cancel_and_resubmit(ctx):
    with pytest.raises(ValidationError):
        ProviderRequestDecision(decision="rejected", note=" ")
    first = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    rejected = await ctx.service.decide_request(
        first["id"],
        ProviderRequestDecision(decision="rejected", note="Thiếu thông tin xác minh"),
        ctx.actors["admin"].id,
    )
    assert (
        rejected["review_note"] == "Thiếu thông tin xác minh"
        and rejected["provider_id"] is None
    )
    second = await ctx.service.submit_request(
        proposal(first["name"]), ctx.actors["lecturer"].id
    )
    await ctx.service.cancel_request(second["id"], ctx.actors["lecturer"].id)
    third = await ctx.service.submit_request(
        proposal(first["name"]), ctx.actors["lecturer"].id
    )
    assert third["status"] == "pending"
    response = await ctx.client.post(
        f"/lecturer/provider-requests/{first['id']}/cancel",
        headers=as_actor("lecturer"),
    )
    assert response.status_code == 409


async def test_duplicate_name_and_concurrent_submission(ctx):
    name = f"Trung tâm   ABC {uuid4().hex}"

    async def submit(actor, title):
        return await ctx.client.post(
            "/lecturer/provider-requests",
            headers=as_actor(actor),
            json=proposal(title).model_dump(),
        )

    results = await asyncio.gather(
        submit("lecturer", name), submit("other", name.upper().replace("   ", " "))
    )
    assert sorted(r.status_code for r in results) == [201, 409]
    normalized = ctx.service.normalized_name(name)
    assert (
        await ctx.db.scalar(
            select(func.count())
            .select_from(ProviderCreationRequest)
            .where(ProviderCreationRequest.normalized_name == normalized)
        )
        == 1
    )


async def test_two_admins_cannot_approve_twice(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)

    async def approve(actor):
        return await ctx.client.post(
            f"/admin/provider-requests/{request['id']}/decision",
            json={"decision": "approved"},
            headers=as_actor(actor),
        )

    results = await asyncio.gather(approve("admin"), approve("admin2"))
    assert sorted(r.status_code for r in results) == [200, 409]
    assert (
        await ctx.db.scalar(
            select(func.count())
            .select_from(Provider)
            .where(Provider.name == request["name"])
        )
        == 1
    )
    assert (
        len(
            [
                n
                for n in ctx.sent
                if n.metadata_["request_id"] == str(request["id"])
                and "được duyệt" in n.title
            ]
        )
        == 1
    )


async def test_admin_can_link_existing_and_membership_revoke_notifies(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    provider = await ctx.service.save(
        ProviderAdminInput(name=request["name"], verification_status="verified"),
        ctx.actors["admin"].id,
        admin=True,
    )
    decision = await ctx.client.post(
        f"/admin/provider-requests/{request['id']}/decision",
        json={"decision": "approved"},
        headers=as_actor("admin"),
    )
    assert decision.status_code == 409
    result = await ctx.service.decide_request(
        request["id"],
        ProviderRequestDecision(decision="approved", provider_id=provider["id"]),
        ctx.actors["admin"].id,
    )
    assert result["provider_id"] == provider["id"]
    await ctx.service.member(
        provider["id"],
        MemberInput(
            user_id=ctx.actors["lecturer"].id,
            status="inactive",
            reason="Kết thúc liên kết giảng dạy",
        ),
        ctx.actors["admin"].id,
        admin=True,
    )
    assert any("thu hồi" in n.content for n in ctx.sent)
    with pytest.raises(HTTPException):
        await CatalogService(ctx.db).provider_permission(
            provider["id"], ctx.actors["lecturer"].id
        )
    lookup = await ctx.client.get(
        "/admin/provider-member-candidates",
        params={"search": ctx.actors["other"].email},
        headers=as_actor("admin"),
    )
    assert lookup.json()["items"][0]["id"] == str(ctx.actors["other"].id)
    users = await ctx.client.get(
        f"/admin/providers/{provider['id']}/members", headers=as_actor("lecturer")
    )
    assert users.status_code == 403


async def test_notification_failure_rolls_back_request(ctx, monkeypatch):
    name = f"Rollback {uuid4().hex}"

    async def fail(*args, **kwargs):
        raise RuntimeError("notification storage unavailable")

    monkeypatch.setattr(NotificationService, "stage_notification_async", fail)
    with pytest.raises(RuntimeError):
        await ctx.service.submit_request(proposal(name), ctx.actors["lecturer"].id)
    async with ctx.factory() as observer:
        assert not await observer.scalar(
            select(ProviderCreationRequest.id).where(
                ProviderCreationRequest.name == name
            )
        )
    assert not ctx.sent


async def test_realtime_failure_keeps_decision_and_durable_notification(
    ctx, monkeypatch
):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)

    async def fail(*args, **kwargs):
        raise RuntimeError("websocket offline")

    monkeypatch.setattr(NotificationService, "publish_notification_async", fail)
    decision = await ctx.service.decide_request(
        request["id"],
        ProviderRequestDecision(decision="approved"),
        ctx.actors["admin"].id,
    )
    assert decision["status"] == "approved"
    assert await ctx.db.scalar(
        select(Notifications.id).where(
            Notifications.metadata_["request_id"].astext == str(request["id"]),
            Notifications.title == "Yêu cầu tạo đơn vị được duyệt",
        )
    )


async def test_pending_hidden_and_admin_notification_read_scope(ctx):
    name = f"Hidden {uuid4().hex}"
    p = await ctx.service.save(
        ProviderAdminInput(name=name, verification_status="pending"),
        ctx.actors["admin"].id,
        admin=True,
    )
    assert not (await ctx.service.listing(search=name))["items"]
    with pytest.raises(HTTPException):
        await ctx.service.detail(p["slug"])
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    admin_notice = next(
        n
        for n in ctx.sent
        if n.user_id is None and n.metadata_["request_id"] == str(request["id"])
    )
    response = await ctx.client.post(
        f"/notifications/read/{admin_notice.id}", headers=as_actor("lecturer")
    )
    assert response.status_code == 404
    response = await ctx.client.post(
        f"/notifications/read/{admin_notice.id}", headers=as_actor("admin")
    )
    assert response.status_code == 200
    response = await ctx.client.post(
        "/notifications/read-all/admin", headers=as_actor("admin")
    )
    assert response.status_code == 200 and response.json()["success"] is True


async def test_strict_schema_rejects_role_status_and_unsafe_url():
    for extra in [
        {"status": "approved"},
        {"reviewed_by": str(uuid4())},
        {"role": "owner"},
        {"website_url": "javascript:alert(1)"},
    ]:
        with pytest.raises(ValidationError):
            ProviderCreationRequestInput(**{**proposal().model_dump(), **extra})


async def test_decision_and_membership_rollback_when_notification_cannot_be_saved(
    ctx, monkeypatch
):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)

    async def fail(*args, **kwargs):
        raise RuntimeError("Cannot persist notification")

    monkeypatch.setattr(NotificationService, "stage_notification_async", fail)
    with pytest.raises(RuntimeError):
        await ctx.service.decide_request(
            request["id"],
            ProviderRequestDecision(decision="approved"),
            ctx.actors["admin"].id,
        )
    async with ctx.factory() as observer:
        current = await observer.get(ProviderCreationRequest, request["id"])
        assert current.status == "pending" and current.provider_id is None
        assert not await observer.scalar(
            select(Provider.id).where(Provider.name == request["name"])
        )


async def test_approval_rechecks_requester_role(ctx):
    from sqlalchemy import delete

    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    await ctx.db.execute(
        delete(UserRoles).where(UserRoles.user_id == ctx.actors["lecturer"].id)
    )
    await ctx.db.commit()
    response = await ctx.client.post(
        f"/admin/provider-requests/{request['id']}/decision",
        json={"decision": "approved"},
        headers=as_actor("admin"),
    )
    assert response.status_code == 409
    assert not await ctx.db.scalar(
        select(Provider.id).where(Provider.name == request["name"])
    )


async def test_rejection_requires_a_reason_even_bypassing_api(ctx):
    from datetime import UTC, datetime

    from sqlalchemy.exc import IntegrityError

    async with ctx.db.begin_nested():
        ctx.db.add(
            ProviderCreationRequest(
                requester_id=ctx.actors["lecturer"].id,
                name="Invalid decision",
                normalized_name=uuid4().hex,
                provider_type="center",
                description="invalid",
                contact_email="test@example.com",
                reason="invalid",
                status="rejected",
                reviewed_by=ctx.actors["admin"].id,
                decided_at=datetime.now(UTC),
                review_note=None,
            )
        )
        with pytest.raises(IntegrityError):
            await ctx.db.flush()


async def test_read_all_admin_never_marks_lecturer_inbox(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    receipt = next(
        n
        for n in ctx.sent
        if n.user_id == ctx.actors["lecturer"].id
        and n.metadata_["request_id"] == str(request["id"])
    )
    result = await ctx.client.post(
        "/notifications/read-all/admin", headers=as_actor("admin")
    )
    assert result.status_code == 200
    async with ctx.factory() as observer:
        assert (await observer.get(Notifications, receipt.id)).is_read is False


async def test_cancel_and_approval_compete_with_one_final_decision(ctx):
    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    approve, cancel = await asyncio.gather(
        ctx.client.post(
            f"/admin/provider-requests/{request['id']}/decision",
            json={"decision": "approved"},
            headers=as_actor("admin"),
        ),
        ctx.client.post(
            f"/lecturer/provider-requests/{request['id']}/cancel",
            headers=as_actor("lecturer"),
        ),
    )
    assert sorted([approve.status_code, cancel.status_code]) == [200, 409]
    async with ctx.factory() as observer:
        final = await observer.get(ProviderCreationRequest, request["id"])
        assert final.status in ["approved", "cancelled"]
        assert bool(final.provider_id) == (final.status == "approved")


async def test_link_permissions_have_no_organization_role_and_require_revoke_reason(
    ctx,
):
    for payload in [
        {"user_id": ctx.actors["lecturer"].id, "role": "owner"},
        {"user_id": ctx.actors["lecturer"].id, "status": "inactive"},
        {"user_id": ctx.actors["lecturer"].id, "status": "inactive", "reason": "  "},
    ]:
        with pytest.raises(ValidationError):
            MemberInput(**payload)
    assert "role" not in ProviderMember.__table__.c


async def test_link_grant_revoke_regrant_keeps_actor_and_immutable_history(ctx):
    from app.db.models.catalog import ProviderMembershipEvent

    user_id, admin_id = ctx.actors["lecturer"].id, ctx.actors["admin"].id
    provider = await ctx.service.save(
        ProviderAdminInput(
            name="Link audit " + uuid4().hex, verification_status="verified"
        ),
        admin_id,
        admin=True,
    )
    await ctx.service.member(
        provider["id"], MemberInput(user_id=user_id), admin_id, admin=True
    )
    member = await ctx.db.get(ProviderMember, (provider["id"], user_id))
    assert (
        member.granted_by == admin_id
        and member.granted_at
        and member.revoked_at is None
    )
    # Idempotent grant must not create an extra audit entry or notice.
    await ctx.service.member(
        provider["id"], MemberInput(user_id=user_id), admin_id, admin=True
    )
    await ctx.service.member(
        provider["id"],
        MemberInput(
            user_id=user_id, status="inactive", reason="Kết thúc đợt giảng dạy"
        ),
        admin_id,
        admin=True,
    )
    assert (
        member.revoked_by == admin_id
        and member.revoked_at
        and member.revocation_reason == "Kết thúc đợt giảng dạy"
    )
    await ctx.service.member(
        provider["id"], MemberInput(user_id=user_id), admin_id, admin=True
    )
    assert member.status == "active" and member.revoked_at is None
    events = (
        await ctx.db.scalars(
            select(ProviderMembershipEvent)
            .where(ProviderMembershipEvent.provider_id == provider["id"])
            .order_by(ProviderMembershipEvent.occurred_at)
        )
    ).all()
    assert [event.action for event in events] == ["granted", "revoked", "granted"]
    assert all(event.actor_id == admin_id for event in events)
    assert events[1].reason == "Kết thúc đợt giảng dạy"
    public = await ctx.client.get(
        f"/admin/providers/{provider['id']}/membership-events",
        headers=as_actor("lecturer"),
    )
    assert public.status_code == 403
    audit = await ctx.client.get(
        f"/admin/providers/{provider['id']}/membership-events?size=1",
        headers=as_actor("admin"),
    )
    assert (
        audit.status_code == 200
        and audit.json()["total"] == 3
        and len(audit.json()["items"]) == 1
    )
    links = await ctx.service.members(provider["id"])
    assert "role" not in links["items"][0]


async def test_approval_grant_is_audited_and_history_failure_rolls_back(
    ctx, monkeypatch
):
    from app.db.models.catalog import ProviderMembershipEvent

    request = await ctx.service.submit_request(proposal(), ctx.actors["lecturer"].id)
    result = await ctx.service.decide_request(
        request["id"],
        ProviderRequestDecision(decision="approved"),
        ctx.actors["admin"].id,
    )
    events = (
        await ctx.db.scalars(
            select(ProviderMembershipEvent).where(
                ProviderMembershipEvent.provider_id == result["provider_id"]
            )
        )
    ).all()
    assert len(events) == 1 and events[0].details["request_id"] == str(request["id"])

    async def fail(*args, **kwargs):
        raise RuntimeError("Audit storage unavailable")

    monkeypatch.setattr(ProviderService, "record_membership_event", fail)
    with pytest.raises(RuntimeError):
        await ctx.service.member(
            result["provider_id"],
            MemberInput(
                user_id=ctx.actors["lecturer"].id, status="inactive", reason="Kết thúc"
            ),
            ctx.actors["admin"].id,
            admin=True,
        )
    async with ctx.factory() as observer:
        member = await observer.get(
            ProviderMember, (result["provider_id"], request["requester_id"])
        )
        assert member.status == "active" and member.revoked_at is None


async def test_admin_and_learner_accounts_cannot_be_granted_lecturer_links(ctx):
    admin_id = ctx.actors["admin"].id
    provider = await ctx.service.save(
        ProviderAdminInput(name="Only teachers " + uuid4().hex), admin_id, admin=True
    )
    for actor in ["admin2", "learner"]:
        response = await ctx.client.put(
            f"/admin/providers/{provider['id']}/members",
            json={"user_id": str(ctx.actors[actor].id), "status": "active"},
            headers=as_actor("admin"),
        )
        assert response.status_code == 422
