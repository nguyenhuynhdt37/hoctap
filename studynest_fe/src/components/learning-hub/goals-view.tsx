"use client";

import { Button, Input, Modal, Progress, Select } from "@/components/ui";
import { GlassCard, Pill, Reveal, SectionHeader, SectionShell } from "@/components/user/home/landing-ui";
import { mayPortrait, pathCover, StudyImage } from "@/components/user/home/study-image";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { hubErrorMessage } from "@/lib/learning-hub/errors";
import { useOwnedGoalCourses, useOwnedGoalPaths } from "@/lib/learning-hub/home-api";
import { getLearningHubApi, goalKey, goalPlanKey, goalsKey, useHubGoal, useHubGoalPlan, useHubGoals } from "@/lib/learning-hub/hooks";
import type { CreateStudyGoalInput, StudyGoal, StudyGoalsListResponse, StudyGoalSchedule } from "@/lib/learning-hub/types";
import { useUserStore } from "@/stores/user";
import { useRef, useState, type FormEvent } from "react";
import { useSWRConfig } from "swr";
import { HubLoadError } from "./hub-page-state";
import { HomeLink, SectionLoading } from "./home/section";
import { MockDataChip } from "./mock-data-chip";

const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "UTC" });
const vietnamDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });

type Target = Pick<CreateStudyGoalInput, "target_type" | "target_id">;
type TargetOption = Target & { title: string; thumbnail?: string | null };

function targetKey(target: Target) {
  return `${target.target_type}:${target.target_id}`;
}

function goalTitle(goal: StudyGoal, options: TargetOption[]) {
  return goal.title || options.find((item) => targetKey(item) === targetKey(goal))?.title
    || (goal.target_type === "path" ? "Mục tiêu lộ trình" : "Mục tiêu khóa học");
}

function TargetPicker({ options, value, onChange, disabled }: {
  options: TargetOption[]; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold">
      <span>Khóa học hoặc lộ trình</span>
      <Select required disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Chọn mục tiêu</option>
        {options.map((item) => <option key={targetKey(item)} value={targetKey(item)}>{item.title}</option>)}
      </Select>
    </label>
  );
}

function readSchedule(form: HTMLFormElement): StudyGoalSchedule {
  const fields = new FormData(form);
  return { target_date: String(fields.get("target-date")), sessions_per_week: Number(fields.get("sessions")) };
}

function ScheduleFields({ goal, disabled }: { goal?: StudyGoal; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Ngày muốn hoàn thành</span>
        <Input required name="target-date" type="date" min={vietnamDate.format(new Date())} defaultValue={goal?.target_date} />
      </label>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Số buổi mỗi tuần</span>
        <Input required name="sessions" type="number" min={1} max={7} defaultValue={goal?.sessions_per_week ?? 3} />
      </label>
    </fieldset>
  );
}

