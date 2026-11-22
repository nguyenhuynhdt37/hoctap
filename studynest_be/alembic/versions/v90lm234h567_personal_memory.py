"""Allow account personal facts alongside learning memories."""
from alembic import op
revision='v90lm234h567'
down_revision='u89kl123g456'
branch_labels=None
depends_on=None


def upgrade():
    op.drop_constraint('ck_memory_kind','learning_memory_items',schema='public',type_='check')
    op.create_check_constraint('ck_memory_kind','learning_memory_items',"kind IN ('learning_goal','review_topic','explanation_preference','current_task','hint_used','unresolved_question','personal_fact')",schema='public')


def downgrade():
    # Preserve personal facts; tightening the check would discard account data.
    pass
