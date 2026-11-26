"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Cloud,
  GraduationCap,
  Lightbulb,
  type PulsoIcon,
} from "pulsoicon-react";
import type { FC } from "react";
import {
  CloudBlob,
  GlassCard,
  IconBubble,
  Pill,
  Reveal,
  SectionHeader,
  SectionShell,
  TONE,
  type Tone,
} from "./landing-ui";

export type SchoolLevelId = "all" | "primary" | "secondary" | "highschool";

interface GradeLevelItem {
  id: Exclude<SchoolLevelId, "all">;
  name: string;
  gradeRange: string;
  grades: string[];
  tagline: string;
  description: string;
  highlights: string[];
  image: string;
  imageAlt: string;
  tone: Tone;
  sceneClassName: string;
  offsetClassName: string;
  icon: PulsoIcon;
}

const GRADE_LEVELS: GradeLevelItem[] = [
  {
    id: "primary",
    name: "Tiểu học",
    gradeRange: "Lớp 1 – Lớp 5",
    grades: ["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5"],
    tagline: "Khơi mở trí tò mò & niềm vui học tập đầu đời",
    description:
      "Tìm các môn phù hợp với lớp 1–5 trong danh mục, từ Toán và Tiếng Việt đến Tiếng Anh và Tự nhiên – Xã hội.",
    highlights: [
      "Lọc môn học theo từng lớp Tiểu học",
      "Xem thông tin và bài học trước khi đăng ký khi khóa được mở",
      "Chọn lộ trình phù hợp với nhu cầu của gia đình",
    ],
    image: "/videos/studynest/scene-mascot.jpg",
    imageAlt: "Bạn nhỏ Mây đồng hành cùng học sinh Tiểu học Lớp 1 đến Lớp 5",
    tone: "vanilla",
    sceneClassName: "from-surface-muted via-surface-muted to-primary-light/70",
    offsetClassName: "",
    icon: Cloud,
  },
  {
    id: "secondary",
    name: "Trung học cơ sở (THCS)",
    gradeRange: "Lớp 6 – Lớp 9",
    grades: ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"],
    tagline: "Phát triển tư duy khoa học & bứt phá năng lực",
    description:
      "Khám phá danh mục Toán, Ngữ văn, Tiếng Anh, Khoa học tự nhiên và Tin học cho lớp 6–9.",
    highlights: [
      "Chọn môn và lớp theo nhu cầu hiện tại",
      "So sánh nội dung từng khóa khi được công khai",
      "Tìm khóa phù hợp cho mục tiêu học tập hoặc ôn thi vào 10",
    ],
    image: "/videos/studynest/scene-guiding.jpg",
    imageAlt: "Bạn nhỏ Mây dẫn lối khám phá tri thức cho học sinh THCS Lớp 6 đến Lớp 9",
    tone: "lavender",
    sceneClassName: "from-accent/55 via-accent/25 to-primary-light/70",
    offsetClassName: "md:mt-0",
    icon: Lightbulb,
  },
  {
    id: "highschool",
    name: "Trung học phổ thông (THPT)",
    gradeRange: "Lớp 10 – Lớp 12",
    grades: ["Lớp 10", "Lớp 11", "Lớp 12"],
    tagline: "Làm chủ chuyên đề nâng cao & chinh phục mục tiêu đại học",
    description:
      "Duyệt các môn lớp 10–12 và tìm hướng học phù hợp với mục tiêu tốt nghiệp hoặc định hướng tiếp theo.",
    highlights: [
      "Lọc môn và lớp trong danh mục THPT",
      "Xem nội dung và hình thức học của từng khóa khi được mở",
      "Chủ động chọn lộ trình học theo mục tiêu riêng",
    ],
    image: "/videos/studynest/scene-academy.jpg",
    imageAlt: "Học viện Mây Mây dành cho học sinh THPT Lớp 10 đến Lớp 12",
    tone: "blue",
    sceneClassName: "from-primary-pastel/55 via-primary-light to-background",
    offsetClassName: "",
    icon: GraduationCap,
  },
];

interface GradeLevelsSectionProps {
  selectedLevel: SchoolLevelId;
  onSelectLevel: (level: Exclude<SchoolLevelId, "all">) => void;
  onExploreCourses: () => void;
}

