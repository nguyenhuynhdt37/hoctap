# Hợp đồng: Cấp độ vô hạn, phần thưởng theo cấp, Cửa hàng Mây (đổi Peak lấy vật phẩm)

Bổ sung cho `2026-11-23-missions-api-contract.md` và `2026-11-23-learning-hub-api-contract.md`. Tiền tố `/api/v1`, xác thực DPoP, lỗi tiếng Việt. Đơn vị tiền tệ trong game: giao diện và mọi chữ người dùng nhìn thấy gọi là **"Coin"** (KHÔNG hiển thị chữ "Peak"). Về kỹ thuật vẫn dùng ví/sổ giao dịch Peak đang có và giữ nguyên tên trường (`peak_balance`, `peak`, `peak_bonus`, `UserPeakBalances`…) để không phá hợp đồng; chủ sản phẩm yêu cầu đổi tên hiển thị thành Coin. Mọi chuỗi hiển thị cho người dùng (thông báo lỗi, tên/mô tả vật phẩm, mô tả thưởng, văn bản trong API) viết "Coin". Chủ sản phẩm đã chốt: lên cấp KHÔNG có trần, MỌI cấp đều có thưởng, cấp chia hết cho 10 là cột mốc lớn, dùng Coin đổi khung avatar, danh hiệu, v.v. XP/Peak đã nhận không thu hồi khi hoàn tiền.

## Quy tắc cấp độ và thưởng (backend quyết định, deterministic, không phụ thuộc bảng cấu hình)
- XP cần để lên cấp L: giữ nguyên `levels_config` cho L ≤ 20 (thực tế DB: 100,200,300,500,750,1000,1100…1700). Với L > 20: `xp_required(L) = 1700 + (L − 20) × 50` (thay công thức dự phòng cũ `(L+1)*100` gây cú nhảy 1700→2100). Không có cấp tối đa.
- Thưởng khi đạt cấp L ≥ 2 (hàm thuần `level_reward(L)`, dùng chung cho mọi cấp, ưu tiên hàng cấu hình nếu có trong `levels_config.rewards_config` cho L ≤ 20 để không đổi thưởng đã seed; phần vật phẩm luôn từ hàm này):
  - Mọi cấp: `coins = min(25 × (L − 1), 500)` (cấp > 21 giữ 500).
  - Cấp chia hết cho 5 (không chia hết cho 10): thêm `bonus = L × 20` Coin và 1 vật phẩm thường/hiếm (khung hoặc danh hiệu theo bậc của cấp).
  - Cấp chia hết cho 10 (cột mốc lớn): thêm `bonus = L × 50` Coin, 1 khung avatar độc quyền của cột mốc, 1 danh hiệu độc quyền, 1 biểu tượng (emblem); và (phía sau cờ `LEVEL_COUPON_REWARDS_ENABLED`, mặc định TẮT) một mã giảm giá cho khóa/combo kế tiếp theo luật chi phí đã chốt (mã nền tảng trừ hoa hồng nền tảng, trần 0,5 × platform_fee × giá).
- Vật phẩm cột mốc là đặc quyền theo cấp (`unlock_level`), KHÔNG mua được bằng Coin; vật phẩm trong cửa hàng mua bằng Peak.
- Việc cấp thưởng khi lên cấp đi qua sổ cái idempotent `reward_grants` (khóa duy nhất user + loại + cấp), an toàn khi gọi đồng thời, lên nhiều cấp một lần thì cấp đủ thưởng từng cấp. Có backfill khi GET cho người dùng đã vượt cấp trước khi tính năng này có (cấp thiếu thưởng thì bù, idempotent).

