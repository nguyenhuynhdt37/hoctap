export function InstructorsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Trở thành giảng viên
        </h3>
        <p className="text-gray-600 mb-6">
          Chia sẻ kiến thức của bạn và kiếm thu nhập từ việc giảng dạy
        </p>
      </div>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">
          Tại sao trở thành giảng viên tại StudyNest?
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">💰 Thu nhập hấp dẫn</h5>
            <p className="text-sm text-gray-700">
              Kiếm thu nhập từ việc chia sẻ kiến thức. Chúng tôi cung cấp tỷ lệ
              chia sẻ doanh thu công bằng và minh bạch.
            </p>
          </div>
          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">🌍 Tiếp cận toàn cầu</h5>
            <p className="text-sm text-gray-700">
              Tiếp cận hàng nghìn học viên từ khắp nơi trên thế giới, mở rộng
              ảnh hưởng và xây dựng thương hiệu cá nhân.
            </p>
          </div>
          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">🛠️ Công cụ hỗ trợ</h5>
            <p className="text-sm text-gray-700">
              Chúng tôi cung cấp các công cụ và tài nguyên cần thiết để bạn tạo
              và quản lý khóa học một cách dễ dàng.
            </p>
          </div>
          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">📊 Phân tích chi tiết</h5>
            <p className="text-sm text-gray-700">
              Theo dõi hiệu suất khóa học, phản hồi học viên và tối ưu hóa nội
              dung dựa trên dữ liệu thực tế.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">
          Yêu cầu trở thành giảng viên
        </h4>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>Có kiến thức chuyên sâu về lĩnh vực bạn muốn giảng dạy</li>
          <li>Kỹ năng giao tiếp và trình bày tốt</li>
          <li>Cam kết tạo nội dung chất lượng cao</li>
          <li>Tuân thủ các quy định và tiêu chuẩn của nền tảng</li>
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">Quy trình đăng ký</h4>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 mb-1">
                Điền đơn đăng ký
              </h5>
              <p className="text-sm text-gray-700">
                Cung cấp thông tin về kinh nghiệm và chuyên môn của bạn
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 mb-1">Xét duyệt hồ sơ</h5>
              <p className="text-sm text-gray-700">
                Đội ngũ của chúng tôi sẽ xem xét và phản hồi trong vòng 3-5 ngày
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 mb-1">
                Tạo khóa học đầu tiên
              </h5>
              <p className="text-sm text-gray-700">
                Sau khi được chấp nhận, bạn có thể bắt đầu tạo khóa học của mình
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="p-6 bg-teal-50 rounded-lg border border-teal-200">
        <h4 className="font-semibold text-teal-900 mb-3">
          Sẵn sàng bắt đầu?
        </h4>
        <p className="text-gray-700 mb-4">
          Đăng ký trở thành giảng viên ngay hôm nay và bắt đầu hành trình chia
          sẻ kiến thức của bạn.
        </p>
        <a
          href="/lecturer"
          className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
        >
          Đăng ký làm giảng viên →
        </a>
      </section>
    </div>
  );
}

