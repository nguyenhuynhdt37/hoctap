"use client";

import {
  createSpeakingUid,
  SpeakingStudio,
  SpeakingStudioState,
} from "@/components/lecturer/lessons/shared/speaking-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

function createInitialState(): SpeakingStudioState {
  return {
    lessonTitle: "",
    langCode: "en-GB",
    level: "B1",
    scenario: "",
    studentRole: "",
    aiPersona: {
      name: "Emma",
      role: "Đối tác hội thoại",
      personality: "Thân thiện, lịch sự, kiên nhẫn",
      voice_id: "edge-tts/en-GB-SoniaNeural",
      opening_line: "",
      opening_translation: "",
      opening_audio_url: "",
    },
    missions: [
      { id: createSpeakingUid("m1"), title: "", hint: "" },
      { id: createSpeakingUid("m2"), title: "", hint: "" },
    ],
    samplePhrases: [],
    maxTurns: 8,
    passPercent: 70,
    allowTranslation: true,
    allowSuggestion: true,
  };
}

export default function CreateSpeakingLesson() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [state, setState] = useState<SpeakingStudioState>(() =>
    createInitialState()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!sectionId || !courseId) {
      setError("Thiếu thông tin section_id hoặc course_id.");
      return;
    }
    if (!state.lessonTitle.trim()) {
      setError("Vui lòng nhập tên bài Giao tiếp AI.");
      return;
    }
    if (!state.scenario.trim()) {
      setError("Vui lòng nhập mô tả bối cảnh tình huống.");
      return;
    }
    if (!state.aiPersona.opening_line.trim()) {
      setError("Vui lòng nhập câu mở màn của nhân vật AI.");
      return;
    }
    const validMissions = state.missions.filter((m) => m.title.trim().length > 0);
    if (validMissions.length === 0) {
      setError("Vui lòng nhập ít nhất 1 nhiệm vụ qua bài.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const createRes = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: state.lessonTitle.trim(),
        description: state.scenario.trim(),
        lesson_type: "speaking",
      });
      const lessonId = createRes.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ.");
      }

      await api.post("/lecturer/lessons/speaking/save", {
        lesson_id: lessonId,
        section_id: sectionId,
        course_id: courseId,
        lang_code: state.langCode,
        level: state.level,
        scenario: state.scenario.trim(),
        student_role: state.studentRole.trim(),
        ai_persona: state.aiPersona,
        missions: validMissions,
        sample_phrases: state.samplePhrases.filter((p) => p.phrase.trim()),
        max_turns: state.maxTurns,
        pass_percent: state.passPercent,
        allow_translation: state.allowTranslation,
        allow_suggestion: state.allowSuggestion,
        auto_render_opening_audio: true,
      });

      showToast.success(
        `Đã tạo bài Giao tiếp AI "${state.lessonTitle.trim()}" thành công!`
      );
      router.push(`/lecturer/lessons/${lessonId}/edit`);
    } catch (err: unknown) {
      const msg = formatApiError(err, "Không thể tạo bài Giao tiếp AI");
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
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <SpeakingStudio
      mode="create"
      sectionName={sectionName}
      videoSections={videoSections}
      state={state}
      onChange={setState}
      onSave={handleSave}
      onBack={() => router.push(`/lecturer/chapters?course_id=${courseId}`)}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}
