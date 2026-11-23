from pydantic import BaseModel


class CoinBalancesResponse(BaseModel):
    """Số dư Coin của người dùng hiện tại và các quy tắc quy đổi đang áp dụng."""

    bonus: int
    paid: int
    total: int
    rate_vnd: int
    bonus_max_share: float

    model_config = {"from_attributes": True}
