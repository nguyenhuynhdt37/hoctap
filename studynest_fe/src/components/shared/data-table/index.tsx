"use client";

import { ReactNode } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";

export interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  onSort?: (column: string) => void;
  className?: string;
  rowClassName?: (record: T, index: number) => string;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = "Không có dữ liệu",
  sortBy,
  order,
  onSort,
  className = "",
  rowClassName,
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  return (
    <div
      className={`bg-white rounded-[20px] shadow-xs border border-[#E7EEF7] overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F6FAFF] border-b border-[#E7EEF7]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-xs uppercase tracking-wider ${
                    column.className || ""
                  }`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center space-x-1.5 font-semibold text-[#6F7C8C] hover:text-[#356FA7] transition-colors duration-200 cursor-pointer"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key &&
                        (order === "asc" ? (
                          <HiChevronUp className="w-4 h-4 text-[#356FA7]" />
                        ) : (
                          <HiChevronDown className="w-4 h-4 text-[#356FA7]" />
                        ))}
                    </button>
                  ) : (
                    <span className="font-semibold text-[#6F7C8C]">
                      {column.title}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7EEF7]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#356FA7] border-t-transparent"></div>
                    <span className="text-sm text-[#6F7C8C]">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-[#6F7C8C]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={record.id || index}
                  className={`hover:bg-[#F6FAFF]/70 transition-colors duration-150 ${
                    rowClassName ? rowClassName(record, index) : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-[#3D4A5A]">
                      {column.render
                        ? column.render(record[column.key], record)
                        : record[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
