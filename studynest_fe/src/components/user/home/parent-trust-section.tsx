"use client";

import { Button } from "@/components/ui";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import {
  GlassCard,
  IconBubble,
  Pill,
  Reveal,
  SectionHeader,
  SectionShell,
} from "./landing-ui";

interface ParentTrustSectionProps {
  onExploreCourses: () => void;
}

const TRUST_PILLARS = [
  {
    title: "Cấu trúc chương trình & mục tiêu rõ ràng",
    description:
      "Mỗi khóa học đều công khai đề cương chi tiết, mục tiêu đầu ra, ngôn ngữ giảng dạy và thông tin giảng viên để phụ huynh cùng con dễ dàng lựa chọn.",
    badge: "Minh bạch thông tin",
  },
  {
    title: "Theo dõi tiến độ học tập thực tế",
    description:
      "Phụ huynh và học sinh có thể xem trực tiếp những bài học nào đã hoàn thành, bài nào đang học dở trong trang Học tập của tôi mà không cần phỏng đoán.",
    badge: "Đồng hành sát sao",
  },
  {
    title: "Không gian học tập lành mạnh, không quảng cáo",
    description:
      "Giao diện Cloudy Blue tĩnh lặng, không chứa quảng cáo thương mại hay các yếu tố gây xao nhãng, giúp học sinh từ Lớp 1 đến Lớp 12 tập trung trọn vẹn.",
    badge: "Tập trung & An tâm",
  },
  {
    title: "Quản lý học phí & hoàn tiền minh bạch",
    description:
      "Hỗ trợ thanh toán an toàn, lưu trữ đầy đủ lịch sử giao dịch trong Ví và có quy trình gửi yêu cầu hoàn tiền trực tuyến rõ ràng trên hệ thống.",
    badge: "Hỗ trợ tận tâm",
  },
];

const TRUST_POINTS = [
  "Xem trước thông tin khóa học và kết quả đầu ra trước khi đăng ký",
  "Phân chia cấp độ phù hợp tâm lý lứa tuổi Tiểu học, THCS và THPT",
  "Trung tâm trợ giúp và chính sách điều khoản rõ ràng, minh bạch",
];

function ParentTrustSection({
  onExploreCourses,
}: ParentTrustSectionProps) {
  return (
    <SectionShell
      id="parent-trust"
      tone="warm"
      label="Dành cho Phụ huynh & Học sinh"
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
        <GlassCard
          tilt={false}
          className="relative isolate min-w-0 bg-linear-to-br from-surface via-surface to-accent-vanilla/40 p-6 lg:p-8 xl:p-10"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            <div className="absolute -right-20 -bottom-24 size-72 rounded-full bg-accent-vanilla/40 blur-3xl" />
            <div className="absolute -right-12 -bottom-16 h-48 w-64 -rotate-25 rounded-[50%] border border-accent-vanilla-border/75" />
            <div className="absolute -right-16 -bottom-10 h-48 w-64 -rotate-25 rounded-[50%] border border-accent-vanilla-border/55" />
          </div>
          <SectionHeader
            align="left"
            tone="vanilla"
            eyebrow="Dành cho Phụ huynh & Học sinh"
            title="Sự an tâm của phụ huynh trên từng bước con trưởng thành"
            description="Chúng tôi hiểu rằng phụ huynh không chỉ tìm kiếm một khóa học trực tuyến, mà cần một môi trường học tập có tổ chức, rõ ràng và đáng tin cậy để con hình thành thói quen tự giác mỗi ngày."
            className="mb-5! md:mb-6! [&_h2]:leading-tight [&_h2]:md:text-4xl [&_h2]:xl:text-5xl [&_p]:text-foreground/85 [&_p]:md:text-base"
          />
          <Reveal delay={0.08} className="space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                className="h-auto min-h-11 rounded-full py-3 leading-snug motion-reduce:transition-none motion-reduce:active:translate-y-0"
                onClick={onExploreCourses}
                rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}
              >
                Tìm khóa học cho con
              </Button>
              <Link
                href="/help"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Trung tâm trợ giúp
              </Link>
            </div>
            <ul className="space-y-2 border-t border-accent-vanilla-border/70 pt-4">
              {TRUST_POINTS.map((point) => (
                <li key={point}>
                  <Pill tone="vanilla" className="items-start! py-1.5 leading-relaxed">
                    <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {point}
                  </Pill>
                </li>
              ))}
            </ul>
          </Reveal>
        </GlassCard>

        <ul className="flex min-w-0 flex-col gap-3.5 lg:gap-4">
          {TRUST_PILLARS.map((pillar, i) => (
            <Reveal
              as="li"
              key={pillar.title}
              delay={i * 0.08}
              className="group min-w-0 odd:mr-2 even:ml-2 md:odd:mr-5 md:even:ml-5 lg:odd:mr-9 lg:even:ml-9"
            >
              <GlassCard className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 bg-linear-to-br from-surface via-surface to-surface-muted px-4 py-4 sm:px-5 lg:px-6 lg:py-5 motion-reduce:hover:translate-y-0">
                <IconBubble tone="success" shape="circle" className="h-9! w-9!">
                  <Check className="size-4" aria-hidden="true" />
                </IconBubble>
                <div className="min-w-0 self-center">
                  <h3 className="text-sm leading-snug font-semibold text-foreground lg:text-base">
                    {pillar.title}
                  </h3>
                </div>
                <p className="col-span-2 text-sm leading-relaxed text-foreground/85 lg:col-span-1 lg:col-start-2">
                  {pillar.description}
                </p>
                <div className="col-span-2 lg:col-span-1 lg:col-start-2">
                  <Pill tone="vanilla" className="shadow-sm group-odd:-rotate-1 group-even:rotate-1">
                    {pillar.badge}
                  </Pill>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

export default ParentTrustSection;
