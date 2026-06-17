export function SupportSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Chào mừng đến Trung tâm trợ giúp
        </h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn trong quá trình học tập. Dưới đây
          là các cách bạn có thể nhận được sự giúp đỡ:
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-6 bg-teal-50 rounded-lg border border-teal-200">
          <h4 className="font-semibold text-teal-900 mb-2">
            📧 Liên hệ qua Email
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            Gửi email cho chúng tôi và chúng tôi sẽ phản hồi trong vòng 24 giờ.
          </p>
          <a
            href="mailto:support@studynest.com"
            className="text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
            support@studynest.com →
          </a>
        </div>

        <div className="p-6 bg-teal-50 rounded-lg border border-teal-200">
          <h4 className="font-semibold text-teal-900 mb-2">
            💬 Chat trực tuyến
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            Trò chuyện trực tiếp với đội ngũ hỗ trợ của chúng tôi.
          </p>
          <button className="text-teal-600 hover:text-teal-700 font-medium text-sm">
            Mở chat →
          </button>
        </div>

        <div className="p-6 bg-teal-50 rounded-lg border border-teal-200">
          <h4 className="font-semibold text-teal-900 mb-2">📞 Hotline</h4>
          <p className="text-sm text-gray-700 mb-3">
            Gọi cho chúng tôi từ 8:00 - 22:00 hàng ngày.
          </p>
          <a
            href="tel:1900123456"
            className="text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
            1900 123 456 →
          </a>
        </div>

        <div className="p-6 bg-teal-50 rounded-lg border border-teal-200">
          <h4 className="font-semibold text-teal-900 mb-2">
            ❓ Câu hỏi thường gặp
          </h4>
          <p className="text-sm text-gray-700 mb-3">
            Tìm câu trả lời nhanh cho các câu hỏi phổ biến.
          </p>
          <a
            href="/help/faq"
            className="text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
            Xem FAQ →
          </a>
        </div>
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">Thời gian hỗ trợ</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>Thứ 2 - Thứ 6: 8:00 - 22:00</li>
          <li>Thứ 7 - Chủ nhật: 9:00 - 18:00</li>
        </ul>
      </div>
    </div>
  );
}
