"""Versioned learning paths, bundles and immutable order allocations.

Frozen PostgreSQL DDL; legacy financial rows and course identities are untouched.
"""

from alembic import op

revision = "d45e67f89a01"
down_revision = "c34d56e78f90"
branch_labels = None
depends_on = None

DDL = [
    "\nCREATE TABLE public.course_bundles (\n\tslug VARCHAR(180) NOT NULL, \n\tis_active BOOLEAN DEFAULT 'true' NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (slug)\n)\n\n",
    "\nCREATE TABLE public.learning_paths (\n\tslug VARCHAR(180) NOT NULL, \n\tsubject_id UUID NOT NULL, \n\tis_active BOOLEAN DEFAULT 'true' NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (slug), \n\tFOREIGN KEY(subject_id) REFERENCES public.subjects (id)\n)\n\n",
    "\nCREATE TABLE public.proficiency_frameworks (\n\tcode VARCHAR(80) NOT NULL, \n\tname VARCHAR(160) NOT NULL, \n\tsubject_id UUID NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (code), \n\tFOREIGN KEY(subject_id) REFERENCES public.subjects (id)\n)\n\n",
    "\nCREATE TABLE public.learning_path_versions (\n\tpath_id UUID NOT NULL, \n\tversion INTEGER NOT NULL, \n\ttitle VARCHAR(180) NOT NULL, \n\tdescription TEXT NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tis_demo BOOLEAN DEFAULT 'false' NOT NULL, \n\tcreated_by UUID NOT NULL, \n\tpublished_at TIMESTAMP WITH TIME ZONE, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (path_id, version), \n\tCONSTRAINT ck_path_version_status CHECK (status IN ('draft','published','archived')), \n\tFOREIGN KEY(path_id) REFERENCES public.learning_paths (id), \n\tFOREIGN KEY(created_by) REFERENCES public.\"user\" (id)\n)\n\n",
    "CREATE INDEX ix_public_learning_path_versions_path_id ON public.learning_path_versions (path_id)",
    "\nCREATE TABLE public.proficiency_levels (\n\tframework_id UUID NOT NULL, \n\tcode VARCHAR(30) NOT NULL, \n\tname VARCHAR(160) NOT NULL, \n\tposition INTEGER NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (framework_id, code), \n\tUNIQUE (framework_id, position), \n\tFOREIGN KEY(framework_id) REFERENCES public.proficiency_frameworks (id)\n)\n\n",
    "\nCREATE TABLE public.course_bundle_versions (\n\tbundle_id UUID NOT NULL, \n\tversion INTEGER NOT NULL, \n\ttitle VARCHAR(180) NOT NULL, \n\tdescription TEXT NOT NULL, \n\tprice NUMERIC(12, 2) NOT NULL, \n\tcurrency VARCHAR(10) DEFAULT 'VND' NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\tpath_version_id UUID, \n\tis_demo BOOLEAN DEFAULT 'false' NOT NULL, \n\tcreated_by UUID NOT NULL, \n\tpublished_at TIMESTAMP WITH TIME ZONE, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (bundle_id, version), \n\tCONSTRAINT ck_bundle_version_status CHECK (status IN ('draft','published','archived')), \n\tCONSTRAINT ck_bundle_price CHECK (price >= 0), \n\tFOREIGN KEY(bundle_id) REFERENCES public.course_bundles (id), \n\tFOREIGN KEY(path_version_id) REFERENCES public.learning_path_versions (id), \n\tFOREIGN KEY(created_by) REFERENCES public.\"user\" (id)\n)\n\n",
    "CREATE INDEX ix_public_course_bundle_versions_bundle_id ON public.course_bundle_versions (bundle_id)",
    "\nCREATE TABLE public.course_proficiency (\n\tcourse_id UUID NOT NULL, \n\tentry_level_id UUID, \n\ttarget_level_id UUID NOT NULL, \n\tskill VARCHAR(160) NOT NULL, \n\tevidence TEXT NOT NULL, \n\tstatus VARCHAR(20) NOT NULL, \n\treviewed_by UUID, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (course_id, target_level_id), \n\tCONSTRAINT ck_proficiency_status CHECK (status IN ('pending','approved','rejected')), \n\tFOREIGN KEY(course_id) REFERENCES public.courses (id), \n\tFOREIGN KEY(entry_level_id) REFERENCES public.proficiency_levels (id), \n\tFOREIGN KEY(target_level_id) REFERENCES public.proficiency_levels (id), \n\tFOREIGN KEY(reviewed_by) REFERENCES public.\"user\" (id)\n)\n\n",
    "CREATE INDEX ix_public_course_proficiency_course_id ON public.course_proficiency (course_id)",
    "\nCREATE TABLE public.learning_path_stages (\n\tversion_id UUID NOT NULL, \n\ttitle VARCHAR(180) NOT NULL, \n\tdescription TEXT NOT NULL, \n\tposition INTEGER NOT NULL, \n\ttarget_level_id UUID, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (version_id, position), \n\tFOREIGN KEY(version_id) REFERENCES public.learning_path_versions (id) ON DELETE CASCADE, \n\tFOREIGN KEY(target_level_id) REFERENCES public.proficiency_levels (id)\n)\n\n",
    "CREATE INDEX ix_public_learning_path_stages_version_id ON public.learning_path_stages (version_id)",
    '\nCREATE TABLE public.user_learning_paths (\n\tuser_id UUID NOT NULL, \n\tversion_id UUID NOT NULL, \n\tstarted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (user_id, version_id), \n\tFOREIGN KEY(user_id) REFERENCES public."user" (id), \n\tFOREIGN KEY(version_id) REFERENCES public.learning_path_versions (id)\n)\n\n',
    "CREATE INDEX ix_public_user_learning_paths_user_id ON public.user_learning_paths (user_id)",
    '\nCREATE TABLE public.bundle_orders (\n\tuser_id UUID NOT NULL, \n\tversion_id UUID NOT NULL, \n\tidempotency_key VARCHAR(100) NOT NULL, \n\tquote_hash VARCHAR(64) NOT NULL, \n\ttitle VARCHAR(180) NOT NULL, \n\ttotal_paid NUMERIC(12, 2) NOT NULL, \n\tcurrency VARCHAR(10) NOT NULL, \n\tcreated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (user_id, idempotency_key), \n\tCONSTRAINT ck_bundle_order_total CHECK (total_paid >= 0), \n\tFOREIGN KEY(user_id) REFERENCES public."user" (id), \n\tFOREIGN KEY(version_id) REFERENCES public.course_bundle_versions (id)\n)\n\n',
    "CREATE INDEX ix_public_bundle_orders_user_id ON public.bundle_orders (user_id)",
    "\nCREATE TABLE public.course_bundle_items (\n\tversion_id UUID NOT NULL, \n\tcourse_id UUID NOT NULL, \n\tposition INTEGER NOT NULL, \n\tlist_price NUMERIC(12, 2) NOT NULL, \n\tallocated_price NUMERIC(12, 2) NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (version_id, course_id), \n\tUNIQUE (version_id, position), \n\tCONSTRAINT ck_bundle_item_price CHECK (list_price >= 0 AND allocated_price >= 0), \n\tFOREIGN KEY(version_id) REFERENCES public.course_bundle_versions (id) ON DELETE CASCADE, \n\tFOREIGN KEY(course_id) REFERENCES public.courses (id)\n)\n\n",
    "CREATE INDEX ix_public_course_bundle_items_course_id ON public.course_bundle_items (course_id)",
    "CREATE INDEX ix_public_course_bundle_items_version_id ON public.course_bundle_items (version_id)",
    "\nCREATE TABLE public.stage_course_groups (\n\tstage_id UUID NOT NULL, \n\ttitle VARCHAR(180) NOT NULL, \n\tposition INTEGER NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (stage_id, position), \n\tFOREIGN KEY(stage_id) REFERENCES public.learning_path_stages (id) ON DELETE CASCADE\n)\n\n",
    "CREATE INDEX ix_public_stage_course_groups_stage_id ON public.stage_course_groups (stage_id)",
    '\nCREATE TABLE public.bundle_order_lines (\n\torder_id UUID NOT NULL, \n\tcourse_id UUID NOT NULL, \n\ttitle VARCHAR(180) NOT NULL, \n\tinstructor_id UUID NOT NULL, \n\tlist_price NUMERIC(12, 2) NOT NULL, \n\tpaid NUMERIC(12, 2) NOT NULL, \n\talready_owned BOOLEAN NOT NULL, \n\tpurchase_item_id UUID, \n\tearning_id UUID, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (order_id, course_id), \n\tCONSTRAINT ck_bundle_order_line_price CHECK (paid >= 0 AND list_price >= 0), \n\tFOREIGN KEY(order_id) REFERENCES public.bundle_orders (id), \n\tFOREIGN KEY(course_id) REFERENCES public.courses (id), \n\tFOREIGN KEY(instructor_id) REFERENCES public."user" (id), \n\tUNIQUE (purchase_item_id), \n\tFOREIGN KEY(purchase_item_id) REFERENCES public.purchase_items (id), \n\tUNIQUE (earning_id), \n\tFOREIGN KEY(earning_id) REFERENCES public.instructor_earnings (id)\n)\n\n',
    "CREATE INDEX ix_public_bundle_order_lines_order_id ON public.bundle_order_lines (order_id)",
    "\nCREATE TABLE public.stage_course_options (\n\tgroup_id UUID NOT NULL, \n\tcourse_id UUID NOT NULL, \n\tposition INTEGER NOT NULL, \n\tid UUID DEFAULT uuid_generate_v4() NOT NULL, \n\tPRIMARY KEY (id), \n\tUNIQUE (group_id, course_id), \n\tUNIQUE (group_id, position), \n\tFOREIGN KEY(group_id) REFERENCES public.stage_course_groups (id) ON DELETE CASCADE, \n\tFOREIGN KEY(course_id) REFERENCES public.courses (id)\n)\n\n",
    "CREATE INDEX ix_public_stage_course_options_course_id ON public.stage_course_options (course_id)",
    "CREATE INDEX ix_public_stage_course_options_group_id ON public.stage_course_options (group_id)",
]
TABLES = [
    "course_bundles",
    "learning_paths",
    "proficiency_frameworks",
    "learning_path_versions",
    "proficiency_levels",
    "course_bundle_versions",
    "course_proficiency",
    "learning_path_stages",
    "user_learning_paths",
    "bundle_orders",
    "course_bundle_items",
    "stage_course_groups",
    "bundle_order_lines",
    "stage_course_options",
]


def upgrade():
    for statement in DDL:
        op.execute(statement)
    op.execute("""CREATE FUNCTION public.guard_published_learning_version() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'Published versions are immutable'; END IF;
      RETURN NEW;
    END $$""")
    for table in ("learning_path_versions", "course_bundle_versions"):
        op.execute(
            f"CREATE TRIGGER immutable_published_version BEFORE UPDATE ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.guard_published_learning_version()"
        )
    op.execute("""CREATE FUNCTION public.guard_commerce_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Commerce snapshots are immutable'; END $$""")
    for table in ("bundle_orders", "bundle_order_lines"):
        op.execute(
            f"CREATE TRIGGER immutable_snapshot BEFORE UPDATE OR DELETE ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.guard_commerce_snapshot()"
        )


def downgrade():
    for table in reversed(TABLES):
        op.drop_table(table, schema="public")
    op.execute("DROP FUNCTION public.guard_commerce_snapshot()")
    op.execute("DROP FUNCTION public.guard_published_learning_version()")
