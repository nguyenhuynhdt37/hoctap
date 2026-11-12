"use client";

import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { Discount, DiscountsTableProps } from "@/types/lecturer/discount";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  variant: BadgeVariant;
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
      variant: "warning",
      isHidden: discount.is_hidden,
    };
  }

  // Đã hết hạn
  if (now > endAt) {
    return {
      status: "expired",
      label: discount.is_hidden ? "Hết hạn - Ẩn" : "Hết hạn",
      variant: "neutral",
      isHidden: discount.is_hidden,
    };
  }

  // Đang trong thời gian hiệu lực
  return {
    status: "active",
    label: discount.is_hidden ? "Đang hoạt động - Ẩn" : "Đang hoạt động",
    variant: "success",
    isHidden: discount.is_hidden,
  };
};

// Hàm lấy trạng thái Bật/Tắt (dựa trên is_active)
const getActiveStatus = (
  isActive: boolean
): {
  label: string;
  variant: BadgeVariant;
} => {
  return isActive
    ? {
        label: "Đã bật",
        variant: "success",
      }
    : {
        label: "Đã tắt",
        variant: "neutral",
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

const getAppliesToBadgeVariant = (appliesTo: string): BadgeVariant => {
  const variants: Record<string, BadgeVariant> = {
    course: "default",
    global: "lavender",
    category: "info",
    specific: "vanilla",
  };
  return variants[appliesTo] || "neutral";
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
    <Card variant="surface" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <span>{column.title}</span>
                      {sortBy === column.key && (
                        <span className="text-primary inline-flex">
                          {orderDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )}
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
          <tbody className="divide-y divide-border bg-surface">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  Không có mã giảm giá nào
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={record.id || index}
                  className="hover:bg-background/70 transition-colors"
                >
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-sm text-foreground">
                      {record.name}
                    </div>
                  </td>

                  {/* Discount Code */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-background text-foreground border border-border">
                      {record.discount_code}
                    </span>
                  </td>

                  {/* Discount Type */}
                  <td className="px-6 py-4">
                    {record.discount_type === "percent" ? (
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {record.percent_value ?? 0}%
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(record.fixed_value ?? 0)}
                      </span>
                    )}
                  </td>

                  {/* Applies To */}
                  <td className="px-6 py-4">
                    <Badge
                      variant={getAppliesToBadgeVariant(record.applies_to)}
                      size="sm"
                    >
                      {getAppliesToLabel(record.applies_to)}
                    </Badge>
                  </td>

                  {/* Usage */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground tabular-nums">
                      <span className="font-medium">{record.usage_count}</span>
                      <span className="text-muted-foreground">
                        {record.usage_limit !== null
                          ? ` / ${record.usage_limit}`
                          : " / ∞"}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      {/* Trạng thái hoạt động/ẩn */}
                      {(() => {
                        const statusInfo = getDiscountStatus(record);
                        return (
                          <Badge variant={statusInfo.variant} size="sm" dot>
                            {statusInfo.label}
                          </Badge>
                        );
                      })()}
                      {/* Trạng thái Bật/Tắt */}
                      {(() => {
                        const activeStatus = getActiveStatus(record.is_active);
                        return (
                          <Badge variant={activeStatus.variant} size="sm">
                            {activeStatus.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Period */}
                  <td className="px-6 py-4">
                    <div className="text-xs text-foreground space-y-1">
                      <div>
                        <span className="text-muted-foreground">
                          Bắt đầu:{" "}
                        </span>
                        <span className="font-medium">
                          {formatDateTime(record.start_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
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
                            type="button"
                            className="p-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl transition-colors shadow-soft-xs"
                            title="Thao tác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="min-w-[200px] bg-surface rounded-2xl shadow-soft-md border border-border p-1.5 z-50"
                            align="end"
                            sideOffset={5}
                          >
                            {/* Xem chi tiết */}
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-xl hover:bg-primary-light hover:text-primary cursor-pointer outline-none transition-colors"
                              onClick={() =>
                                router.push(`/lecturer/discounts/${record.id}`)
                              }
                            >
                              <Eye className="h-4 w-4 text-primary" />
                              <span>Xem chi tiết</span>
                            </DropdownMenu.Item>

                            {/* Chỉnh sửa */}
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-xl hover:bg-primary-light hover:text-primary cursor-pointer outline-none transition-colors"
                              onClick={() =>
                                router.push(
                                  `/lecturer/discounts/${record.id}/edit`
                                )
                              }
                            >
                              <Pencil className="h-4 w-4 text-primary" />
                              <span>Chỉnh sửa</span>
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-px bg-border my-1" />

                            {/* Tắt/Bật */}
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-xl hover:bg-warning-bg hover:text-warning-foreground cursor-pointer outline-none transition-colors"
                              onClick={() => {
                                if (onToggleActive) {
                                  onToggleActive(record.id, record.is_active);
                                }
                              }}
                            >
                              {record.is_active ? (
                                <>
                                  <XCircle className="h-4 w-4 text-warning-foreground" />
                                  <span>Tắt mã giảm giá</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                                  <span>Bật mã giảm giá</span>
                                </>
                              )}
                            </DropdownMenu.Item>

                            {/* Xóa - chỉ hiện khi chưa có ai dùng */}
                            {record.usage_count === 0 && onDelete && (
                              <>
                                <DropdownMenu.Separator className="h-px bg-border my-1" />
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-destructive-foreground rounded-xl hover:bg-destructive-bg cursor-pointer outline-none transition-colors"
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
                                  <Trash2 className="h-4 w-4" />
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
    </Card>
  );
}
