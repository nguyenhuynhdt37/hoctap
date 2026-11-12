"""One eligibility policy for directory, profile, featured and provider people."""

from sqlalchemy import and_, exists, select

from app.db.models.database import Role, User, UserRoles


def public_instructor():
    # LECTURER is granted by the successful fee/upgrade flow. Publication of
    # a first course is independent from visibility of the teaching profile.
    return and_(
        User.deleted_at.is_(None),
        User.is_banned.is_(False),
        exists(
            select(UserRoles.id)
            .join(Role, Role.id == UserRoles.role_id)
            .where(UserRoles.user_id == User.id, Role.role_name == "LECTURER")
            .correlate(User)
        ),
    )
