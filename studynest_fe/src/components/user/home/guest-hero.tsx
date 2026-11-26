"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  GraduationCap,
  Play,
  Search,
  ShieldCheck,
} from "pulsoicon-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SchoolLevelId } from "./grade-levels-section";
import { CloudBlob } from "./landing-ui";
import { mayPortrait, StudyImage } from "./study-image";

type GuestLevelKey = Exclude<SchoolLevelId, "all">;

interface LevelPreview {
  id: GuestLevelKey;
  shortLabel: string;
  grades: string;
  title: string;
  description: string;
  catalogHref: string;
  subjects: string[];
  toneClass: string;
  activeTabClass: string;
}

const LEVEL_PREVIEWS: LevelPreview[] = [
  {
    id: "primary",
    shortLabel: "Tiểu học",
    grades: "Lớp 1 – 5",
    title: "Học vui, nhớ lâu, tạo thói quen tự học",
    description:
      "Bài giảng ngắn sinh động, luyện tập tương tác nhẹ nhàng giúp bé yêu thích Toán, Tiếng Việt và Tiếng Anh mỗi ngày.",
    catalogHref: "/courses?level=tieu-hoc",
    subjects: ["Toán tư duy", "Tiếng Việt", "Tiếng Anh thiếu nhi", "Tin học cơ bản"],
    toneClass: "bg-accent-vanilla/70 border-accent-vanilla-border text-accent-vanilla-foreground",
    activeTabClass: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground shadow-2xs",
  },
  {
    id: "secondary",
    shortLabel: "THCS",
    grades: "Lớp 6 – 9",
    title: "Vững kiến thức nền, bứt phá điểm số",
    description:
      "Hệ thống bài giảng bám sát chương trình kết hợp luyện đề từng chương và ôn thi vào lớp 10 bài bản.",
    catalogHref: "/courses?level=thcs",
    subjects: ["Toán THCS", "Ngữ văn", "Tiếng Anh", "Khoa học Tự nhiên"],
    toneClass: "bg-secondary-light/80 border-secondary-pastel text-secondary-foreground",
    activeTabClass: "border-secondary-pastel bg-secondary-light text-secondary-foreground shadow-2xs",
  },
  {
    id: "highschool",
    shortLabel: "THPT",
    grades: "Lớp 10 – 12",
    title: "Lộ trình chuyên sâu, chinh phục kỳ thi",
    description:
      "Ôn luyện trọng tâm theo chuyên đề, luyện đề thi THPT Quốc gia & Đánh giá năng lực cùng giảng viên giàu kinh nghiệm.",
    catalogHref: "/courses?level=thpt",
    subjects: ["Toán 10–12", "Vật lý – Hóa học", "Tiếng Anh THPT", "Lập trình & Tin học"],
    toneClass: "bg-accent/70 border-accent-border text-accent-foreground",
    activeTabClass: "border-accent-border bg-accent text-accent-foreground shadow-2xs",
  },
];

const QUICK_TOPICS = [
  "Toán học",
  "Tiếng Anh",
  "Ngữ văn",
  "Lập trình",
  "Ôn thi lớp 10",
  "Luyện thi THPT",
];

const TRUST_POINTS = [
  { icon: Play, text: "Học thử miễn phí trước khi chọn khóa" },
  { icon: Bot, text: "Gia sư AI hỗ trợ giải đáp ngay trong bài" },
  { icon: ShieldCheck, text: "Lộ trình rõ ràng theo từng lớp 1–12" },
];

