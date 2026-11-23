const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const src = path.resolve(__dirname, "../src");

function testApp(env = {}) {
  const modules = new Map();
  const cache = new Map();
  const requests = [];
  const fetchers = new Map();
  const responses = new Map();
  const failures = new Map();
  const account = { id: "learner-1", fullname: "Học viên" };

  function request(method, endpoint, payload) {
    requests.push({ method, endpoint, payload });
    return failures.has(endpoint)
      ? Promise.reject(failures.get(endpoint))
      : Promise.resolve({ data: responses.get(endpoint) });
  }

  async function revalidate(key) {
    const id = JSON.stringify(key);
    try {
      const data = await fetchers.get(id)?.();
      cache.set(id, { data });
      return data;
    } catch (error) {
      cache.set(id, { error });
      throw error;
    }
  }

  function useSWR(key, fetcher) {
    if (!key) return {};
    const id = JSON.stringify(key);
    fetchers.set(id, () => fetcher(key));
    return {
      ...cache.get(id),
      async mutate(update) {
        if (!update) return revalidate(key);
        const data = await update(cache.get(id)?.data);
        cache.set(id, { data });
        return data;
      },
    };
  }
  useSWR.useSWRConfig = () => ({
    async mutate(key) {
      if (fetchers.has(JSON.stringify(key))) return revalidate(key);
    },
  });

  const stubs = {
    "swr": useSWR,
    "@/lib/utils/fetcher/client/axios": {
      get: (endpoint, options) => request("GET", endpoint, options?.params),
      post: (endpoint, payload) => request("POST", endpoint, payload),
      patch: (endpoint, payload) => request("PATCH", endpoint, payload),
      delete: (endpoint) => request("DELETE", endpoint),
    },
    "@/stores/user": { useUserStore: (select) => select({ user: account }) },
    "@/lib/auth/mode": { isDpopMode: true },
    "@/hooks/auth/useAuthedSWR": {
      useAuthBootstrapStatus: (select) => select({ status: "ready" }),
      useAuthedSWR: (endpoint) => endpoint ? { data: responses.get(endpoint) } : {},
    },
    "@/components/shared/user-loader": { useCookieUserStatus: () => "ready" },
    "next/link": ({ children, href }) => React.createElement("a", { href }, children),
    "next/image": ({ src, alt }) => React.createElement("span", { "data-image": src, "aria-label": alt }),
  };

  function load(resolved) {
    const filename = [resolved, `${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, "index.ts"), path.join(resolved, "index.tsx")]
      .find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
    assert.ok(filename, `Không tìm thấy mô-đun ${resolved}`);
    if (modules.has(filename)) return modules.get(filename).exports;

    const module = { exports: {} };
    modules.set(filename, module);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
      fileName: filename,
    });
    const localRequire = (specifier) => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.startsWith("@/")) return load(path.join(src, specifier.slice(2)));
      if (specifier.startsWith(".")) return load(path.resolve(path.dirname(filename), specifier));
      return require(specifier);
    };
    new Function("module", "exports", "require", "process", compiled.outputText)(
      module, module.exports, localRequire, { env },
    );
    return module.exports;
  }

  return {
    load: (file) => load(path.join(src, file)), requests, responses, failures, revalidate, account,
    loaded: (file) => modules.has(path.join(src, file)),
  };
}

const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(Component, props));
const httpError = (status) => ({ isAxiosError: true, response: { status } });

test("mặc định là API; chỉ dev bật mock rõ ràng mới nạp dữ liệu mẫu", async () => {
  for (const [env, expected] of [
    [{ NODE_ENV: "development" }, "api"],
    [{ NODE_ENV: "development", NEXT_PUBLIC_HUB_DATA_SOURCE: "typo" }, "api"],
    [{ NODE_ENV: "development", NEXT_PUBLIC_HUB_DATA_SOURCE: "mock" }, "mock"],
    [{ NODE_ENV: "production", NEXT_PUBLIC_HUB_DATA_SOURCE: "mock" }, "api"],
  ]) {
    const app = testApp(env);
    assert.equal(app.load("lib/learning-hub/data-source").getHubDataSource(), expected);
    const { getLearningHubApi } = app.load("lib/learning-hub/hooks");
    const client = await getLearningHubApi(app.account.id);
    if (expected === "mock") {
      const queue = await client.getReviewQueue({ limit: 1 });
      assert.ok(queue.due_count > queue.items.length);
      assert.equal(app.requests.length, 0);
    } else {
      for (const status of [404, 501]) {
        const error = httpError(status);
        app.failures.set("/user/review/queue", error);
        await assert.rejects(client.getReviewQueue(), (failure) => failure === error);
      }
      const network = { isAxiosError: true };
      app.failures.set("/user/review/queue", network);
      await assert.rejects(client.getReviewQueue(), (failure) => failure === network);
    }
    assert.equal(app.loaded("lib/learning-hub/mock-client.ts"), expected === "mock");
  }
});

test("client gửi đúng phương thức, tham số và mã lần trả lời theo hợp đồng", async () => {
  const app = testApp();
  const { apiLearningHubClient: hub } = app.load("lib/learning-hub/api-client");
  const { apiMissionsClient: missions } = app.load("lib/learning-hub/missions-api");
  const answer = { option_id: "option", self_rating: "remembered", idempotency_key: "request-id" };
  const goal = { target_id: "owned-order", target_type: "path", target_date: "2026-12-10", sessions_per_week: 3 };
  const update = { sessions_per_week: 4, target_date: "2026-12-11" };
  await hub.getReviewQueue({ course_id: "course", limit: 1 });
  await hub.submitReviewAnswer("item / id", answer);
  await hub.getMasteryCourses();
  await hub.getCourseMastery("course");
  await hub.getGoals();
  await hub.getGoal("goal");
  await hub.createGoal(goal);
  await hub.updateGoal("goal", update);
  await hub.deleteGoal("goal");
  await hub.getGoalPlan("goal");
  await hub.getWeeklyReport();
  await hub.getBadges();
  await missions.getOverview();
  await missions.claim("mission");
  await missions.getInventory();

  assert.deepEqual(app.requests.map(({ method, endpoint, payload }) => [method, endpoint, payload]), [
    ["GET", "/user/review/queue", { course_id: "course", limit: 1 }],
    ["POST", "/user/review/item%20%2F%20id/answer", answer],
    ["GET", "/user/mastery/courses", undefined],
    ["GET", "/user/courses/course/mastery", undefined],
    ["GET", "/user/goals", undefined],
    ["GET", "/user/goals/goal", undefined],
    ["POST", "/user/goals", goal],
    ["PATCH", "/user/goals/goal", update],
    ["DELETE", "/user/goals/goal", undefined],
    ["GET", "/user/goals/goal/plan", undefined],
    ["GET", "/user/reports/weekly", undefined],
    ["GET", "/gamification/badges", undefined],
    ["GET", "/gamification/missions", undefined],
    ["POST", "/gamification/missions/mission/claim", undefined],
    ["GET", "/gamification/rewards/inventory", undefined],
  ]);
});

test("XP, cấp, Coin và chuỗi ngày đồng bộ giữa header, trang chủ và nhiệm vụ sau nhận thưởng", async () => {
  const app = testApp({ NODE_ENV: "production", NEXT_PUBLIC_HUB_DATA_SOURCE: "mock" });
  const { LiveTicket } = app.load("components/user/header/live-stats");
  const { SkyHero } = app.load("components/learning-hub/home/sky-hero");
  const { useDailyLearningState } = app.load("components/learning-hub/home/use-daily-learning-state");
  const { MissionBoard } = app.load("components/learning-hub/missions/mission-board");
  const { RewardShelf } = app.load("components/learning-hub/missions/reward-shelf");
  const { missionsOverviewKey, streakKey, useMissionBoard } = app.load("lib/learning-hub/mission-hooks");
  const { hubEndpoints: api } = app.load("lib/learning-hub/endpoints");
  const xp = { level: 7, current_xp: 140, required_xp: 150, total_xp: 437, peak_balance: 222 };
  const mission = {
    id: "mission", scope: "daily", template: "lesson.completed", status: "completed",
    title: "Học một bài", description: "Hoàn thành bài đang học.", expires_at: null,
    progress: { current: 1, target: 1 }, reward: { xp: 20, peak: 5, coupon: null },
  };
  const overview = { xp, daily: [mission], long_term: [], daily_resets_at: new Date(Date.now() + 60_000).toISOString() };
  const earnedXp = { level: 8, current_xp: 10, required_xp: 160, total_xp: 457, peak_balance: 227 };
  const completedMission = { ...mission, status: "claimed" };
  app.responses.set(api.missions, overview);
  app.responses.set(api.streak, { current_streak: 12, best_streak: 18 });
  app.responses.set("/gamification/profile", { level: 1, current_xp: 70, required_xp: 100 });
  app.responses.set(api.inventory, { peak_balance: 999, coupons: [] });
  app.responses.set(api.missionClaim(mission.id), {
    mission: completedMission, xp: earnedXp, level_up: null, granted: mission.reward,
  });

  function HomeHero() {
    return React.createElement(SkyHero, {
      daily: useDailyLearningState(),
      journey: { active: "study", remaining: 1 },
      current: {},
    });
  }

  render(LiveTicket);
  const key = missionsOverviewKey(app.account.id);
  await app.revalidate(key);
  await app.revalidate(streakKey(app.account.id));

  function assertDisplays(expected) {
    const ticket = render(LiveTicket);
    const hero = render(HomeHero);
    const board = render(MissionBoard);
    const shelf = render(RewardShelf);
    for (const markup of [ticket, hero, board]) {
      assert.match(markup, new RegExp(`Cấp ${expected.level}\\b`));
      assert.match(markup, /12 ngày liên tiếp/);
      assert.doesNotMatch(markup, /Dữ liệu mẫu|Cấp 1\b/);
    }
    assert.match(ticket, new RegExp(`${expected.current_xp}/${expected.required_xp} XP`));
    assert.match(hero, new RegExp(`${expected.total_xp} XP`));
    assert.match(board, new RegExp(`${expected.total_xp} XP tích lũy`));
    for (const markup of [ticket, board, shelf]) {
      assert.match(markup, new RegExp(`${expected.peak_balance} Coin`));
      assert.doesNotMatch(markup, /999 Coin/);
    }
  }

  assertDisplays(xp);
  await app.revalidate([api.inventory, app.account.id, "api"]);
  let board;
  render(() => { board = useMissionBoard(); return null; });
  app.responses.set(api.missions, { ...overview, xp: earnedXp, daily: [completedMission] });
  await Promise.all([board.claim(mission), board.claim(mission)]);
  assertDisplays(earnedXp);
  assert.equal(app.requests.filter(({ method }) => method === "POST").length, 1);
  assert.equal(app.requests.some(({ endpoint }) => endpoint === "/gamification/profile"), false);
  assert.equal(app.loaded("lib/learning-hub/missions-mock.ts"), false);
});

test("nhiệm vụ lỗi 404/501 và lỗi mạng giữ nguyên lỗi API; kệ mã thưởng rỗng hiện Sắp có", async () => {
  const app = testApp({ NODE_ENV: "production", NEXT_PUBLIC_HUB_DATA_SOURCE: "mock" });
  const { MissionBoard } = app.load("components/learning-hub/missions/mission-board");
  const { RewardShelf } = app.load("components/learning-hub/missions/reward-shelf");
  const { hubEndpoints: api } = app.load("lib/learning-hub/endpoints");
  const { missionsOverviewKey, rewardInventoryKey } = app.load("lib/learning-hub/mission-hooks");
  const key = missionsOverviewKey(app.account.id);
  render(MissionBoard);
  render(RewardShelf);
  app.responses.set(api.inventory, { peak_balance: 222, coupons: [] });
  app.responses.set(api.badges, { badges: [{
    id: "badge", name: "Chăm học", description: null, image_url: "/images/badge.png", earned: false, earned_at: null,
  }] });
  await app.revalidate(rewardInventoryKey(app.account.id));
  await app.revalidate([api.badges, app.account.id, "api"]);
  for (const status of [404, 501]) {
    app.failures.set(api.missions, httpError(status));
    await assert.rejects(app.revalidate(key));
    assert.match(render(MissionBoard), /Tính năng này đang được cập nhật/);
  }
  app.failures.set(api.missions, { isAxiosError: true });
  await assert.rejects(app.revalidate(key));
  assert.match(render(MissionBoard), /Không thể kết nối tới máy chủ/);
  assert.match(render(MissionBoard), /Thử lại/);
  const shelf = render(RewardShelf);
  assert.match(shelf, /Sắp có/);
  assert.match(shelf, /Chưa đạt/);
  assert.match(shelf, /\/images\/badge\.png/);
  assert.doesNotMatch(shelf, /Dữ liệu mẫu/);
  assert.equal(app.loaded("lib/learning-hub/missions-mock.ts"), false);
});

test("claim chưa triển khai giữ nhiệm vụ chờ nhận và không đổi XP", async () => {
  const app = testApp({ NODE_ENV: "production" });
  const { LiveTicket } = app.load("components/user/header/live-stats");
  const { hubEndpoints: api } = app.load("lib/learning-hub/endpoints");
  const { missionsOverviewKey, useMissionBoard } = app.load("lib/learning-hub/mission-hooks");
  const mission = {
    id: "mission", scope: "daily", status: "completed", expires_at: null,
  };
  app.responses.set(api.missions, {
    xp: { level: 7, current_xp: 140, required_xp: 150, total_xp: 437, peak_balance: 222 },
    daily: [mission], long_term: [], daily_resets_at: new Date(Date.now() + 60_000).toISOString(),
  });
  const error = httpError(501);
  app.failures.set(api.missionClaim(mission.id), error);
  render(LiveTicket);
  await app.revalidate(missionsOverviewKey(app.account.id));
  let board;
  const readBoard = () => { board = useMissionBoard(); return null; };
  render(readBoard);
  await board.claim(mission);
  render(readBoard);
  assert.equal(board.xp.level, 7);
  assert.equal(board.xp.peak_balance, 222);
  assert.equal(board.overview.data.daily[0].status, "completed");
  assert.equal(app.loaded("lib/learning-hub/missions-mock.ts"), false);
});
