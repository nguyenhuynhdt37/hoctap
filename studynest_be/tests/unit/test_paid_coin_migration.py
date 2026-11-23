import importlib.util
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "alembic" / "versions" / "am67cd901z234_paid_coin.py"


def load_migration():
    spec = importlib.util.spec_from_file_location("paid_coin_migration", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_paid_coin_revision_follows_daily_checkin_seed_on_a_single_chain():
    scripts = ScriptDirectory.from_config(Config(str(ROOT / "alembic.ini")))
    assert len(scripts.get_heads()) == 1
    assert scripts.get_revision("am67cd901z234").down_revision == "al56bc890y123"


@pytest.mark.asyncio
async def test_convert_wallets_is_idempotent_and_keeps_remainder(db_session):
    from app.db.models.coins import UserPaidCoinBalances
    from app.db.models.database import PeakTransactions, User, Wallets

    user = User(fullname="Học viên", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db_session.add(user)
    await db_session.flush()
    db_session.add(Wallets(user_id=user.id, balance=Decimal("1255000"), currency="VND"))
    await db_session.flush()

    convert = load_migration().convert_wallets
    for _ in range(2):
        await db_session.run_sync(lambda session: convert(session.connection(), 10000))

    paid = await db_session.scalar(select(UserPaidCoinBalances.balance).where(UserPaidCoinBalances.user_id == user.id))
    wallet = await db_session.scalar(select(Wallets).where(Wallets.user_id == user.id))
    rows = (await db_session.scalars(select(PeakTransactions).where(
        PeakTransactions.user_id == user.id, PeakTransactions.source == "wallet_migration"))).all()
    assert paid == 125
    assert wallet.balance == Decimal("5000")
    assert len(rows) == 1 and rows[0].coin_kind == "paid" and rows[0].amount == 125
