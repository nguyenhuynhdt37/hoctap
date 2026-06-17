"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useState } from "react";
import { HiDownload, HiCalendar } from "react-icons/hi";

type GroupBy = "day" | "month" | "year";

export default function ExportCSV() {
  const [groupBy, setGroupBy] = useState<GroupBy>("month");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/statistics/revenue/export", {
        params: { group_by: groupBy, from_date: fromDate, to_date: toDate },
        responseType: "blob",
      });

      // Kiểm tra content-type để đảm bảo là CSV
      const contentType = String(response.headers["content-type"] || "");

      // Nếu server trả về JSON (có thể là error), đọc và hiển thị lỗi
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

      // Tạo blob với đúng MIME type
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue_${groupBy}_${fromDate}_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Export failed:", error);
      const message =
        error.response?.data?.detail || error.message || "Xuất file thất bại";
      alert(`Lỗi: ${message}`);
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
          <h3 className="text-lg font-bold text-gray-900">Xuất báo cáo CSV</h3>
          <p className="text-gray-500 text-sm">
            Tải dữ liệu doanh thu về file Excel/CSV
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {/* Group By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nhóm theo
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Từ ngày
          </label>
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đến ngày
          </label>
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
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
        <p className="text-sm text-gray-600">
          <span className="font-medium">Các cột trong file CSV:</span>
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
          <li>
            •{" "}
            {groupBy === "day"
              ? "date"
              : groupBy === "month"
              ? "month"
              : "year"}{" "}
            - Thời gian
          </li>
          <li>• platform_income - Doanh thu nền tảng</li>
          <li>• instructor_payout - Phần giảng viên</li>
          <li>• total_transaction - Tổng giao dịch</li>
          <li>• transaction_count - Số giao dịch</li>
        </ul>
      </div>
    </div>
  );
}
