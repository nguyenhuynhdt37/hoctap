"""Enforce immutable published path/bundle structures at database level."""

from alembic import op

revision = "e56f78a90b12"
down_revision = "d45e67f89a01"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE OR REPLACE FUNCTION public.guard_published_learning_version() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'Published versions are immutable'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END $$""")
    for table in ("learning_path_versions", "course_bundle_versions"):
        op.execute(
            f"CREATE TRIGGER immutable_published_version_delete BEFORE DELETE ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.guard_published_learning_version()"
        )
    op.execute("""CREATE FUNCTION public.guard_learning_child() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE state text;
    BEGIN
      IF TG_TABLE_NAME='learning_path_stages' THEN
        SELECT status INTO state FROM public.learning_path_versions WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.version_id ELSE NEW.version_id END;
      ELSIF TG_TABLE_NAME='stage_course_groups' THEN
        SELECT v.status INTO state FROM public.learning_path_versions v JOIN public.learning_path_stages s ON s.version_id=v.id WHERE s.id=CASE WHEN TG_OP='DELETE' THEN OLD.stage_id ELSE NEW.stage_id END;
      ELSIF TG_TABLE_NAME='stage_course_options' THEN
        SELECT v.status INTO state FROM public.learning_path_versions v JOIN public.learning_path_stages s ON s.version_id=v.id JOIN public.stage_course_groups g ON g.stage_id=s.id WHERE g.id=CASE WHEN TG_OP='DELETE' THEN OLD.group_id ELSE NEW.group_id END;
      ELSE
        SELECT status INTO state FROM public.course_bundle_versions WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.version_id ELSE NEW.version_id END;
      END IF;
      IF state IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'Published structure is immutable'; END IF;
      IF TG_OP='UPDATE' THEN
        IF TG_TABLE_NAME IN ('learning_path_stages','course_bundle_items') THEN
          IF OLD.version_id<>NEW.version_id THEN RAISE EXCEPTION 'Cannot move version children'; END IF;
        ELSIF TG_TABLE_NAME='stage_course_groups' THEN
          IF OLD.stage_id<>NEW.stage_id THEN RAISE EXCEPTION 'Cannot move stage children'; END IF;
        ELSE
          IF OLD.group_id<>NEW.group_id THEN RAISE EXCEPTION 'Cannot move group children'; END IF;
        END IF;
      END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END $$""")
    for table in (
        "learning_path_stages",
        "stage_course_groups",
        "stage_course_options",
        "course_bundle_items",
    ):
        op.execute(
            f"CREATE TRIGGER immutable_published_structure BEFORE INSERT OR UPDATE OR DELETE ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.guard_learning_child()"
        )


def downgrade():
    for table in (
        "learning_path_stages",
        "stage_course_groups",
        "stage_course_options",
        "course_bundle_items",
    ):
        op.execute(f"DROP TRIGGER immutable_published_structure ON public.{table}")
    op.execute("DROP FUNCTION public.guard_learning_child()")
    for table in ("learning_path_versions", "course_bundle_versions"):
        op.execute(f"DROP TRIGGER immutable_published_version_delete ON public.{table}")