export default function GuestHero({
  onExploreCourses,
  onSelectGradeLevel,
}: {
  onExploreCourses: () => void;
  onSelectGradeLevel: (level: GuestLevelKey) => void;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [activeLevel, setActiveLevel] = useState<GuestLevelKey>("highschool");

  const preview =
    LEVEL_PREVIEWS.find((item) => item.id === activeLevel) ?? LEVEL_PREVIEWS[2];

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    router.push(
      trimmed ? `/courses?keyword=${encodeURIComponent(trimmed)}` : "/courses",
    );
  };

  return (
    <section
      aria-labelledby="guest-home-hero-title"
      className="relative isolate overflow-hidden border-b border-border/80 bg-gradient-to-br from-primary-light/85 via-background to-secondary-light/45"
    >
      <CloudBlob className="-top-20 -left-24 h-72 w-96 bg-white/80" />
      <CloudBlob className="right-[-6rem] bottom-[-4rem] h-80 w-[28rem] bg-primary-pastel/45" />
      <CloudBlob className="top-16 left-[42%] h-52 w-64 bg-accent/35" />

      <div className="relative mx-auto w-full px-3 pt-8 pb-12 sm:px-5 sm:pt-10 sm:pb-14 lg:px-8 lg:pt-12 lg:pb-16">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Cột trái: Tiêu đề + Tìm kiếm trực tiếp + CTA rõ ràng */}
          <div className="min-w-0 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-2xs">
              <GraduationCap size={15} animated={false} aria-hidden="true" />
              <span>Nền tảng học trực tuyến Mây Mây · Lớp 1 đến Lớp 12</span>
            </div>

            <h1
              id="guest-home-hero-title"
              className="mt-4 font-display text-[clamp(2rem,4.2vw,3.35rem)] leading-[1.14] font-bold tracking-tight text-foreground text-balance"
            >
              Học dễ hiểu, vững nền tảng{" "}
              <span className="text-primary">mỗi ngày trên mây</span>
            </h1>

            <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Tìm ngay khóa học phù hợp theo cấp lớp, học qua video trực quan kết
              hợp bài tập tương tác và theo dõi tiến độ rõ ràng từng buổi.
            </p>

            {/* Ô tìm kiếm khóa học trực tiếp */}
            <form
              role="search"
              aria-label="Tìm kiếm khóa học trên Mây Mây"
              onSubmit={handleSearch}
              className="mt-6 flex max-w-2xl flex-col gap-2.5 sm:flex-row"
            >
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">Tìm khóa học, môn học hoặc lớp</span>
                <Search
                  size={18}
                  animated={false}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-primary"
                />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Bạn muốn học môn gì? VD: Toán 12, Tiếng Anh, Lập trình C..."
                  className="h-12 w-full rounded-2xl border border-primary-pastel bg-surface pr-4 pl-11 text-sm text-foreground shadow-ambient-xs placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <Button type="submit" size="lg" className="h-12 shrink-0 rounded-2xl px-6">
                Tìm khóa học
              </Button>
            </form>

            {/* Gợi ý từ khóa 1 chạm */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-subtle-foreground">
                Phổ biến:
              </span>
              {QUICK_TOPICS.map((topic) => (
                <Link
                  key={topic}
                  href={`/courses?keyword=${encodeURIComponent(topic)}`}
                  className="inline-flex items-center rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                >
                  {topic}
                </Link>
              ))}
            </div>

            {/* Hành động chính */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={onExploreCourses}
                className="rounded-full px-6 shadow-ambient-sm"
              >
                <BookOpen size={17} aria-hidden="true" />
                <span>Khám phá khóa học</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-primary-pastel bg-surface px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary-light"
              >
                <Compass size={17} animated={false} aria-hidden="true" />
                <span>Đăng ký học thử miễn phí</span>
              </Link>
            </div>

            {/* 3 cam kết ngắn gọn */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-border/70 pt-5 text-xs font-medium text-muted-foreground sm:text-sm">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <Icon size={14} animated={false} aria-hidden="true" />
                  </span>
                  <span>{text}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Cột phải: Bảng chọn nhanh cấp học tương tác 1 chạm */}
          <div className="min-w-0 lg:col-span-5">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-primary-pastel/80 bg-surface/95 p-5 shadow-[0_24px_48px_-14px_rgba(53,111,167,0.16)] backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StudyImage
                    src={mayPortrait}
                    sizes="48px"
                    priority
                    className="size-12 shrink-0 rounded-2xl border border-primary-pastel bg-primary-light/60"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Chọn nhanh theo cấp học
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Bạn đang học lớp mấy?
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-bold",
                    preview.toneClass,
                  )}
                >
                  {preview.grades}
                </span>
              </div>

              {/* 3 tab chọn cấp học */}
              <div
                role="tablist"
                aria-label="Chọn cấp học"
                className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-background p-1.5"
              >
                {LEVEL_PREVIEWS.map((item) => {
                  const selected = item.id === activeLevel;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveLevel(item.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border px-2.5 py-2 text-center transition-all",
                        selected
                          ? item.activeTabClass
                          : "border-transparent bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground",
                      )}
                    >
                      <span className="block text-xs font-bold sm:text-sm">
                        {item.shortLabel}
                      </span>
                      <span className="block text-[11px] opacity-85">
                        {item.grades}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Nội dung cấp học đang chọn */}
              <div className="mt-4 rounded-2xl border border-border/80 bg-background/70 p-4">
                <h2 className="text-base font-bold text-foreground">
                  {preview.title}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {preview.description}
                </p>

                <div className="mt-3.5 grid grid-cols-2 gap-2">
                  {preview.subjects.map((subject) => (
                    <Link
                      key={subject}
                      href={`/courses?keyword=${encodeURIComponent(subject)}`}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
                    >
                      <CheckCircle2
                        size={14}
                        animated={false}
                        aria-hidden="true"
                        className="shrink-0 text-primary"
                      />
                      <span className="truncate">{subject}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Nút mở lộ trình / xem khóa theo cấp */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <Button
                  fullWidth
                  size="md"
                  onClick={() => onSelectGradeLevel(preview.id)}
                  className="flex-1 rounded-xl"
                >
                  <span>Xem môn học {preview.shortLabel}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Button>
                <Link
                  href={preview.catalogHref}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                >
                  Tất cả khóa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
