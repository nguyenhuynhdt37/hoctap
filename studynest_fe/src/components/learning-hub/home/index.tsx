"use client";

import { Button } from "@/components/ui";
import { useCurrentLesson, useLearningActivity, usePurchasedCourses } from "@/lib/learning-hub/home-api";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { useHubReviewQueue } from "@/lib/learning-hub/hooks";
import type { Mission } from "@/lib/learning-hub/mission-types";
import type { CatalogCourseCard } from "@/types/catalog";
import { CalendarCheck, Gift, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HubLoadError } from "../hub-page-state";
import { CheckInCard } from "./daily-check-in";
import { Discover } from "./discover";
import { FirstCourse, TrialDialog, type SchoolLevel } from "./first-course";
import { daysSinceStudy, getJourneyState, type StepStatus } from "./journey-state";
import { MyCourses } from "./my-courses";
import { StickerBook } from "./mission-tile";
import { PathAndGoals } from "./path-and-goals";
import { ReviewPreview } from "./review-today";
import { VoucherShelf } from "./reward-tile";
import { homeWidth, HomeLink, number } from "./section";
import { SkyHero } from "./sky-hero";
import { TodayJourney } from "./today-journey";
import { useDailyLearningState } from "./use-daily-learning-state";
import { WeeklyReport } from "./weekly-report";

const heroButton = "min-h-14 rounded-full px-8 text-base font-bold whitespace-nowrap shadow-ambient-md ring-2 ring-surface/80 motion-reduce:transition-none";

