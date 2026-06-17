"use client";

import { HiArrowLeft, HiRefresh } from "react-icons/hi";
import Link from "next/link";
import RevenueCompare from "./compare";
import RevenueTransactions from "./transactions";
import RevenueByInstructor from "./by-instructor";
import RevenueByCourse from "./by-course";
import RevenueTrends from "./trends";
import ExportCSV from "./export-csv";
import { memo, useCallback, useState } from "react";

const MemoizedRevenueCompare = memo(RevenueCompare);
const MemoizedRevenueTransactions = memo(RevenueTransactions);
const MemoizedRevenueByInstructor = memo(RevenueByInstructor);
const MemoizedRevenueByCourse = memo(RevenueByCourse);
const MemoizedRevenueTrends = memo(RevenueTrends);
const MemoizedExportCSV = memo(ExportCSV);

export default function RevenueDetail() {
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
              Chi tiết Doanh thu
            </h1>
            <p className="text-gray-500 text-sm">
              Phân tích doanh thu chi tiết theo nhiều chiều
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

      {/* Compare Section */}
      <MemoizedRevenueCompare key={`compare-${refreshKey}`} />

      {/* Trends Chart */}
      <MemoizedRevenueTrends key={`trends-${refreshKey}`} />

      {/* By Instructor & By Course */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MemoizedRevenueByInstructor key={`instructor-${refreshKey}`} />
        <MemoizedRevenueByCourse key={`course-${refreshKey}`} />
      </div>

      {/* Export CSV */}
      <MemoizedExportCSV key={`export-${refreshKey}`} />

      {/* Transactions Table */}
      <MemoizedRevenueTransactions key={`transactions-${refreshKey}`} />
    </div>
  );
}
