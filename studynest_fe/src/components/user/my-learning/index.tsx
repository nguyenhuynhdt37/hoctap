"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { CourseListPanel } from "./course-list-panel";

export default function CoursesMeSection() {
  const [stats, setStats] = useState<{
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  }>({
    total: 0,
    inProgress: 0,
    completed: 0,
    avgProgress: 0,
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-16 selection:bg-primary-pastel/60 selection:text-foreground overflow-hidden">
      {/* Đốm mây Ambient Pastel trang trí nền */}
      <div
        className="pointer-events-none absolute -top-20 left-1/4 w-[600px] h-[300px] bg-gradient-to-b from-primary-light/60 via-secondary-light/30 to-transparent blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-60 -right-20 w-80 h-80 bg-accent/20 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10">
        {/* Hero Section */}
        <div className="mb-8 md:mb-10">
          <div className="inline-flex items-center mb-3">
            <Badge
              variant="info"
              className="px-3 py-1 text-xs font-medium tracking-wide shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Góc học tập cá nhân • Mây Mây
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Khóa học của tôi
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                Theo dõi tiến trình học tập, tiếp tục những bài giảng còn dang dở
                và bứt phá mục tiêu điểm số cùng Học viện trên mây.
              </p>
            </div>

            {/* Huy hiệu động viên học tập */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface border border-border shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-pastel/60">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-foreground">
                  Học đều mỗi ngày
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Kiên trì là chìa khóa thành công
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Thẻ Thống Kê Nhanh (Overview Metric Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
          {/* Card 1: Tổng số khóa */}
          <Card className="p-4 sm:p-5 rounded-[20px] border-border bg-surface shadow-xs transition-all duration-200 hover:border-primary-pastel">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-pastel/60">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Tổng số khóa học
                </p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-0.5">
                  {stats.total}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 2: Đang học */}
          <Card className="p-4 sm:p-5 rounded-[20px] border-border bg-surface shadow-xs transition-all duration-200 hover:border-secondary-pastel">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-secondary-light text-secondary-foreground flex items-center justify-center shrink-0 border border-secondary-pastel/60">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Đang tiến hành
                </p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-0.5">
                  {stats.inProgress}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 3: Đã hoàn thành */}
          <Card className="p-4 sm:p-5 rounded-[20px] border-border bg-surface shadow-xs transition-all duration-200 hover:border-success-border">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-success-bg text-success-foreground flex items-center justify-center shrink-0 border border-success-border">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Đã hoàn thành
                </p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-0.5">
                  {stats.completed}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 4: Tiến độ bình quân */}
          <Card className="p-4 sm:p-5 rounded-[20px] border-border bg-surface shadow-xs transition-all duration-200 hover:border-accent-border">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 border border-accent-border/60">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Tiến độ bình quân
                </p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-0.5">
                  {stats.avgProgress}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Panel Quản lý danh sách khóa học */}
        <CourseListPanel onStatsChange={setStats} />
      </div>
    </div>
  );
}
