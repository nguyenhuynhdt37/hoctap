"""Seed the default 7-day daily check-in event and Coin rewards."""

import sqlalchemy as sa

from alembic import op

revision = "al56bc890y123"
down_revision = "ak45ab789x012"
branch_labels = None
depends_on = None

EVENT_CODE = "daily-checkin"
REWARDS = (10, 10, 15, 15, 20, 20, 50)


def upgrade() -> None:
    conn = op.get_bind()
    # Không đụng vào sự kiện đã có: chỉ seed khi chưa có sự kiện nào mang mã này.
    event_id = conn.execute(
        sa.text(
            """
            INSERT INTO public.daily_checkin_events (name, code, cycle_days, is_active)
            VALUES ('Điểm danh hằng ngày', :code, :cycle, true)
            ON CONFLICT (code) DO NOTHING
            RETURNING id
            """
        ),
        {"code": EVENT_CODE, "cycle": len(REWARDS)},
    ).scalar()
    if event_id is None:
        return
    for day, amount in enumerate(REWARDS, start=1):
        conn.execute(
            sa.text(
                """
                INSERT INTO public.daily_checkin_rewards_config (event_id, day_number, reward_type, reward_amount)
                VALUES (:event_id, :day, 'peak_wallet', :amount)
                ON CONFLICT (event_id, day_number) DO NOTHING
                """
            ),
            {"event_id": event_id, "day": day, "amount": amount},
        )


def downgrade() -> None:
    # Chỉ gỡ sự kiện mặc định nếu chưa có ai điểm danh; ngược lại giữ lại để không mất lịch sử.
    op.execute(
        sa.text(
            """
            DELETE FROM public.daily_checkin_events e
            WHERE e.code = 'daily-checkin'
              AND NOT EXISTS (SELECT 1 FROM public.user_checkins u WHERE u.event_id = e.id)
            """
        )
    )
