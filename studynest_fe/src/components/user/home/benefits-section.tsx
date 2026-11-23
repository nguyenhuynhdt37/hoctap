"use client";

import {
  BookOpen,
  Bot,
  ChartNoAxesColumn,
  Check,
  CirclePlay,
  ClipboardCheck,
  CodeXml,
  NotebookPen,
  Play,
  type PulsoIcon,
} from "pulsoicon-react";
import type { ComponentType } from "react";
import {
  GlassCard,
  IconBubble,
  Pill,
  Reveal,
  SectionHeader,
  SectionShell,
  TONE,
  type Tone,
} from "./landing-ui";

interface BenefitItem {
  title: string;
  subtitle: string;
  description: string;
  icon: PulsoIcon;
  preview: ComponentType;
  tone: Tone;
  placement: string;
  gradient: string;
  wide?: boolean;
}

const BENEFITS: BenefitItem[] = [
  {
    title: "Học theo lộ trình từng chương",
    subtitle: "Cấu trúc tuần tự & khoa học",
    description:
      "Mỗi khóa học được chia thành các chương và bài học ngắn gọn, có mục tiêu đầu ra rõ ràng giúp học sinh từ lớp 1 đến lớp 12 dễ dàng tiếp thu mà không bị quá tải.",
    icon: BookOpen,
    preview: LessonPreview,
    tone: "blue",
    placement: "lg:col-span-5 lg:row-span-2",
    gradient: "bg-linear-to-br from-surface via-surface to-primary-light",
  },
  {
    title: "Bài giảng Video trực quan",
    subtitle: "Học mọi lúc, xem lại không giới hạn",
    description:
      "Hệ thống trình phát bài giảng mượt mà, cho phép điều chỉnh tốc độ, tua lại phần kiến thức trọng tâm và tự động lưu vị trí bài đang học dở.",
    icon: CirclePlay,
    preview: VideoPreview,
    tone: "blue",
    placement: "lg:col-span-7",
    gradient: "bg-linear-to-r from-surface to-primary-light/65",
    wide: true,
  },
  {
    title: "Luyện tập & Trắc nghiệm tức thì",
    subtitle: "Hiểu sâu thay vì học vẹt",
    description:
      "Sau các bài học lý thuyết là hệ thống câu hỏi trắc nghiệm (Quiz) tương tác giúp học sinh tự kiểm tra mức độ nắm vững kiến thức ngay tại chỗ.",
    icon: ClipboardCheck,
    preview: QuizPreview,
    tone: "blue",
    placement: "lg:col-span-7",
    gradient: "bg-linear-to-bl from-primary-light/75 via-surface to-surface",
    wide: true,
  },
  {
    title: "Ghi chú & Trợ lý học tập AI",
    subtitle: "Hỏi đáp ngay khi gặp bài khó",
    description:
      "Học sinh có thể tạo ghi chú riêng ngay trong bài học và trò chuyện cùng Trợ lý AI hoặc đặt câu hỏi ở mục Thảo luận (Q&A) để được giải đáp kịp thời.",
    icon: NotebookPen,
    preview: AssistantPreview,
    tone: "lavender",
    placement: "lg:col-span-5",
    gradient: "bg-linear-to-br from-surface via-surface to-accent/65",
  },
  {
    title: "Thực hành Tin học & Code trực tiếp",
    subtitle: "Tích hợp trình biên dịch ngay trên web",
    description:
      "Đối với các khóa học Tin học, Lập trình và SQL, học sinh có thể viết code, chạy thử nghiệm và kiểm tra kết quả trực tiếp mà không cần cài đặt phức tạp.",
    icon: CodeXml,
    preview: CodePreview,
    tone: "lavender",
    placement: "lg:col-span-4",
    gradient: "bg-linear-to-b from-surface to-accent/35",
  },
  {
    title: "Theo dõi tiến độ minh bạch",
    subtitle: "Nhìn thấy sự tiến bộ mỗi ngày",
    description:
      "Biểu đồ và danh sách bài học đã hoàn thành được cập nhật theo thời gian thực, giúp học sinh duy trì động lực và phụ huynh dễ dàng đồng hành.",
    icon: ChartNoAxesColumn,
    preview: ProgressPreview,
    tone: "blue",
    placement: "lg:col-span-3",
    gradient: "bg-linear-to-br from-surface to-primary-light/75",
  },
];

