# Hợp đồng: Cấp độ vô hạn, phần thưởng theo cấp, Cửa hàng Mây (đổi Coin lấy vật phẩm)

Bổ sung cho `2026-11-23-missions-api-contract.md` và `2026-11-23-learning-hub-api-contract.md`. Tiền tố `/api/v1`, xác thực DPoP, lỗi tiếng Việt. Đơn vị tiền tệ trong game: giao diện và mọi chữ người dùng nhìn thấy gọi là **"Coin"** (KHÔNG hiển thị chữ "Peak"). Về kỹ thuật vẫn dùng ví/sổ giao dịch Peak đang có và giữ nguyên tên trường (`peak_balance`, `peak`, `peak_bonus`, `UserPeakBalances`…) để không phá hợp đồng; chủ sản phẩm yêu cầu đổi tên hiển thị thành Coin. Mọi chuỗi hiển thị cho người dùng (thông báo lỗi, tên/mô tả vật phẩm, mô tả thưởng, văn bản trong API) viết "Coin". Chủ sản phẩm đã chốt: lên cấp KHÔNG có trần, MỌI cấp đều có thưởng, cấp chia hết cho 10 là cột mốc lớn, dùng Coin đổi khung avatar, danh hiệu, v.v. XP và Coin đã nhận không thu hồi khi hoàn tiền.

## Quy tắc cấp độ và thưởng (backend quyết định, deterministic, không phụ thuộc bảng cấu hình)
- XP cần để lên cấp L: giữ nguyên `levels_config` cho L ≤ 20 (thực tế DB: 100,200,300,500,750,1000,1100…1700). Với L > 20: `xp_required(L) = 1700 + (L − 20) × 50` (thay công thức dự phòng cũ `(L+1)*100` gây cú nhảy 1700→2100). Không có cấp tối đa.
- Thưởng khi đạt cấp L ≥ 2 (hàm thuần `level_reward(L)`, dùng chung cho mọi cấp, ưu tiên hàng cấu hình nếu có trong `levels_config.rewards_config` cho L ≤ 20 để không đổi thưởng đã seed; phần vật phẩm luôn từ hàm này):
  - Mọi cấp: `coins = min(25 × (L − 1), 500)` (cấp > 21 giữ 500).
  - Cấp chia hết cho 5 (không chia hết cho 10): thêm `bonus = L × 20` Coin và 1 vật phẩm thường/hiếm (khung hoặc danh hiệu theo bậc của cấp).
  - Cấp chia hết cho 10 (cột mốc lớn): thêm `bonus = L × 50` Coin, 1 khung avatar độc quyền, 1 danh hiệu độc quyền và 1 biểu tượng. Cờ `LEVEL_COUPON_REWARDS_ENABLED` mặc định tắt. Khi bật, API lịch thưởng chỉ hiển thị mức ưu đãi dự kiến tối đa `floor(50 × platform_fee)` phần trăm, thời hạn dự kiến 30 ngày. Phát và dùng mã giảm giá cho khóa/combo cần tích hợp checkout riêng để áp trần `0,5 × platform_fee × giá` theo phí lúc mua và chỉ trừ phần hoa hồng nền tảng.
- Vật phẩm cột mốc là đặc quyền theo cấp (`unlock_level`), KHÔNG mua được bằng Coin; vật phẩm trong cửa hàng mua bằng Coin.
- Việc cấp thưởng khi lên cấp đi qua sổ cái idempotent `reward_grants` (khóa duy nhất user + loại + cấp), an toàn khi gọi đồng thời, lên nhiều cấp một lần thì cấp đủ thưởng từng cấp. GET cấp độ, cửa hàng, kho đồ, hồ sơ gamification, nhiệm vụ, kho mã thưởng và `/auth/me` bù phần thưởng thiếu từ các cấp đã đạt. Đối với lượt nhận cũ đã ghi Coin lên cấp gộp, backend dùng khoảng cấp trong sổ XP để nhận diện các cấp đã thanh toán theo cấu hình và chỉ bù vật phẩm còn thiếu. Hồ sơ công khai đọc trang bị hiện tại.

## Cửa hàng và kho đồ
Loại vật phẩm: `avatar_frame` (khung avatar), `title` (danh hiệu), `emblem` (biểu tượng hiển thị cạnh tên). Độ hiếm: `common|rare|epic|legendary`. Hình ảnh KHÔNG lưu ảnh raster: mỗi vật phẩm có `asset.key` (khóa trong bộ vẽ CSS/SVG của frontend) và tùy chọn `asset.palette` (danh sách token màu). Tên/mô tả bằng tiếng Việt.
Giá tham khảo (đơn vị Coin): common 100–300, rare 600–1.200, epic 2.000–3.500, legendary 5.000+. Hằng số có thể chỉnh. Catalog ban đầu (seed trong migration, idempotent `ON CONFLICT DO NOTHING`) khoảng 24–30 vật phẩm: nhiều khung (viền gradient trời, viền đám mây, vòng cực quang, vòng mặt trăng, nguyệt quế vàng…), danh hiệu, emblem, cộng các vật phẩm đặc quyền cột mốc cấp 10/20/30/40/50 và vật phẩm mốc cấp 5/15/25… Đừng dùng hình ngôi sao nhấp nháy dạng "sparkle" trong tên/mô tả asset.

