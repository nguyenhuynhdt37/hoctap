"use client";

import {
  createEmptyFlashcard,
  createFlashcardUid,
  FlashcardStudio,
} from "@/components/lecturer/lessons/shared/flashcard-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  FlashcardItem,
  FlashcardStudioItem,
} from "@/types/lecturer/flashcard";
import { LessonDetail } from "@/types/lecturer/lesson-api";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

export default function EditFlashcardLesson() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string | undefined;

  const [mounted, setMounted] = useState(false);
  const [cardsHydrated, setCardsHydrated] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [cards, setCards] = useState<FlashcardStudioItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const {
    data: lessonDetail,
    isLoading: isLoadingDetail,
    mutate: mutateDetail,
  } = useSWR<LessonDetail>(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const {
    data: cardsData,
    isLoading: isLoadingCards,
    mutate: mutateCards,
  } = useSWR<FlashcardItem[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/flashcards` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: chaptersData } = useSWR(
    lessonDetail?.course_id
      ? `/lecturer/chapters/${lessonDetail.course_id}`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const sectionName = useMemo(() => {
    if (!chaptersData?.sections || !lessonDetail?.section_id) return "";
    return (
      chaptersData.sections.find(
        (s: { section_id?: string; section_title?: string }) =>
          s.section_id === lessonDetail.section_id
      )?.section_title || ""
    );
  }, [chaptersData, lessonDetail]);

  const videoSections = useMemo<StudioVideoSectionGroup[]>(() => {
    const sections = Array.isArray(chaptersData?.sections)
      ? chaptersData.sections
      : [];
    const currentSecId = lessonDetail?.section_id;
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
          isCurrent: sec.section_id === currentSecId,
          videos,
        });
      }
    }
    groups.sort(
      (a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    );
    return groups;
  }, [chaptersData, lessonDetail?.section_id]);

  useEffect(() => {
    if (lessonDetail && !mounted) {
      setLessonTitle(lessonDetail.title || "");
      setLessonDescription(lessonDetail.description || "");
      setMounted(true);
    }
  }, [lessonDetail, mounted]);

  useEffect(() => {
    if (cardsData !== undefined && !cardsHydrated) {
      if (cardsData.length > 0) {
        setCards(
          cardsData.map((c, idx) => ({
            uid: c.id || createFlashcardUid(),
            id: c.id,
            front_text: c.front_text || "",
            back_text: c.back_text || "",
            phonetic: c.phonetic || "",
            part_of_speech: c.part_of_speech || "",
            example_sentence: c.example_sentence || "",
            example_translation: c.example_translation || "",
            hint: c.hint || "",
            lang_code: c.lang_code || "en-US",
            voice_id: c.voice_id || "edge-tts/en-US-AriaNeural",
            audio_url: c.audio_url || "",
            example_audio_url: c.example_audio_url || "",
            difficulty_level: c.difficulty_level || 1,
            position: typeof c.position === "number" ? c.position : idx,
          }))
        );
      } else {
        setCards([createEmptyFlashcard()]);
      }
      setCardsHydrated(true);
    }
  }, [cardsData, cardsHydrated]);

  const hasChanges = useMemo(() => {
    if (!lessonDetail || !cardsHydrated) return false;
    if (
      lessonTitle.trim() !== (lessonDetail.title || "").trim() ||
      lessonDescription.trim() !== (lessonDetail.description || "").trim()
    ) {
      return true;
    }
    const base = cardsData || [];
    if (cards.length !== base.length) return true;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const o = base[i];
      if (
        !o ||
        c.front_text.trim() !== (o.front_text || "").trim() ||
        c.back_text.trim() !== (o.back_text || "").trim() ||
        c.phonetic.trim() !== (o.phonetic || "").trim() ||
        c.part_of_speech.trim() !== (o.part_of_speech || "").trim() ||
        c.example_sentence.trim() !== (o.example_sentence || "").trim() ||
        c.example_translation.trim() !== (o.example_translation || "").trim() ||
        c.hint.trim() !== (o.hint || "").trim() ||
        c.voice_id !== (o.voice_id || "") ||
        c.audio_url !== (o.audio_url || "") ||
        c.example_audio_url !== (o.example_audio_url || "") ||
        c.difficulty_level !== (o.difficulty_level || 1)
      ) {
        return true;
      }
    }
    return false;
  }, [lessonDetail, lessonTitle, lessonDescription, cards, cardsData, cardsHydrated]);

  const handleSubmit = useCallback(
    async (autoGenerateAudio: boolean) => {
      if (!lessonId) return;
      setIsSubmitting(true);
      setError(null);
      setSavedBanner(null);

      try {
        await api.put(`/lecturer/lessons/${lessonId}`, {
          title: lessonTitle.trim(),
          description: lessonDescription.trim(),
        });

        await api.post("/lecturer/lessons/flashcards/bulk", {
          lesson_id: lessonId,
          section_id: lessonDetail?.section_id,
          course_id: lessonDetail?.course_id,
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

        await Promise.all([mutateDetail(), mutateCards()]);
        setCardsHydrated(false);
        const msg = `Đã lưu bộ Flashcard "${lessonTitle.trim()}" với ${cards.length} thẻ thành công.`;
        setSavedBanner(msg);
        showToast.success(msg);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err: unknown) {
        const msg = formatApiError(err, "Đã xảy ra lỗi khi cập nhật bộ Flashcard");
        setError(msg);
        showToast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      lessonId,
      lessonTitle,
      lessonDescription,
      lessonDetail,
      cards,
      mutateDetail,
      mutateCards,
    ]
  );

  if (!lessonId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border border-border p-6 text-center">
          <Alert variant="destructive" title="Thiếu mã bài học">
            Không tìm thấy mã bài học Flashcard cần chỉnh sửa.
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

  if ((isLoadingDetail || isLoadingCards) && !mounted) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="space-y-4 lg:col-span-4">
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FlashcardStudio
      mode="edit"
      sectionName={sectionName}
      lessonTitle={lessonTitle}
      onLessonTitleChange={setLessonTitle}
      lessonDescription={lessonDescription}
      onLessonDescriptionChange={setLessonDescription}
      cards={cards}
      onCardsChange={setCards}
      videoSections={videoSections}
      isSubmitting={isSubmitting}
      hasChanges={hasChanges}
      error={error}
      onClearError={() => setError(null)}
      successBanner={
        savedBanner
          ? {
              title: "Lưu thay đổi thành công!",
              description: savedBanner,
              lessonId,
            }
          : null
      }
      onSubmit={handleSubmit}
      onBackToChapters={() =>
        router.push(
          lessonDetail?.course_id
            ? `/lecturer/chapters?course_id=${lessonDetail.course_id}`
            : "/lecturer/chapters"
        )
      }
      onOpenResources={(id) => router.push(`/lecturer/resources?lesson_id=${id}`)}
      onOpenPreview={(id) => router.push(`/lecturer/lessons/${id}/preview`)}
    />
  );
}
