from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.user.coins import (
    CoinBalancesResponse,
    CoinRateResponse,
    ExchangeWhiteRequest,
    ExchangeWhiteResponse,
)
from app.services.coin_math import BONUS_MAX_COINS_SHARE
from app.services.coin_service import CoinService
from app.services.coupon_settlement import billing_policy

router = APIRouter(prefix="/coins", tags=["USER COINS"])


@router.get("/rate", response_model=CoinRateResponse)
async def get_coin_rate(
    db: AsyncSession = Depends(get_session),
):
    policy = await billing_policy(db)
    return CoinRateResponse(
        rate_vnd=policy.coin_vnd_rate,
        bonus_max_share=float(BONUS_MAX_COINS_SHARE),
    )


@router.get("", response_model=CoinBalancesResponse)
async def get_coin_balances(
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: CoinService = Depends(CoinService),
):
    user = await authorization.get_current_user()
    balances = await service.get_balances_async(user.id)
    policy = await billing_policy(service.db)
    return CoinBalancesResponse(
        bonus=balances.bonus, paid=balances.paid, total=balances.bonus + balances.paid,
        rate_vnd=policy.coin_vnd_rate, bonus_max_share=float(BONUS_MAX_COINS_SHARE),
    )


@router.post("/exchange-white", response_model=ExchangeWhiteResponse)
async def exchange_gold_to_white(
    payload: ExchangeWhiteRequest,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: CoinService = Depends(CoinService),
):
    user = await authorization.get_current_user()
    white_gained, balances = await service.exchange_gold_to_white_async(user.id, payload.gold_amount)
    await service.db.commit()
    return ExchangeWhiteResponse(
        gold_spent=payload.gold_amount,
        white_gained=white_gained,
        paid=balances.paid,
        bonus=balances.bonus,
        total=balances.paid + balances.bonus,
    )
