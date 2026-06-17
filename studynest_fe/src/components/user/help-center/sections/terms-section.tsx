export function TermsSection() {
  return (
    <div className="space-y-8">
      <div className="text-sm text-gray-500 mb-8">
        Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}
      </div>

      <div className="space-y-6">
        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            1. Chấp nhận điều khoản
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Bằng việc truy cập và sử dụng nền tảng StudyNest, bạn đồng ý tuân
            thủ các điều khoản và điều kiện được nêu trong tài liệu này. Nếu bạn
            không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch
            vụ của chúng tôi.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            2. Tài khoản người dùng
          </h4>
          <p className="text-gray-700 leading-relaxed mb-3">
            Khi tạo tài khoản, bạn cam kết:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Cung cấp thông tin chính xác và đầy đủ</li>
            <li>Bảo mật thông tin đăng nhập của bạn</li>
            <li>
              Chịu trách nhiệm cho mọi hoạt động diễn ra trên tài khoản của bạn
            </li>
            <li>Thông báo ngay cho chúng tôi nếu phát hiện vi phạm bảo mật</li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            3. Sử dụng dịch vụ
          </h4>
          <p className="text-gray-700 leading-relaxed mb-3">
            Bạn được phép sử dụng StudyNest cho mục đích học tập cá nhân. Bạn
            không được phép:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Sao chép, phân phối hoặc bán nội dung khóa học</li>
            <li>
              Sử dụng nội dung cho mục đích thương mại mà không có sự cho phép
            </li>
            <li>Can thiệp vào hệ thống hoặc cố gắng truy cập trái phép</li>
            <li>Tạo tài khoản giả mạo hoặc sử dụng thông tin của người khác</li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            4. Thanh toán và hoàn tiền
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Tất cả các giao dịch thanh toán đều được xử lý an toàn. Chúng tôi
            cung cấp chính sách hoàn tiền trong vòng 30 ngày kể từ ngày mua nếu
            bạn không hài lòng với khóa học. Vui lòng liên hệ hỗ trợ để được xử
            lý yêu cầu hoàn tiền.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            5. Quyền sở hữu trí tuệ
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Tất cả nội dung trên StudyNest, bao gồm video, tài liệu, và tài
            nguyên khác, đều thuộc quyền sở hữu của StudyNest hoặc các đối tác
            của chúng tôi. Bạn không được phép sao chép, phân phối hoặc sử dụng
            nội dung này mà không có sự cho phép bằng văn bản.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            6. Chấm dứt tài khoản
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu bạn
            vi phạm các điều khoản sử dụng. Bạn cũng có thể yêu cầu xóa tài
            khoản bất cứ lúc nào bằng cách liên hệ với bộ phận hỗ trợ.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            7. Thay đổi điều khoản
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi có quyền cập nhật các điều khoản này bất cứ lúc nào. Các
            thay đổi sẽ có hiệu lực ngay sau khi được đăng tải. Việc bạn tiếp
            tục sử dụng dịch vụ sau khi có thay đổi được coi là bạn đã chấp nhận
            các điều khoản mới.
          </p>
        </section>
      </div>
    </div>
  );
}
