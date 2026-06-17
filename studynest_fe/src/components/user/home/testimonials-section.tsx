"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HiStar } from "react-icons/hi";

const testimonials = [
  {
    id: 1,
    name: "Nguyễn Minh T",
    role: "Frontend Developer",
    company: "TechCorp",
    content:
      "Khóa học JavaScript của StudyNest đã giúp tôi từ một người mới bắt đầu trở thành developer chuyên nghiệp. Giảng viên rất tận tâm và nội dung chất lượng cao.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Trần Thị H",
    role: "UI Designer",
    company: "DesignStudio",
    content:
      "Tôi đã học được rất nhiều từ khóa UI/UX Design. Phương pháp giảng dạy rất thực tế và dễ hiểu. Giờ đây tôi có thể tự tin làm việc trong lĩnh vực thiết kế.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Lê Văn K",
    role: "Data Analyst",
    company: "DataCorp",
    content:
      "Khóa Python cho Data Science rất tuyệt vời! Tôi đã áp dụng ngay những kiến thức học được vào công việc và được sếp đánh giá cao.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-3">
            Học viên nói gì về StudyNest
          </h2>
          <p className="text-emerald-600 font-medium flex items-center justify-center gap-2">
            <span className="text-green-500">💬</span>
            Những chia sẻ chân thực từ cộng đồng học viên
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-100 hover:border-green-300 hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <HiStar
                    key={i}
                    className="h-5 w-5 text-yellow-500 fill-current"
                  />
                ))}
              </div>

              <p className="text-gray-700 mb-6 text-sm leading-relaxed italic">
                "{testimonial.content}"
              </p>

              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full ring-2 ring-green-200 overflow-hidden mr-3">
                  <img
                    src={getGoogleDriveImageUrl(testimonial.avatar)}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-emerald-600 font-medium">
                    {testimonial.role} tại {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

