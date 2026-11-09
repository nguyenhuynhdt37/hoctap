"use client";

import { getImageUrl } from "@/lib/utils/helpers/image";
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
    <section className="py-16 bg-white border-b border-[#E7EEF7]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D4A5A] tracking-tight mb-2">
            Học viên nói gì về StudyNest
          </h2>
          <p className="text-[#6F7C8C] text-sm font-medium">
            Những chia sẻ chân thực từ cộng đồng học viên
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="group bg-[#FFF9F6] rounded-[20px] p-6 border border-[#E7EEF7] hover:border-[#BFD7ED] hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <HiStar
                      key={i}
                      className="h-4 w-4 text-[#D99B26] fill-current"
                    />
                  ))}
                </div>

                <p className="text-[#3D4A5A] mb-6 text-sm leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
              </div>

              <div className="flex items-center pt-4 border-t border-[#E7EEF7]/80">
                <div className="w-11 h-11 rounded-full ring-2 ring-[#E8F2FA] overflow-hidden mr-3 bg-[#E8F2FA]">
                  <img
                    src={getImageUrl(testimonial.avatar)}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#3D4A5A]">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-[#6F7C8C] font-medium">
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
