"use client";

import { HiArrowLeft, HiRefresh } from "react-icons/hi";
import Link from "next/link";
import InstructorOverview from "./overview";
import InstructorGrowth from "./growth";
import TopInstructors from "./top-instructors";
import InstructorRevenue from "./revenue";
import InstructorList from "./list";
import InstructorByCategory from "./by-category";
import ExportInstructorCSV from "./export-csv";
import { memo, useCallback, useState } from "react";

const MemoizedInstructorOverview = memo(InstructorOverview);
const MemoizedInstructorGrowth = memo(InstructorGrowth);
const MemoizedTopInstructors = memo(TopInstructors);
const MemoizedInstructorRevenue = memo(InstructorRevenue);
const MemoizedInstructorList = memo(InstructorList);
const MemoizedInstructorByCategory = memo(InstructorByCategory);
const MemoizedExportInstructorCSV = memo(ExportInstructorCSV);

export default function InstructorStats() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <HiArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Thống kê Giảng viên
            </h1>
            <p className="text-gray-500 text-sm">
              Phân tích chi tiết về giảng viên trên nền tảng
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <HiRefresh className="w-4 h-4" />
          <span className="text-sm font-medium">Làm mới</span>
        </button>
      </div>

      {/* Overview Stats */}
      <MemoizedInstructorOverview key={`overview-${refreshKey}`} />

      {/* Growth Chart & Top Instructors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MemoizedInstructorGrowth key={`growth-${refreshKey}`} />
        <MemoizedTopInstructors key={`top-${refreshKey}`} />
      </div>

      {/* By Category */}
      <MemoizedInstructorByCategory key={`category-${refreshKey}`} />

      {/* Revenue by Instructor */}
      <MemoizedInstructorRevenue key={`revenue-${refreshKey}`} />

      {/* Export CSV */}
      <MemoizedExportInstructorCSV key={`export-${refreshKey}`} />

      {/* Instructor List với detail modal */}
      <MemoizedInstructorList key={`list-${refreshKey}`} />
    </div>
  );
}
