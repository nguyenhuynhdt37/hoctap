"use client";

import { useCallback, useRef } from "react";
import CoursesSection from "./courses-section";
import CTASection from "./cta-section";
import HeroSection from "./hero-section";
import InstructorsSection from "./instructors-section";
import RecommendedCourses from "./recommended-courses";
import StatsSection from "./stats-section";
import TestimonialsSection from "./testimonials-section";

const Home = () => {
  const coursesSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToCourses = useCallback(() => {
    coursesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <HeroSection onScrollToCourses={scrollToCourses} />

      <RecommendedCourses />
      <div ref={coursesSectionRef}>
        <CoursesSection />
      </div>

      <StatsSection />

      <InstructorsSection />

      <TestimonialsSection />

      <CTASection />
    </div>
  );
};

export default Home;
