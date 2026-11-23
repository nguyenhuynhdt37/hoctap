"use client";

import { Badge, Button, EmptyState, Progress, Select, Skeleton } from "@/components/ui";
import { IconBubble, Pill, TONE, type Tone } from "@/components/user/home/landing-ui";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { useMissionBoard } from "@/lib/learning-hub/mission-hooks";
import type { Mission, MissionStatus, MissionsOverview, XpState } from "@/lib/learning-hub/mission-types";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, BookOpen, CalendarDays, Check, ClipboardList, Clock3, Code2, Flag, Gift, Coins, Ticket, Trophy, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { HomeLink, number, SectionLoading } from "../home/section";
import type { useDailyLearningState } from "../home/use-daily-learning-state";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";

const progressClass = "[&_[role=progressbar]>div]:motion-reduce:transition-none [&>div:first-child]:sr-only";
const softButton = "min-h-11 rounded-full font-semibold motion-reduce:transition-none";
const statuses = {
  assigned: { label: "Chưa bắt đầu", variant: "outline" },
  in_progress: { label: "Đang thực hiện", variant: "info" },
  completed: { label: "Chờ nhận thưởng", variant: "vanilla" },
  claimed: { label: "Đã nhận thưởng", variant: "success" },
  expired: { label: "Hết hạn", variant: "outline" },
} as const satisfies Record<MissionStatus, { label: string; variant: string }>;

const missionArt = {
  "daily_checkin.completed": { icon: CalendarDays, tone: "vanilla" },
  "lesson.completed": { icon: BookOpen, tone: "blue" },
  "quiz.completed": { icon: ClipboardList, tone: "pink" },
  "code.completed": { icon: Code2, tone: "lavender" },
  "chapter.complete": { icon: BookOpen, tone: "blue" },
  "chapter.quiz_pass": { icon: ClipboardList, tone: "pink" },
  "course.complete": { icon: Trophy, tone: "vanilla" },
  "course.weekly_streak": { icon: CalendarDays, tone: "lavender" },
} satisfies Record<Mission["template"], { icon: LucideIcon; tone: Tone }>;

type CourseGroup = MissionsOverview["long_term"][number];
type DailyLearningState = ReturnType<typeof useDailyLearningState>;
type RenderMission = (mission: Mission, now?: number, groupCourse?: CourseGroup["course"]) => ReactNode;

function LevelBand({ xp, sample, streak }: { xp: XpState; sample: boolean; streak?: number }) {
  const remaining = Math.max(xp.required_xp - xp.current_xp, 0);
  return (
    <div className="relative isolate grid gap-5 overflow-hidden rounded-t-3xl border-b border-primary-pastel bg-linear-to-br from-primary-light via-surface to-accent/45 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:p-7">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <IconBubble tone="lavender" className="size-11! sm:size-14!"><Trophy aria-hidden="true" className="size-5 sm:size-6" /></IconBubble>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-lg font-bold text-foreground sm:text-xl">Cấp {number.format(xp.level)}</p>
            <span className="text-sm font-semibold text-accent-foreground">{number.format(xp.total_xp)} XP tích lũy</span>
            {streak != null && <span className="text-sm font-semibold">{number.format(streak)} ngày liên tiếp</span>}
            {sample && <MockDataChip source="mock" />}
          </div>
          <Progress
            value={xp.required_xp > 0 ? xp.current_xp : 100}
            max={xp.required_xp > 0 ? xp.required_xp : 100}
            size="sm"
            label="Tiến độ lên cấp tiếp theo"
            className={cn("mt-3", progressClass)}
          />
          <p className="mt-2 text-xs leading-relaxed text-foreground">
            {xp.required_xp > 0 ? <>Còn <strong>{number.format(remaining)} XP</strong> để lên cấp {number.format(xp.level + 1)}</> : "Đang cập nhật XP để lên cấp"}
          </p>
        </div>
      </div>
      <div className="flex w-fit items-center gap-2.5 rounded-2xl border border-accent-vanilla-border bg-surface px-3.5 py-2.5 sm:px-4">
        <IconBubble tone="vanilla" className="size-9!"><Coins aria-hidden="true" className="size-4" /></IconBubble>
        <div>
          <p className="text-xs font-medium text-foreground">Số dư Coin</p>
          <p className="text-base font-bold tabular-nums text-accent-vanilla-foreground">{number.format(xp.peak_balance)} Coin</p>
        </div>
      </div>
    </div>
  );
}