const GradeLevelsSection: FC<GradeLevelsSectionProps> = ({
  selectedLevel,
  onSelectLevel,
  onExploreCourses,
}) => {
  return (
    <div data-tour="levels">
      <SectionShell id="grade-levels" tone="sky" label="Chọn cấp học">
        <SectionHeader
          eyebrow="Lộ trình xuyên suốt 12 năm phổ thông"
          title="Chọn cấp học đồng hành cùng bạn"
          description="Mỗi cấp học là một tầng mây mới, từ sự gần gũi và khích lệ ở Tiểu học đến sự chuyên sâu và tự chủ ở THPT."
          className="[&_h2]:text-balance [&_p]:text-foreground/85"
        />

        <div className="relative">
          <CloudBlob className="left-1/4 top-1/3 h-40 w-1/2 bg-primary-pastel/45" />
          <ul role="list" className="relative grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {GRADE_LEVELS.map((level, index) => {
              const Icon = level.icon;
              const isSelected = selectedLevel === level.id;
              const tone = TONE[level.tone];

              return (
                <Reveal key={level.id} as="li" delay={index * 0.08} className={level.offsetClassName}>
                  <GlassCard
                    as="article"
                    className={cn(
                      "relative p-3.5 motion-reduce:hover:translate-y-0",
                      level.id === "highschool" &&
                        "md:max-lg:grid md:max-lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]",
                      isSelected && "border-primary-pastel! ring-2 ring-ring/30",
                    )}
                  >
                    {isSelected && (
                      <Pill className="absolute -top-3.5 right-5 z-10 shadow-sm">
                        <Check animated={false} aria-hidden="true" className="size-3.5" />
                        Đang chọn
                      </Pill>
                    )}

                    <div
                      className={cn(
                        "relative isolate flex min-h-36 flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl bg-linear-to-br p-4 lg:min-h-40",
                        level.sceneClassName,
                        level.id === "highschool" && "md:max-lg:min-h-64",
                      )}
                    >
                      <CloudBlob className="-bottom-14 -left-6 h-36 w-48" />
                      <div
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute -top-16 right-7 size-52 rounded-full border",
                          tone.border,
                        )}
                      />
                      <div className="absolute inset-y-3 right-3 w-[58%] overflow-hidden rounded-2xl border-2 border-surface/85 shadow-lg">
                        <img
                          src={level.image}
                          alt={level.imageAlt}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </div>
                      <IconBubble
                        tone={level.tone}
                        className="relative shadow-md sm:h-16 sm:w-16"
                      >
                        <Icon aria-hidden="true" className="size-7" strokeWidth={1.75} />
                      </IconBubble>
                      <Pill tone={level.tone} className="relative shadow-sm">
                        {level.gradeRange}
                      </Pill>
                    </div>

                    <div className="px-2.5 pb-2.5 pt-5 sm:px-3.5">
                      <h3 className="text-xl font-bold leading-snug tracking-tight text-foreground">
                        {level.name}
                      </h3>
                      <p className={cn("mt-1.5 text-xs font-semibold leading-relaxed", tone.fg)}>
                        {level.tagline}
                      </p>

                      <ul role="list" aria-label="Các lớp" className="mt-4 flex flex-wrap gap-1">
                        {level.grades.map((grade) => (
                          <li key={grade}>
                            <Pill tone={level.tone} className="px-2!">
                              {grade}
                            </Pill>
                          </li>
                        ))}
                      </ul>

                      <p className="mt-4 text-sm leading-relaxed text-foreground/85">
                        {level.description}
                      </p>
                      <ul role="list" className="mt-4 space-y-2 border-t border-border pt-4">
                        {level.highlights.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                            <Check animated={false} aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", tone.fg)} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={isSelected ? "primary" : "pastel"}
                        fullWidth
                        onClick={() => onSelectLevel(level.id)}
                        aria-label={"Xem môn học " + level.name}
                        rightIcon={<ArrowDown aria-hidden="true" className="size-4" />}
                        className={cn(
                          "mt-6 h-11 rounded-full motion-reduce:transition-none motion-reduce:active:translate-y-0",
                          !isSelected && "text-info-foreground",
                        )}
                      >
                        Xem môn học
                      </Button>
                    </div>
                  </GlassCard>
                </Reveal>
              );
            })}
          </ul>
        </div>

        <Reveal className="mt-12 flex flex-col items-center gap-3 text-center md:mt-14">
          <p className="text-sm leading-relaxed text-foreground/85">
            Bạn muốn xem toàn bộ kho bài giảng và khóa học đang mở trên hệ thống?
          </p>
          <Button
            variant="outline"
            onClick={onExploreCourses}
            rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
            className="h-11 max-w-full rounded-full text-primary motion-reduce:transition-none motion-reduce:active:translate-y-0"
          >
            Đi thẳng tới danh sách khóa học
          </Button>
        </Reveal>
      </SectionShell>
    </div>
  );
};

export default GradeLevelsSection;
