"use client";

import { HiDownload, HiRefresh } from "react-icons/hi";

// Charts
import RevenueLineChart from "./charts/revenue-line-chart";
import CategoryPieChart from "./charts/category-pie-chart";
import UserGrowthChart from "./charts/user-growth-chart";
import CourseStatusChart from "./charts/course-status-chart";

// Stats
import OverviewStats from "./stats/overview-stats";
import FinanceStats from "./stats/finance-stats";
import ActivityStats from "./stats/activity-stats";
import InstructorStats from "./stats/instructor-stats";

// Tables
import TopCoursesTable from "./tables/top-courses-table";
import TopInstructorsTable from "./tables/top-instructors-table";

// Export
import ExportComprehensive from "./export-comprehensive";

import { memo, useCallback, useState } from "react";

// Memo để tránh re-render không cần thiết
const MemoizedRevenueLineChart = memo(RevenueLineChart);
const MemoizedCategoryPieChart = memo(CategoryPieChart);
const MemoizedUserGrowthChart = memo(UserGrowthChart);
const MemoizedCourseStatusChart = memo(CourseStatusChart);
const MemoizedOverviewStats = memo(OverviewStats);
const MemoizedFinanceStats = memo(FinanceStats);
const MemoizedActivityStats = memo(ActivityStats);
const MemoizedInstructorStats = memo(InstructorStats);
const MemoizedTopCoursesTable = memo(TopCoursesTable);
const MemoizedTopInstructorsTable = memo(TopInstructorsTable);

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showExport, setShowExport] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-green-500/25">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tổng quan Thống kê 📊</h1>
            <p className="text-green-100 text-lg">
              Dashboard quản trị với dữ liệu thời gian thực
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 group"
            >
              <HiRefresh className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="font-semibold">Làm mới</span>
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 group"
            >
              <HiDownload className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold">Xuất báo cáo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats - Component tự fetch */}
      <MemoizedOverviewStats key={`overview-${refreshKey}`} />

      {/* Charts Row 1: Revenue + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MemoizedRevenueLineChart key={`revenue-${refreshKey}`} />
        </div>
        <MemoizedCategoryPieChart key={`category-${refreshKey}`} />
      </div>

      {/* Charts Row 2: Users + Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MemoizedUserGrowthChart key={`users-${refreshKey}`} />
        <MemoizedCourseStatusChart key={`courses-${refreshKey}`} />
      </div>

      {/* Tables Row: Top Courses + Top Instructors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MemoizedTopCoursesTable key={`topCourses-${refreshKey}`} />
        <MemoizedTopInstructorsTable key={`topInstructors-${refreshKey}`} />
      </div>

      {/* Stats Row: Finance + Activity + Instructor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MemoizedFinanceStats key={`finance-${refreshKey}`} />
        <MemoizedActivityStats key={`activity-${refreshKey}`} />
        <MemoizedInstructorStats key={`instructor-${refreshKey}`} />
      </div>

      {/* Export Modal */}
      <ExportComprehensive
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
