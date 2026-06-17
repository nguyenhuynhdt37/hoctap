"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { CategoryRootAndLevel1Response } from "@/types/user/category";
import { useRouter } from "next/navigation";
import { HiChevronRight } from "react-icons/hi";
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
      <div className="bg-white border-b border-green-100">
        <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24 py-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-32 bg-green-100 rounded animate-pulse" />
            <div className="h-4 w-4 bg-green-100 rounded animate-pulse" />
            <div className="h-6 w-24 bg-green-50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return null;
  }

  const rootCategory = data.items.find((item) => item.level === 0);
  const level1Categories = data.items.filter((item) => item.level === 1);

  if (!rootCategory) return null;

  return (
    <div className="bg-white border-b border-green-100">
      <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24 py-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          <button
            onClick={() => router.push(`/categories/${rootCategory.slug}`)}
            className="text-xl font-bold text-green-700 hover:text-green-800 transition-colors whitespace-nowrap"
          >
            {rootCategory.name}
          </button>

          {level1Categories.length > 0 && (
            <>
              <HiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex items-center gap-2">
                {level1Categories.map((category) => {
                  const isActive = category.slug === slug;
                  return (
                    <button
                      key={category.id}
                      onClick={() =>
                        router.push(`/categories/${category.slug}`)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md"
                          : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesHeader;
