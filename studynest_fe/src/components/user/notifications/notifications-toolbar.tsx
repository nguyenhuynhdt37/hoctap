"use client";

import { HiArrowDown, HiArrowUp, HiSearch, HiX } from "react-icons/hi";

interface NotificationsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  readFilter: string;
  onReadFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  orderDir: "asc" | "desc";
  onOrderDirChange: (value: "asc" | "desc") => void;
}

const types = [
  { value: "", label: "Tất cả loại" },
  { value: "wallet", label: "Ví" },
  { value: "course", label: "Khóa học" },
  { value: "system", label: "Hệ thống" },
  { value: "learning", label: "Học tập" },
];

const reads = [
  { value: "", label: "Tất cả" },
  { value: "false", label: "Chưa đọc" },
  { value: "true", label: "Đã đọc" },
];

const sorts = [
  { value: "created_at", label: "Thời gian" },
  { value: "title", label: "Tiêu đề" },
  { value: "type", label: "Loại" },
  { value: "is_read", label: "Trạng thái đọc" },
];

export function NotificationsToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  readFilter,
  onReadFilterChange,
  sortBy,
  onSortByChange,
  orderDir,
  onOrderDirChange,
}: NotificationsToolbarProps) {
  return (
    <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm space-y-4">
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm kiếm thông báo..."
          className="w-full rounded-lg border-2 border-green-200 bg-gray-50 py-2 pl-10 pr-10 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <HiX className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="rounded-lg border-2 border-green-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={readFilter}
          onChange={(e) => onReadFilterChange(e.target.value)}
          className="rounded-lg border-2 border-green-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          {reads.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="rounded-lg border-2 border-green-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              Sắp xếp: {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => onOrderDirChange(orderDir === "asc" ? "desc" : "asc")}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-green-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:border-green-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          {orderDir === "asc" ? (
            <>
              <HiArrowUp className="h-4 w-4" />
              Tăng dần
            </>
          ) : (
            <>
              <HiArrowDown className="h-4 w-4" />
              Giảm dần
            </>
          )}
        </button>
      </div>
    </div>
  );
}

