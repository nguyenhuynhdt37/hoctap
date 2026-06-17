"use client";

import { useState } from "react";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Liên hệ với chúng tôi</h3>
        <p className="text-gray-600 mb-6">
          Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn. Hãy gửi tin nhắn cho
          chúng tôi!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h4 className="font-semibold text-teal-900 mb-2">📧 Email</h4>
            <a
              href="mailto:contact@studynest.com"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              contact@studynest.com
            </a>
          </div>

          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h4 className="font-semibold text-teal-900 mb-2">📞 Điện thoại</h4>
            <a
              href="tel:1900123456"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              1900 123 456
            </a>
          </div>

          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h4 className="font-semibold text-teal-900 mb-2">📍 Địa chỉ</h4>
            <p className="text-gray-700 text-sm">
              123 Đường ABC, Quận XYZ
              <br />
              Thành phố Hồ Chí Minh, Việt Nam
            </p>
          </div>

          <div className="p-5 bg-teal-50 rounded-lg border border-teal-200">
            <h4 className="font-semibold text-teal-900 mb-2">⏰ Giờ làm việc</h4>
            <p className="text-gray-700 text-sm">
              Thứ 2 - Thứ 6: 8:00 - 22:00
              <br />
              Thứ 7 - Chủ nhật: 9:00 - 18:00
            </p>
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chủ đề *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tin nhắn *
              </label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              Gửi tin nhắn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

