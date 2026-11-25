"use client";

import type { CourseEducation } from "@/types/catalog";
import { CategoryItem } from "@/types/user/course_detail";
import Link from "next/link";
import { Award, BookOpen, GraduationCap, Target } from "pulsoicon-react";

interface RelatedTopicsSectionProps {
  categories: CategoryItem[];
  education?: CourseEducation | null;
}

type TopicKind = "subject" | "grade" | "goal" | "exam" | "category";

interface RelatedTopicCard {
  key: string;
  name: string;
  subtitle: string;
  href: string;
  kind: TopicKind;
}

export default function RelatedTopicsSection({
  categories,
  education,
}: RelatedTopicsSectionProps) {
  const educationTopics: RelatedTopicCard[] = [];

  if (education && !education.needs_classification) {
    if (education.subject) {
      const subjectParam = education.subject.slug || education.subject.code;
      educationTopics.push({
        key: `subject-${education.subject.id}`,
        name: education.subject.name,
        subtitle: "Môn học",
        href: `/courses?subject=${encodeURIComponent(subjectParam)}`,
        kind: "subject",
      });
    }

    for (const grade of education.grades ?? []) {
      const gradeParam =
        grade.grade_number != null ? String(grade.grade_number) : grade.code;
      educationTopics.push({
        key: `grade-${grade.id}`,
        name: grade.name,
        subtitle: "Khối lớp",
        href: `/courses?grade=${encodeURIComponent(gradeParam)}`,
        kind: "grade",
      });
    }

    for (const goal of education.learning_goals ?? []) {
      educationTopics.push({
        key: `goal-${goal.id}`,
        name: goal.name,
        subtitle: "Định hướng học tập",
        href: `/courses?goal=${encodeURIComponent(goal.code)}`,
        kind: "goal",
      });
    }

    for (const exam of education.exams ?? []) {
      educationTopics.push({
        key: `exam-${exam.id}`,
        name: exam.name,
        subtitle: "Kỳ thi mục tiêu",
        href: `/courses?exam=${encodeURIComponent(exam.code)}`,
        kind: "exam",
      });
    }
  }

  const topics: RelatedTopicCard[] =
    educationTopics.length > 0
      ? educationTopics
      : (categories ?? []).map((category) => ({
          key: `category-${category.id}`,
          name: category.name,
          subtitle: "Lộ trình Mây Mây",
          href: `/categories/${category.slug}`,
          kind: "category",
        }));

  if (topics.length === 0) return null;

  const renderIcon = (kind: TopicKind) => {
    switch (kind) {
      case "grade":
        return <GraduationCap className="h-4 w-4" />;
      case "goal":
        return <Target className="h-4 w-4" />;
      case "exam":
        return <Award className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <section className="bg-surface rounded-[24px] shadow-xs border border-border p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-primary-light border border-primary-pastel rounded-2xl flex items-center justify-center text-primary shrink-0">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
            {educationTopics.length > 0
              ? "Khối lớp · Môn học · Định hướng · Kỳ thi"
              : "Chuyên đề liên kết"}
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Khám phá các chủ đề liên quan
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topics.map((topic) => (
          <Link
            key={topic.key}
            href={topic.href}
            className="group bg-background rounded-2xl p-4 border border-border hover:border-primary-pastel hover:bg-primary-light/40 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface border border-primary-pastel rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                {renderIcon(topic.kind)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-sm">
                  {topic.name}
                </h3>
                <p className="text-xs text-muted-foreground">{topic.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
