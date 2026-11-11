"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Badge } from "@/components/ui";
import { useUserStore } from "@/stores/user";
import type { LearningPath, Bundle, PageResult } from "@/types/learning-paths";
import { fetchLearning, LoadError, Loading, message, price } from "./shared";
export default function PathDetail({ slug }: { slug: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const url = params.get("version")
    ? `/learning-paths/versions/${encodeURIComponent(params.get("version")!)}`
    : `/learning-paths/${encodeURIComponent(slug)}`;
  const { data, error, mutate } = useSWR<LearningPath>(
    [url, user?.id],
    ([path]: [string, string | undefined]) => fetchLearning<LearningPath>(path),
  );
  const { data: bundles } = useSWR<PageResult<Bundle>>(
    "/bundles?limit=50",
    fetchLearning,
  );
  async function follow() {
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      await api.post(`/learning-paths/versions/${data!.id}/follow`);
      await mutate();
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (error) return <LoadError error={error} retry={() => mutate()} />;
  if (!data) return <Loading />;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 text-foreground sm:px-6">
      <nav className="text-sm">
        <Link className="text-primary underline" href="/lo-trinh">
          ← Tất cả lộ trình
        </Link>
      </nav>
      <header className="space-y-4 rounded-2xl border border-border bg-surface p-6 sm:p-10">
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">Phiên bản {data.version}</Badge>
          <Badge variant="outline">Lộ trình tuyển chọn</Badge>
        </div>
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <p className="max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground">
          {data.description}
        </p>
        <p className="text-sm text-muted-foreground">
          Mỗi học phần chọn một khóa phù hợp. Theo dõi lộ trình không tự đăng ký
          hoặc mua khóa học.
        </p>
        <Button disabled={busy || data.following} onClick={follow}>
          {data.following
            ? "Đang theo dõi lộ trình"
            : busy
              ? "Đang lưu…"
              : "Theo dõi lộ trình"}
        </Button>
        {failure && (
          <p role="alert" className="text-destructive-foreground">
            {failure}
          </p>
        )}
        {user && data.following && (
          <div className="space-y-2">
            <p className="text-sm">
              Đã hoàn thành nội dung {data.completed_stages}/
              {data.stages?.length} chặng
            </p>
            <progress
              className="h-2 w-full accent-primary"
              value={data.completed_stages ?? 0}
              max={data.stages?.length || 1}
            />
            <p className="text-xs text-muted-foreground">
              {data.completion_note}
            </p>
          </div>
        )}
      </header>
      <ol className="space-y-6">
        {data.stages?.map((stage, index) => (
          <li
            key={stage.id}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
          >
            <div className="mb-6 flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light font-semibold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-xl font-semibold">
                  {stage.title}
                  {stage.completed ? " · Đã học xong nội dung" : ""}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {stage.description}
                </p>
              </div>
            </div>
            <div className="space-y-6">
              {stage.groups.map((group) => (
                <section key={group.id} aria-label={group.title}>
                  <h3 className="font-medium">
                    {group.title}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · Chọn một khóa
                    </span>
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {group.options.map((course) => (
                      <article
                        key={course.course_id}
                        className="flex gap-3 rounded-xl border border-border p-4"
                      >
                        {course.thumbnail && (
                          <img
                            loading="lazy"
                            alt=""
                            src={course.thumbnail}
                            className="h-16 w-24 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 space-y-2">
                          <h4 className="text-sm font-semibold">
                            {course.title}
                          </h4>
                          {course.owned ? (
                            <Badge variant="success">
                              {course.completed ? "Đã hoàn thành" : "Đã sở hữu"}
                            </Badge>
                          ) : course.base_price !== undefined ? (
                            <p className="text-sm text-primary">
                              {price(course.base_price, course.currency)}
                            </p>
                          ) : null}
                          {course.slug &&
                            (course.available || course.owned) && (
                              <Link
                                href={
                                  course.owned
                                    ? `/learning/${course.slug}`
                                    : `/course/${course.slug}`
                                }
                                className="block text-sm text-primary underline"
                              >
                                {course.owned ? "Vào học" : "Xem khóa học"}
                              </Link>
                            )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {!!bundles?.items.some((b) => b.path_version_id === data.id) && (
        <section className="rounded-2xl border border-primary-pastel bg-primary-light p-6">
          <h2 className="text-xl font-semibold">Combo cho lộ trình này</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Danh sách khóa được chọn rõ ràng, xem giá và quyền lợi trước khi
            mua.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {bundles.items
              .filter((b) => b.path_version_id === data.id)
              .map((b) => (
                <Link
                  key={b.id}
                  href={`/combo/${b.slug}`}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-primary"
                >
                  {b.title} · {price(b.price)} →
                </Link>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}