## Endpoints
- `GET  /gamification/levels?from=&count=` → `LevelsOverview`
- `GET  /gamification/shop/items?kind=` → `{ balance:number, items: ShopItem[] }`
- `POST /gamification/shop/items/{item_id}/purchase` body `{ idempotency_key }` → `{ item: ShopItem, balance:number }` (atomic: khóa dòng số dư Coin, kiểm quyền sở hữu/độ hiếm/`unlock_level`, trừ Coin, ghi `PeakTransactions`, cấp vật phẩm trong MỘT giao dịch; trả lỗi rõ khi thiếu Coin/đã sở hữu/chưa đủ cấp; gọi lại cùng `idempotency_key` cho cùng vật phẩm trả đúng snapshot lần mua đầu. Dùng lại khóa cho vật phẩm khác trả 409. Thiếu Coin trả 402. Giới hạn 30 yêu cầu mua/phút mỗi người dùng khi Redis khả dụng.)
- `GET  /gamification/inventory` → `{ items: ShopItem[], equipment: Equipment, balance:number }`
- `PUT  /gamification/equipment` body `{ slot: "avatar_frame"|"title"|"emblem", item_id: string|null }` → `Equipment` (chỉ trang bị đồ mình sở hữu, đúng loại ô)
- `POST /gamification/missions/{mission_id}/claim` (đã có) → `level_up` bổ sung `rewards`.
- Người dùng khác nhìn thấy khung/danh hiệu của một người: `GET` hồ sơ công khai và payload `/auth/me` có thêm `equipment` (frontend dùng hiển thị header, hero, hồ sơ). Đường dẫn hồ sơ công khai hiện có là `GET /profile/{user_id}`.
```ts
type ItemKind = "avatar_frame"|"title"|"emblem"; type Rarity = "common"|"rare"|"epic"|"legendary";
interface ShopItem { id:string; key:string; kind:ItemKind; name:string; description:string; rarity:Rarity;
  price:number|null;            // null = không bán, chỉ nhận theo cấp
  unlock_level:number|null; owned:boolean; equipped:boolean; purchasable:boolean; reason:string|null; // lý do không mua được
  source:"shop"|"level_reward"; asset:{ key:string; palette:string[]|null } }
interface Equipment { avatar_frame:ShopItem|null; title:ShopItem|null; emblem:ShopItem|null }
interface LevelReward { level:number; xp_required:number; coins:number; milestone:"none"|"five"|"ten"; items:ShopItem[]; coupon:null|{max_percent:number; valid_days:number}; reached:boolean; granted:boolean }
interface LevelsOverview { current:{ level:number; current_xp:number; required_xp:number; total_xp:number; peak_balance:number }; max_level:null; rewards: LevelReward[] } // cửa sổ [from, from+count), mặc định từ cấp hiện tại − 2, count 12 (tối đa 50); luôn kèm cột mốc chia hết cho 10 ngay sau cấp hiện tại, sắp tăng dần và không lặp
interface ClaimLevelUp { from:number; to:number; peak_bonus:number; rewards: Array<{level:number; coins:number; items:ShopItem[]}> }
```


## Catalog seed và lịch thưởng

Giá và điều kiện mua qua Coin áp dụng cho tám vật phẩm dưới đây. Các vật phẩm theo cấp được cấp tự động vào kho.

| Vật phẩm | Ô | Độ hiếm | Giá Coin | Cấp mở |
| --- | --- | --- | ---: | ---: |
| Viền Trời Trong | Khung | Thường | 180 | — |
| Viền Mây Ôm | Khung | Thường | 280 | — |
| Vòng Cực Quang | Khung | Hiếm | 1.000 | — |
| Vòng Ánh Trăng | Khung | Sử thi | 2.400 | 10 |
| Nguyệt Quế Vàng | Khung | Huyền thoại | 5.200 | 20 |
| Người Gieo Chữ | Danh hiệu | Thường | 150 | — |
| Người Dệt Mây | Danh hiệu | Hiếm | 750 | — |
| Gió Lam | Biểu tượng | Sử thi | 2.100 | 15 |

| Cấp | XP để đạt cấp | Coin theo seed hoặc công thức | Vật phẩm |
| ---: | ---: | ---: | --- |
| 1 | 0 | 0 | — |
| 2 | 100 | 25 | — |
| 3 | 200 | 50 | — |
| 4 | 300 | 75 | — |
| 5 | 500 | 100 | Danh hiệu Bạn Của Mây |
| 6 | 750 | 125 | — |
| 7 | 1.000 | 150 | — |
| 8 | 1.100 | 175 | — |
| 9 | 1.150 | 200 | — |
| 10 | 1.200 | 225 | Bộ Bình Minh |
| 11 | 1.250 | 250 | — |
| 12 | 1.300 | 275 | — |
| 15 | 1.450 | 350 | Danh hiệu Người Đón Gió |
| 20 | 1.700 | 475 | Bộ Trăng Non |
| 25 | 1.950 | 1.000 | Danh hiệu Bạn Của Trăng |
| 30 | 2.200 | 2.000 | Bộ Cực Quang |
| 35 | 2.450 | 1.200 | Danh hiệu Người Dẫn Mây |
| 40 | 2.700 | 2.500 | Bộ Nguyệt Quế |
| 45 | 2.950 | 1.400 | Danh hiệu Người Giữ Trời |
| 50 | 3.200 | 3.000 | Bộ Chân Trời |

Mỗi bộ gồm khung, danh hiệu và biểu tượng. Migration seed 28 vật phẩm. Từ cấp 55, các vật phẩm mốc tiếp theo có định danh ổn định và được ghi vào catalog khi cấp lần đầu.
