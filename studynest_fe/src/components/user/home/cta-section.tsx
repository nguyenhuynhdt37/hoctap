"use client";

import { Button } from "@/components/ui";
import { useUserStore } from "@/stores/user";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Cloud,
  GraduationCap,
  Zap,
} from "pulsoicon-react";
import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import {
  CloudBlob,
  GlassCard,
  IconBubble,
  Pill,
  Reveal,
  SectionHeader,
  SectionShell,
} from "./landing-ui";

interface CTASectionProps {
  onExploreCourses?: () => void;
}

const CTASection: FC<CTASectionProps> = ({ onExploreCourses }) => {
  const user = useUserStore((s) => s.user);

  const handleScrollCourses = () => {
    if (onExploreCourses) {
      onExploreCourses();
      return;
    }
    const el = document.getElementById("courses-section");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const PrimaryIcon = user ? GraduationCap : Cloud;

  return (
    <SectionShell tone="sky">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary bg-linear-to-br from-primary-hover via-primary to-primary p-6 text-primary-foreground shadow-xl sm:p-10 lg:p-14">
        <div className="grid min-w-0 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="relative z-10 min-w-0 lg:col-span-7">
            <SectionHeader
              align="left"
              eyebrow="Đồng hành cùng học sinh Lớp 1 – 12"
              title="Hành trình học tập của bạn bắt đầu từ hôm nay."
              description="Dù bạn đang xây dựng nền tảng đầu đời ở bậc Tiểu học, khám phá khoa học ở bậc THCS hay bứt phá cho kỳ thi THPT, Mây Mây và bạn nhỏ Mây luôn sẵn sàng đồng hành cùng bạn."
              className="mb-0! [&>h2]:max-w-xl [&>h2]:text-balance [&>h2]:leading-tight [&>h2]:text-primary-foreground [&>p]:max-w-lg [&>p]:text-primary-foreground/90 md:[&>h2]:text-4xl lg:[&>h2]:text-5xl"
            />

            <Reveal delay={0.08} className="mt-7 flex flex-wrap gap-3">
              <Link
                href={user ? "/my-learning" : "/register"}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface px-4 py-2 text-center text-sm leading-snug font-semibold text-primary transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none sm:w-auto sm:px-5"
              >
                <PrimaryIcon aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  {user ? "Tiếp tục lộ trình học tập" : "Đăng ký học tập miễn phí"}
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>

              <Button
                variant="outline"
                size="lg"
                onClick={handleScrollCourses}
                leftIcon={<BookOpen className="size-4" />}
                className="h-auto min-h-12 w-full rounded-full border-primary-foreground bg-transparent px-5 py-2 text-sm leading-snug font-semibold text-primary-foreground hover:border-primary-foreground hover:bg-primary-hover focus-visible:ring-offset-surface active:bg-primary-active motion-reduce:transition-none motion-reduce:active:translate-y-0 sm:w-auto"
              >
                Khám phá khóa học
              </Button>
            </Reveal>
          </div>

          <div className="relative isolate mx-auto w-full max-w-lg min-w-0 pt-5 pb-7 lg:col-span-5 lg:max-w-none">
            <CloudBlob className="-right-24 -top-20 h-52 w-80 bg-surface/25!" />
            <CloudBlob className="-right-24 -bottom-20 h-36 w-80 bg-surface/20!" />

            <Reveal delay={0.12} className="relative">
              <GlassCard
                as="figure"
                className="bg-surface/95! p-2 text-foreground motion-reduce:hover:translate-y-0 sm:p-2.5"
              >
                <Image
                  src="/videos/studynest/scene-welcome.jpg"
                  alt="Bạn nhỏ Mây chào đón học sinh trước cổng Học viện Mây Mây"
                  width={1920}
                  height={1080}
                  sizes="(min-width: 1024px) 40vw, 85vw"
                  className="aspect-video h-auto w-full rounded-2xl object-cover"
                />
                <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 pt-2.5 pb-3 sm:px-3">
                  <span className="text-sm font-semibold">Học viện Mây Mây</span>
                  <span className="text-xs font-medium text-foreground/85">
                    Tiểu học • THCS • THPT
                  </span>
                </figcaption>
              </GlassCard>
            </Reveal>

            <Reveal delay={0.2} className="absolute top-1 right-2 z-10">
              <Pill
                tone="blue"
                className="bg-surface! px-3.5! py-2! text-foreground! shadow-lg"
              >
                <Zap aria-hidden="true" className="size-4 text-primary" />
                Trắc nghiệm tức thì
              </Pill>
            </Reveal>

            <Reveal delay={0.26} className="absolute bottom-1 left-2 z-10">
              <GlassCard className="inline-flex items-center gap-2 rounded-bl-lg! bg-surface! py-1.5 pr-4 pl-1.5 text-foreground motion-reduce:hover:translate-y-0">
                <IconBubble tone="lavender" shape="circle" className="size-8!">
                  <Bot aria-hidden="true" className="size-4" />
                </IconBubble>
                <span className="text-xs font-semibold">Trợ lý AI</span>
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </div>
    </SectionShell>
  );
};

export default CTASection;
