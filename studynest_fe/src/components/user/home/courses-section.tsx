"use client";

import { Badge, Button, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { CatalogResult } from "@/types/catalog";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => api.get<CatalogResult>(url).then((res) => res.data);
const money = new Intl.NumberFormat("vi-VN");

export default function CoursesSection() {
  const { data, error, isLoading, mutate } = useSWR<CatalogResult>(
    "/catalog/courses?sort=newest&limit=4",
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <section id="courses-section" className="border-b border-border bg-surface py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="primary" size="sm">Từ danh mục đang mở</Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
              Khóa học chính thức
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Khám phá các khóa học theo môn học và cấp lớp.
            </p>
          </div>
          <Link href="/courses">
            <Button variant="outline">Xem danh mục →</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Đang tải khóa học">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-border bg-background p-8 text-center">
            <p className="text-foreground">Chưa tải được khóa học lúc này.</p>
            <Button className="mt-4" variant="outline" onClick={() => mutate()}>
              Thử lại
            </Button>
          </Card>
        ) : !data?.items.length ? (
          <Card className="rounded-2xl border-border bg-background p-8 text-center sm:p-12">
            <h3 className="text-lg font-semibold text-foreground">Khóa học đang được chuẩn bị</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Hiện chưa có khóa học chính thức được công khai. Bạn có thể xem các cấp học và môn học để chọn hướng học phù hợp.
            </p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => document.getElementById("subjects-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              Xem môn học
            </Button>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((course) => (
              <Link key={course.id} href={`/course/${course.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">
                <Card density="none" className="h-full overflow-hidden rounded-2xl border-border bg-surface transition-colors group-hover:border-primary-pastel">
                  <img
                    src={getImageUrl(course.thumbnail || "") || "/videos/studynest/scene-academy.jpg"}
                    alt=""
                    loading="lazy"
                    className="h-44 w-full object-cover bg-primary-light"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/videos/studynest/scene-academy.jpg";
                    }}
                  />
                  <div className="space-y-3 p-5">
                    <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-primary">{course.title}</h3>
                    <p className="text-sm text-muted-foreground">{course.instructor.fullname}</p>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{course.subject?.name || "Khóa học"}</span>
                      <strong className="text-primary">{Number(course.base_price) === 0 ? "Miễn phí" : `${money.format(Number(course.base_price))} ₫`}</strong>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
