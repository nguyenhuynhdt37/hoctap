"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useEffect, useState } from "react";
import { HiCheckCircle, HiSave, HiX } from "react-icons/hi";
import useSWR from "swr";

interface PlatformSettings {
  id: string;
  platform_fee: number;
  hold_days: number;
  payout_min_balance: number;
  payout_schedule: string;
  currency: string;
  allow_wallet_topup: boolean;
  allow_auto_withdraw: boolean;
  max_discounts_per_course: number;
  discount_max_percent: number;
  discount_min_price: number;
  course_min_price: number;
  course_max_price: number;
  course_default_language: string;
  embedding_dim: number;
  search_top_k: number;
  rag_max_chunks: number;
  max_login_attempts: number;
  lock_time_minutes: number;
  updated_at: string;
  updated_by: string | null;
  instructor_fee?: number; // Computed field
}

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({});

  const { data, error, isLoading, mutate } = useSWR<PlatformSettings>(
    "/admin/settings",
    async (url: string) => {
      const response = await api.get(url);
      return response.data;
    }
  );

  useEffect(() => {
    if (data) {
      setFormData({
        platform_fee: data.platform_fee,
        hold_days: data.hold_days,
        payout_min_balance: data.payout_min_balance,
        payout_schedule: data.payout_schedule,
        currency: data.currency,
        allow_wallet_topup: data.allow_wallet_topup,
        allow_auto_withdraw: data.allow_auto_withdraw,
        max_discounts_per_course: data.max_discounts_per_course,
        discount_max_percent: data.discount_max_percent,
        discount_min_price: data.discount_min_price,
        course_min_price: data.course_min_price,
        course_max_price: data.course_max_price,
        course_default_language: data.course_default_language,
        embedding_dim: data.embedding_dim,
        search_top_k: data.search_top_k,
        rag_max_chunks: data.rag_max_chunks,
        max_login_attempts: data.max_login_attempts,
        lock_time_minutes: data.lock_time_minutes,
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      setSaveSuccess(false);
      await api.put("/admin/settings", formData);
      setSaveSuccess(true);
      mutate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Không thể cập nhật cài đặt. Vui lòng thử lại.";
      showToast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };
  // Context menu for save
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const openSaveMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setMenuOpen(true);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-600">Đang tải cài đặt...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
          <div className="text-center">
            <HiX className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Lỗi tải cài đặt
            </h3>
            <p className="text-gray-600">
              Không thể tải dữ liệu cài đặt. Vui lòng thử lại sau.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const instructorFee = data
    ? (1 - (formData.platform_fee ?? data.platform_fee)).toFixed(4)
    : "0.0000";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
        <p className="text-gray-600 mt-1">
          Quản lý các thiết lập chung của nền tảng
        </p>
      </div>

      {saveSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <HiCheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">
            Cập nhật cài đặt thành công!
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phí và Thanh toán */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Phí và Thanh toán
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phí nền tảng (0.0000 - 1.0000)
              </label>
              <input
                type="number"
                name="platform_fee"
                value={formData.platform_fee ?? ""}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.0001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Ví dụ: 0.3000 = 30%. Phần còn lại ({instructorFee}) sẽ thuộc về
                giảng viên.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số ngày giữ tiền (hold_days)
              </label>
              <input
                type="number"
                name="hold_days"
                value={formData.hold_days ?? ""}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Số ngày giữ tiền trước khi giảng viên có thể rút.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số dư tối thiểu để rút (VND)
              </label>
              <input
                type="number"
                name="payout_min_balance"
                value={formData.payout_min_balance ?? ""}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lịch thanh toán (payout_schedule)
              </label>
              <input
                type="text"
                name="payout_schedule"
                value={formData.payout_schedule ?? ""}
                onChange={handleChange}
                placeholder="mon-wed-fri"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Ví dụ: "mon-wed-fri", "daily", "manual"
              </p>
            </div>
          </div>
        </div>

        {/* Ví và Rút tiền */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ví và Rút tiền
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="allow_wallet_topup"
                checked={formData.allow_wallet_topup ?? false}
                onChange={handleChange}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cho phép nạp tiền vào ví
                </label>
                <p className="text-xs text-gray-500">
                  Người dùng có thể nạp tiền vào ví hay không.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="allow_auto_withdraw"
                checked={formData.allow_auto_withdraw ?? false}
                onChange={handleChange}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cho phép tự động rút tiền
                </label>
                <p className="text-xs text-gray-500">
                  Giảng viên có thể bật chế độ tự rút tiền.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Giá khóa học */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Giá khóa học
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá tối thiểu (VND)
              </label>
              <input
                type="number"
                name="course_min_price"
                value={formData.course_min_price ?? ""}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá tối đa (VND)
              </label>
              <input
                type="number"
                name="course_max_price"
                value={formData.course_max_price ?? ""}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiền tệ mặc định
              </label>
              <select
                name="currency"
                value={formData.currency ?? ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngôn ngữ mặc định
              </label>
              <select
                name="course_default_language"
                value={formData.course_default_language ?? ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mã giảm giá */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mã giảm giá
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số mã tối đa mỗi khóa học
              </label>
              <input
                type="number"
                name="max_discounts_per_course"
                value={formData.max_discounts_per_course ?? ""}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                % Giảm tối đa
              </label>
              <input
                type="number"
                name="discount_max_percent"
                value={formData.discount_max_percent ?? ""}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá tối thiểu sau giảm (VND)
              </label>
              <input
                type="number"
                name="discount_min_price"
                value={formData.discount_min_price ?? ""}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>
        </div>

        {/* RAG và Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            RAG và Tìm kiếm
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kích thước embedding (embedding_dim)
              </label>
              <input
                type="number"
                name="embedding_dim"
                value={formData.embedding_dim ?? ""}
                onChange={handleChange}
                min="128"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số kết quả tìm kiếm (search_top_k)
              </label>
              <input
                type="number"
                name="search_top_k"
                value={formData.search_top_k ?? ""}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số chunks tối đa (rag_max_chunks)
              </label>
              <input
                type="number"
                name="rag_max_chunks"
                value={formData.rag_max_chunks ?? ""}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Bảo mật */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bảo mật</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lần đăng nhập sai tối đa
              </label>
              <input
                type="number"
                name="max_login_attempts"
                value={formData.max_login_attempts ?? ""}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian khóa (phút)
              </label>
              <input
                type="number"
                name="lock_time_minutes"
                value={formData.lock_time_minutes ?? ""}
                onChange={handleChange}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Thông tin cập nhật */}
        {data && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="font-medium">Cập nhật lần cuối:</span>{" "}
                {new Date(data.updated_at).toLocaleString("vi-VN")}
              </div>
              {data.updated_by && (
                <div>
                  <span className="font-medium">Người cập nhật:</span>{" "}
                  {data.updated_by}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nút lưu */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            onContextMenu={openSaveMenu}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <HiSave className="h-5 w-5" />
                Lưu cài đặt
              </>
            )}
          </button>
          {/* Mobile quick trigger */}
          <button
            type="button"
            onClick={(e) => openSaveMenu(e as unknown as React.MouseEvent)}
            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors sm:hidden"
            aria-label="Thao tác lưu"
          >
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
      </form>
      {menuOpen && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Lưu cài đặt",
              onClick: () => {
                // submit form programmatically
                const form = document.querySelector("form");
                if (form) (form as HTMLFormElement).requestSubmit();
                setMenuOpen(false);
              },
            },
          ]}
        />
      )}
    </div>
  );
};

export default Settings;