export function GoalsView({ courseId, pathId }: { courseId?: string; pathId?: string }) {
  const userId = useUserStore((state) => state.user?.id);
  const { mutate } = useSWRConfig();
  const courses = useOwnedGoalCourses();
  const paths = useOwnedGoalPaths(courses.data);
  const goals = useHubGoals();
  const [target, setTarget] = useState<string>();
  const [selectedGoal, setSelectedGoal] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>();
  const createPending = useRef(false);
  const options: TargetOption[] = [
    ...(courses.error ? [] : courses.data ?? []).map((course) => ({
      target_type: "course" as const, target_id: course.id, title: course.title, thumbnail: course.thumbnail_url,
    })),
    ...(paths.error || courses.error ? [] : paths.data ?? []).map((order) => ({
      target_type: "path" as const, target_id: order.id, title: order.title,
    })),
  ];
  const preferredKey = courseId ? `course:${courseId}` : pathId ? `path:${pathId}` : undefined;
  const targetOption = options.find((option) => targetKey(option) === (target ?? preferredKey));
  const chosenGoal = goals.data?.items.find(({ id }) => id === selectedGoal)
    ?? goals.data?.items.find((goal) => targetKey(goal) === preferredKey)
    ?? goals.data?.items[0];

  async function syncGoal(id: string, saved?: StudyGoal) {
    const key = [goalsKey, userId, goals.source];
    const detailKey = [goalKey(id), userId, goals.source];
    await mutate<StudyGoalsListResponse>(key, (current) => {
      const previous = current?.items ?? [];
      const remaining = previous.filter((goal) => goal.id !== id);
      if (!saved) return { items: remaining };
      return { items: previous.some((goal) => goal.id === id)
        ? previous.map((goal) => goal.id === id ? saved : goal)
        : [saved, ...remaining] };
    }, { revalidate: false });
    if (saved) await mutate(detailKey, saved, { revalidate: false });
    else await mutate(detailKey, undefined, { revalidate: false });
    void Promise.allSettled([
      mutate(key),
      mutate([goalPlanKey(id), userId, goals.source], undefined, { revalidate: Boolean(saved) }),
    ]);
  }

  async function create(schedule: StudyGoalSchedule) {
    if (!targetOption || createPending.current) return;
    createPending.current = true;
    setCreating(true);
    setCreateError(undefined);
    try {
      const client = await getLearningHubApi(userId);
      const goal = await client.createGoal({
        target_type: targetOption.target_type, target_id: targetOption.target_id, ...schedule,
      });
      await syncGoal(goal.id, goal);
      setSelectedGoal(goal.id);
    } catch (error) {
      setCreateError(error);
    } finally {
      createPending.current = false;
      setCreating(false);
    }
  }

  return (
    <main>
      <SectionShell tone="blue" label="Mục tiêu học tập">
        <SectionHeader eyebrow="Chia nhỏ chặng đường" title="Mục tiêu học tập" tone="lavender" />
        <div className="mx-auto grid max-w-5xl min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Reveal>
            <GlassCard className="min-w-0 space-y-4 p-5 sm:p-6">
              <StudyImage src={targetOption?.thumbnail} fallback={targetOption?.target_type === "course" ? undefined : pathCover}
                alt={targetOption ? `Ảnh bìa ${targetOption.title}` : ""}
                sizes="(min-width: 1024px) 350px, 87vw" className="aspect-[2/1] shadow-ambient-sm" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Đặt ngày hoàn thành</h2>
                {options.length > 0 && <MockDataChip source={goals.source} />}
              </div>
              {courses.error && <HubLoadError error={courses.error} message="Mây chưa tải được khóa học." onRetry={() => void courses.mutate().catch(() => undefined)} isRetrying={courses.isValidating} />}
              {paths.error && <HubLoadError error={paths.error} message="Mây chưa tải được lộ trình đã sở hữu." onRetry={paths.retry} isRetrying={paths.isValidating} />}
              {options.length > 0 ? (
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void create(readSchedule(event.currentTarget)); }}>
                  <TargetPicker options={options} value={targetOption ? targetKey(targetOption) : ""} onChange={setTarget} disabled={creating} />
                  <ScheduleFields disabled={creating} />
                  <Button type="submit" isLoading={creating} loadingText="Đang lưu…" className="min-h-11 rounded-full">
                    {createError ? "Thử lại" : "Lưu mục tiêu"}
                  </Button>
                  {Boolean(createError) && <GoalWriteError error={createError} />}
                </form>
              ) : courses.isLoading || paths.isLoading ? (
                <SectionLoading label="Đang tải khóa học và lộ trình" />
              ) : !courses.error && !paths.error ? (
                <>
                  <p className="text-sm leading-relaxed">Bạn chưa có khóa học hoặc lộ trình đã sở hữu để đặt mục tiêu.</p>
                  <HomeLink href="/my-learning">Khóa học của tôi</HomeLink>
                </>
              ) : null}
            </GlassCard>
          </Reveal>
          <Reveal delay={0.08}>
            {goals.error ? (
              <HubLoadError error={goals.error} message="Mây chưa tải được mục tiêu." onRetry={goals.retry} isRetrying={goals.isValidating} />
            ) : goals.isLoading ? (
              <SectionLoading label="Đang tải mục tiêu" />
            ) : chosenGoal ? (
              <GlassCard className="min-w-0 space-y-4 bg-linear-to-br from-surface to-accent/50 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Kế hoạch của bạn</h2>
                  <MockDataChip source={goals.source} />
                </div>
                <label className="block space-y-1.5 text-sm font-semibold">
                  <span>Mục tiêu đang xem</span>
                  <Select value={chosenGoal.id} onChange={(event) => setSelectedGoal(event.target.value)}>
                    {goals.data?.items.map((goal) => <option key={goal.id} value={goal.id}>{goalTitle(goal, options)}</option>)}
                  </Select>
                </label>
                <GoalDetails key={chosenGoal.id} goal={chosenGoal} options={options} syncGoal={syncGoal} />
              </GlassCard>
            ) : (
              <GlassCard className="flex items-center gap-4 p-5 text-sm">
                <StudyImage fallback={mayPortrait} sizes="88px" className="size-22 shrink-0" />
                <p>Bạn chưa có mục tiêu học tập.</p>
              </GlassCard>
            )}
          </Reveal>
        </div>
      </SectionShell>
    </main>
  );
}

