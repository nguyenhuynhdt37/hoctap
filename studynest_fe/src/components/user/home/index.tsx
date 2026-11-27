"use client";

import { useCallback, useRef, useState } from "react";
import BenefitsSection from "./benefits-section";
import CombosSection from "./combos-section";
import ScrollThreeHero from "./three-hero/ScrollThreeHero";
import PageSky from "./may-world/PageSky";
import CoursesSection from "./courses-section";
import CTASection from "./cta-section";
import GradeLevelsSection, { SchoolLevelId } from "./grade-levels-section";
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
    []
  );

  return (
    <main className="relative isolate min-h-screen">
      <PageSky />

      <ScrollThreeHero
        onExploreCourses={scrollToCourses}
        onSelectGradeLevel={(level) =>
          handleSelectGradeLevel(
            level === "middle"
              ? "secondary"
              : level === "high"
                ? "highschool"
                : "primary"
          )
        }
      />

      <div id="home-main-content" tabIndex={-1} className="scroll-mt-16" />

      {/* Section C: Choose Your Learning Level (Grades 1–5, 6–9, 10–12) */}
      <GradeLevelsSection
        selectedLevel={selectedLevel}
        onSelectLevel={handleSelectGradeLevel}
        onExploreCourses={scrollToCourses}
      />

      {/* Section D: Explore Subjects & Real Categories */}
      <div ref={subjectsSectionRef} className="scroll-mt-16">
        <SubjectsSection
          selectedLevel={selectedLevel}
          onChangeLevel={setSelectedLevel}
          onExploreCourses={scrollToCourses}
        />
      </div>

      {/* Section E: Public courses from the official catalog */}
      <div ref={coursesSectionRef} className="scroll-mt-16">
        <CoursesSection />
      </div>
      <CombosSection />

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
