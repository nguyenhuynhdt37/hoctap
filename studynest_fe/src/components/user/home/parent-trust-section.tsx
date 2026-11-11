"use client";

import { Badge, Button, Card } from "@/components/ui";
import Link from "next/link";
import React from "react";
import {
  HiCheckCircle,
  HiClipboardList,
  HiEye,
  HiShieldCheck,
  HiUserGroup,
} from "react-icons/hi";

interface ParentTrustSectionProps {
  onExploreCourses: () => void;
}

const TRUST_PILLARS = [
  {
    title: "Cấu trúc chương trình & mục tiêu rõ ràng",
    description:
      "Mỗi khóa học đều công khai đề cương chi tiết, mục tiêu đầu ra, ngôn ngữ giảng dạy và thông tin giảng viên để phụ huynh cùng con dễ dàng lựa chọn.",
    icon: HiClipboardList,
    badge: "Minh bạch thông tin",
  },
  {
    title: "Theo dõi tiến độ học tập thực tế",
    description:
      "Phụ huynh và học sinh có thể xem trực tiếp những bài học nào đã hoàn thành, bài nào đang học dở trong trang Học tập của tôi mà không cần phỏng đoán.",
    icon: HiEye,
    badge: "Đồng hành sát sao",
  },
  {
    title: "Không gian học tập lành mạnh, không quảng cáo",
    description:
      "Giao diện Cloudy Blue tĩnh lặng, không chứa quảng cáo thương mại hay các yếu tố gây xao nhãng, giúp học sinh từ Lớp 1 đến Lớp 12 tập trung trọn vẹn.",
    icon: HiShieldCheck,
    badge: "Tập trung & An tâm",
  },
  {
    title: "Quản lý học phí & hoàn tiền minh bạch",
    description:
      "Hỗ trợ thanh toán an toàn, lưu trữ đầy đủ lịch sử giao dịch trong Ví và có quy trình gửi yêu cầu hoàn tiền trực tuyến rõ ràng trên hệ thống.",
    icon: HiUserGroup,
    badge: "Hỗ trợ tận tâm",
  },
];

const ParentTrustSection: React.FC<ParentTrustSectionProps> = ({
  onExploreCourses,
}) => {
  return (
    <section
      id="parent-trust"
      className="py-20 bg-surface-muted border-b border-border/70 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Editorial Message for Parents */}
          <div className="lg:col-span-5 space-y-6">
            <Badge variant="vanilla" size="md" dot>
              Dành cho Phụ huynh & Học sinh
            </Badge>

            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.22]">
              Sự an tâm của phụ huynh trên từng bước con trưởng thành
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Chúng tôi hiểu rằng phụ huynh không chỉ tìm kiếm một khóa học trực
              tuyến, mà cần một môi trường học tập có tổ chức, rõ ràng và đáng
              tin cậy để con hình thành thói quen tự giác mỗi ngày.
            </p>

            <div className="space-y-3 pt-1">
              {[
                "Xem trước thông tin khóa học và kết quả đầu ra trước khi đăng ký",
                "Phân chia cấp độ phù hợp tâm lý lứa tuổi Tiểu học, THCS và THPT",
                "Trung tâm trợ giúp và chính sách điều khoản rõ ràng, minh bạch",
              ].map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground font-medium"
                >
                  <HiCheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="primary" size="md" onClick={onExploreCourses}>
                Tìm khóa học cho con
              </Button>
              <Link href="/help">
                <Button variant="secondary" size="md">
                  Trung tâm trợ giúp
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: 4 Trust Pillar Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={pillar.title}
                  className="bg-surface border-border hover:border-primary-pastel transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="default" size="sm">
                        {pillar.badge}
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParentTrustSection;
