"""Làm lại từ đầu phần tiền của DỮ LIỆU THỬ: ví VND về 0, bỏ Coin thật và sổ Coin thật, hủy yêu cầu rút đang chờ.

Không xóa người dùng, khóa học, giao dịch, thu nhập hay Coin thưởng. Mặc định chỉ đếm (dry-run);
cần `--apply` mới ghi. Chỉ dùng cho DB thử: script từ chối chạy `--apply` nếu thiếu cờ `--i-know-this-is-test-data`.

    python scripts/reset_money_test_data.py                # đếm
    python scripts/reset_money_test_data.py --apply --i-know-this-is-test-data
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

COUNTS = {
    "wallets": "SELECT count(*) FROM public.wallets WHERE balance <> 0 OR total_in <> 0 OR total_out <> 0",
    "paid_balances": "SELECT count(*) FROM public.user_paid_coin_balances",
    "paid_ledger": "SELECT count(*) FROM public.peak_transactions WHERE coin_kind = 'paid'",
    "pending_withdrawals": "SELECT count(*) FROM public.withdrawal_requests WHERE status = 'pending'",
    "stuck_withdrawals": (
        "SELECT count(*) FROM public.withdrawal_requests WHERE status IN ('approved', 'payout_pending', 'processing')"
    ),
}

APPLY = (
    "UPDATE public.wallets SET balance = 0, total_in = 0, total_out = 0, updated_at = now() "
    "WHERE balance <> 0 OR total_in <> 0 OR total_out <> 0",
    "DELETE FROM public.user_paid_coin_balances",
    # Sổ Coin thật phải đi cùng số dư: nếu giữ lại các dòng "thu nhập", một lần nạp tiền sau này sẽ bị tính nhầm là rút được.
    "DELETE FROM public.peak_transactions WHERE coin_kind = 'paid'",
    "UPDATE public.withdrawal_requests SET status = 'rejected', rejected_at = now(), "
    "error_message = 'Reset dữ liệu thử' WHERE status = 'pending'",
)


async def _count(conn: AsyncConnection) -> dict[str, int]:
    return {name: int((await conn.execute(text(sql))).scalar() or 0) for name, sql in COUNTS.items()}


async def reset_money(conn: AsyncConnection, *, apply: bool) -> dict[str, int]:
    """Chạy trong transaction của người gọi. Trả số dòng bị ảnh hưởng (hoặc sẽ bị ảnh hưởng khi dry-run)."""
    report = await _count(conn)
    if not apply:
        return report
    for statement in APPLY:
        await conn.execute(text(statement))
    left = await _count(conn)
    leftovers = {name: left[name] for name in ("wallets", "paid_balances", "paid_ledger", "pending_withdrawals") if left[name]}
    if leftovers:
        raise RuntimeError(f"Reset chưa sạch, hủy giao dịch: {leftovers}")
    return report


async def _main(apply: bool) -> None:
    from dotenv import load_dotenv

    app_env = os.getenv("APP_ENV", "development").strip().lower()
    if app_env == "production":
        raise SystemExit("Từ chối: script xóa dữ liệu tiền không được chạy với APP_ENV=production.")
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", f".env.{app_env}"))
    engine = create_async_engine(os.environ["DATABASE_ASYNC_URL"])
    try:
        async with engine.connect() as conn:
            transaction = await conn.begin()
            report = await reset_money(conn, apply=apply)
            print(("ĐÃ GHI" if apply else "DRY-RUN (không ghi)"), report)
            if report["stuck_withdrawals"]:
                print(f"Cảnh báo: còn {report['stuck_withdrawals']} yêu cầu rút ở trạng thái dở, không bị đụng tới.")
            if apply:
                await transaction.commit()
            else:
                await transaction.rollback()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="ghi thật (mặc định chỉ đếm)")
    parser.add_argument("--i-know-this-is-test-data", action="store_true", dest="confirmed")
    args = parser.parse_args()
    if args.apply and not args.confirmed:
        sys.exit("Từ chối: --apply cần thêm --i-know-this-is-test-data (script chỉ dành cho dữ liệu thử).")
    asyncio.run(_main(args.apply))
