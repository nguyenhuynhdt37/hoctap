"""Retain only a topic hash when a remembered fact is forgotten."""
from alembic import op
import sqlalchemy as sa
import hashlib

revision = 'w01mn345i678'
down_revision = 'v90lm234h567'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('learning_memory_items', sa.Column('memory_key_hash', sa.String(64), nullable=True))
    for slot, key in {'preferred_name':'identity.preferred_name','explanation':'learning.explanation_style','friend_name':'personal.friend_name'}.items():
        op.execute(sa.text("UPDATE learning_memory_items SET memory_key_hash=:digest WHERE evidence->0->>'slot'=:slot").bindparams(digest=hashlib.sha256(key.encode()).hexdigest(),slot=slot))


def downgrade():
    op.drop_column('learning_memory_items','memory_key_hash')