function GoalDetails({ goal, options, syncGoal }: {
  goal: StudyGoal; options: TargetOption[]; syncGoal: (id: string, saved?: StudyGoal) => Promise<void>;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const detail = useHubGoal(goal.id);
  const selected = detail.data ?? goal;
  const option = options.find((item) => targetKey(item) === targetKey(selected));
  const [action, setAction] = useState<"edit" | "delete">();
  const [newTarget, setNewTarget] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();
  const pending = useRef(false);

  function changeAction(value?: "edit" | "delete") {
    if (pending.current) return;
    setError(undefined);
    setNewTarget(undefined);
    setAction(value);
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (pending.current) return;
    const schedule = event && readSchedule(event.currentTarget);
    pending.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const client = await getLearningHubApi(userId);
      if (schedule) {
        const target = options.find((item) => targetKey(item) === newTarget);
        const payload = target && newTarget !== targetKey(selected)
          ? { ...schedule, target_id: target.target_id, target_type: target.target_type }
          : schedule;
        await syncGoal(goal.id, await client.updateGoal(goal.id, payload));
      } else {
        await client.deleteGoal(goal.id);
        await syncGoal(goal.id);
      }
      setAction(undefined);
    } catch (failure) {
      setError(failure);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <StudyImage src={selected.thumbnail_url ?? option?.thumbnail} fallback={selected.target_type === "path" ? pathCover : undefined}
        alt={`Ảnh bìa ${goalTitle(selected, options)}`}
        sizes="(min-width: 1100px) 560px, (min-width: 1024px) 53vw, 87vw" className="aspect-[2/1] shadow-ambient-sm sm:aspect-[5/2]" />
      <div className="flex flex-wrap gap-2">
        <Pill tone="lavender"><time dateTime={selected.target_date}>{date.format(new Date(selected.target_date))}</time></Pill>
        <Pill>{selected.sessions_per_week} buổi/tuần</Pill>
      </div>
      {detail.error && <HubLoadError error={detail.error} message="Mây chưa tải được chi tiết mục tiêu." onRetry={detail.retry} isRetrying={detail.isValidating} />}
      {action === "edit" ? (
        <form className="space-y-4 rounded-2xl border border-primary-pastel bg-surface p-4" onSubmit={(event) => void save(event)}>
          {options.length > 0 && <TargetPicker
            options={option ? options : [{ ...selected, title: goalTitle(selected, options) }, ...options]}
            value={newTarget ?? targetKey(selected)} onChange={setNewTarget} disabled={saving} />}
          <ScheduleFields goal={selected} disabled={saving} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" isLoading={saving} loadingText="Đang lưu…">{error ? "Thử lại" : "Lưu thay đổi"}</Button>
            <Button variant="ghost" disabled={saving} onClick={() => changeAction()}>Hủy</Button>
          </div>
          {Boolean(error) && <GoalWriteError error={error} />}
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => changeAction("edit")}>Sửa mục tiêu</Button>
          <Button variant="ghost" className="text-destructive-foreground" onClick={() => changeAction("delete")}>Xóa mục tiêu</Button>
        </div>
      )}
      <GoalPlan goalId={goal.id} />
      <Modal open={action === "delete"} onClose={() => changeAction()} title="Xóa mục tiêu?"
        description={`Kế hoạch học của “${goalTitle(selected, options)}” sẽ bị xóa.`} size="sm"
        footer={<>
          <Button variant="outline" disabled={saving} onClick={() => changeAction()}>Giữ mục tiêu</Button>
          <Button variant="destructive" isLoading={saving} loadingText="Đang xóa…" onClick={() => void save()}>{error ? "Thử lại" : "Xóa mục tiêu"}</Button>
        </>}>
        {Boolean(error) && <GoalWriteError error={error} deleting />}
      </Modal>
    </>
  );
}

