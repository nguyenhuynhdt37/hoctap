from decimal import Decimal as D

import pytest
from fastapi import HTTPException

from app.services.coupon_settlement import coupon_cap, settle


@pytest.mark.parametrize(
    "sponsor, reduction, expected",
    [
        ("platform", "150000", ("850000", "150000", "700000")),
        ("instructor", "100000", ("900000", "300000", "600000")),
        (None, "0", ("1000000", "300000", "700000")),
    ],
)
def test_only_the_coupon_sponsor_pays(sponsor, reduction, expected):
    result = settle(D("1000000"), D(".3"), sponsor, D(reduction), fixed=True)
    assert (result.paid, result.platform, result.instructor) == tuple(map(D, expected))
    assert result.platform + result.instructor + result.discount == result.base


@pytest.mark.parametrize("fee", ["0", ".0033", ".3", ".4999", ".9999", "1"])
@pytest.mark.parametrize("price", [".01", ".03", "101.01", "20000000"])
@pytest.mark.parametrize("sponsor", ["platform", "instructor"])
def test_rounding_never_exceeds_caps_or_loses_money(fee, price, sponsor):
    fee, price = D(fee), D(price)
    result = settle(price, fee, sponsor, price, instructor_max=D(55))
    rate = fee / 2 if sponsor == "platform" else min(1 - fee, D(".55"))
    original = settle(price, fee)
    assert D(0) <= result.discount <= rate * price
    assert result.paid + result.discount == price
    assert result.platform + result.instructor == result.paid
    assert result.platform >= 0 and result.instructor >= 0
    if sponsor == "platform":
        assert result.instructor == original.instructor
    else:
        assert result.platform == original.platform


@pytest.mark.parametrize("sponsor, amount, cap", [
    ("platform", "15.01", "15.00"), ("instructor", "50.01", "50.00"),
])
def test_fixed_coupons_above_cap_are_rejected(sponsor, amount, cap):
    assert coupon_cap(D(100), D(".3"), sponsor, D(50)) == D(cap)
    with pytest.raises(HTTPException) as error:
        settle(D(100), D(".3"), sponsor, D(amount), fixed=True, instructor_max=D(50))
    assert error.value.status_code == 422
