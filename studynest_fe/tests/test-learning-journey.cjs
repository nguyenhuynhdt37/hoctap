const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const source = path.resolve(__dirname, "../src/components/learning-hub/home/journey-state.ts");
const compiled = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const journeyModule = { exports: {} };
new Function("exports", compiled.outputText)(journeyModule.exports);
const { daysSinceStudy, getDailyMissionState, getJourneyState } = journeyModule.exports;

const beforeMidnight = Date.parse("2026-11-23T16:59:59Z");
const afterMidnight = beforeMidnight + 1000;
const input = {
  enrollment: "enrolled",
  study: "done",
  review: "done",
  missions: "done",
  reward: "done",
  onboarding: { grade: false, course: false, trial: false },
};

test("người mới đi qua chọn cấp, chọn khóa và học thử", () => {
  const newest = { ...input, enrollment: "new" };
  const first = getJourneyState(newest);
  assert.deepEqual(first.steps.map(({ id }) => id), ["grade", "course", "trial"]);
  assert.equal(first.active, "grade");
  assert.equal(getJourneyState({ ...newest, onboarding: { grade: true } }).active, "course");
  assert.equal(getJourneyState({ ...newest, onboarding: { grade: true, course: true } }).active, "trial");
  assert.equal(getJourneyState({ ...newest, onboarding: { grade: true, course: true, trial: true } }).complete, true);
});

test("quay lại sau đúng ba ngày Việt Nam dùng lời mời nhẹ nhàng", () => {
  const history = [
    { action_type: "daily_checkin.completed", created_at: "2026-11-23T16:45:00Z" },
    { action_type: "lesson.completed", created_at: "2026-11-21T16:45:00Z" },
    { action_type: "quiz.completed", created_at: "2026-11-20T16:45:00Z" },
  ];
  assert.equal(daysSinceStudy(history, beforeMidnight), 2);
  assert.equal(daysSinceStudy(history, afterMidnight), 3);
  assert.equal(getJourneyState({ ...input, study: "pending", daysSinceStudy: 2 }).returning, false);
  const returning = getJourneyState({ ...input, study: "pending", daysSinceStudy: 3 });
  assert.equal(returning.active, "study");
  assert.equal(returning.returning, true);
  assert.equal(daysSinceStudy([history[0]], afterMidnight), undefined);
});

test("hoàn thành mọi chặng hôm nay không có CTA chính", () => {
  const { complete, active, remaining, returning } = getJourneyState({ ...input, daysSinceStudy: 0 });
  assert.equal(complete, true);
  assert.equal(active, undefined);
  assert.equal(remaining, 0);
  assert.equal(returning, false);
});

test("duy trì đúng thứ tự khi đang học, ôn và nhận thưởng", () => {
  const inProgress = { ...input, study: "pending", review: "pending", missions: "pending", reward: "pending" };
  assert.equal(getJourneyState(inProgress).active, "study");
  assert.equal(getJourneyState(inProgress).remaining, 4);
  inProgress.study = "done";
  assert.equal(getJourneyState(inProgress).active, "review");
  inProgress.review = "done";
  assert.equal(getJourneyState(inProgress).active, "missions");
  inProgress.missions = "done";
  assert.equal(getJourneyState(inProgress).active, "reward");
});

test("lỗi một phần vẫn cho phép bước đã tải và không báo hoàn thành", () => {
  const state = getJourneyState({ ...input, study: "error", review: "pending" });
  assert.equal(state.active, "review");
  assert.equal(state.hasError, true);
  assert.equal(state.complete, false);
  assert.equal(getJourneyState({ ...input, enrollment: "error" }).complete, false);
  assert.equal(getJourneyState({ ...input, missions: "error", reward: "error" }).complete, false);
});

test("chờ chặng trước đang tải để CTA không nhảy nhầm", () => {
  const awaiting = getJourneyState({ ...input, study: "loading", review: "pending" });
  assert.equal(awaiting.active, undefined);
  assert.equal(awaiting.loading, true);
  assert.equal(awaiting.complete, false);
  assert.equal(getJourneyState({ ...input, study: "pending", review: "loading" }).active, "study");
});

test("phần thưởng chỉ hoàn tất sau phản hồi xác nhận và bỏ qua nhiệm vụ hết hạn", () => {
  const overview = {
    daily_resets_at: new Date(beforeMidnight + 10_000).toISOString(),
    daily: [
      { id: "expired", status: "completed", expires_at: new Date(beforeMidnight - 1000).toISOString() },
      { id: "today", status: "completed", expires_at: null },
    ],
  };
  const ready = getDailyMissionState(overview, false, beforeMidnight);
  assert.equal(ready.missions, "done");
  assert.equal(ready.reward, "pending");
  assert.equal(ready.claimable.id, "today");

  overview.daily[1].status = "claimed";
  assert.equal(getDailyMissionState(overview, false, beforeMidnight, "today").reward, "pending");
  assert.equal(getDailyMissionState(overview, false, beforeMidnight).reward, "done");
  assert.equal(getDailyMissionState(overview, false, beforeMidnight + 20_000).reward, "loading");
  assert.equal(getDailyMissionState(overview, true, beforeMidnight).reward, "error");
});

test("điểm danh 1/1 chờ thưởng dù lịch điểm danh chưa mở", () => {
  const daily = {
    id: "check-in", template: "daily_checkin.completed", status: "completed",
    progress: { current: 1, target: 1 }, expires_at: null,
  };
  const overview = { daily_resets_at: new Date(beforeMidnight + 10_000).toISOString(), daily: [daily] };
  const checkIn = { closed: true };
  const ready = getDailyMissionState(overview, false, beforeMidnight, undefined, checkIn);
  assert.equal(ready.checkIn.label, "Chờ nhận thưởng");
  assert.equal(ready.checkIn.mission, ready.claimable);
  assert.equal(ready.rewardStatus, ready.checkIn.label);
  assert.equal(ready.claimableCount, 1);
  assert.equal(getJourneyState({ ...input, ...ready }).active, "reward");

  daily.status = "claimed";
  const pending = getDailyMissionState(overview, false, beforeMidnight, daily.id, checkIn);
  assert.equal(pending.checkIn.label, "Đang nhận thưởng");
  assert.equal(pending.rewardStatus, pending.checkIn.label);
  assert.equal(pending.claimableCount, 0);
  assert.equal(getJourneyState({ ...input, ...pending }).active, "reward");

  const claimed = getDailyMissionState(overview, false, beforeMidnight, undefined, checkIn);
  assert.equal(claimed.checkIn.label, "Đã điểm danh hôm nay");
  assert.equal(claimed.claimableCount, 0);
  assert.equal(getJourneyState({ ...input, ...claimed }).complete, true);
});

test("điểm danh chưa làm dùng cùng hành động và không báo có thưởng sẵn", () => {
  const daily = { id: "check-in", template: "daily_checkin.completed", status: "assigned", expires_at: null };
  const overview = { daily_resets_at: new Date(beforeMidnight + 10_000).toISOString(), daily: [daily] };
  const ready = getDailyMissionState(overview, false, beforeMidnight, undefined, { checkedToday: false });
  assert.equal(ready.checkIn.label, "Điểm danh hôm nay");
  assert.equal(ready.checkIn.mission, daily);
  assert.equal(ready.claimableCount, 0);
  assert.equal(getJourneyState({ ...input, ...ready }).active, "missions");
  const rollover = getDailyMissionState(overview, false, afterMidnight + 10_000, undefined, { closed: true });
  assert.equal(rollover.checkIn.status, "loading");
  assert.equal(rollover.reward, "loading");
});
