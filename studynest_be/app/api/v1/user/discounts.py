from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import AuthorizationService
from app.db.models.database import User
from app.schemas.shares.discounts import ApplyDiscountRequest, DiscountAvailableRequest
from app.services.shares.discounts import DiscountService

router = APIRouter(prefix="/users/discounts", tags=["User Discounts"])


@router.get("/my-vault")
async def get_my_voucher_vault(
    service: DiscountService = Depends(DiscountService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """Kho mã giảm giá của tôi (mã thưởng cá nhân + mã ưu đãi công khai + thống kê tiết kiệm)."""
    user = await authorization.require_role(["USER"])
    return await service.get_my_voucher_vault_async(user_id=user.id)


@router.post("/personal/{instance_id}/reveal")
async def reveal_personal_coupon(
    instance_id: UUID,
    service: DiscountService = Depends(DiscountService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """Giải mã mã thưởng cá nhân cho đúng chủ sở hữu để sao chép và áp dụng."""
    user = await authorization.require_role(["USER"])
    return await service.reveal_personal_coupon_async(
        user_id=user.id, instance_id=instance_id
    )


@router.post("/available")
async def list_available_discounts(
    body: DiscountAvailableRequest,
    service: DiscountService = Depends(DiscountService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.require_role(["USER"])

    return await service.get_available_discounts(
        user_id=user.id,
        course_ids=body.course_ids,
    )


@router.post("/apply")
async def apply_discount(
    schema: ApplyDiscountRequest,
    service: DiscountService = Depends(DiscountService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    """
    Tính giảm giá cho nhiều khóa học hoặc 1 khóa.
    Không ghi DB — chỉ preview.
    """

    if not schema.course_ids:
        raise HTTPException(400, "Danh sách khóa học rỗng")
    user: User = await authorization.require_role(["USER"])
    result = await service.calculate_discount_apply(
        user_id=user.id,
        course_ids=schema.course_ids,
        discount_input=schema.discount_input,
    )

    return result
