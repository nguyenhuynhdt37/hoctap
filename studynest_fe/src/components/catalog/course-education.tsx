"use client";

import { Badge } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { CourseEducation } from "@/types/catalog";
import Link from "next/link";
import { HiAcademicCap, HiCloud } from "react-icons/hi";
import useSWR from "swr";

export default function CourseEducationInfo({
  courseId,
}: {
  courseId: string;
}) {
  const { data, error } = useSWR<CourseEducation>(
    courseId ? `/catalog/courses/${courseId}/taxonomy` : null,
    (url: string) => api.get<CourseEducation>(url).then((r) => r.data)
  );
  if (error || !data || data.needs_classification) return null;

  const tags = [
    ...(data.grades || []),
    ...(data.subject ? [data.subject] : []),
    ...(data.learning_goals || []),
    ...(data.exams || []),
  ];

  if (tags.length === 0 && !data.provider) return null;

  return (
    <section
      aria-label="Phân loại chương trình học"
      className="rounded-[24px] border border-primary-pastel bg-surface p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <HiAcademicCap className="w-4 h-4" />
            <span>Phân loại Chương trình Phổ thông Mây Mây</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((x) => (
              <Badge key={x.id} variant="default" size="md">
                <HiCloud className="w-3 h-3 mr-1 inline" />
                {x.name}
              </Badge>
            ))}
          </div>
        </div>

        {data.provider && (
          <div className="text-xs sm:text-sm text-muted-foreground">
            <span>Đơn vị biên soạn: </span>
            <Link
              className="font-semibold text-primary hover:underline"
              href={`/providers/${data.provider.slug}`}
            >
              {data.provider.name}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
