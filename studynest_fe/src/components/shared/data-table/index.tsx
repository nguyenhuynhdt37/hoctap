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
      className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 border border-white/30 overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-teal-50 to-blue-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left ${column.className || ""}`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center space-x-2 font-semibold text-gray-700 hover:text-teal-600 transition-colors duration-300"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key &&
                        (order === "asc" ? (
                          <HiChevronUp className="w-4 h-4" />
                        ) : (
                          <HiChevronDown className="w-4 h-4" />
                        ))}
                    </button>
                  ) : (
                    <span className="font-semibold text-gray-700">
                      {column.title}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    <span className="text-gray-600">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={record.id || index}
                  className={`hover:bg-gray-50/50 transition-colors duration-300 ${
                    rowClassName ? rowClassName(record, index) : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
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
