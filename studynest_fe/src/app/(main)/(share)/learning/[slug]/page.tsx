import LearningLoader from "./client";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tutor?: string | string[]; lesson_id?: string | string[]; section_id?: string | string[]; lesson_type?: string | string[] }>;
}

export default async function LearningDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { tutor, lesson_id, section_id, lesson_type }] = await Promise.all([params, searchParams]);
  const lessonId = typeof lesson_id === "string" ? lesson_id : undefined;
  const sectionId = typeof section_id === "string" ? section_id : undefined;
  return (
    <LearningLoader
      key={`${slug}:${tutor === "1"}:${lessonId ?? ""}:${sectionId ?? ""}:${lesson_type === "quiz"}`}
      slug={slug}
      openTutor={tutor === "1"}
      lessonId={lessonId}
      sectionId={sectionId}
      preferQuiz={lesson_type === "quiz"}
    />
  );
}
