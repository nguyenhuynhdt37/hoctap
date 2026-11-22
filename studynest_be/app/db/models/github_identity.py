"""Stable GitHub sign-in identity, independent of revocable repository access."""
from datetime import datetime
from uuid import UUID
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.models.database import Base


class GitHubIdentity(Base):
    __tablename__ = 'github_auth_identities'
    __table_args__ = (Index('ix_github_identity_user', 'user_id'), {'schema': 'public'})
    github_user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey('public.user.id', ondelete='CASCADE'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