function LessonPreview() {
  return (
    <div className="relative isolate flex min-h-44 flex-col justify-center px-3 py-6 lg:min-h-60">
      <div className="absolute inset-x-[12%] inset-y-[10%] -z-10 -rotate-12 rounded-[50%] border border-primary-pastel/80" />
      <div className="absolute inset-x-[18%] inset-y-[2%] -z-10 rounded-full bg-primary-pastel/40 blur-2xl" />
      <div className="absolute right-[12%] top-[12%] size-4 rounded-full bg-primary-pastel/70" />
      <div className="absolute bottom-[14%] left-[10%] size-2.5 rounded-full bg-primary-pastel" />
      <GlassCard tilt={false} className="relative mx-auto w-[90%] max-w-72 -rotate-2 p-4">
        <div className="flex items-center gap-3">
          <IconBubble className="h-9! w-9!">
            <BookOpen className="size-4" aria-hidden="true" />
          </IconBubble>
          <div>
            <p className="text-xs font-semibold text-foreground">Chương 2 · Hàm số</p>
            <p className="mt-1 text-xs text-foreground/85">Bài 3 · Đồ thị</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-2 flex-1 rounded-full bg-primary-light">
            <div className="h-full w-[70%] rounded-full bg-primary" />
          </div>
          <span className="text-xs font-semibold tabular-nums text-primary">70%</span>
        </div>
      </GlassCard>
      <Pill className="relative -mt-1 mr-[3%] rotate-2 self-end shadow-sm">
        Đang học
      </Pill>
    </div>
  );
}

function VideoPreview() {
  return (
    <div className="relative isolate mx-auto w-full max-w-64 px-2 py-2.5">
      <div className="absolute inset-x-[10%] inset-y-1 -z-10 rotate-3 rounded-3xl border border-primary-pastel bg-primary-light" />
      <GlassCard tilt={false} className="-rotate-2 p-2.5">
        <div className="grid h-18 place-items-center rounded-2xl bg-linear-to-br from-primary-light to-primary-pastel/65">
          <IconBubble shape="circle" className="h-9! w-9! bg-surface! shadow-sm">
            <Play className="size-4 fill-current" aria-hidden="true" />
          </IconBubble>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-primary-light">
            <div className="h-full w-2/5 rounded-full bg-primary" />
          </div>
          <span className="text-xs font-semibold text-primary">1,25×</span>
        </div>
      </GlassCard>
    </div>
  );
}

function QuizPreview() {
  return (
    <div className="relative isolate mx-auto w-full max-w-64 px-2 py-2.5">
      <Pill className="relative z-10 -mb-2 ml-2 -rotate-2 shadow-sm">
        Câu hỏi nhanh
      </Pill>
      <GlassCard tilt={false} className="rotate-1 px-3 pt-4 pb-3">
        <p className="px-1 text-sm font-semibold text-foreground">7 × 8 bằng bao nhiêu?</p>
        <div className="mt-3 grid grid-cols-[1fr_1.25fr_1fr] gap-1.5 text-xs font-semibold tabular-nums">
          <span className="rounded-xl border border-border bg-background py-2 text-center text-foreground">54</span>
          <span className="flex items-center justify-center gap-1 rounded-xl border border-success-border bg-success-bg py-2 text-success-foreground">
            56 <Check className="size-3.5" aria-hidden="true" />
          </span>
          <span className="rounded-xl border border-border bg-background py-2 text-center text-foreground">64</span>
        </div>
      </GlassCard>
    </div>
  );
}

