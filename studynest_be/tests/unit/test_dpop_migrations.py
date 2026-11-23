from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from unittest.mock import MagicMock

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import dialect

from app.db.models.database import EmailVerifications


def test_new_dpop_revision_creates_missing_indexes_in_autocommit_block(monkeypatch):
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    revision = ScriptDirectory.from_config(config).get_revision("ad78tu012q345").module
    op = MagicMock()
    block = op.get_context.return_value.autocommit_block.return_value
    op.reset_mock()
    monkeypatch.setattr(revision, "op", op)

    def create_index(*args, **kw):
        block.__enter__.assert_called_once()
        block.__exit__.assert_not_called()
        assert kw["schema"] == "public"
        assert kw["if_not_exists"] and kw["postgresql_concurrently"]

    op.create_index.side_effect = create_index
    revision.upgrade()
    assert [call.args[0] for call in op.create_index.call_args_list] == [
        "ix_sessions_dpop_jkt", "idx_sessions_previous_refresh_hash",
    ]


def test_atomic_otp_delete_compiles_for_postgres():
    stmt = delete(EmailVerifications).where(EmailVerifications.purpose == "login").returning(EmailVerifications.id)
    assert "RETURNING public.email_verifications.id" in str(stmt.compile(dialect=dialect()))