## Cửa hàng và kho đồ
Loại vật phẩm: `avatar_frame` (khung avatar), `title` (danh hiệu), `emblem` (biểu tượng hiển thị cạnh tên). Độ hiếm: `common|rare|epic|legendary`. Hình ảnh KHÔNG lưu ảnh raster: mỗi vật phẩm có `asset.key` (khóa trong bộ vẽ CSS/SVG của frontend) và tùy chọn `asset.palette` (danh sách token màu). Tên/mô tả bằng tiếng Việt.
Giá tham khảo (đơn vị Coin): common 100–300, rare 600–1.200, epic 2.000–3.500, legendary 5.000+. Hằng số có thể chỉnh. Catalog ban đầu (seed trong migration, idempotent `ON CONFLICT DO NOTHING`) khoảng 24–30 vật phẩm: nhiều khung (viền gradient trời, viền đám mây, vòng cực quang, vòng mặt trăng, nguyệt quế vàng…), danh hiệu, emblem, cộng các vật phẩm đặc quyền cột mốc cấp 10/20/30/40/50 và vật phẩm mốc cấp 5/15/25… Đừng dùng hình ngôi sao nhấp nháy dạng "sparkle" trong tên/mô tả asset.

## Endpoints
- `GET  /gamification/levels?from=&count=` → `LevelsOverview`
- `GET  /gamification/shop/items?kind=` → `{ balance:number, items: ShopItem[] }`
- `POST /gamification/shop/items/{item_id}/purchase` body `{ idempotency_key }` → `{ item: ShopItem, balance:number }` (atomic: khóa dòng số dư Peak, kiểm quyền sở hữu/độ hiếm/`unlock_level`, trừ Coin, ghi `PeakTransactions`, cấp vật phẩm trong MỘT giao dịch; trả lỗi rõ khi thiếu Coin/đã sở hữu/chưa đủ cấp; gọi lại cùng `idempotency_key` trả cùng kết quả, không trừ hai lần)
- `GET  /gamification/inventory` → `{ items: ShopItem[], equipment: Equipment, balance:number }`
- `PUT  /gamification/equipment` body `{ slot: "avatar_frame"|"title"|"emblem", item_id: string|null }` → `Equipment` (chỉ trang bị đồ mình sở hữu, đúng loại ô)
- `POST /gamification/missions/{mission_id}/claim` (đã có) → `level_up` bổ sung `rewards`.
- Người dùng khác nhìn thấy khung/danh hiệu của một người: `GET` hồ sơ công khai và payload `/auth/me` có thêm `equipment` (frontend dùng hiển thị header, hero, hồ sơ). Nếu việc sửa schema hồ sơ rộng thì chỉ làm `/auth/me` và hồ sơ công khai `GET /user/profile/{id}` (tìm đúng route), ghi rõ trong báo cáo.
```ts
type ItemKind = "avatar_frame"|"title"|"emblem"; type Rarity = "common"|"rare"|"epic"|"legendary";
interface ShopItem { id:string; key:string; kind:ItemKind; name:string; description:string; rarity:Rarity;
  price:number|null;            // null = không bán, chỉ nhận theo cấp
  unlock_level:number|null; owned:boolean; equipped:boolean; purchasable:boolean; reason:string|null; // lý do không mua được
  source:"shop"|"level_reward"; asset:{ key:string; palette:string[]|null } }
interface Equipment { avatar_frame:ShopItem|null; title:ShopItem|null; emblem:ShopItem|null }
interface LevelReward { level:number; xp_required:number; coins:number; milestone:"none"|"five"|"ten"; items:ShopItem[]; coupon:null|{max_percent:number; valid_days:number}; reached:boolean; granted:boolean }
interface LevelsOverview { current:{ level:number; current_xp:number; required_xp:number; total_xp:number; peak_balance:number }; max_level:null; rewards: LevelReward[] } // cửa sổ [from, from+count), mặc định từ cấp hiện tại − 2, count 12 (tối đa 50); luôn kèm cột mốc x0 kế tiếp
interface ClaimLevelUp { from:number; to:number; peak_bonus:number; rewards: Array<{level:number; coins:number; items:ShopItem[]}> }
```