const tabs = [{ id: "daily", text: "Hằng ngày", icon: CalendarDays }, { id: "course", text: "Dài hạn", icon: BookOpen }] as const;
export type MissionTab = typeof tabs[number]["id"];

export function MissionBoard({ full = false }: { full?: boolean }) {
  const board = useMissionBoard();
  return <MissionBoardContent board={board} full={full} />;
}

export function MissionBoardContent({ board, dailyLearning, full = false, compact = false, heroClaimId, selectedTab, onSelectTab }: {
  board: ReturnType<typeof useMissionBoard>;
  dailyLearning?: DailyLearningState;
  full?: boolean;
  compact?: boolean;
  heroClaimId?: string;
  selectedTab?: MissionTab;
  onSelectTab?: (tab: MissionTab) => void;
}) {
  const { overview, xp, streak, source, claim, pendingId, feedback } = board;
  const [localTab, setLocalTab] = useState<MissionTab>("daily");
  const activeTab = selectedTab ?? localTab;
  const setActiveTab = onSelectTab ?? setLocalTab;
  const id = useId();
  const dailyTab = useRef<HTMLButtonElement>(null);
  const courseTab = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const [attemptedId, setAttemptedId] = useState<string>();

  function switchTab(event: KeyboardEvent<HTMLButtonElement>) {
    const target = event.key === "Home" ? "daily" : event.key === "End" ? "course"
      : event.key === "ArrowLeft" || event.key === "ArrowRight" ? (activeTab === "daily" ? "course" : "daily") : undefined;
    if (!target) return;
    event.preventDefault();
    setActiveTab(target);
    (target === "daily" ? dailyTab : courseTab).current?.focus();
  }

  if (overview.error) {
    return <HubLoadError error={overview.error} title="Chưa tải được nhiệm vụ" message="Tải lại để xem tiến độ nhiệm vụ và phần thưởng đang chờ." onRetry={() => void overview.mutate().catch(() => undefined)} isRetrying={overview.isValidating} />;
  }
  if (!overview.data) return <BoardSkeleton compact={compact} />;

  const data = overview.data;
  const courseGroups = data.long_term;

  function renderRow(mission: Mission, now?: number, groupCourse?: CourseGroup["course"]) {
    const pending = pendingId === mission.id;
    const failed = feedback?.id === mission.id && feedback.kind === "error";
    const checkInState = dailyLearning?.missions.checkIn;
    const checkIn = checkInState?.mission?.id === mission.id ? checkInState : undefined;
    return (
      <MissionRow
        key={mission.id}
        mission={mission}
        groupCourse={groupCourse}
        now={now}
        pending={pending}
        blocked={Boolean(pendingId)}
        claimError={failed ? feedback.error : undefined}
        compact={compact}
        checkIn={checkIn}
        onCheckIn={dailyLearning?.checkIn.claim}
        checkingIn={dailyLearning?.checkIn.claiming}
        keepClaimButton={attemptedId === mission.id}
        onClaim={() => {
          setAttemptedId(mission.id);
          void claim(mission);
        }}
      />
    );
  }

  return (
    <div className={cn("min-w-0 bg-surface", compact ? "rounded-xl border border-border" : "rounded-3xl border border-border")}>
      {!compact && xp && <LevelBand xp={xp} sample={source === "mock"} streak={streak.data?.current_streak} />}
      <div className={cn("px-3 pt-3", !compact && "sm:px-7 sm:pt-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Loại nhiệm vụ" className="flex w-fit max-w-full gap-1 rounded-full border border-border bg-background p-1">
            {tabs.map(({ id: tab, icon: Icon, text }) => (
              <button
                key={tab}
                ref={tab === "daily" ? dailyTab : courseTab}
                id={`${id}-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`${id}-panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={switchTab}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-2 sm:px-5",
                  activeTab === tab ? (compact ? "bg-primary-light text-info-foreground ring-1 ring-inset ring-primary-pastel" : "bg-primary text-primary-foreground") : "text-foreground hover:bg-primary-light",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />{text}
              </button>
            ))}
          </div>
          {compact && source === "mock" && <MockDataChip source="mock" />}
        </div>
        <div aria-live={heroClaimId && feedback?.id === heroClaimId ? "off" : "polite"} aria-atomic="true">
          {feedback?.kind === "success" && (
            <motion.div
              key={feedback.id}
              initial={reduce || feedback.result.level_up?.rewards?.length ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.23 }}
              className="mt-4 flex items-start gap-2 rounded-2xl border border-success-border bg-success-bg px-4 py-3 text-sm leading-relaxed text-success-foreground"
            >
              {feedback.result.level_up ? <ArrowUp aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
              <p>
                <strong>Đã nhận thưởng!</strong>
                {feedback.result.level_up && ` Bạn đã lên cấp ${number.format(feedback.result.level_up.to)}.`}
                {" "}{rewardText(feedback.result.granted.xp, feedback.result.granted.peak)}
                {feedback.result.level_up && feedback.result.level_up.peak_bonus > 0
                  ? ` · Thưởng lên cấp +${number.format(feedback.result.level_up.peak_bonus)} Coin` : ""}
                {feedback.result.granted.coupon && " · Đã nhận mã thưởng."}
              </p>
            </motion.div>
          )}
        </div>
      </div>
      <div id={`${id}-panel-daily`} role="tabpanel" aria-labelledby={`${id}-tab-daily`} tabIndex={0} hidden={activeTab !== "daily"} className={cn("rounded-b-xl p-3 focus-visible:outline-2 focus-visible:outline-ring", !compact && "sm:p-7 sm:pt-5")}>
        {activeTab === "daily" && (dailyLearning && !dailyLearning.missions.daily
          ? <SectionLoading label="Đang làm mới nhiệm vụ" />
          : <DailyMissions overview={data} noCourses={!compact && courseGroups?.length === 0} renderRow={renderRow} dailyLearning={dailyLearning} />)}
      </div>
      <div id={`${id}-panel-course`} role="tabpanel" aria-labelledby={`${id}-tab-course`} tabIndex={0} hidden={activeTab !== "course"} className={cn("rounded-b-xl p-3 focus-visible:outline-2 focus-visible:outline-ring", !compact && "sm:p-7 sm:pt-5")}>
        {activeTab === "course" && <CourseMissions groups={courseGroups} full={full} renderRow={renderRow} />}
      </div>
    </div>
  );
}

function BoardSkeleton({ compact }: { compact: boolean }) {
  return (
    <SectionLoading label={compact ? "Đang tải nhiệm vụ" : "Đang tải cấp độ và nhiệm vụ"} className="space-y-0! p-0!">
      {!compact && <div className="flex items-center gap-4 rounded-t-3xl bg-background p-5 sm:p-7">
        <Skeleton className="size-12 shrink-0" />
        <div className="flex-1 space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-2 w-full" /><Skeleton className="h-3 w-32" /></div>
        <Skeleton className="hidden h-14 w-28 sm:block" />
      </div>}
      <div className={cn("space-y-2.5 p-3", !compact && "sm:p-7")}>
        <Skeleton className="h-11 w-52 rounded-full" />
        <Skeleton className="my-4 h-5 w-40" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className={cn("w-full rounded-xl", compact ? "h-24 sm:h-16" : "h-28 sm:h-20")} />)}
      </div>
    </SectionLoading>
  );
}

function DailyMissions({ overview, noCourses, renderRow, dailyLearning }: {
  overview: MissionsOverview; noCourses: boolean; renderRow: RenderMission; dailyLearning?: DailyLearningState;
}) {
  const { daily_resets_at } = overview;
  const daily = dailyLearning?.missions.daily ?? overview.daily;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((Date.parse(daily_resets_at) - now) / 1000));
  const clock = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((unit) => String(unit).padStart(2, "0")).join(":");
  const finished = daily.filter(({ status }) => status === "completed" || status === "claimed").length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-semibold text-foreground">{finished}/{daily.length} nhiệm vụ hoàn thành</p>
        <span role="timer" className="inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs text-info-foreground">
          <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
          {seconds > 0 ? (
            <>Làm mới lúc 00:00 (giờ Việt Nam) <time dateTime={daily_resets_at} aria-label={`Còn ${Math.floor(seconds / 3600)} giờ ${Math.floor(seconds / 60) % 60} phút`} className="font-bold tabular-nums">{clock}</time></>
          ) : "Đang làm mới nhiệm vụ"}
        </span>
      </div>
      {daily.length ? (
        <ul className="space-y-2.5">
          {daily.map((mission) => renderRow(mission.expires_at ? mission : { ...mission, expires_at: daily_resets_at }, dailyLearning?.now ?? now))}
        </ul>
      ) : <EmptyState compact icon={<StudyImage fallback={mayPortrait} sizes="44px" className="size-11" />} title="Hôm nay chưa có nhiệm vụ" description="Ghé lại sau để bắt đầu một nhịp học mới cùng Mây nhé." />}
      {noCourses && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3">
          <p className="text-sm text-foreground">Bạn có thể bắt đầu với một khóa học hợp sở thích.</p>
          <HomeLink href="/courses" className="text-xs!">Khám phá khóa học</HomeLink>
        </div>
      )}
    </>
  );
}

