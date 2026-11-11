"use client";

import { Badge, BadgeVariant, Button, Card } from "@/components/ui";
import React from "react";
import {
  HiAcademicCap,
  HiArrowRight,
  HiCheckCircle,
  HiLightBulb,
  HiCloud,
} from "react-icons/hi";

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
  badgeVariant: BadgeVariant;
  cardSurfaceClass: string;
  accentBorderClass: string;
  iconBgClass: string;
  icon: React.ComponentType<{ className?: string }>;
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
    badgeVariant: "vanilla",
    cardSurfaceClass: "bg-surface-muted/80 hover:bg-surface",
    accentBorderClass: "border-accent-vanilla-border hover:border-warning",
    iconBgClass: "bg-accent-vanilla text-accent-vanilla-foreground",
    icon: HiCloud,
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
    badgeVariant: "secondary",
    cardSurfaceClass: "bg-surface hover:bg-secondary-light/25",
    accentBorderClass: "border-secondary-pastel hover:border-secondary-foreground/40",
    iconBgClass: "bg-secondary-light text-secondary-foreground",
    icon: HiLightBulb,
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
    badgeVariant: "default",
    cardSurfaceClass: "bg-surface hover:bg-primary-light/30",
    accentBorderClass: "border-primary-pastel hover:border-primary",
    iconBgClass: "bg-primary-light text-primary",
    icon: HiAcademicCap,
  },
];

interface GradeLevelsSectionProps {
  selectedLevel: SchoolLevelId;
  onSelectLevel: (level: Exclude<SchoolLevelId, "all">) => void;
  onExploreCourses: () => void;
}

const GradeLevelsSection: React.FC<GradeLevelsSectionProps> = ({
  selectedLevel,
  onSelectLevel,
  onExploreCourses,
}) => {
  return (
    <section
      id="grade-levels"
      data-tour="levels"
      className="py-20 bg-surface border-b border-border/70 relative overflow-hidden"
    >
      {/* Subtle Pastel Background Accents */}
      <div
        className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-primary-light/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-secondary-light/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Badge
            variant="default"
            size="md"
            dot
            className="mb-4 bg-primary-light/80 border-primary-pastel"
          >
            Lộ trình xuyên suốt 12 năm phổ thông
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Chọn cấp học đồng hành cùng bạn
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Mỗi cấp học là một tầng mây mới với phương pháp tiếp cận phù hợp độ
            tuổi — từ sự gần gũi, khích lệ ở Tiểu học đến sự chuyên sâu, tự chủ
            ở bậc THPT.
          </p>
        </div>

        {/* 3 Grade Level Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {GRADE_LEVELS.map((level) => {
            const Icon = level.icon;
            const isSelected = selectedLevel === level.id;

            return (
              <Card
                key={level.id}
                density="none"
                className={`group flex flex-col justify-between overflow-hidden rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  level.cardSurfaceClass
                } ${level.accentBorderClass} ${
                  isSelected ? "ring-2 ring-primary shadow-md" : ""
                }`}
              >
                <div>
                  {/* Visual Header from Real Video Scene */}
                  <div className="relative h-48 overflow-hidden bg-primary-light">
                    <img
                      src={level.image}
                      alt={level.imageAlt}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-transparent" />
                    <div className="absolute top-3.5 left-3.5">
                      <Badge
                        variant={level.badgeVariant}
                        size="md"
                        className="shadow-xs backdrop-blur-sm"
                      >
                        {level.gradeRange}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex flex-wrap gap-1.5">
                      {level.grades.map((g) => (
                        <span
                          key={g}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface/90 text-foreground backdrop-blur-sm shadow-2xs"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 sm:p-7">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${level.iconBgClass}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          {level.name}
                        </h3>
                        <p className="text-xs font-semibold text-primary">
                          {level.tagline}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {level.description}
                    </p>

                    <ul className="space-y-2.5 mb-6">
                      {level.highlights.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground leading-snug"
                        >
                          <HiCheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer CTA */}
                <div className="px-6 pb-6 sm:px-7 sm:pb-7 pt-2 flex items-center gap-3">
                  <Button
                    variant={isSelected ? "primary" : "pastel"}
                    fullWidth
                    onClick={() => onSelectLevel(level.id)}
                    className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                  >
                    <span>Xem môn học {level.name.split(" ")[0]}</span>
                    <HiArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom Helper Bar */}
        <div className="mt-10 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bạn muốn xem toàn bộ kho bài giảng và khóa học đang mở trên hệ thống?{" "}
            <button
              type="button"
              onClick={onExploreCourses}
              className="font-semibold text-primary hover:text-primary-hover underline underline-offset-4 cursor-pointer"
            >
              Đi thẳng tới danh sách khóa học →
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default GradeLevelsSection;
