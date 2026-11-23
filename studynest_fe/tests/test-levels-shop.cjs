const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const src = path.resolve(__dirname, "../src");

function createLoader(stubs = {}) {
  const modules = new Map();

  function load(resolved) {
    const filename = [resolved, `${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, "index.ts")]
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert.ok(filename, `Không tìm thấy mô-đun ${resolved}`);
    if (modules.has(filename)) return modules.get(filename).exports;

    const module = { exports: {} };
    modules.set(filename, module);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      },
      fileName: filename,
    });
    new Function("module", "exports", "require", outputText)(module, module.exports, (specifier) => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.startsWith("@/")) return load(path.join(src, specifier.slice(2)));
      if (specifier.startsWith(".")) return load(path.resolve(path.dirname(filename), specifier));
      return require(specifier);
    });
    return module.exports;
  }

  return (name) => load(path.join(src, name));
}

const load = createLoader();
const logic = load("lib/learning-hub/shop-logic");

const frame = {
  id: "frame-1", key: "frame_sky", kind: "avatar_frame", name: "Viền trời trong",
  description: "", rarity: "common", price: 1200, unlock_level: null,
  owned: false, equipped: false, purchasable: true, reason: null,
  source: "shop", asset: { key: "frame_sky", palette: null },
};

test("registry vẽ khung, biểu tượng và danh hiệu dự phòng cho khóa mới", () => {
  const {
    frameArt, emblemArt, titleArt, resolveFrameArt, resolveEmblemArt, resolveTitleArt,
    FramedAvatar, EmblemIcon, TitleBadge, RarityBadge,
  } = load("components/learning-hub/shop/item-art");
  assert.ok(Object.keys(frameArt).length >= 12);
  assert.ok(Object.keys(emblemArt).length >= 6);
  assert.equal(resolveFrameArt("frame_moon"), frameArt.frame_moon);
  assert.equal(resolveEmblemArt("emblem_cloud"), emblemArt.emblem_cloud);
  assert.equal(resolveTitleArt("title_wind"), titleArt.title_wind);
  assert.equal(resolveFrameArt("__proto__"), resolveFrameArt("future_frame"));
  assert.equal(resolveEmblemArt("constructor"), resolveEmblemArt("future_emblem"));
  assert.notEqual(resolveTitleArt("future_title"), titleArt.title_wind);

  const unknown = { ...frame, asset: { key: "future_item", palette: null }, rarity: "legendary" };
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  assert.match(render(FramedAvatar, { equipment: { avatar_frame: unknown }, name: "Học viên" }), /<linearGradient.*stroke-dasharray/);
  assert.match(render(EmblemIcon, { item: unknown }), /role="img".*M19 15h26/);
  assert.match(render(TitleBadge, { item: unknown }), /Viền trời trong/);
  for (const [rarity, label] of [["common", "Phổ thông"], ["rare", "Hiếm"], ["epic", "Sử thi"], ["legendary", "Huyền thoại"]]) {
    assert.ok(render(RarityBadge, { rarity }).includes(label));
  }
});

test("Coin dùng định dạng Việt Nam và lỗi từ hợp đồng hiển thị đúng tên tiền", () => {
  const { hubErrorMessage } = load("lib/learning-hub/errors");
  const error = (status, detail) => ({ isAxiosError: true, response: { status, data: { detail } } });
  assert.equal(logic.formatCoin(0), "0 Coin");
  assert.equal(logic.formatCoin(1234567), "1.234.567 Coin");
  assert.equal(hubErrorMessage(error(409, "Không đủ Peak."), ""), "Không đủ Coin.");
  for (const status of [404, 501]) {
    assert.equal(hubErrorMessage(error(status), ""), "Tính năng này đang được cập nhật");
  }
});

test("chỉ đổi vật phẩm khi đáp ứng quyền mua, giá và số dư", () => {
  const { shopItemState, emptyEquipment } = logic;
  assert.equal(shopItemState(frame, frame.price).kind, "available");
  assert.deepEqual(shopItemState(frame, 0), {
    kind: "blocked", label: "Chưa đủ Coin", reason: "Cần thêm 1.200 Coin để đổi.",
  });
  assert.deepEqual(shopItemState({ ...frame, purchasable: false, reason: "Cửa hàng đang nghỉ." }, 1200), {
    kind: "blocked", label: "Chưa thể đổi", reason: "Cửa hàng đang nghỉ.",
  });
  assert.deepEqual(shopItemState({ ...frame, purchasable: false, reason: "Bạn thiếu Peak." }, 1000), {
    kind: "blocked", label: "Chưa đủ Coin", reason: "Bạn thiếu Coin.",
  });
  assert.deepEqual(shopItemState({ ...frame, price: null, unlock_level: 20, reason: "Quà đảo mây." }, 9000), {
    kind: "locked", label: "Mở ở cấp 20", reason: "Quà đảo mây.",
  });
  assert.equal(shopItemState({ ...frame, price: null }).kind, "blocked");
  assert.equal(shopItemState({ ...frame, owned: true, equipped: true }, 0, emptyEquipment).kind, "owned");
  assert.equal(shopItemState({ ...frame, owned: true }, 0, { ...emptyEquipment, avatar_frame: frame }).kind, "equipped");
});

test("cửa sổ cấp giữ mốc bổ sung, không nhảy qua cấp và không lặp mốc", () => {
  const { initialLevelFrom, levelPageSize, mergeLevelRewards, nextLevelFrom, nextMilestone } = logic;
  assert.equal(initialLevelFrom(1), 1);
  assert.equal(initialLevelFrom(10), 8);
  assert.equal(nextMilestone(9), 10);
  assert.equal(nextMilestone(10), 20);
  assert.equal(nextMilestone(2800), 2810);
  assert.equal(nextLevelFrom(10), 20);
  assert.equal(nextLevelFrom(11, 20), 20 + levelPageSize);

  const firstPage = [...Array.from({ length: levelPageSize }, (_, i) => ({ level: 8 + i })), { level: 20 }];
  const nextPage = [{ level: 20, coins: 1475 }, { level: 21 }];
  const result = mergeLevelRewards([{ rewards: firstPage }, { rewards: nextPage }]);
  assert.deepEqual(result.map(({ level }) => level), Array.from({ length: 14 }, (_, index) => index + 8));
  assert.equal(result.find(({ level }) => level === 20).coins, 1475);
});

test("một lượt xác nhận giữ mã khi thử lại và lượt mới nhận mã mới", async () => {
  const values = ["key-first", "key-next"];
  const createKey = () => values.shift();
  const calls = [];
  async function purchase(id, key) {
    calls.push([id, key]);
    if (calls.length === 1) throw new Error("Mất kết nối");
    return { balance: 3 };
  }
  const confirmation = logic.createPurchaseConfirmation(frame.id, createKey);
  await assert.rejects(confirmation.submit(purchase), /Mất kết nối/);
  await confirmation.submit(purchase);
  await logic.createPurchaseConfirmation(frame.id, createKey).submit(purchase);
  assert.deepEqual(calls, [[frame.id, "key-first"], [frame.id, "key-first"], [frame.id, "key-next"]]);
  let actualKey;
  await logic.createPurchaseConfirmation(frame.id).submit(async (_, key) => { actualKey = key; });
  assert.match(actualKey, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("client dùng đúng đường dẫn, bộ lọc, khóa đổi và payload gỡ vật phẩm", async () => {
  const requests = [];
  const record = (method) => async (route, payload) => {
    requests.push([method, route, payload]);
    return { data: {} };
  };
  const apiLoad = createLoader({ "@/lib/utils/fetcher/client/axios": {
    get: record("GET"), post: record("POST"), put: record("PUT"),
  } });
  const { apiShopClient: api } = apiLoad("lib/learning-hub/shop-api");
  await api.getLevels({ from: 20, count: 12 });
  await api.getItems("emblem");
  await api.purchase("frame/1", "uuid");
  await api.getInventory();
  await api.setEquipment("avatar_frame", null);
  assert.deepEqual(requests, [
    ["GET", "/gamification/levels", { params: { from: 20, count: 12 } }],
    ["GET", "/gamification/shop/items", { params: { kind: "emblem" } }],
    ["POST", "/gamification/shop/items/frame%2F1/purchase", { idempotency_key: "uuid" }],
    ["GET", "/gamification/inventory", undefined],
    ["PUT", "/gamification/equipment", { slot: "avatar_frame", item_id: null }],
  ]);
});

test("dữ liệu mẫu chia sẻ Coin, chỉ trừ một lần và đồng bộ món đang dùng", async () => {
  const { getMockShopAccount } = load("lib/learning-hub/shop-mock");
  const { getMockMissionsClient } = load("lib/learning-hub/missions-mock");
  const account = "mock-levels-shop";
  const { client: shop } = getMockShopAccount(account);
  const missions = getMockMissionsClient(account);
  const before = await shop.getInventory();
  const { items } = await shop.getItems("emblem");
  const item = items.find(({ purchasable }) => purchasable);
  const bought = await shop.purchase(item.id, "same-key");
  assert.deepEqual(await shop.purchase(item.id, "same-key"), bought);
  assert.equal((await missions.getOverview()).xp.peak_balance, before.balance - item.price);
  assert.equal((await shop.setEquipment(item.kind, item.id))[item.kind].id, item.id);
  assert.equal((await shop.getInventory()).items.find(({ id }) => id === item.id).equipped, true);
  assert.equal((await shop.setEquipment(item.kind, null))[item.kind], null);

  const mission = (await missions.getOverview()).daily.find(({ status }) => status === "completed");
  const claim = await missions.claim(mission.id);
  assert.deepEqual(claim.level_up.rewards.map(({ level }) => level), [4]);
  assert.equal((await shop.getLevels()).current.peak_balance, claim.xp.peak_balance);
});
