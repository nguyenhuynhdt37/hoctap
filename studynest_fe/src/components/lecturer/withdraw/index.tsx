"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

interface WithdrawItem {
  id: string;
  lecturer_id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  amount: number;
  currency: string;
  status: string;
  requested_at: string;
  rejected_at: string | null;
}

interface WithdrawResponse {
  page: number;
  limit: number;
  total: number;
  items: WithdrawItem[];
}

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

export default function WithdrawPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>("all");
  const [orderBy, setOrderBy] = useState("requested_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("order_by", orderBy);
    params.set("order_dir", orderDir);
    if (status !== "all") params.set("status", status);
    return params.toString();
  };

  const { data, error, isLoading } = useSWR<WithdrawResponse>(
    `/lecturer/withdraw?${buildQuery()}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Lịch sử yêu cầu rút tiền
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Theo dõi các yêu cầu rút tiền của bạn
            </p>
          </div>
          <Link
            href="/lecturer/withdraw/create"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Tạo yêu cầu mới
          </Link>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            Không thể tải danh sách yêu cầu. Vui lòng thử lại
          </div>
        )}

        <div className="bg-white rounded-xl border border-green-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-4">
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
              <option value="payout_pending">Đang chờ PayPal thanh toán</option>
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
                        Avatar
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Thời gian
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Số tiền
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data?.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <img
                              src={
                                item.avatar
                                  ? getGoogleDriveImageUrl(item.avatar)
                                  : "https://ui-avatars.com/api/?name=" +
                                    encodeURIComponent(item.fullname) +
                                    "&background=00bba7&color=fff"
                              }
                              alt={item.fullname}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(item.requested_at)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {(page - 1) * limit + 1}-
                    {Math.min(page * limit, data?.total || 0)} trên tổng số{" "}
                    {data?.total || 0} yêu cầu
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="text-sm text-gray-600">
                      Trang {page} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
