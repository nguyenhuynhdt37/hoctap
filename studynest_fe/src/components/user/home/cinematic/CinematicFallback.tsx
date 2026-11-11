"use client";

import { Badge, Button, Card } from "@/components/ui";
import React from "react";
import {
  HiAcademicCap,
  HiBookOpen,
  HiCheckCircle,
  HiPlay,
  HiCloud,
} from "react-icons/hi";
import { CINEMATIC_SCENES } from "./scenes-data";
import { ScrollCinematicHeroProps } from "./types";

const CinematicFallback: React.FC<ScrollCinematicHeroProps> = ({
  onExploreCourses,
  onSelectGradeLevel,
}) => {
  return (
    <section
      aria-label="Giới thiệu hành trình học tập Mây Mây Lớp 1 đến Lớp 12"
      className="relative overflow-hidden bg-gradient-to-b from-primary-light/80 via-background to-surface border-b border-border py-14 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Narrative Column */}
          <div className="lg:col-span-6 space-y-6">
            <Badge
              variant="default"
              size="md"
              dot
              className="bg-surface border-primary-pastel text-primary font-semibold"
            >
              Mây Mây • Hành trình tri thức Lớp 1 – 12
            </Badge>

            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-foreground tracking-tight leading-[1.18]">
              Mỗi hành trình lớn đều bắt đầu từ{" "}
              <span className="text-primary italic font-medium">
                một điều nhỏ bé.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Cùng bạn nhỏ Mây khám phá Học viện trên mây dành cho học sinh từ
              Tiểu học (Lớp 1–5), THCS (Lớp 6–9) đến THPT (Lớp 10–12). Bài giảng
              trực quan, luyện tập tương tác và lộ trình rõ ràng mỗi ngày.
            </p>

            <div className="flex flex-wrap gap-2.5">
              {[
                "Lộ trình chuẩn Lớp 1 – 12",
                "Bài giảng Video & Quiz tương tác",
                "Theo dõi tiến độ minh bạch",
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground"
                >
                  <HiCheckCircle className="w-4 h-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onExploreCourses}
                className="px-7"
              >
                <HiPlay className="w-5 h-5" />
                Khám phá khóa học
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (onSelectGradeLevel) {
                    onSelectGradeLevel("highschool");
                  } else {
                    onExploreCourses();
                  }
                }}
                className="px-6 border-primary-pastel text-primary hover:bg-primary-light"
              >
                <HiAcademicCap className="w-5 h-5" />
                Chọn cấp học của bạn
              </Button>
            </div>
          </div>

          {/* Right Storyboard Composition from Real Video Frames */}
          <div className="lg:col-span-6 space-y-4">
            <Card
              density="none"
              className="overflow-hidden rounded-[24px] border-primary-pastel shadow-md"
            >
              <div className="relative aspect-video bg-primary-light">
                <img
                  src="/videos/studynest/scene-welcome.jpg"
                  alt="Học viện Mây Mây trên mây và bạn nhỏ Mây chào đón học sinh"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-surface/90 backdrop-blur-md p-3.5 border border-white/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      Học viện trên mây Mây Mây
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Không gian học tập trực quan cho Tiểu học, THCS & THPT
                    </p>
                  </div>
                  <Badge variant="default" size="sm">
                    Lớp 1 – 12
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 4 Key Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CINEMATIC_SCENES.map((scene) => (
                <Card
                  key={scene.id}
                  density="compact"
                  className="bg-surface/90 border-border hover:border-primary-pastel transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                    <HiCloud className="w-3.5 h-3.5" />
                    <span>{scene.stepNumber}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {scene.shortTitle}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CinematicFallback;
