"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { HiArrowLeft, HiExclamationCircle } from "react-icons/hi";

export default function CreateRefundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseItemId = searchParams.get("purchase_item_id") || "";

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    refund_id: string;
    refund_amount: number;
    deadline: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!purchaseItemId.trim()) {
      setError("Thiếu thông tin đơn hàng. Vui lòng quay lại trang trước.");
      return;
    }

    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hoàn tiền.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/users/refunds/request", {
        purchase_item_id: purchaseItemId,
        reason: reason.trim(),
      });

      setSuccess({
        refund_id: response.data.refund_id,
        refund_amount: response.data.refund_amount,
        deadline: response.data.deadline,
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDateTime = (value: string) => {
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
      return value;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <HiExclamationCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Yêu cầu hoàn tiền đã được gửi thành công
              </h1>
              <p className="text-gray-600">
                Yêu cầu của bạn đã được ghi nhận và đang chờ xử lý.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-sm text-gray-600 mb-1">ID yêu cầu</div>
                <div className="font-mono text-sm text-gray-900">
                  {success.refund_id}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">
                  Số tiền hoàn tiền
                </div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(success.refund_amount)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="text-sm text-yellow-800 mb-1">
                  Hạn xử lý yêu cầu
                </div>
                <div className="text-sm font-semibold text-yellow-900">
                  {formatDateTime(success.deadline)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/refunds/my-requests")}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
              >
                Xem danh sách yêu cầu
              </button>
              <button
                onClick={() => router.push("/refunds/refundable")}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors mb-6"
        >
          <HiArrowLeft className="h-5 w-5" />
          <span className="font-medium">Quay lại</span>
        </button>

        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Yêu cầu hoàn tiền
          </h1>
          <p className="text-gray-600 mb-6">
            Vui lòng điền thông tin và lý do để gửi yêu cầu hoàn tiền.
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lý do hoàn tiền <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
                <TiptapEditor
                  value={reason}
                  onChange={setReason}
                  placeholder="Nhập lý do bạn muốn hoàn tiền cho khóa học này..."
                  minHeight="200px"
                  showToolbar={true}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Vui lòng mô tả chi tiết lý do bạn muốn hoàn tiền để chúng tôi có
                thể xử lý nhanh chóng.
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <HiExclamationCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Lưu ý quan trọng</p>
                <p>
                  Bạn chỉ có thể yêu cầu hoàn tiền{" "}
                  <strong>1 lần duy nhất</strong> cho khóa học này. Sau khi yêu
                  cầu được gửi, bạn không thể hủy hoặc yêu cầu lại.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!reason.trim() || isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
