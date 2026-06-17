"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useState } from "react";
import { HiDownload } from "react-icons/hi";

type SortBy = "revenue" | "students" | "courses";

export default function ExportInstructorCSV() {
  const [sortBy, setSortBy] = useState<SortBy>("revenue");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/statistics/instructors/export", {
        params: { sort_by: sortBy, from_date: fromDate, to_date: toDate },
        responseType: "blob",
      });

      // Kiểm tra content-type
      const contentType = String(response.headers["content-type"] || "");
      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        const errorData = JSON.parse(text);
        alert(
          `Lỗi: ${
            errorData.detail || errorData.message || "Không thể xuất file"
          }`
        );
        return;
      }

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `instructors_${sortBy}_${fromDate}_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Export failed:", error);
      alert(`Lỗi: ${error.message || "Xuất file thất bại"}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <HiDownload className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Xuất danh sách giảng viên
          </h3>
          <p className="text-gray-500 text-sm">
            Tải danh sách giảng viên ra file CSV
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sắp xếp theo
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="revenue">Doanh thu</option>
            <option value="students">Học viên</option>
            <option value="courses">Khóa học</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Từ ngày
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đến ngày
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Export Button */}
        <div className="flex items-end">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Đang xuất...</span>
              </>
            ) : (
              <>
                <HiDownload className="w-4 h-4" />
                <span className="text-sm font-medium">Xuất CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 font-medium">
          Các cột trong file CSV:
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
          <li>• STT</li>
          <li>• ID Giảng viên</li>
          <li>• Họ tên</li>
          <li>• Email</li>
          <li>• Số khóa học</li>
          <li>• Số học viên</li>
          <li>• Đánh giá</li>
          <li>• Tổng doanh thu (VND)</li>
        </ul>
      </div>
    </div>
  );
}
