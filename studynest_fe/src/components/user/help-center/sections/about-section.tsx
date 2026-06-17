export function AboutSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Về StudyNest
        </h3>
      </div>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">Sứ mệnh của chúng tôi</h4>
        <p className="text-gray-700 leading-relaxed">
          StudyNest được thành lập với sứ mệnh mang đến nền tảng học tập trực
          tuyến chất lượng cao, giúp mọi người có thể tiếp cận giáo dục một cách
          dễ dàng và hiệu quả. Chúng tôi tin rằng giáo dục là quyền cơ bản của
          mọi người và không nên bị giới hạn bởi địa lý hay điều kiện kinh tế.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">Chúng tôi là ai</h4>
        <p className="text-gray-700 leading-relaxed mb-3">
          StudyNest là nền tảng học tập trực tuyến hàng đầu, cung cấp hàng nghìn
          khóa học chất lượng cao từ các giảng viên chuyên nghiệp. Chúng tôi
          tập trung vào:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>Nội dung học tập chất lượng và cập nhật</li>
          <li>Trải nghiệm người dùng tối ưu</li>
          <li>Hỗ trợ học viên tận tâm</li>
          <li>Cộng đồng học tập tích cực</li>
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">Giá trị cốt lõi</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">🎯 Chất lượng</h5>
            <p className="text-sm text-gray-700">
              Chúng tôi cam kết cung cấp nội dung học tập chất lượng cao, được
              kiểm duyệt kỹ lưỡng.
            </p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">💡 Đổi mới</h5>
            <p className="text-sm text-gray-700">
              Luôn cập nhật công nghệ và phương pháp giảng dạy mới nhất để mang
              đến trải nghiệm tốt nhất.
            </p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">🤝 Hỗ trợ</h5>
            <p className="text-sm text-gray-700">
              Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn trong suốt hành trình học tập.
            </p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <h5 className="font-semibold text-teal-900 mb-2">🌱 Phát triển</h5>
            <p className="text-sm text-gray-700">
              Khuyến khích và hỗ trợ sự phát triển cá nhân và nghề nghiệp của mỗi học viên.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-3">Thành tựu</h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-teal-600 mb-2">100K+</div>
            <div className="text-sm text-gray-600">Học viên</div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-teal-600 mb-2">5K+</div>
            <div className="text-sm text-gray-600">Khóa học</div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-teal-600 mb-2">500+</div>
            <div className="text-sm text-gray-600">Giảng viên</div>
          </div>
        </div>
      </section>
    </div>
  );
}

