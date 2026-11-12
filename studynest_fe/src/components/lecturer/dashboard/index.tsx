"use client";

import { memo } from "react";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui";
import OverviewStats from "./overview-stats";
import RevenueChart from "./revenue-chart";
import StudentAnalytics from "./student-analytics";
import CoursePerformance from "./course-performance";

const MemoizedOverviewStats = memo(OverviewStats);
const MemoizedRevenueChart = memo(RevenueChart);
const MemoizedStudentAnalytics = memo(StudentAnalytics);
const MemoizedCoursePerformance = memo(CoursePerformance);

export default function LecturerStatsDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <Badge variant="info" size="sm" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Phân tích chuyên sâu
          </Badge>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Bảng Thống Kê Giảng Viên
          </h1>
          <p className="text-muted-foreground text-sm">
            Tổng quan về hiệu suất khóa học, doanh thu và sự phát triển học viên của bạn
          </p>
        </div>

        {/* KPI Cards */}
        <MemoizedOverviewStats />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-h-[400px]">
            <MemoizedRevenueChart />
          </div>
          <div className="min-h-[400px]">
            <MemoizedStudentAnalytics />
          </div>
        </div>

        {/* Course Performance Table */}
        <MemoizedCoursePerformance />
      </div>
    </div>
  );
}
