"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, User } from "lucide-react";
import InstructorDetail from "./detail";
import InstructorCourses from "./courses";
import type { InstructorDetailProfile } from "@/types/user/instructor";

interface InstructorTabsProps {
  instructorId: string;
  initialProfile?: InstructorDetailProfile | null;
  initialUnavailable?: boolean;
}

export default function InstructorTabs({
  instructorId,
  initialProfile,
  initialUnavailable,
}: InstructorTabsProps) {
  const [activeTab, setActiveTab] = useState<"detail" | "courses">("detail");

  return (
    <div className="space-y-6">
      {/* Breadcrumb điều hướng */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <Link href="/instructors" className="hover:text-primary transition-colors">
          Đội ngũ giáo viên
        </Link>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">Hồ sơ giáo viên</span>
      </nav>

      {/* Tab Navigation chuẩn Cloudy Blue */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface rounded-2xl px-3 py-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("detail")}
          aria-pressed={activeTab === "detail"}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "detail"
              ? "bg-primary-light text-primary shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Giới thiệu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          aria-pressed={activeTab === "courses"}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "courses"
              ? "bg-primary-light text-primary shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Khóa học</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "detail" && (
          <InstructorDetail
            instructorId={instructorId}
            initialProfile={initialProfile}
            initialUnavailable={initialUnavailable}
          />
        )}
        {activeTab === "courses" && <InstructorCourses instructorId={instructorId} />}
      </div>
    </div>
  );
}
