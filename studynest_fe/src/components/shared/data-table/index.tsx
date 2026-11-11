"use client";

import { ReactNode } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";
import { cn } from "@/lib/utils";

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
  compact?: boolean;
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
  compact = false,
  className = "",
  rowClassName,
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const cellPadding = compact ? "px-4 py-2.5" : "px-6 py-4";

  return (
    <div
      className={cn(
        "bg-surface rounded-[20px] shadow-xs border border-border overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              {columns.map((column) => {
                const isSorted = sortBy === column.key;
                const ariaSort = isSorted
                  ? order === "asc"
                    ? "ascending"
                    : "descending"
                  : column.sortable
                  ? "none"
                  : undefined;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      cellPadding,
                      "text-left text-xs uppercase tracking-wider",
                      column.className
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className="inline-flex items-center space-x-1.5 rounded-md font-semibold text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150 cursor-pointer"
                      >
                        <span>{column.title}</span>
                        {isSorted &&
                          (order === "asc" ? (
                            <HiChevronUp
                              className="w-4 h-4 text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <HiChevronDown
                              className="w-4 h-4 text-primary"
                              aria-hidden="true"
                            />
                          ))}
                      </button>
                    ) : (
                      <span className="font-semibold text-muted-foreground">
                        {column.title}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center"
                >
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-center space-x-2"
                  >
                    <div
                      className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted-foreground">
                      Đang tải...
                    </span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={record.id || index}
                  className={cn(
                    "hover:bg-background/75 transition-colors duration-150",
                    rowClassName ? rowClassName(record, index) : ""
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(cellPadding, "text-sm text-foreground")}
                    >
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
