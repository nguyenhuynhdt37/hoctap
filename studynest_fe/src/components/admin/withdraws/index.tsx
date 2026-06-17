"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import type {
  AdminLecturerOption,
  AdminWithdrawResponse,
} from "@/types/admin/withdraw";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiEye } from "react-icons/hi";
import useSWR from "swr";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Đang chờ",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    payout_pending: "Đang chờ PayPal thanh toán",
    failed: "PayPal thanh toán thất bại",
    paid: "Đã rút tiền thành công",
  };
  return labels[status] || status;
};

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    payout_pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    failed: "bg-red-100 text-red-700 border-red-200",
    paid: "bg-green-100 text-green-700 border-green-200",
  };
  return classes[status] || "bg-gray-100 text-gray-700 border-gray-200";
};

export default function AdminWithdraws() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>("all");
  const [lecturerId, setLecturerId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("requested_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [lecturerSearch, setLecturerSearch] = useState("");
  const [showLecturerDropdown, setShowLecturerDropdown] = useState(false);
  const lecturerDropdownRef = useRef<HTMLDivElement>(null);
  const [batchAction, setBatchAction] = useState<"approve" | "reject" | null>(
    null
  );
  const [batchReason, setBatchReason] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuItem, setMenuItem] = useState<{ id: string } | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("order_by", orderBy);
    params.set("order_dir", orderDir);
    if (status !== "all") params.set("status", status);
    if (lecturerId) params.set("lecturer_id", lecturerId);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  };

  const { data, error, isLoading, mutate } = useSWR<AdminWithdrawResponse>(
    `/admin/withdraw?${buildQuery()}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const searchQuery = lecturerSearch.trim() || "";
  const { data: lecturerOptions } = useSWR<AdminLecturerOption[]>(
    `/admin/withdraw/lecturers?q=${encodeURIComponent(searchQuery)}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        lecturerDropdownRef.current &&
        !lecturerDropdownRef.current.contains(e.target as Node)
      ) {
        setShowLecturerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openContextMenu = (e: React.MouseEvent, item: { id: string }) => {
    e.preventDefault();
    e.stopPropagation();
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const pendingItems = data?.items.filter((item) => item.status === "pending");
  const hasPending = pendingItems && pendingItems.length > 0;
  const pendingForLecturer =
    lecturerId &&
    pendingItems?.filter((item) => item.lecturer_id === lecturerId);
  const hasPendingForLecturer =
    lecturerId && pendingForLecturer && pendingForLecturer.length > 0;

  const handleBatchAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !batchReason.trim()) {
      showToast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      const payload: any = {
        approve: action === "approve",
        all_pending: true,
      };
      if (lecturerId) {
        payload.lecturer_id = lecturerId;
      }
      if (action === "reject" && batchReason.trim()) {
        payload.reason = batchReason.trim();
      }
      await api.post(`/admin/withdraw/approve_deny`, payload);
      mutate();
      showToast.success(
        action === "approve"
          ? `Đã duyệt tất cả yêu cầu${lecturerId ? " của giảng viên này" : ""}`
          : `Đã từ chối tất cả yêu cầu${
              lecturerId ? " của giảng viên này" : ""
            }`
      );
      setBatchAction(null);
      setBatchReason("");
      router.refresh();
    } catch (error: any) {
      showToast.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Không thể xử lý yêu cầu"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý yêu cầu rút tiền
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý và xử lý các yêu cầu rút tiền từ giảng viên
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            Không thể tải danh sách yêu cầu. Vui lòng thử lại
          </div>
        )}

        <div className="bg-white rounded-xl border border-green-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm theo tên/email..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-[200px]"
              />

              <div className="relative" ref={lecturerDropdownRef}>
                <input
                  type="text"
                  value={lecturerSearch}
                  onChange={(e) => {
                    setLecturerSearch(e.target.value);
                    setShowLecturerDropdown(true);
                    if (!e.target.value) setLecturerId("");
                  }}
                  onFocus={() => setShowLecturerDropdown(true)}
                  placeholder="Tìm giảng viên..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                />
                {showLecturerDropdown &&
                  lecturerOptions &&
                  lecturerOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {lecturerOptions.map((lecturer) => (
                        <button
                          key={lecturer.id}
                          onClick={() => {
                            setLecturerId(lecturer.id);
                            setLecturerSearch(lecturer.fullname);
                            setShowLecturerDropdown(false);
                            setPage(1);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                        >
                          {lecturer.avatar ? (
                            <img
                              src={getGoogleDriveImageUrl(lecturer.avatar)}
                              alt={lecturer.fullname}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
                              <span className="text-gray-500 text-xs font-medium">
                                {lecturer.fullname[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {lecturer.fullname}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lecturer.email}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Đang chờ</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
                <option value="payout_pending">
                  Đang chờ PayPal thanh toán
                </option>
                <option value="failed">PayPal thanh toán thất bại</option>
                <option value="paid">Đã rút tiền thành công</option>
              </select>

              <select
                value={orderBy}
                onChange={(e) => {
                  setOrderBy(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="requested_at">Sắp xếp theo thời gian</option>
                <option value="amount">Sắp xếp theo số tiền</option>
                <option value="status">Sắp xếp theo trạng thái</option>
              </select>

              <button
                onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                {orderDir === "asc" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 19V5m0 0-5 5m5-5 5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Tăng dần
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 5v14m0 0-5-5m5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Giảm dần
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              {(lecturerId || search) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {lecturerId && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      Giảng viên: {lecturerSearch || "Đã chọn"}
                      <button
                        onClick={() => {
                          setLecturerId("");
                          setLecturerSearch("");
                          setPage(1);
                        }}
                        className="ml-2 hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {search && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      Tìm kiếm: {search}
                      <button
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                        className="ml-2 hover:text-green-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}

              {hasPending && status === "pending" && (
                <div className="flex gap-2">
                  {hasPendingForLecturer ? (
                    <>
                      <button
                        onClick={() => setBatchAction("approve")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                      >
                        Duyệt tất cả của GV
                      </button>
                      <button
                        onClick={() => setBatchAction("reject")}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-50 text-sm"
                      >
                        Từ chối tất cả của GV
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setBatchAction("approve")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                      >
                        Duyệt tất cả
                      </button>
                      <button
                        onClick={() => setBatchAction("reject")}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-50 text-sm"
                      >
                        Từ chối tất cả
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {batchAction && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="mb-3">
                  <p className="font-semibold text-gray-900 mb-1">
                    {batchAction === "approve"
                      ? `Xác nhận duyệt tất cả yêu cầu${
                          lecturerId ? " của giảng viên này" : ""
                        }?`
                      : `Xác nhận từ chối tất cả yêu cầu${
                          lecturerId ? " của giảng viên này" : ""
                        }?`}
                  </p>
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Hành động này không thể hoàn tác
                  </p>
                </div>
                {batchAction === "reject" && (
                  <textarea
                    value={batchReason}
                    onChange={(e) => setBatchReason(e.target.value)}
                    placeholder="Nhập lý do từ chối (bắt buộc)..."
                    className="w-full min-h-[100px] rounded-lg border border-yellow-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm p-3 mb-3"
                  />
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBatchAction(null);
                      setBatchReason("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleBatchAction(batchAction)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2">Đang tải...</p>
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>Chưa có yêu cầu rút tiền nào</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Giảng viên
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Số tiền
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Thời gian yêu cầu
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data?.items.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() =>
                          router.push(`/admin/withdraws/${item.id}`)
                        }
                        onContextMenu={(e) => openContextMenu(e, item)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {item.avatar && (
                              <img
                                src={getGoogleDriveImageUrl(item.avatar)}
                                alt={item.fullname}
                                className="w-10 h-10 rounded-full object-cover shrink-0"
                              />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">
                                {item.fullname}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(item.amount)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(item.requested_at)}
                          </div>
                        </td>
                        <td
                          className="px-4 py-4"
                          onClick={(e) => e.stopPropagation()}
                          onContextMenu={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/withdraws/${item.id}`);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <HiEye className="h-4 w-4" />
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Hiển thị {(page - 1) * limit + 1}-
                      {Math.min(page * limit, data?.total || 0)} trên tổng số{" "}
                      {data?.total || 0} yêu cầu
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Mỗi trang</span>
                      <select
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            pageNum === page
                              ? "bg-green-600 text-white"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {menuOpen && menuItem && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Xem chi tiết",
              onClick: () => {
                router.push(`/admin/withdraws/${menuItem.id}`);
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
