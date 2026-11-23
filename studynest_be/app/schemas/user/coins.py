from pydantic import BaseModel, Field


class CoinRateResponse(BaseModel):
    """Tỷ giá quy đổi Coin công khai dùng cho trang hiển thị giá."""

    rate_vnd: int
    bonus_max_share: float

    model_config = {"from_attributes": True}


class CoinBalancesResponse(BaseModel):
    """Số dư Coin của người dùng hiện tại và các quy tắc quy đổi đang áp dụng."""

    bonus: int
    paid: int
    total: int
    rate_vnd: int
    bonus_max_share: float

    model_config = {"from_attributes": True}


class ExchangeWhiteRequest(BaseModel):
    """Yêu cầu đổi đồng vàng sang đồng trắng (1 vàng = 5 trắng)."""

    gold_amount: int = Field(..., ge=1, le=100_000)


class ExchangeWhiteResponse(BaseModel):
    """Kết quả sau khi đổi đồng vàng sang đồng trắng."""

    gold_spent: int
    white_gained: int
    paid: int
    bonus: int
    total: int

    model_config = {"from_attributes": True}
