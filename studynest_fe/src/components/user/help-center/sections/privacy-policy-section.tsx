export function PrivacyPolicySection() {
  return (
    <div className="space-y-8">
      <div className="text-sm text-gray-500 mb-8">
        Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}
      </div>

      <div className="space-y-10">
        <section className="border-l-4 border-teal-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            1. Thông tin chúng tôi thu thập
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Chúng tôi thu thập các loại thông tin sau:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li className="flex items-start gap-3">
              <span className="text-teal-600 mt-1">•</span>
              <span>
                <strong>Thông tin cá nhân:</strong> Tên, email, số điện thoại
                khi bạn đăng ký tài khoản
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-teal-600 mt-1">•</span>
              <span>
                <strong>Thông tin thanh toán:</strong> Được xử lý bởi các đối
                tác thanh toán uy tín, chúng tôi không lưu trữ thông tin thẻ tín
                dụng
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-teal-600 mt-1">•</span>
              <span>
                <strong>Dữ liệu sử dụng:</strong> Thông tin về cách bạn sử dụng
                nền tảng, tiến độ học tập
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-teal-600 mt-1">•</span>
              <span>
                <strong>Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình
                duyệt, thiết bị sử dụng
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            2. Cách chúng tôi sử dụng thông tin
          </h4>
          <p className="text-gray-700 leading-relaxed mb-3">
            Chúng tôi sử dụng thông tin của bạn để:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Cung cấp và cải thiện dịch vụ học tập</li>
            <li>Xử lý thanh toán và quản lý tài khoản</li>
            <li>Gửi thông báo về khóa học và cập nhật</li>
            <li>Hỗ trợ kỹ thuật và phản hồi yêu cầu của bạn</li>
            <li>Phân tích và cải thiện trải nghiệm người dùng</li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            3. Bảo mật thông tin
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi áp dụng các biện pháp bảo mật tiên tiến để bảo vệ thông
            tin của bạn, bao gồm mã hóa SSL/TLS, kiểm soát truy cập nghiêm ngặt,
            và giám sát hệ thống liên tục. Tuy nhiên, không có phương thức
            truyền tải hoặc lưu trữ nào là hoàn toàn an toàn 100%.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            4. Chia sẻ thông tin
          </h4>
          <p className="text-gray-700 leading-relaxed mb-3">
            Chúng tôi không bán thông tin cá nhân của bạn. Chúng tôi chỉ chia sẻ
            thông tin trong các trường hợp sau:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Với các nhà cung cấp dịch vụ cần thiết để vận hành nền tảng</li>
            <li>Khi được yêu cầu bởi pháp luật hoặc cơ quan có thẩm quyền</li>
            <li>Để bảo vệ quyền và an toàn của StudyNest và người dùng</li>
            <li>Với sự đồng ý rõ ràng của bạn</li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">5. Quyền của bạn</h4>
          <p className="text-gray-700 leading-relaxed mb-3">Bạn có quyền:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Truy cập và xem thông tin cá nhân của bạn</li>
            <li>Yêu cầu chỉnh sửa hoặc cập nhật thông tin</li>
            <li>Yêu cầu xóa tài khoản và dữ liệu cá nhân</li>
            <li>Từ chối nhận email marketing</li>
            <li>Yêu cầu xuất dữ liệu của bạn</li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">6. Cookie</h4>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi sử dụng cookie để cải thiện trải nghiệm của bạn, ghi nhớ
            tùy chọn và phân tích lưu lượng truy cập. Bạn có thể quản lý cookie
            thông qua cài đặt trình duyệt của mình.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">7. Liên hệ</h4>
          <p className="text-gray-700 leading-relaxed">
            Nếu bạn có câu hỏi về chính sách bảo mật này, vui lòng liên hệ với
            chúng tôi qua email:{" "}
            <a
              href="mailto:privacy@studynest.com"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              privacy@studynest.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
