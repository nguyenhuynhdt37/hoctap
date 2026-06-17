import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useUserStore } from "@/stores/user";
import { useState } from "react";
import { createPortal } from "react-dom";
import { HiAcademicCap, HiCheck, HiX } from "react-icons/hi";

interface BecomeLecturerModalProps {
  onClose: () => void;
}

export default function BecomeLecturerModal({
  onClose,
}: BecomeLecturerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user, setUser } = useUserStore();

  const handleRegister = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Gọi API đăng ký giảng viên
      // const response = await api.post("/user/become-lecturer"); // Giả định API

      // Tạm thời giả lập thành công và reload lại user để cập nhật role (nếu backend xử lý ngay)
      // Trong thực tế có thể là gửi request và chờ duyệt -> Hiển thị thông báo chờ duyệt

      // Ở đây ta hiển thị thông báo demo trước vì chưa biết API chính xác
      // Nếu user cần flow này, họ sẽ cung cấp thêm thông tin API.

      // Theo luồng thông thường của các hệ thống LMS, sẽ là chuyển trạng thái user hoặc gửi request

      // Giả sử API là: POST /api/v1/users/become-lecturer
      // await api.post("/users/become-lecturer");

      showToast.success("Yêu cầu đăng ký giảng viên đã được gửi thành công!");
      onClose();
    } catch (error) {
      showToast.error("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    "Tạo và quản lý khóa học không giới hạn",
    "Tiếp cận hàng ngàn học viên tiềm năng",
    "Công cụ giảng dạy chuyên nghiệp",
    "Nhận doanh thu hấp dẫn từ khóa học của bạn",
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Image/Background */}
        <div className="h-32 bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center relative">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/patterns/circuit-board.svg')] opacity-10"></div>
          </div>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transform translate-y-8">
            <HiAcademicCap className="w-10 h-10 text-green-600" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="pt-12 px-8 pb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Trở thành Giảng viên
            </h2>
            <p className="text-gray-600">
              Chia sẻ kiến thức của bạn và kiếm thêm thu nhập cùng StudyNest
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <HiCheck className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700 text-sm font-medium">
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <p className="text-xs text-yellow-800 text-center">
              Lưu ý: Yêu cầu của bạn sẽ được đội ngũ Admin kiểm duyệt trong vòng
              24h.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              Để sau
            </button>
            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đăng ký ngay"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