export function LearnerHome() {
  const [level, setLevel] = useState<SchoolLevel>();
  const [trialCourse, setTrialCourse] = useState<CatalogCourseCard>();
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialDone, setTrialDone] = useState(false);
  const [heroClaimId, setHeroClaimId] = useState<string>();
  const focusOnAdvance = useRef<"primary" | "check-in" | null>(null);
  const purchases = usePurchasedCourses();
  const current = useCurrentLesson();
  const activity = useLearningActivity();
  const review = useHubReviewQueue();
  const daily = useDailyLearningState();
  const { now, board, missions: missionState, checkIn } = daily;

  const lastStudy = activity.data && daysSinceStudy(activity.data.activities, now);
  const enrollment = purchases.error ? "error" : !purchases.data ? "loading" : purchases.data.total ? "enrolled" : "new";
  const needsActivity = Boolean(current.href && lastStudy !== 0);
  const study: StepStatus = lastStudy === 0 ? "done" : current.error ? "error" : current.isLoading ? "loading"
    : !current.href ? "done" : activity.error && needsActivity ? "error" : !activity.data ? "loading" : "pending";

  const { claimable } = missionState;
  const checkInState = missionState.checkIn;
  const reviewItems = review.data?.items;
  const firstReview = reviewItems?.[0];
  const dueCount = review.data?.due_count;
  const journey = getJourneyState({
    enrollment, study,
    review: review.error ? "error" : dueCount == null ? "loading" : dueCount > 0 ? "pending" : "done",
    missions: missionState.missions,
    reward: missionState.reward,
    onboarding: { grade: Boolean(level), course: Boolean(trialCourse), trial: trialDone },
    daysSinceStudy: lastStudy,
  });

  const active = journey.active;
  const pendingClaim = Boolean(board.pendingId);
  const claimingJourneyReward = Boolean(board.pendingId && board.pendingId === claimable?.id);
  const { feedback } = board;
  const claimUnavailable = feedback?.kind === "error" && feedback.id === claimable?.id && isHubUnavailable(feedback.error);
  const heroFeedback = feedback && feedback.id === heroClaimId ? feedback : undefined;
  const checkInInPrimary = (active === "reward" && claimable?.id === checkInState.mission?.id)
    || (active === "missions" && checkInState.status === "available" && Boolean(checkInState.mission));

  useEffect(() => {
    const focus = focusOnAdvance.current;
    if (!focus || pendingClaim || checkIn.claiming || trialOpen) return;
    focusOnAdvance.current = null;
    const checkInRegion = document.getElementById("diem-danh-hom-nay");
    const target = focus === "check-in" ? checkInRegion?.querySelector("button") ?? checkInRegion
      : document.querySelector<HTMLElement>("[data-journey-action] :is(a, button)") ?? document.getElementById("journey-status");
    target?.focus({ preventScroll: true });
  }, [active, checkIn.claiming, checkInState.status, pendingClaim, trialOpen]);

  function claimFromHero(mission: Mission | undefined, focus: "primary" | "check-in") {
    if (!mission || pendingClaim || (claimUnavailable && mission.id === claimable?.id)) return;
    setHeroClaimId(mission.id);
    focusOnAdvance.current = focus;
    void board.claim(mission);
  }

  function checkInFromHero(focus: "primary" | "check-in") {
    focusOnAdvance.current = focus;
    void checkIn.claim();
  }

  const chapterToReview = Boolean(current.section && reviewItems?.some(({ course, section }) =>
    course.id === current.course?.id && section?.id === current.section?.id));
  const duration = current.lesson?.duration ? Math.max(1, Math.round(current.lesson.duration / 60)) : null;
  const shortReview = journey.returning && active === "review";
  let action: ReactNode;
  let actionDetail: string | undefined;

  if (active === "study" && current.href) {
    action = (
      <HomeLink href={current.href} primary endIcon={false} describedBy="journey-action-detail" className={heroButton} icon={<Play aria-hidden="true" className="size-5 shrink-0" />}>
        {current.lesson || current.course?.progress_percent ? "Học tiếp" : "Bắt đầu học"}
      </HomeLink>
    );
    actionDetail = duration ? `Khoảng ${number.format(duration)} phút` : undefined;
  } else if (active === "review" && dueCount != null) {
    action = <HomeLink href={shortReview ? "/review?limit=1" : "/review"} primary endIcon={false} className={heroButton}>Ôn {number.format(shortReview ? 1 : dueCount)} câu</HomeLink>;
  } else if (active === "missions" && checkInInPrimary) {
    action = <Button variant="primary" className={heroButton}
      leftIcon={<CalendarCheck aria-hidden="true" className="size-4" />} isLoading={checkIn.claiming} loadingText="Đang điểm danh…"
      disabled={isHubUnavailable(checkIn.claimError)}
      onClick={() => checkInFromHero("primary")}>{checkIn.claimError && !isHubUnavailable(checkIn.claimError) ? "Thử lại" : checkInState.label}</Button>;
  } else if (active === "missions") {
    action = <HomeLink href="#daily-missions" primary endIcon={false} className={heroButton}>Xem nhiệm vụ</HomeLink>;
  } else if (active === "reward" && claimable) {
    action = (
      <Button variant="primary" aria-busy={claimingJourneyReward || undefined} aria-disabled={pendingClaim || claimUnavailable || undefined}
        className={heroButton} aria-describedby="journey-action-detail"
        leftIcon={<Gift aria-hidden="true" className="size-4" />} onClick={() => claimFromHero(claimable, "primary")}>
        {claimingJourneyReward ? "Đang nhận thưởng…" : feedback?.kind === "error" && feedback.id === claimable.id && !claimUnavailable ? "Thử lại" : "Nhận thưởng"}
      </Button>
    );
    actionDetail = claimable.title;
  } else if (active === "grade") {
    action = <HomeLink href="#choose-grade" primary endIcon={false} className={heroButton}>Chọn cấp lớp</HomeLink>;
  } else if (active === "course") {
    action = <HomeLink href="#choose-course" primary endIcon={false} className={heroButton}>Chọn khóa</HomeLink>;
  } else if (active === "trial" && trialCourse) {
    action = <Button variant="primary" className={heroButton} onClick={() => setTrialOpen(true)}>Học thử</Button>;
  } else if (journey.complete) {
    action = <HomeLink href={journey.isNew && trialCourse ? `/course/${encodeURIComponent(trialCourse.slug)}` : current.href ?? "#discover"}
      endIcon={false} primary className={heroButton}>{journey.isNew ? "Xem khóa đã học thử" : "Học thêm"}</HomeLink>;
  }

  const rewardFeedback = heroFeedback && (
    <p role={heroFeedback.kind === "error" ? "alert" : "status"} className={`mt-4 w-fit max-w-[60ch] rounded-full px-4 py-2 text-sm font-semibold ${heroFeedback.kind === "success" ? "bg-success-bg text-success-foreground" : "bg-destructive-bg text-destructive-foreground"}`}>
      {heroFeedback.kind === "success" ? "Đã nhận thưởng. Xem chi tiết ở phần Phần thưởng bên dưới."
        : hubErrorMessage(heroFeedback.error, "Chưa nhận được thưởng. Bạn có thể bấm nút nhận thưởng để thử lại.")}
    </p>
  );

  const links = journey.isNew
    ? { grade: "#choose-grade", course: "#choose-course" }
    : { study: current.href, review: dueCount ? "/review" : undefined, missions: "#daily-missions", reward: "#phan-thuong" };

  return (
    <main className="relative min-h-screen overflow-x-clip bg-background font-sans text-foreground">
      <SkyHero daily={daily} journey={journey} action={action} actionDetail={actionDetail} current={current}
        chapterReview={chapterToReview && current.section ? { title: current.section.title, sample: review.source === "mock" } : undefined}>
        <TodayJourney journey={journey} links={links} sampleReview={!journey.isNew && review.source === "mock" && !!reviewItems && !review.error}
          claimableCount={missionState.claimableCount}
          rewardStatus={missionState.rewardStatus}
          stepNotes={{
            study: lastStudy === 0 ? "Đã học hôm nay" : "Không có bài đang dở",
            review: dueCount ? `${number.format(dueCount)} câu đến hạn` : "Không còn câu đến hạn",
            missions: missionState.daily?.length ? undefined : "Không có nhiệm vụ hôm nay",
            reward: missionState.hasClaimed ? "Đã nhận thưởng" : "Không có thưởng chờ nhận",
          }}
          reviewPreview={active === "review" && firstReview && <ReviewPreview item={firstReview} />} />
        {review.error && !journey.isNew && <div className="mt-4 max-w-xl"><HubLoadError error={review.error} title="Chưa tải được câu ôn đến hạn" message="Tải lại để lấy danh sách câu cần ôn hôm nay." onRetry={review.retry} isRetrying={review.isValidating} /></div>}
        {activity.error && !journey.isNew && needsActivity && <div className="mt-4 max-w-xl"><HubLoadError error={activity.error} title="Chưa tải được lịch sử học" message="Tải lại để xác định bạn đã học bài nào hôm nay." onRetry={() => void activity.mutate().catch(() => undefined)} isRetrying={activity.isValidating} /></div>}
        {rewardFeedback}
      </SkyHero>
      <div className="relative">
        {/* Đường bay của Mây đi xuyên các khối khi cuộn (chỉ trang trí, chỉ trên màn hình rộng). */}
        <svg aria-hidden="true" viewBox="0 0 1000 1600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block">
          <path d="M120 0 C 900 200, 1000 380, 520 560 S -40 820, 480 1040 S 1010 1260, 700 1600" fill="none" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-primary-pastel" />
        </svg>
        <div className={`${homeWidth} relative space-y-14 pt-12 pb-16 lg:space-y-16 lg:pt-16 lg:pb-20`}>
          {journey.isNew && <FirstCourse level={level} course={trialCourse} onLevel={(next) => {
            if (level === next) return;
            setLevel(next);
            setTrialCourse(undefined);
            setTrialDone(false);
          }} onCourse={(next) => {
            if (trialCourse?.id === next.id) return;
            setTrialCourse(next);
            setTrialDone(false);
            requestAnimationFrame(() => document.getElementById("journey-status")?.focus());
          }} />}
          <div className="grid min-w-0 gap-10 lg:grid-cols-12 lg:gap-x-6">
            <div className="min-w-0 lg:col-span-7"><StickerBook daily={daily} heroClaimId={heroClaimId} /></div>
            <div className="flex min-w-0 flex-col gap-10 lg:col-span-5 lg:mt-14 lg:-ml-6 lg:gap-8">
              <CheckInCard daily={daily} onClaimReward={() => claimFromHero(checkInState.mission, "check-in")} onCheckIn={() => checkInFromHero("check-in")} inPrimary={checkInInPrimary} />
              <div className="lg:ml-6"><VoucherShelf daily={daily} /></div>
            </div>
          </div>
          <MyCourses current={current} purchases={purchases} />
          <PathAndGoals course={current.course}><WeeklyReport /></PathAndGoals>
          <Discover />
        </div>
      </div>
      {trialOpen && trialCourse && <TrialDialog course={trialCourse} onClose={(opened) => {
        setTrialOpen(false);
        if (opened) {
          setTrialDone(true);
          focusOnAdvance.current = "primary";
        }
      }} />}
    </main>
  );
}
