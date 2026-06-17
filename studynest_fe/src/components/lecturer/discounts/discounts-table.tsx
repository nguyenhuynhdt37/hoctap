"use client";

import { Discount, DiscountsTableProps } from "@/types/lecturer/discount";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import {
  HiCheckCircle,
  HiDotsVertical,
  HiEye,
  HiPencil,
  HiTrash,
  HiXCircle,
} from "react-icons/hi";

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

// Hàm lấy trạng thái hoạt động/ẩn (dựa trên thời gian và is_hidden)
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

  // Chưa đến thời gian bắt đầu
  if (now < startAt) {
    return {
      status: "upcoming",
      label: discount.is_hidden ? "Sắp bắt đầu - Ẩn" : "Sắp bắt đầu",
      className: discount.is_hidden
        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
        : "bg-yellow-50 text-yellow-700 border-yellow-200",
      isHidden: discount.is_hidden,
    };
  }

  // Đã hết hạn
  if (now > endAt) {
    return {
      status: "expired",
      label: discount.is_hidden ? "Hết hạn - Ẩn" : "Hết hạn",
      className: "bg-gray-100 text-gray-600 border-gray-200",
      isHidden: discount.is_hidden,
    };
  }

  // Đang trong thời gian hiệu lực
  return {
    status: "active",
    label: discount.is_hidden ? "Đang hoạt động - Ẩn" : "Đang hoạt động",
    className: discount.is_hidden
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-green-50 text-green-700 border-green-200",
    isHidden: discount.is_hidden,
  };
};

// Hàm lấy trạng thái Bật/Tắt (dựa trên is_active)
const getActiveStatus = (
  isActive: boolean
): {
  label: string;
  className: string;
} => {
  return isActive
    ? {
        label: "Đã bật",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
    specific: "Cụ thể",
  };
  return labels[appliesTo] || appliesTo;
};

const getAppliesToBadgeClass = (appliesTo: string) => {
  const classes: Record<string, string> = {
    course: "bg-green-50 text-green-700 border-green-200",
    global: "bg-green-100 text-green-800 border-green-300",
    category: "bg-green-50 text-green-700 border-green-200",
    specific: "bg-green-100 text-green-800 border-green-300",
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

  const handleSort = (column: string) => {
    onSort(column);
  };

  const columns = [
    { key: "name", title: "Tên", sortable: true },
    { key: "discount_code", title: "Mã giảm giá", sortable: false },
    { key: "discount_type", title: "Loại giảm giá", sortable: true },
    { key: "applies_to", title: "Áp dụng cho", sortable: true },
    { key: "usage", title: "Sử dụng", sortable: false },
    { key: "status", title: "Trạng thái", sortable: false },
    { key: "period", title: "Thời gian", sortable: false },
    { key: "actions", title: "Thao tác", sortable: false },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-2 hover:text-green-600 transition-colors duration-200"
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
                  className="hover:bg-gray-50 transition-colors duration-200"
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
                      {/* Trạng thái hoạt động/ẩn */}
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
                      {/* Trạng thái Bật/Tắt */}
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
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            className="p-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-md shadow-green-500/25 group"
                            title="Thao tác"
                          >
                            <HiDotsVertical className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-200 p-1 z-50"
                            align="end"
                            sideOffset={5}
                          >
                            {/* Xem chi tiết */}
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                              onClick={() =>
                                router.push(`/lecturer/discounts/${record.id}`)
                              }
                            >
                              <HiEye className="h-4 w-4 text-green-600" />
                              <span>Xem chi tiết</span>
                            </DropdownMenu.Item>

                            {/* Chỉnh sửa */}
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 cursor-pointer outline-none"
                              onClick={() =>
                                router.push(
                                  `/lecturer/discounts/${record.id}/edit`
                                )
                              }
                            >
                              <HiPencil className="h-4 w-4 text-green-600" />
                              <span>Chỉnh sửa</span>
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />

                            {/* Tắt/Bật */}
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-yellow-50 hover:text-yellow-700 cursor-pointer outline-none"
                              onClick={() => {
                                if (onToggleActive) {
                                  onToggleActive(record.id, record.is_active);
                                }
                              }}
                            >
                              {record.is_active ? (
                                <>
                                  <HiXCircle className="h-4 w-4 text-yellow-600" />
                                  <span>Tắt mã giảm giá</span>
                                </>
                              ) : (
                                <>
                                  <HiCheckCircle className="h-4 w-4 text-green-600" />
                                  <span>Bật mã giảm giá</span>
                                </>
                              )}
                            </DropdownMenu.Item>

                            {/* Xóa - chỉ hiện khi chưa có ai dùng */}
                            {record.usage_count === 0 && onDelete && (
                              <>
                                <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 cursor-pointer outline-none"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Bạn có chắc chắn muốn xóa mã giảm giá "${record.name}"?`
                                      )
                                    ) {
                                      onDelete(record.id);
                                    }
                                  }}
                                >
                                  <HiTrash className="h-4 w-4" />
                                  <span>Xóa mã giảm giá</span>
                                </DropdownMenu.Item>
                              </>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
