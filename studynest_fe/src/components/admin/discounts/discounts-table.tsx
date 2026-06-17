"use client";

import ContextMenu from "@/components/shared/context-menu";
import { Discount, DiscountsTableProps } from "@/types/admin/discount";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const getDiscountStatus = (
  discount: Discount
): {
  status: "active" | "expired" | "upcoming";
  label: string;
  className: string;
  isHidden: boolean;
} => {
  const now = new Date();
  const startAt = new Date(discount.start_at);
  const endAt = new Date(discount.end_at);

  if (now < startAt) {
    return {
      status: "upcoming",
      label: discount.is_hidden ? "Sắp bắt đầu - Ẩn" : "Sắp bắt đầu",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
      isHidden: discount.is_hidden,
    };
  }

  if (now > endAt) {
    return {
      status: "expired",
      label: discount.is_hidden ? "Hết hạn - Ẩn" : "Hết hạn",
      className: "bg-gray-100 text-gray-600 border-gray-200",
      isHidden: discount.is_hidden,
    };
  }

  return {
    status: "active",
    label: discount.is_hidden ? "Đang hoạt động - Ẩn" : "Đang hoạt động",
    className: "bg-green-50 text-green-700 border-green-200",
    isHidden: discount.is_hidden,
  };
};

const getActiveStatus = (
  isActive: boolean
): {
  label: string;
  className: string;
} => {
  return isActive
    ? {
        label: "Đã bật",
        className: "bg-green-50 text-green-700 border-green-200",
      }
    : {
        label: "Đã tắt",
        className: "bg-gray-100 text-gray-600 border-gray-200",
      };
};

const getAppliesToLabel = (appliesTo: string) => {
  const labels: Record<string, string> = {
    course: "Khóa học",
    global: "Toàn hệ thống",
    category: "Danh mục",
  };
  return labels[appliesTo] || appliesTo;
};

const getAppliesToBadgeClass = (appliesTo: string) => {
  const classes: Record<string, string> = {
    course: "bg-green-50 text-green-700 border-green-200",
    global: "bg-green-100 text-green-800 border-green-300",
    category: "bg-green-50 text-green-700 border-green-200",
  };
  return classes[appliesTo] || "bg-gray-50 text-gray-700 border-gray-200";
};

export function DiscountsTable({
  data,
  sortBy,
  orderDir,
  onSort,
  onDelete,
  onToggleActive,
}: DiscountsTableProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuItem, setMenuItem] = useState<Discount | null>(null);

  const openContextMenu = (e: React.MouseEvent, item: Discount) => {
    e.preventDefault();
    setMenuItem(item);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [menuOpen]);

  const handleSort = (column: string) => {
    onSort(column);
  };

  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return "bg-purple-100 text-purple-700 border-purple-200";
    }
    if (role === "LECTURER") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const columns = [
    { key: "name", title: "Tên", sortable: true },
    { key: "discount_code", title: "Mã giảm giá", sortable: false },
    { key: "discount_type", title: "Loại giảm giá", sortable: true },
    { key: "applies_to", title: "Áp dụng cho", sortable: true },
    { key: "usage", title: "Sử dụng", sortable: false },
    { key: "status", title: "Trạng thái", sortable: false },
    // { key: "created_by", title: "Người tạo", sortable: true },
    { key: "created_at", title: "Ngày tạo", sortable: true },
    { key: "period", title: "Thời gian hiệu lực", sortable: false },
    { key: "actions", title: "Thao tác", sortable: false },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 ${
                    column.key === "actions" ? "sm:hidden" : ""
                  }`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 hover:text-green-600 transition-colors"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key && (
                        <span className="text-green-600 font-bold">
                          {orderDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span>{column.title}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  Không có mã giảm giá nào
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={record.id || index}
                  className="hover:bg-gray-50 transition-colors"
                  onContextMenu={(e) => openContextMenu(e, record)}
                >
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {record.name}
                    </div>
                  </td>
                  {/* Discount Code */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-mono font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {record.discount_code}
                    </span>
                  </td>
                  {/* Discount Type */}
                  <td className="px-6 py-4">
                    {record.discount_type === "percent" ? (
                      <span className="text-sm font-semibold text-gray-900">
                        {record.percent_value ?? 0}%
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-gray-900">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(record.fixed_value ?? 0)}
                      </span>
                    )}
                  </td>
                  {/* Applies To */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAppliesToBadgeClass(
                        record.applies_to
                      )}`}
                    >
                      {getAppliesToLabel(record.applies_to)}
                    </span>
                  </td>
                  {/* Usage */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{record.usage_count}</span>
                      <span className="text-gray-500">
                        {record.usage_limit !== null
                          ? ` / ${record.usage_limit}`
                          : " / ∞"}
                      </span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const statusInfo = getDiscountStatus(record);
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                      {(() => {
                        const activeStatus = getActiveStatus(record.is_active);
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${activeStatus.className}`}
                          >
                            {activeStatus.label}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  {/* Created By */}
                  {/* <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">
                        ID: {record.created_by.slice(0, 8)}...
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(
                          record.created_role
                        )}`}
                      >
                        {record.created_role}
                      </span>
                    </div>
                  </td> */}
                  {/* Created At */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">
                      {formatDateTime(record.created_at)}
                    </div>
                  </td>
                  {/* Period */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>
                        <span className="text-gray-500 text-xs">Bắt đầu: </span>
                        <span className="font-medium">
                          {formatDateTime(record.start_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">
                          Kết thúc:{" "}
                        </span>
                        <span className="font-medium">
                          {formatDateTime(record.end_at)}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 sm:hidden">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors sm:hidden"
                        title="Thao tác"
                        onClick={(e) => {
                          const rect = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          setMenuItem(record);
                          setMenuPos({
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + 8,
                          });
                          setMenuOpen(true);
                        }}
                      >
                        {/* 3 dots icon */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path d="M10 4a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 20a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {menuOpen && menuItem && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem chi tiết",
              onClick: () => {
                router.push(`/admin/discounts/${menuItem.id}`);
                setMenuOpen(false);
              },
            },
            {
              label: "Chỉnh sửa",
              onClick: () => {
                router.push(`/admin/discounts/${menuItem.id}/edit`);
                setMenuOpen(false);
              },
            },
            ...(onToggleActive
              ? [
                  {
                    label: menuItem.is_active
                      ? "Tắt mã giảm giá"
                      : "Bật mã giảm giá",
                    onClick: () => {
                      onToggleActive(menuItem.id, menuItem.is_active);
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
            ...(onDelete && (menuItem.usage_count ?? 0) === 0
              ? [
                  {
                    label: "Xóa mã giảm giá",
                    onClick: () => {
                      onDelete(menuItem.id);
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
