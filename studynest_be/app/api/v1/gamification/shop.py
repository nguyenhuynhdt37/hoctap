from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.gamification.rate_limit import limit_action
from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.gamification.shop import (
    Equipment,
    EquipRequest,
    ItemKind,
    LevelsOverview,
    PurchaseRequest,
    PurchaseResult,
    ShopInventory,
    ShopOverview,
)
from app.services.gamification.shop_service import ShopService


class ShopRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def localized_validation(request: Request):
            try:
                return await handler(request)
            except RequestValidationError as exc:
                errors = [{"loc": list(error["loc"]), "msg": "Giá trị không hợp lệ hoặc bị thiếu."}
                          for error in exc.errors()]
                raise HTTPException(422, errors) from None

        return localized_validation


async def current_user_id(authorization: Annotated[AuthorizationService, Depends()]) -> UUID:
    return (await authorization.get_current_user()).id


router = APIRouter(prefix="/gamification", tags=["Cấp độ và Cửa hàng Mây"], route_class=ShopRoute)
CurrentUserId = Annotated[UUID, Depends(current_user_id)]
Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("/levels", response_model=LevelsOverview, summary="Xem cấp độ và lịch thưởng")
async def levels(
    user_id: CurrentUserId, db: Session,
    start: Annotated[int | None, Query(alias="from", ge=1)] = None,
    count: Annotated[int, Query(ge=1, le=50)] = 12,
) -> LevelsOverview:
    return await ShopService(db).levels(user_id, start=start, count=count)


@router.get("/shop/items", response_model=ShopOverview, summary="Xem vật phẩm trong Cửa hàng Mây")
async def catalog(user_id: CurrentUserId, db: Session, kind: ItemKind | None = None) -> ShopOverview:
    return await ShopService(db).catalog(user_id, kind)


@router.post("/shop/items/{item_id}/purchase", response_model=PurchaseResult, summary="Đổi Coin lấy vật phẩm")
async def purchase(item_id: UUID, body: PurchaseRequest, user_id: CurrentUserId, db: Session) -> PurchaseResult:
    await limit_action(user_id, "shop-purchase", "Bạn gửi yêu cầu mua quá nhanh. Vui lòng thử lại sau.")
    return await ShopService(db).purchase(user_id, item_id, body.idempotency_key)


@router.get("/inventory", response_model=ShopInventory, summary="Xem kho vật phẩm của bạn")
async def inventory(user_id: CurrentUserId, db: Session) -> ShopInventory:
    return await ShopService(db).inventory(user_id)


@router.put("/equipment", response_model=Equipment, summary="Trang bị hoặc tháo vật phẩm")
async def equip(body: EquipRequest, user_id: CurrentUserId, db: Session) -> Equipment:
    return await ShopService(db).equip(user_id, body)