function CourseMissions({ groups, full, renderRow }: { groups: CourseGroup[]; full: boolean; renderRow: RenderMission }) {
  const [courseId, setCourseId] = useState("");
  const filterId = useId();
  const selected = groups.some((group) => group.course.id === courseId) ? courseId : "";
  if (!groups.length) {
    return (
      <EmptyState
        compact
        icon={<StudyImage fallback={mayPortrait} sizes="48px" className="size-12" />}
        title="Nhiệm vụ dài hạn bắt đầu từ khóa học đầu tiên"
        description="Khi có khóa học, bạn sẽ thấy các cột mốc theo chương và theo khóa ngay tại đây."
        action={<HomeLink href="/courses">Khám phá khóa học</HomeLink>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {full && (
        <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
          <label htmlFor={filterId} className="text-sm font-semibold">Lọc theo khóa học</label>
          <Select id={filterId} value={selected} onChange={(event) => setCourseId(event.target.value)} className="min-h-11">
            <option value="">Tất cả khóa học</option>
            {groups.map(({ course }) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </Select>
        </div>
      )}
      {groups.filter(({ course }) => !selected || course.id === selected).map((group) => <CourseMissionGroup key={group.course.id} group={group} renderRow={renderRow} />)}
    </div>
  );
}

function CourseMissionGroup({ group, renderRow }: { group: CourseGroup; renderRow: RenderMission }) {
  const { course, progress_percent, missions } = group;
  const percent = Math.min(100, Math.max(0, Math.round(progress_percent)));
  const id = useId();
  return (
    <section aria-labelledby={id} className="min-w-0 overflow-hidden rounded-2xl border border-primary-pastel">
      <div className="flex items-center gap-3 bg-primary-light p-3 sm:gap-4 sm:p-4">
        <StudyImage src={course.thumbnail_url} alt={`Ảnh bìa khóa học ${course.title}`}
          sizes="(min-width: 640px) 160px, 96px" className="aspect-[3/2] w-24 shrink-0 rounded-xl border border-surface shadow-ambient-sm sm:aspect-video sm:w-40"
        />
        <div className="min-w-0 flex-1">
          <h3 id={id} className="font-semibold wrap-anywhere text-foreground">{course.title}</h3>
          <p className="mt-1 text-xs font-medium text-info-foreground">Đã học {percent}%</p>
          <Progress value={percent} label={`Tiến độ khóa ${course.title}`} size="sm" className={cn("mt-1.5 max-w-sm [&_[role=progressbar]]:bg-surface", progressClass)} />
        </div>
      </div>
      {missions.length > 0
        ? <ul className="space-y-2 p-2.5 sm:p-4">{missions.map((mission) => renderRow(mission, undefined, course))}</ul>
        : <p className="p-4 text-sm text-foreground">Khóa học này chưa có nhiệm vụ.</p>}
    </section>
  );
}

function rewardText(xp: number, peak: number) {
  return [xp > 0 && `+${number.format(xp)} XP`, peak > 0 && `+${number.format(peak)} Coin`].filter(Boolean).join(" · ");
}

export function missionHref(mission: Mission) {
  if (mission.href === null) {
    return mission.template === "daily_checkin.completed" ? "/#diem-danh-hom-nay" : null;
  }
  const href = sanitizeRedirect(mission.href, "/");
  if (href !== mission.href) return null;
  const url = new URL(href, "https://learning.invalid");
  if (!mission.section || !/^\/learning\/[^/]+\/?$/.test(url.pathname) || url.hash ||
      url.searchParams.has("lesson_id") || url.searchParams.has("section_id")) return href;
  // Some versions of the API return the course URL even when the mission belongs to a section.
  url.searchParams.set("section_id", mission.section.id);
  if (mission.template === "chapter.quiz_pass") url.searchParams.set("lesson_type", "quiz");
  return url.pathname + url.search;
}

function MissionIllustration({ mission, course }: { mission: Mission; course?: CourseGroup["course"] }) {
  const { icon: Icon, tone } = missionArt[mission.template] ?? { icon: Flag, tone: "blue" };
  const artClass = "relative isolate grid aspect-[4/3] w-15 shrink-0 place-items-center rounded-xl sm:w-20";

  return (
    <span aria-hidden="true" className={cn(artClass, TONE[tone].bg)}>
      {mission.scope === "course" ? (
        <>
          <StudyImage src={mission.course?.thumbnail_url || course?.thumbnail_url} sizes="(min-width: 640px) 80px, 60px" className="absolute inset-0 size-full rounded-xl" />
          <IconBubble tone={tone} className="absolute -right-1 -bottom-1 size-6! rounded-lg! shadow-ambient-sm"><Icon className="size-3.5" /></IconBubble>
        </>
      ) : (
        <>
          <span className="absolute inset-0 overflow-hidden rounded-xl">
            <span className="absolute -bottom-4 -left-3 h-10 w-16 rounded-full bg-surface/80 blur-sm" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-surface/85" />
            <span className="absolute bottom-1.5 left-1.5 size-5 rounded-full border border-surface" />
          </span>
          <IconBubble tone={tone} className="relative size-8! -rotate-6 rounded-xl! shadow-ambient-sm sm:size-10!"><Icon className="size-4 sm:size-5" /></IconBubble>
        </>
      )}
    </span>
  );
}

function MissionRow({ mission, groupCourse, now, pending, blocked, claimError, keepClaimButton, compact, onClaim, checkIn, checkingIn, onCheckIn }: {
  mission: Mission;
  groupCourse?: CourseGroup["course"];
  now?: number;
  pending: boolean;
  blocked: boolean;
  claimError?: unknown;
  keepClaimButton: boolean;
  compact: boolean;
  onClaim: () => void;
  checkIn?: DailyLearningState["missions"]["checkIn"];
  checkingIn?: boolean;
  onCheckIn?: () => Promise<void>;
}) {
  const status = mission.status !== "claimed" && mission.expires_at && Date.parse(mission.expires_at) <= (now ?? Date.now()) ? "expired" : mission.status;
  const { label, variant } = statuses[status];
  const finished = status === "completed" || status === "claimed";
  const href = missionHref(mission);
  const showLink = !checkIn && href && status !== "expired" && (mission.scope === "course" || (!finished && !pending));
  const canClaim = !isHubUnavailable(claimError) && status === "completed" && !blocked;
  const showClaim = pending || status === "completed" || (status === "claimed" && keepClaimButton);
  const linkLabel = mission.template === "chapter.quiz_pass" ? "Mở bài trắc nghiệm" : mission.section ? "Mở chương" : mission.scope === "course" ? "Mở khóa học" : "Thực hiện";
  const { xp, peak, coupon } = mission.reward;
  const row = useRef<HTMLLIElement>(null);
  const shouldRestoreFocus = useRef(false);
  useEffect(() => {
    if (!shouldRestoreFocus.current || checkingIn) return;
    shouldRestoreFocus.current = false;
    if (checkIn?.status !== "available") row.current?.focus({ preventScroll: true });
  }, [checkingIn, checkIn?.status]);

  return (
    <li ref={row} tabIndex={checkIn ? -1 : undefined} className={cn("min-w-0 rounded-xl border p-2.5 focus-visible:outline-2 focus-visible:outline-ring", !compact && "p-3.5 sm:p-4", finished || pending ? "border-success-border bg-success-bg/45" : "border-border bg-surface")}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <MissionIllustration mission={mission} course={groupCourse} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <p className="text-sm font-semibold wrap-anywhere text-foreground">{mission.title}</p>
              {checkIn?.status !== "available" && <Badge variant={pending ? "info" : variant} className="bg-surface/85!">{checkIn?.label ?? (pending ? "Đang nhận thưởng" : label)}</Badge>}
            </div>
            {mission.description && <p className="mt-1 text-xs leading-relaxed wrap-anywhere text-foreground">{mission.description}</p>}
            <div className="mt-2 flex max-w-lg items-center gap-2">
              <Progress value={mission.progress.current} max={mission.progress.target} label={`Tiến độ ${mission.title}`} size="sm" variant={finished ? "success" : "primary"} className={progressClass} />
              <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">{number.format(mission.progress.current)}/{number.format(mission.progress.target)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:max-w-64 sm:justify-end">
          {xp > 0 && <Pill tone="lavender"><Zap aria-hidden="true" className="size-3.5 shrink-0" />+{number.format(xp)} XP</Pill>}
          {peak > 0 && <Pill tone="vanilla"><Coins aria-hidden="true" className="size-3.5 shrink-0" />+{number.format(peak)} Coin</Pill>}
          {coupon && <Pill tone="pink"><Ticket aria-hidden="true" className="size-3.5 shrink-0" />Mã giảm tối đa {number.format(coupon.max_percent)}%</Pill>}
          {(showClaim || showLink || checkIn?.status === "available") && (
            <div className="flex w-full flex-wrap gap-2 sm:justify-end">
              {checkIn?.status === "available" && (
                <Button size="sm" variant="outline" className={softButton} aria-disabled={checkingIn || undefined} aria-busy={checkingIn || undefined}
                  onClick={() => {
                    if (checkingIn) return;
                    shouldRestoreFocus.current = true;
                    void onCheckIn?.();
                  }}>{checkingIn ? "Đang điểm danh…" : checkIn.label}</Button>
              )}
              {showLink && (
                <HomeLink href={href} endIcon={false} className="px-3 py-1.5 text-xs!">{linkLabel}<span className="sr-only"> — {mission.title}</span></HomeLink>
              )}
              {showClaim && (
                <Button
                  size="sm"
                  variant={canClaim && !compact ? "primary" : "outline"}
                  className={cn(softButton, !canClaim && "cursor-default! active:translate-y-0")}
                  tabIndex={status === "claimed" && !pending ? -1 : undefined}
                  aria-disabled={!canClaim}
                  aria-busy={pending || undefined}
                  onClick={() => { if (canClaim) onClaim(); }}
                  leftIcon={pending || status === "claimed" ? undefined : <Gift aria-hidden="true" className="size-4" />}
                >
                  {pending ? "Đang nhận…" : status === "claimed" ? "Đã nhận thưởng" : claimError && !isHubUnavailable(claimError) ? "Thử lại" : "Nhận thưởng"}
                  <span className="sr-only"> — {mission.title}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {Boolean(claimError) && <p role="alert" className="mt-3 text-sm text-destructive-foreground">{hubErrorMessage(claimError, "Chưa nhận được phần thưởng. Bấm Thử lại để nhận phần thưởng này.")}</p>}
    </li>
  );
}
