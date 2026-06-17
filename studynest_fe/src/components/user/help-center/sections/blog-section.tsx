export function BlogSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Blog</h3>
        <p className="text-gray-600 mb-6">
          Cập nhật tin tức, mẹo học tập và kiến thức mới nhất từ StudyNest
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="h-48 bg-gradient-to-br from-teal-100 to-emerald-100"></div>
            <div className="p-4">
              <div className="text-xs text-gray-500 mb-2">
                {new Date().toLocaleDateString("vi-VN")}
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Bài viết mẫu {item}
              </h4>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                Đây là mô tả ngắn gọn về bài viết. Nội dung sẽ được cập nhật sau.
              </p>
              <a
                href="#"
                className="text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                Đọc thêm →
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">
          Blog đang được phát triển. Nội dung sẽ sớm được cập nhật!
        </p>
        <a
          href="#"
          className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
        >
          Xem tất cả bài viết →
        </a>
      </div>
    </div>
  );
}

