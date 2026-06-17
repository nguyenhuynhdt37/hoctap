"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useState } from "react";
import { HiDownload, HiX, HiDocumentDownload, HiCode } from "react-icons/hi";

type ExportFormat = "xlsx" | "json";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportComprehensive({ isOpen, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
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
      const response = await api.get("/admin/statistics/export/comprehensive", {
        params: { from_date: fromDate, to_date: toDate, format },
        responseType: format === "xlsx" ? "blob" : "json",
      });

      if (format === "xlsx") {
        // Check content-type
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
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao_cao_toan_dien_${new Date()
          .toISOString()
          .split("T")[0]
          .replace(/-/g, "")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // JSON - download as file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bao_cao_toan_dien_${new Date()
          .toISOString()
          .split("T")[0]
          .replace(/-/g, "")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      onClose();
    } catch (error: any) {
      console.error("Export failed:", error);
      alert(`Lỗi: ${error.message || "Xuất file thất bại"}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <HiDownload className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Xuất báo cáo toàn diện
              </h3>
              <p className="text-gray-500 text-sm">
                Tải tất cả thống kê hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Định dạng xuất
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat("xlsx")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  format === "xlsx"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <HiDocumentDownload
                  className={`w-6 h-6 ${
                    format === "xlsx" ? "text-green-600" : "text-gray-400"
                  }`}
                />
                <div className="text-left">
                  <p
                    className={`font-medium ${
                      format === "xlsx" ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    Excel
                  </p>
                  <p className="text-xs text-gray-500">
                    File .xlsx với 13 sheets
                  </p>
                </div>
              </button>
              <button
                onClick={() => setFormat("json")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  format === "json"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <HiCode
                  className={`w-6 h-6 ${
                    format === "json" ? "text-green-600" : "text-gray-400"
                  }`}
                />
                <div className="text-left">
                  <p
                    className={`font-medium ${
                      format === "json" ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    JSON
                  </p>
                  <p className="text-xs text-gray-500">Dữ liệu raw cho dev</p>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Info */}
          {format === "xlsx" && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 font-medium mb-2">
                Nội dung file Excel:
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                <span>• Tổng quan</span>
                <span>• Doanh thu</span>
                <span>• DT theo tháng</span>
                <span>• DT theo danh mục</span>
                <span>• Người dùng</span>
                <span>• Khóa học</span>
                <span>• Top khóa học</span>
                <span>• Giảng viên</span>
                <span>• Top giảng viên</span>
                <span>• Tài chính</span>
                <span>• Hoạt động</span>
                <span>• +2 sheets khác</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Đang xuất...</span>
              </>
            ) : (
              <>
                <HiDownload className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Xuất {format === "xlsx" ? "Excel" : "JSON"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
