"use client";

import { memo } from "react";
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard Giảng Viên
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Tổng quan về hiệu suất, doanh thu và sự phát triển của bạn
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
  );
}