function GoalWriteError({ error, deleting }: { error: unknown; deleting?: boolean }) {
  const message = deleting ? "Mây chưa xóa được mục tiêu." : "Mây chưa lưu được mục tiêu. Hãy kiểm tra ngày hoàn thành và số buổi mỗi tuần.";
  return <p role="alert" className="text-sm text-destructive-foreground">{hubErrorMessage(error, message)}</p>;
}

function GoalPlan({ goalId }: { goalId: string }) {
  const plan = useHubGoalPlan(goalId);
  if (plan.error) return <HubLoadError error={plan.error} message="Mây chưa tải được lịch học theo ngày." onRetry={plan.retry} isRetrying={plan.isValidating} />;
  if (!plan.data) return <SectionLoading label="Đang tải lịch học" />;
  const { days, completed_lessons, total_lessons, on_track, behind_lessons, suggestion } = plan.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={on_track ? "success" : "vanilla"}>{on_track ? "Đúng lịch" : `Chậm ${behind_lessons} bài`}</Pill>
        <span className="text-sm font-semibold">{completed_lessons}/{total_lessons} bài đã hoàn thành</span>
      </div>
      {total_lessons > 0 && <Progress value={completed_lessons} max={total_lessons} label="Tiến độ mục tiêu" showValue size="sm" />}
      {suggestion && <p className="rounded-xl bg-surface px-3 py-2 text-sm">{suggestion}</p>}
      {days.length > 0 ? (
        <ol className="relative space-y-3">
          {days.map(({ date: day, items }) => (
            <li key={day} className="min-w-0 rounded-2xl border border-primary-pastel bg-surface p-3">
              <h3 className="text-sm font-semibold"><time dateTime={day}>{date.format(new Date(day))}</time></h3>
              <ul className="mt-2 space-y-2">
                {items.map((item, index) => {
                  const href = sanitizeRedirect(item.href, item.kind === "review" ? "/review" : "/my-learning");
                  return (
                    <li key={`${item.kind}:${item.lesson_id ?? index}:${index}`} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-background p-2 text-sm">
                      <HomeLink href={href} endIcon={false} className="wrap-anywhere">{item.title}</HomeLink>
                      <Pill tone={item.done ? "success" : "blue"}>{item.done ? "Đã xong" : item.kind === "review" ? "Ôn tập" : "Bài học"}</Pill>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-xl bg-surface p-3 text-sm">Kế hoạch hiện chưa có buổi học nào.</p>}
    </div>
  );
}
