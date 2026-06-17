"use client";

import { FavoritesPanel } from "./favorites-panel";

export default function FavoritesSection() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Khóa học yêu thích</h1>
          <p className="text-gray-600">Theo dõi những khóa học bạn đã lưu để dễ dàng quay lại và đăng ký khi sẵn sàng</p>
        </div>
        <FavoritesPanel />
      </div>
    </div>
  );
}
