"use client";

import { Button, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { CategoryRootAndLevel1Response } from "@/types/user/category";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

interface CategoriesHeaderProps {
  slug: string;
}

const CategoriesHeader = ({ slug }: CategoriesHeaderProps) => {
  const router = useRouter();
  const { data, isLoading } = useSWR<CategoryRootAndLevel1Response>(
    `/categories/${slug}/get_root_and_level1`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <section className="border-b border-primary-pastel/70 bg-primary-light/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="mb-4 h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return null;
  }

  const rootCategory = data.items.find((item) => item.level === 0);
  const level1Categories = data.items.filter((item) => item.level === 1);
  if (!rootCategory) return null;

  const current =
    data.items.find((item) => item.slug === slug) ?? rootCategory;
  const onRoot = current.slug === rootCategory.slug;

  return (
    <section className="border-b border-primary-pastel/70 bg-primary-light/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav aria-label="Đường dẫn danh mục" className="mb-3 flex items-center gap-2 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary">
            Trang chủ
          </Link>
          <span className="text-subtle-foreground" aria-hidden="true">
            /
          </span>
          {onRoot ? (
            <span className="font-medium text-foreground">{rootCategory.name}</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push(`/categories/${rootCategory.slug}`)}
                className="text-muted-foreground hover:text-primary"
              >
                {rootCategory.name}
              </button>
              <span className="text-subtle-foreground" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-foreground">{current.name}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Danh mục học tập
            </p>
            <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">
              {current.name}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Khóa học và giảng viên trong {rootCategory.name}, chọn môn để xem
              đúng phần bạn cần.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/khoa-hoc")}
            className="shrink-0"
          >
            Lọc theo lớp, môn và kỳ thi
          </Button>
        </div>

        {level1Categories.length > 0 && (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => router.push(`/categories/${rootCategory.slug}`)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                onRoot
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary-pastel bg-surface text-foreground hover:bg-primary-light"
              }`}
            >
              Tất cả
            </button>
            {level1Categories.map((category) => {
              const isActive = category.slug === slug;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => router.push(`/categories/${category.slug}`)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary-pastel bg-surface text-foreground hover:bg-primary-light"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoriesHeader;
