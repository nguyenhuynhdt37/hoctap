import pytest
from pydantic import ValidationError

from app.schemas.admin.platform_settings import UpdateSettingsSchema


def test_admin_can_set_valid_coin_settings():
    body = UpdateSettingsSchema(coin_vnd_rate=10000, bonus_coin_max_share=0.5)
    assert body.coin_vnd_rate == 10000 and float(body.bonus_coin_max_share) == 0.5


@pytest.mark.parametrize("field,value", [
    ("coin_vnd_rate", 0), ("coin_vnd_rate", -5), ("bonus_coin_max_share", 1.5), ("bonus_coin_max_share", -0.1),
])
def test_admin_cannot_set_invalid_coin_settings(field, value):
    with pytest.raises(ValidationError):
        UpdateSettingsSchema(**{field: value})


@pytest.mark.asyncio
async def test_coin_balance_endpoint_is_registered_and_requires_authentication():
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/api/v1/coins")).status_code == 401
