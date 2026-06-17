export function PrivacySection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Quyền riêng tư
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            Cam kết bảo vệ quyền riêng tư
          </h4>
          <p className="text-gray-700 leading-relaxed">
            StudyNest cam kết bảo vệ quyền riêng tư của bạn. Chúng tôi hiểu rằng
            thông tin cá nhân của bạn là quan trọng và chúng tôi sẽ xử lý nó một
            cách cẩn thận và minh bạch.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            Kiểm soát thông tin của bạn
          </h4>
          <p className="text-gray-700 leading-relaxed mb-3">
            Bạn có toàn quyền kiểm soát thông tin cá nhân của mình:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Xem và chỉnh sửa thông tin hồ sơ bất cứ lúc nào</li>
            <li>Chọn thông tin nào được hiển thị công khai</li>
            <li>Quyết định nhận thông báo nào</li>
            <li>Yêu cầu xóa tài khoản và dữ liệu</li>
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            Bảo vệ dữ liệu cá nhân
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi tuân thủ các quy định về bảo vệ dữ liệu cá nhân và chỉ thu
            thập thông tin cần thiết để cung cấp dịch vụ tốt nhất cho bạn. Dữ
            liệu của bạn được mã hóa và lưu trữ an toàn.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            Không chia sẻ không cần thiết
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi không chia sẻ thông tin cá nhân của bạn với bên thứ ba trừ
            khi được yêu cầu bởi pháp luật hoặc với sự đồng ý rõ ràng của bạn.
            Chúng tôi không bán dữ liệu người dùng.
          </p>
        </section>

        <section>
          <h4 className="font-semibold text-gray-900 mb-3">
            Quyền truy cập và chỉnh sửa
          </h4>
          <p className="text-gray-700 leading-relaxed">
            Bạn có thể truy cập, chỉnh sửa hoặc xóa thông tin cá nhân của mình
            bất cứ lúc nào thông qua trang cài đặt tài khoản. Nếu bạn cần hỗ
            trợ, vui lòng liên hệ với chúng tôi.
          </p>
        </section>
      </div>
    </div>
  );
}
