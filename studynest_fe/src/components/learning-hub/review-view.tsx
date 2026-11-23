"use client";

import { Button, Progress } from "@/components/ui";
import { GlassCard, Pill, Reveal, SectionHeader, SectionShell } from "@/components/user/home/landing-ui";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { hubHttpStatus } from "@/lib/learning-hub/errors";
import { hubEndpoints } from "@/lib/learning-hub/endpoints";
import { getLearningHubApi, reviewQueueKey, reviewQueuePrefix, useHubReviewQueue } from "@/lib/learning-hub/hooks";
import type { ReviewQueueItem, ReviewQueueResponse, ReviewSelfRating, SubmitReviewAnswerInput, SubmitReviewAnswerResponse } from "@/lib/learning-hub/types";
import { safeUUID } from "@/lib/utils/uuid";
import { useUserStore } from "@/stores/user";
import { useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { HubLoadError } from "./hub-page-state";
import { HomeLink, SectionLoading } from "./home/section";
import { MockDataChip } from "./mock-data-chip";

export function ReviewView({ courseId, limit }: { courseId?: string; limit?: number }) {
  const queue = useHubReviewQueue({ course_id: courseId, limit });
  const { mutate } = useSWRConfig();
  const userId = useUserStore((state) => state.user?.id);
  const [started, setStarted] = useState<ReviewQueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [lastDueCount, setLastDueCount] = useState<number>();
  const item = started?.[index];
  const preview = item ?? queue.data?.items[0];
  const thumbnail = preview?.course.thumbnail_url;

  function resetSession() {
    setStarted(null);
    setIndex(0);
    setCorrect(0);
    setLastDueCount(undefined);
  }

  function onAnswered(result: SubmitReviewAnswerResponse) {
    if (!courseId) setLastDueCount(result.due_count);
    const matchesUser = (key: unknown): key is [string, string, string] =>
      Array.isArray(key) && typeof key[0] === "string" && key[1] === userId && key[2] === queue.source;
    void mutate<ReviewQueueResponse>(
      (key) => matchesUser(key) && key[0].startsWith(reviewQueueKey()),
      (current) => current && {
        due_count: result.due_count,
        items: current.items.filter(({ item_id }) => item_id !== item?.item_id),
      },
      { revalidate: true },
    ).catch(() => undefined);
    void mutate((key) => matchesUser(key)
      && ((key[0].startsWith(reviewQueuePrefix) && !key[0].startsWith(reviewQueueKey()))
        || key[0] === hubEndpoints.weeklyReport)).catch(() => undefined);
  }

  const remaining = !queue.error && !queue.isValidating ? queue.data?.due_count : lastDueCount;

  return (
    <main>
      <SectionShell tone="sky" label="Ôn tập">
        <SectionHeader eyebrow="Nhớ lâu hơn mỗi ngày" title="Ôn tập" tone="pink" />
        <Reveal className="mx-auto max-w-2xl">
          {item && started ? (
            <ReviewQuestion key={item.item_id} item={item} index={index} total={started.length} source={queue.source}
              onAnswered={onAnswered}
              onRefresh={() => { resetSession(); queue.retry(); }}
              onNext={(result) => {
                if (result.correct) setCorrect((value) => value + 1);
                setIndex((value) => value + 1);
              }} />
          ) : started ? (
            <GlassCard className="p-5 sm:p-7">
              <StudyImage fallback={mayPortrait} sizes="160px" className="mb-4 aspect-[4/3] w-40" />
              <h2 className="text-xl font-semibold">Bạn đã hoàn thành phiên ôn!</h2>
              <p className="my-3 text-sm">Bạn trả lời đúng {correct}/{started.length} câu. Mây đã ghi lại lịch ôn tiếp theo.</p>
              {remaining != null && <p className="mb-3 text-sm">Còn {remaining} câu đến hạn ôn.</p>}
              {queue.error && <HubLoadError error={queue.error} message="Mây chưa tải được các câu ôn còn lại." onRetry={queue.retry} isRetrying={queue.isValidating} />}
              <MockDataChip source={queue.source} />
              <div className="mt-4 flex flex-wrap gap-2">
                {!queue.error && Boolean(queue.data?.items.length) && <Button onClick={resetSession}>Ôn tiếp</Button>}
                <HomeLink href="/">Về trang chủ</HomeLink>
              </div>
            </GlassCard>
          ) : queue.error ? (
            <HubLoadError error={queue.error} message="Mây chưa tải được câu hỏi ôn tập." onRetry={queue.retry} isRetrying={queue.isValidating} />
          ) : !queue.data ? (
            <SectionLoading label="Đang tải phiên ôn" className="min-h-60" />
          ) : (
            <GlassCard className="bg-linear-to-br from-surface to-secondary-light/70 p-5 sm:p-7">
              <StudyImage src={thumbnail} fallback={preview ? undefined : mayPortrait} alt={preview?.course.title ? `Ảnh bìa khóa học ${preview.course.title}` : ""}
                sizes="(min-width: 768px) 616px, 86vw" className="mb-4 aspect-[2/1] shadow-ambient-sm" />
              <MockDataChip source={queue.source} />
              <h2 className="mt-3 text-xl font-semibold">{queue.data.due_count > 0 ? `${queue.data.due_count} câu đến hạn ôn` : "Không có câu đến hạn ôn"}</h2>
              <p className="my-3 text-sm leading-relaxed">Thử nhớ lại cách làm trước khi chọn đáp án. Mây sẽ hẹn lại câu nào bạn còn thấy khó.</p>
              {queue.data.items.length > 0
                ? <Button className="min-h-11 rounded-full" onClick={() => setStarted(queue.data?.items ?? [])}>Ôn {queue.data.items.length} câu</Button>
                : <HomeLink href="/my-learning">Xem khóa học của tôi</HomeLink>}
            </GlassCard>
          )}
        </Reveal>
      </SectionShell>
    </main>
  );
}

function ReviewQuestion({ item, index, total, source, onAnswered, onRefresh, onNext }: {
  item: ReviewQueueItem;
  index: number;
  total: number;
  source: "mock" | "api";
  onAnswered: (result: SubmitReviewAnswerResponse) => void;
  onRefresh: () => void;
  onNext: (result: SubmitReviewAnswerResponse) => void;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const [optionId, selectOption] = useState("");
  const attempt = useRef<SubmitReviewAnswerInput | null>(null);
  const inFlight = useRef(false);
  const advanced = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [result, setResult] = useState<SubmitReviewAnswerResponse>();
  const staleQuestion = [404, 409, 422].includes(hubHttpStatus(error) ?? 0);
  const lessonHref = sanitizeRedirect(item.lesson_href, "/my-learning");

  async function submit(rating: ReviewSelfRating) {
    if (!optionId || inFlight.current || result) return;
    inFlight.current = true;
    // A lost response can still mean the server recorded the answer. Retry the original payload.
    const payload = attempt.current ?? { option_id: optionId, self_rating: rating, idempotency_key: safeUUID() };
    attempt.current = payload;
    setSubmitting(true);
    setError(undefined);
    try {
      const client = await getLearningHubApi(userId);
      const answer = await client.submitReviewAnswer(item.item_id, payload);
      setResult(answer);
      onAnswered(answer);
    } catch (failure) {
      setError(failure);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <GlassCard className="space-y-4 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pill tone="pink">Câu {index + 1}/{total}</Pill>
        <MockDataChip source={source} />
      </div>
      <Progress value={index + 1} max={total} size="sm" />
      <div className="flex items-start gap-3 rounded-2xl border border-secondary-pastel bg-secondary-light/50 p-3 sm:gap-4">
        <StudyImage src={item.course.thumbnail_url} sizes="(min-width: 640px) 144px, 96px"
          className="aspect-[4/3] w-24 shrink-0 rounded-xl shadow-ambient-sm sm:w-36" />
        <div className="min-w-0 space-y-1">
          {item.course.title && <p className="text-sm font-semibold wrap-anywhere text-secondary-foreground">{item.course.title}</p>}
          <p className="text-xs leading-relaxed wrap-anywhere text-foreground/85">{[item.section?.title, item.lesson.title].filter(Boolean).join(" · ")}</p>
          <HomeLink href={lessonHref} className="text-xs">Mở bài học</HomeLink>
        </div>
      </div>
      <fieldset disabled={submitting || Boolean(result) || Boolean(attempt.current)} className="space-y-2">
        <legend className="mb-3 text-base leading-relaxed font-semibold wrap-anywhere">{item.question}</legend>
        {item.options.map((option) => (
          <label key={option.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background p-3 text-sm has-checked:border-primary has-checked:bg-primary-light">
            <input type="radio" name={item.item_id} value={option.id} checked={optionId === option.id} onChange={() => selectOption(option.id)} className="size-4 shrink-0 accent-primary" />
            <span className="min-w-0 wrap-anywhere">{option.text}</span>
            {result?.correct_option_id === option.id && <span className="ml-auto shrink-0 text-xs font-semibold text-success-foreground">Đáp án đúng</span>}
          </label>
        ))}
      </fieldset>
      {result ? (
        <>
          <div role="status" className="rounded-2xl bg-primary-light p-3 text-sm leading-relaxed">
            <strong>{result.correct ? "Chính xác!" : "Mình xem lại một chút nhé."}</strong> {result.explanation}
            <p className="mt-1">Ôn lại sau {result.interval_days} ngày.</p>
          </div>
          <Button onClick={() => {
            if (advanced.current) return;
            advanced.current = true;
            onNext(result);
          }} className="min-h-11 rounded-full">{index + 1 === total ? "Xem kết quả" : "Câu tiếp theo"}</Button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Bạn thấy mình nhớ bài đến đâu?</p>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 rounded-full" disabled={!optionId || submitting || Boolean(attempt.current)} onClick={() => void submit("remembered")}>Nhớ rồi</Button>
            <Button variant="outline" className="min-h-11 rounded-full" disabled={!optionId || submitting || Boolean(attempt.current)} onClick={() => void submit("forgot")}>Chưa nhớ</Button>
          </div>
          {submitting && <p role="status" className="text-sm">Đang chấm câu trả lời…</p>}
          {Boolean(error) && <HubLoadError error={error} title="Chưa lưu được câu trả lời" message="Bạn có thể gửi lại để Mây lưu lịch ôn." onRetry={() => {
            if (staleQuestion) onRefresh();
            else if (attempt.current) void submit(attempt.current.self_rating);
          }} />}
          {hubHttpStatus(error) === 404 && <Button variant="outline" onClick={onRefresh}>Tải lại danh sách ôn</Button>}
        </div>
      )}
    </GlassCard>
  );
}
