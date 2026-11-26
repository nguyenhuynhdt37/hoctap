"use client";

import { useCallback, useRef, useState } from "react";
import BenefitsSection from "./benefits-section";
import CombosSection from "./combos-section";
import CoursesSection from "./courses-section";
import CTASection from "./cta-section";
import GradeLevelsSection, { SchoolLevelId } from "./grade-levels-section";
import GuestHero from "./guest-hero";
import PageSky from "./may-world/PageSky";
import ParentTrustSection from "./parent-trust-section";
import SubjectsSection from "./subjects-section";

const Home = () => {
  const coursesSectionRef = useRef<HTMLDivElement | null>(null);
  const subjectsSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SchoolLevelId>("all");

  const scrollToCourses = useCallback(() => {
    coursesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSelectGradeLevel = useCallback(
    (level: Exclude<SchoolLevelId, "all">) => {
      setSelectedLevel(level);
      subjectsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    [],
  );

  return (
    <main className="relative isolate min-h-screen">
      <PageSky />

      {/* Hero sáng thoáng có tìm kiếm trực tiếp & chọn cấp học 1 chạm */}
      <GuestHero
        onExploreCourses={scrollToCourses}
        onSelectGradeLevel={handleSelectGradeLevel}
      />

      {/* Chọn cấp học chi tiết (Lớp 1–5, 6–9, 10–12) */}
      <GradeLevelsSection
        selectedLevel={selectedLevel}
        onSelectLevel={handleSelectGradeLevel}
        onExploreCourses={scrollToCourses}
      />

      {/* Khám phá môn học theo cấp đã chọn */}
      <div ref={subjectsSectionRef}>
        <SubjectsSection
          selectedLevel={selectedLevel}
          onChangeLevel={setSelectedLevel}
          onExploreCourses={scrollToCourses}
        />
      </div>

      {/* Khóa học nổi bật & Combo tiết kiệm */}
      <div ref={coursesSectionRef}>
        <CoursesSection />
      </div>
      <CombosSection />

      {/* Vì sao chọn Mây Mây */}
      <BenefitsSection />

      {/* Cam kết minh bạch cho phụ huynh & học sinh */}
      <ParentTrustSection onExploreCourses={scrollToCourses} />

      {/* CTA chuyển đổi cuối trang */}
      <CTASection onExploreCourses={scrollToCourses} />
    </main>
  );
};

export default Home;
