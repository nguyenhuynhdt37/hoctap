from fastapi import APIRouter, Depends

from app.core.deps import AuthorizationService
from app.schemas.user.coins import CoinBalancesResponse
from app.services.coin_service import CoinService
from app.services.coupon_settlement import billing_policy

router = APIRouter(prefix="/coins", tags=["USER COINS"])


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
        rate_vnd=policy.coin_vnd_rate, bonus_max_share=float(policy.bonus_coin_max_share),
    )