function AssistantPreview() {
  return (
    <div className="relative isolate mx-auto flex w-full max-w-76 flex-col items-start px-2 pt-3 pb-2">
      <span className="mb-1 self-end rounded-2xl rounded-br-md border border-accent-border/70 bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
        Em nên bắt đầu từ đâu?
      </span>
      <GlassCard tilt={false} className="flex -rotate-2 items-start gap-2.5 rounded-bl-lg! border-accent-border! bg-accent! p-3 text-accent-foreground">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold">Trợ lý AI</p>
          <p className="mt-1 text-xs leading-relaxed">Thử chia bài toán thành từng bước nhé!</p>
        </div>
      </GlassCard>
    </div>
  );
}

function CodePreview() {
  return (
    <div className="relative isolate mx-auto w-full max-w-64 px-2 py-2">
      <GlassCard tilt={false} className="-rotate-2 border-accent-border/75!">
        <div className="flex items-center gap-1.5 border-b border-accent-border/55 px-3 py-2">
          <span className="size-1.5 rounded-full bg-accent-foreground/55" />
          <span className="size-1.5 rounded-full bg-accent-foreground/35" />
          <CodeXml className="ml-auto size-3.5 text-accent-foreground" aria-hidden="true" />
        </div>
        <code className="block px-3 pt-2 pb-3 font-mono text-xs leading-relaxed text-accent-foreground">
          def binh_phuong(n):<br />
          <span className="pl-3">return n * n</span>
        </code>
      </GlassCard>
    </div>
  );
}

function ProgressPreview() {
  return (
    <div className="relative isolate mx-auto w-full max-w-56 px-2 py-2">
      <GlassCard tilt={false} className="rotate-1 px-3 pt-3 pb-2.5">
        <p className="text-xs font-semibold text-foreground">Bài đã hoàn thành</p>
        <div className="mt-2.5 grid h-11 grid-cols-5 items-end gap-1.5 border-b border-primary-pastel pb-1">
          <span className="h-[30%] rounded-t-md bg-primary-pastel/75" />
          <span className="h-[48%] rounded-t-md bg-primary-pastel" />
          <span className="h-[40%] rounded-t-md bg-primary-pastel" />
          <span className="h-[72%] rounded-t-md bg-primary/70" />
          <span className="h-full rounded-t-md bg-primary" />
        </div>
      </GlassCard>
    </div>
  );
}

function BenefitsSection() {
  return (
    <SectionShell
      id="why-studynest"
      tone="plain"
      label="Vì sao chọn Mây Mây?"
    >
      <SectionHeader
        eyebrow="Vì sao chọn Mây Mây?"
        title="Thiết kế để việc tự học trở nên nhẹ nhàng và hiệu quả"
        description="Không chạy theo các hiệu ứng gây xao nhãng, Mây Mây tập trung vào không gian học tập tĩnh lặng, trực quan và đầy đủ công cụ hỗ trợ học sinh tiến bộ thực chất."
        className="[&_h2]:text-balance [&_p]:text-foreground/85"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12">
        {BENEFITS.map(({ icon: Icon, preview: Preview, ...item }, i) => (
          <Reveal key={item.title} delay={i * 0.08} className={`min-w-0 ${item.placement}`}>
            <GlassCard
              as="article"
              className={`grid h-full grid-rows-[auto_1fr] items-center gap-4 p-5 sm:p-6 motion-reduce:hover:translate-y-0 ${item.gradient} ${
                item.wide ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-rows-1" : ""
              } ${i === 0 ? "lg:gap-6 lg:p-8" : ""}`}
            >
              <div className="min-w-0 self-start">
                <IconBubble tone={item.tone} className={i === 0 ? "" : "h-10! w-10!"}>
                  <Icon className={i === 0 ? "size-6" : "size-5"} aria-hidden="true" />
                </IconBubble>
                <p className={`mt-3 text-xs leading-relaxed font-semibold ${TONE[item.tone].fg}`}>
                  {item.subtitle}
                </p>
                <h3 className={`mt-1 text-lg leading-snug font-semibold text-foreground ${i === 0 ? "sm:text-xl lg:max-w-xs lg:text-3xl" : ""}`}>
                  {item.title}
                </h3>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-foreground/85">
                  {item.description}
                </p>
              </div>
              <div aria-hidden="true" className="pointer-events-none min-w-0 self-end">
                <Preview />
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

export default BenefitsSection;
