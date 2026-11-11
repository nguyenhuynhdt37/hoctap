"use client";

import { Badge, Card } from "@/components/ui";
import React from "react";
import {
  HiAnnotation,
  HiChartBar,
  HiClipboardCheck,
  HiCode,
  HiCollection,
  HiPlay,
} from "react-icons/hi";

interface BenefitItem {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconStyle: string;
  cardAccent: string;
}

const BENEFITS: BenefitItem[] = [
  {
    title: "Học theo lộ trình từng chương",
    subtitle: "Cấu trúc tuần tự & khoa học",
    description:
      "Mỗi khóa học được chia thành các chương và bài học ngắn gọn, có mục tiêu đầu ra rõ ràng giúp học sinh từ lớp 1 đến lớp 12 dễ dàng tiếp thu mà không bị quá tải.",
    icon: HiCollection,
    iconStyle: "bg-primary-light text-primary border-primary-pastel",
    cardAccent: "hover:border-primary-pastel",
  },
  {
    title: "Bài giảng Video trực quan",
    subtitle: "Học mọi lúc, xem lại không giới hạn",
    description:
      "Hệ thống trình phát bài giảng mượt mà, cho phép điều chỉnh tốc độ, tua lại phần kiến thức trọng tâm và tự động lưu vị trí bài đang học dở.",
    icon: HiPlay,
    iconStyle: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    cardAccent: "hover:border-secondary-pastel",
  },
  {
    title: "Luyện tập & Trắc nghiệm tức thì",
    subtitle: "Hiểu sâu thay vì học vẹt",
    description:
      "Sau các bài học lý thuyết là hệ thống câu hỏi trắc nghiệm (Quiz) tương tác giúp học sinh tự kiểm tra mức độ nắm vững kiến thức ngay tại chỗ.",
    icon: HiClipboardCheck,
    iconStyle: "bg-success-bg text-success-foreground border-success-border",
    cardAccent: "hover:border-success-border",
  },
  {
    title: "Ghi chú & Trợ lý học tập AI",
    subtitle: "Hỏi đáp ngay khi gặp bài khó",
    description:
      "Học sinh có thể tạo ghi chú riêng ngay trong bài học và trò chuyện cùng Trợ lý AI hoặc đặt câu hỏi ở mục Thảo luận (Q&A) để được giải đáp kịp thời.",
    icon: HiAnnotation,
    iconStyle: "bg-accent text-accent-foreground border-accent-border",
    cardAccent: "hover:border-accent-border",
  },
  {
    title: "Thực hành Tin học & Code trực tiếp",
    subtitle: "Tích hợp trình biên dịch ngay trên web",
    description:
      "Đối với các khóa học Tin học, Lập trình và SQL, học sinh có thể viết code, chạy thử nghiệm và kiểm tra kết quả trực tiếp mà không cần cài đặt phức tạp.",
    icon: HiCode,
    iconStyle: "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
    cardAccent: "hover:border-accent-vanilla-border",
  },
  {
    title: "Theo dõi tiến độ minh bạch",
    subtitle: "Nhìn thấy sự tiến bộ mỗi ngày",
    description:
      "Biểu đồ và danh sách bài học đã hoàn thành được cập nhật theo thời gian thực, giúp học sinh duy trì động lực và phụ huynh dễ dàng đồng hành.",
    icon: HiChartBar,
    iconStyle: "bg-info-bg text-info-foreground border-info-border",
    cardAccent: "hover:border-info-border",
  },
];

const BenefitsSection: React.FC = () => {
  return (
    <section
      id="why-studynest"
      className="py-20 bg-surface border-b border-border/70 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Badge
            variant="default"
            size="md"
            dot
            className="mb-4 bg-primary-light/80 border-primary-pastel"
          >
            Vì sao chọn Mây Mây?
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Thiết kế để việc tự học trở nên nhẹ nhàng và hiệu quả
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Không chạy theo các hiệu ứng gây xao nhãng, Mây Mây tập trung vào
            không gian học tập tĩnh lặng, trực quan và đầy đủ công cụ hỗ trợ học
            sinh tiến bộ thực chất.
          </p>
        </div>

        {/* 6 Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className={`group bg-background/50 hover:bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.cardAccent}`}
              >
                <div className="flex items-center gap-3.5 mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.iconStyle}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-primary block">
                      {item.subtitle}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
