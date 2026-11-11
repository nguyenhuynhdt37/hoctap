"use client";

import { Badge, Button, Card } from "@/components/ui";
import { useUserStore } from "@/stores/user";
import Link from "next/link";
import React from "react";
import { HiAcademicCap, HiBookOpen, HiCloud } from "react-icons/hi";

interface CTASectionProps {
  onExploreCourses?: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onExploreCourses }) => {
  const user = useUserStore((s) => s.user);

  const handleScrollCourses = () => {
    if (onExploreCourses) {
      onExploreCourses();
      return;
    }
    const el = document.getElementById("courses-section");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-20 bg-surface relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Card
          density="none"
          className="rounded-[32px] bg-gradient-to-br from-primary-light via-background to-secondary-light/55 border-primary-pastel/80 overflow-hidden relative shadow-md"
        >
          <div
            className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 bg-primary-pastel/30 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 bg-secondary-pastel/25 rounded-full blur-3xl"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-7 sm:p-12 lg:p-14 relative z-10">
            {/* Left Copy & Conversion Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <Badge
                variant="default"
                size="md"
                dot
                className="bg-surface/90 border-primary-pastel"
              >
                Đồng hành cùng học sinh Lớp 1 – 12
              </Badge>

              <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold text-foreground tracking-tight leading-[1.18]">
                Hành trình học tập của bạn bắt đầu từ hôm nay.
              </h2>

              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl">
                Dù bạn đang xây dựng nền tảng đầu đời ở bậc Tiểu học, khám phá
                khoa học ở bậc THCS hay bứt phá cho kỳ thi THPT, Mây Mây và
                bạn nhỏ Mây luôn sẵn sàng đồng hành cùng bạn.
              </p>

              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                {user ? (
                  <Link href="/my-learning">
                    <Button
                      variant="primary"
                      size="lg"
                      className="px-7 w-full sm:w-auto"
                    >
                      <HiAcademicCap className="h-5 w-5" />
                      Tiếp tục lộ trình học tập
                    </Button>
                  </Link>
                ) : (
                  <Link href="/register">
                    <Button
                      variant="primary"
                      size="lg"
                      className="px-7 w-full sm:w-auto"
                    >
                      <HiCloud className="h-5 w-5" />
                      Đăng ký học tập miễn phí
                    </Button>
                  </Link>
                )}

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleScrollCourses}
                  className="px-7 w-full sm:w-auto bg-surface border-primary-pastel text-primary hover:bg-primary-light"
                >
                  <HiBookOpen className="h-5 w-5" />
                  Khám phá khóa học
                </Button>
              </div>
            </div>

            {/* Right Visual Frame with Mascot Mây & Cloud Academy */}
            <div className="lg:col-span-5">
              <div className="relative rounded-[24px] overflow-hidden border-2 border-white/90 shadow-lg aspect-video bg-primary-light">
                <img
                  src="/videos/studynest/scene-welcome.jpg"
                  alt="Bạn nhỏ Mây chào đón học sinh trước cổng Học viện Mây Mây"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-surface/90 backdrop-blur-md px-3.5 py-2.5 border border-white/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Học viện Mây Mây
                  </span>
                  <Badge variant="default" size="sm">
                    Tiểu học • THCS • THPT
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;
