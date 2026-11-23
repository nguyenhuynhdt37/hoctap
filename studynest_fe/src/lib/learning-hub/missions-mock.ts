import { getMockShopAccount, mockLevelReward, mockXpRequired } from "./shop-mock";
import type { ClaimResult, Mission, MissionsClient } from "./mission-types";

const dayMs = 86_400_000;
const vietnamOffsetMs = 7 * 3_600_000;

function nextMidnight(now: number) {
  return (Math.floor((now + vietnamOffsetMs) / dayMs) + 1) * dayMs - vietnamOffsetMs;
}

function buildMission(input: Pick<Mission, "id" | "template" | "title" | "description" | "progress" | "href"> &
  Partial<Pick<Mission, "course" | "section" | "expires_at">>, xp: number, peak: number): Mission {
  const completed = input.progress.current >= input.progress.target;
  return {
    course: null,
    section: null,
    expires_at: null,
    ...input,
    scope: input.course ? "course" : "daily",
    status: completed ? "completed" : input.progress.current > 0 ? "in_progress" : "assigned",
    reward: { xp, peak, coupon: null },
    completed_at: completed ? new Date().toISOString() : null,
    claimed_at: null,
  };
}

function makeDaily(resetAt: string) {
  const id = resetAt.slice(0, 10);
  return [
    buildMission({
      id: `sample-lessons-${id}`, template: "lesson.completed", title: "Hoàn thành 3 bài học",
      description: "Học tiếp các bài trong khóa của bạn.", progress: { current: 3, target: 3 },
      href: "/my-learning", expires_at: resetAt,
    }, 50, 10),
    buildMission({
      id: `sample-quiz-${id}`, template: "quiz.completed", title: "Làm một bài trắc nghiệm",
      description: "Củng cố kiến thức với một bài trắc nghiệm trong khóa học.", progress: { current: 0, target: 1 },
      href: "/my-learning", expires_at: resetAt,
    }, 30, 5),
  ];
}

const mockClients = new Map<string, MissionsClient>();

export function getMockMissionsClient(userId: string): MissionsClient {
  const existing = mockClients.get(userId);
  if (existing) return existing;

  const account = getMockShopAccount(userId);
  const claims = new Map<string, ClaimResult>();

  const daily = () => makeDaily(new Date(nextMidnight(Date.now())).toISOString());
  const claimed = (mission: Mission) => claims.get(mission.id)?.mission ?? mission;
  const client: MissionsClient = {
    async getOverview() {
      const resetAt = new Date(nextMidnight(Date.now())).toISOString();
      return { xp: account.xp, daily: makeDaily(resetAt).map(claimed), daily_resets_at: resetAt, long_term: [] };
    },

    async claim(id) {
      const previous = claims.get(id);
      if (previous) return previous;
      const mission = daily().find((item) => item.id === id);
      if (mission?.status !== "completed") throw new Error("Nhiệm vụ chưa sẵn sàng để nhận thưởng.");

      const { xp: gainedXp, peak } = mission.reward;
      const xp = account.xp;
      let { level, current_xp, required_xp } = xp;
      current_xp += gainedXp;
      const rewards: NonNullable<NonNullable<ClaimResult["level_up"]>["rewards"]> = [];
      while (current_xp >= required_xp) {
        current_xp -= required_xp;
        level += 1;
        required_xp = mockXpRequired(level);
        const { coins, items } = mockLevelReward(level, level);
        rewards.push({ level, coins, items });
      }
      const peakBonus = rewards.reduce((total, reward) => total + reward.coins, 0);
      const level_up = rewards.length ? { from: xp.level, to: level, peak_bonus: peakBonus, rewards } : null;
      account.xp = { level, current_xp, required_xp, total_xp: xp.total_xp + gainedXp, peak_balance: xp.peak_balance + peak + peakBonus };
      const result: ClaimResult = {
        mission: { ...mission, status: "claimed", claimed_at: new Date().toISOString() },
        granted: { xp: gainedXp, peak, coupon: null },
        xp: account.xp,
        level_up,
      };
      claims.set(id, result);
      return result;
    },

    async getInventory() {
      return { peak_balance: account.xp.peak_balance, coupons: [] };
    },
  };

  mockClients.set(userId, client);
  return client;
}
