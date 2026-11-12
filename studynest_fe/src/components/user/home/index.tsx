"use client";

import { useCallback, useRef, useState } from "react";
import BenefitsSection from "./benefits-section";
import { LandingDynamicIsland, ScrollCinematicHero } from "./cinematic";
import LandingVoiceTour from "./cinematic/LandingVoiceTour";
import CoursesSection from "./courses-section";
import CTASection from "./cta-section";
import GradeLevelsSection, { SchoolLevelId } from "./grade-levels-section";
import ParentTrustSection from "./parent-trust-section";
import SubjectsSection from "./subjects-section";

const Home = () => {
  const contentSectionRef = useRef<HTMLDivElement | null>(null);
  const coursesSectionRef = useRef<HTMLDivElement | null>(null);
  const subjectsSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SchoolLevelId>("all");

  const scrollToCourses = useCallback(() => {
    coursesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToContent = useCallback(() => {
    contentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSelectGradeLevel = useCallback(
    (level: Exclude<SchoolLevelId, "all">) => {
      setSelectedLevel(level);
      subjectsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    []
  );

  return (
    <main className="min-h-screen bg-background">
      <LandingDynamicIsland onSkipVideo={scrollToContent} />
      <LandingVoiceTour />

      {/* Section B: Scroll-Driven 3D Cinematic Hero */}
      <ScrollCinematicHero
        onExploreCourses={scrollToCourses}
        onSelectGradeLevel={handleSelectGradeLevel}
      />

      {/* Điểm neo nội dung chính sau khi bỏ qua phần lướt video */}
      <div
        id="home-main-content"
        ref={contentSectionRef}
        className="scroll-mt-6"
        aria-hidden="true"
      />

      {/* Section C: Choose Your Learning Level (Grades 1–5, 6–9, 10–12) */}
      <GradeLevelsSection
        selectedLevel={selectedLevel}
        onSelectLevel={handleSelectGradeLevel}
        onExploreCourses={scrollToCourses}
      />

      {/* Section D: Explore Subjects & Real Categories */}
      <div ref={subjectsSectionRef}>
        <SubjectsSection
          selectedLevel={selectedLevel}
          onChangeLevel={setSelectedLevel}
          onExploreCourses={scrollToCourses}
        />
      </div>

      {/* Section E: Public courses from the official catalog */}
      <div ref={coursesSectionRef}>
        <CoursesSection />
      </div>

      {/* Section F: Why Mây Mây? */}
      <BenefitsSection />

      {/* Section H & I: Parent Trust & Transparent Commitments */}
      <ParentTrustSection onExploreCourses={scrollToCourses} />

      {/* Section J: Final Conversion CTA */}
      <CTASection onExploreCourses={scrollToCourses} />
    </main>
  );
};

export default Home;
