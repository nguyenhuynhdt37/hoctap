"use client";

import { PageLoadError } from "@/components/shared/page-load-state";
import { Skeleton } from "@/components/ui";
import Personalize from "@/components/user/personalize";
import useSWR from "swr";

interface TopicItem {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  topics: TopicItem[];
}

async function fetchCategories(path: string): Promise<Subcategory[]> {
  const response = await fetch(path, { credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error("Không thể tải danh mục học tập.");
  const result: Subcategory[] = await response.json();
  return Array.isArray(result) ? result : [];
}

export default function PersonalizeLoader() {
  const { data, error, isValidating, mutate } = useSWR(
    "/api/categories/subcategories",
    fetchCategories,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  if (!data && error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageLoadError
          message="Không thể tải danh mục học tập. Vui lòng thử lại."
          onRetry={() => void mutate()}
          retrying={isValidating}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" aria-label="Đang tải danh mục học tập" className="mx-auto min-h-[65vh] max-w-3xl space-y-6 px-4 py-10">
        <Skeleton className="mx-auto h-10 w-64 max-w-full" />
        <Skeleton className="mx-auto h-4 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="ml-auto h-11 w-32" />
      </div>
    );
  }

  const rootCategories = data
    .filter((item) => item.parent_id === null)
    .map((root) => {
      const childTopics = data
        .filter((child) => child.parent_id === root.id)
        .flatMap((child) => child.topics ?? []);
      const merged = [...(root.topics ?? []), ...childTopics];
      const seen = new Set<string>();
      const uniqueTopics = merged.filter((topic) => {
        const key = topic.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...root, topics: uniqueTopics };
    });

  return <Personalize learningFields={rootCategories} />;
}
