"use client";

import {
  createEmptyFlashcard,
  FlashcardStudio,
} from "@/components/lecturer/lessons/shared/flashcard-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { FlashcardStudioItem } from "@/types/lecturer/flashcard";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

export default function CreateFlashcardLesson() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [cards, setCards] = useState<FlashcardStudioItem[]>(() => [
    createEmptyFlashcard(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);

  const { data: chaptersData } = useSWR(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const sectionName: string =
    chaptersData?.sections?.find(
      (s: { section_id?: string; section_title?: string }) =>
        s.section_id === sectionId
    )?.section_title || "";

  const videoSections = useMemo<StudioVideoSectionGroup[]>(() => {
    const sections = Array.isArray(chaptersData?.sections)
      ? chaptersData.sections
      : [];
    const groups: StudioVideoSectionGroup[] = [];
    for (const sec of sections) {
      const secLessons = Array.isArray(sec.lessons) ? sec.lessons : [];
      const videos = secLessons
        .filter(
          (l: {
            lesson_type?: string;
            has_embedding?: boolean;
            chunk_count?: number;
          }) =>
            l.lesson_type === "video" &&
            (l.has_embedding === true || (l.chunk_count ?? 0) > 0)
        )
        .map(
          (l: {
            lesson_id?: string;
            id?: string;
            lesson_title?: string;
            title?: string;
          }) => ({
            id: l.lesson_id || l.id || "",
            title: l.lesson_title || l.title || "Bài giảng video",
          })
        )
        .filter((v: { id: string }) => Boolean(v.id));

      if (videos.length > 0) {
        groups.push({
          sectionId: sec.section_id,
          sectionTitle: sec.section_title || "Chương học",
          isCurrent: sec.section_id === sectionId,
          videos,
        });
      }
    }
    groups.sort(
      (a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    );
    return groups;
  }, [chaptersData, sectionId]);

  const handleSubmit = async (autoGenerateAudio: boolean) => {
    if (!sectionId || !courseId) {
      setError("Thiếu thông tin section_id hoặc course_id.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const createRes = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        lesson_type: "flashcard",
      });
      const lessonId = createRes.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ.");
      }

      await api.post("/lecturer/lessons/flashcards/bulk", {
        lesson_id: lessonId,
        section_id: sectionId,
        course_id: courseId,
        created_by: "lecturer",
        auto_generate_audio: autoGenerateAudio,
        flashcards: cards.map((c, idx) => ({
          front_text: c.front_text.trim(),
          back_text: c.back_text.trim(),
          phonetic: c.phonetic.trim() || null,
          part_of_speech: c.part_of_speech.trim() || null,
          example_sentence: c.example_sentence.trim() || null,
          example_translation: c.example_translation.trim() || null,
          hint: c.hint.trim() || null,
          lang_code: c.lang_code || "en-US",
          voice_id: c.voice_id || null,
          audio_url: c.audio_url.trim() || null,
          example_audio_url: c.example_audio_url.trim() || null,
          difficulty_level: c.difficulty_level || 1,
          position: idx,
        })),
      });

      setCreatedLessonId(lessonId);
      showToast.success(
        `Đã tạo bài Flashcard "${lessonTitle.trim()}" với ${cards.length} thẻ thành công!`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi tạo bài học Flashcard");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sectionId || !courseId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border border-border p-6 text-center">
          <Alert variant="destructive" title="Thiếu thông tin cần thiết">
            Thiếu tham số section_id hoặc course_id. Vui lòng quay lại trang Chương &amp; bài học.
          </Alert>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <FlashcardStudio
      mode="create"
      sectionName={sectionName}
      lessonTitle={lessonTitle}
      onLessonTitleChange={setLessonTitle}
      lessonDescription={lessonDescription}
      onLessonDescriptionChange={setLessonDescription}
      cards={cards}
      onCardsChange={setCards}
      videoSections={videoSections}
      isSubmitting={isSubmitting}
      error={error}
      onClearError={() => setError(null)}
      successBanner={
        createdLessonId
          ? {
              title: "Tạo bài học Flashcard thành công!",
              description: `Bộ thẻ "${lessonTitle.trim()}" (${cards.length} thẻ kèm giọng đọc) đã sẵn sàng cho học viên.`,
              lessonId: createdLessonId,
            }
          : null
      }
      onSubmit={handleSubmit}
      onBackToChapters={() =>
        router.push(`/lecturer/chapters?course_id=${courseId}`)
      }
      onOpenResources={(id) => router.push(`/lecturer/resources?lesson_id=${id}`)}
      onOpenEdit={(id) => router.push(`/lecturer/lessons/${id}/edit`)}
      onOpenPreview={(id) => router.push(`/lecturer/lessons/${id}/preview`)}
    />
  );
}
