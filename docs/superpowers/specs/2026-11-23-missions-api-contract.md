# Hợp đồng API: XP, nhiệm vụ hằng ngày, nhiệm vụ dài hạn (theo khóa)

Cả backend và frontend bám tài liệu này. Đường dẫn cuối cùng do backend quyết theo quy ước router hiện có (`studynest_be/app/api/v1/gamification/`); nếu khác bảng dưới đây, backend PHẢI cập nhật tài liệu này và nêu trong báo cáo. Đã chốt với chủ sản phẩm: XP và Coin đã nhận KHÔNG bị thu hồi khi hoàn tiền; mỗi khóa trong một đơn chỉ áp một mã giảm giá.

## Endpoints (yêu cầu xác thực DPoP như các API user khác)

Các đường dẫn bên dưới tính từ tiền tố `/api/v1`.
- `GET  /gamification/missions` → `MissionsOverview`
- `POST /gamification/missions/{mission_id}/claim` → `ClaimResult` (idempotent: gọi lại trả cùng kết quả, không cấp lần hai)
- `GET  /gamification/rewards/inventory` → `RewardInventory`

## Kiểu dữ liệu
```ts
type MissionScope = "daily" | "course";
type MissionTemplate =
  | "lesson.completed" | "quiz.completed" | "code.completed" | "daily_checkin.completed"   // hằng ngày
  | "chapter.complete" | "chapter.quiz_pass" | "course.complete" | "course.weekly_streak"; // dài hạn theo khóa
type MissionStatus = "assigned" | "in_progress" | "completed" | "claimed" | "expired";

interface MissionReward { xp: number; peak: number; coupon: null | { max_percent: number; valid_days: number; target: "next_course_or_combo" } }
interface Mission {
  id: string; scope: MissionScope; template: MissionTemplate;
  title: string; description: string;
  course: null | { id: string; title: string; thumbnail_url: string | null };
  section: null | { id: string; title: string; position: number };
  progress: { current: number; target: number };
  status: MissionStatus; reward: MissionReward;
  expires_at: string | null;      // hằng ngày: hết hạn lúc 24:00 giờ Việt Nam
  completed_at: string | null; claimed_at: string | null;
  href: string | null;            // deep link vào bài/chương/khóa để làm tiếp
}
interface XpState { level: number; current_xp: number; required_xp: number; total_xp: number; peak_balance: number }
interface MissionsOverview {
  xp: XpState;
  daily: Mission[];                // danh sách hằng ngày (luôn trả đủ, kể cả chưa có tiến độ)
  daily_resets_at: string;         // ISO, 00:00 ngày kế tiếp giờ Việt Nam
  long_term: Array<{ course: { id: string; title: string; thumbnail_url: string | null }; progress_percent: number; missions: Mission[] }>;
}
interface ClaimResult {
  mission: Mission;
  granted: { xp: number; peak: number; coupon: null | { id: string; code_masked: string; expires_at: string } };
  xp: XpState;
  level_up: null | { from: number; to: number; peak_bonus: number; rewards: Array<{ level: number; coins: number; items: ShopItem[] }> };
}
interface RewardInventory { peak_balance: number; coupons: Array<{ id: string; title: string; code_masked: string; max_percent: number; expires_at: string; status: "available" | "used" | "expired" | "revoked" }> }
```

## Quy tắc nghiệp vụ
1. **Hằng ngày**: mẫu có sẵn (hoàn thành 1 bài, 3 bài, bài thực hành, điểm danh…) cấu hình ở bảng nhiệm vụ, reset 00:00 giờ Việt Nam. GET luôn đảm bảo nhiệm vụ của hôm nay đã được gán (không đợi có sự kiện mới hiện ra).
2. **Dài hạn theo khóa, TỰ SINH, không ai phải ra đề**: khi mua khóa (và backfill cho khóa đã sở hữu) sinh từ cấu trúc khóa: mỗi chương `chapter.complete` (target = số bài của chương lúc sinh), `chapter.quiz_pass` cho chương có quiz (điểm ≥ ngưỡng cấu hình), một `course.complete`, một `course.weekly_streak`. Chương có 0 bài thì bỏ qua.
3. **Tiến độ tính từ nguồn sự thật phía server** (`LessonProgress`, `QuizAttempt`), tính lại idempotent khi có sự kiện và khi GET; không cộng dồn mù từ sự kiện lặp. Hoàn thành là đơn điệu (xong rồi không tụt dù giảng viên thêm bài sau). Chỉ tính khóa còn quyền truy cập (đã mua, chưa hoàn tiền).
4. **Nhận thưởng (`claim`)**: chỉ khi `completed`; sổ cái `reward_grants` ràng buộc duy nhất `(user_id, mission_id, reward_kind)`; an toàn khi gọi đồng thời; trả `level_up` nếu lên cấp, kèm số Coin và vật phẩm của từng cấp. Kiểu `ShopItem` và lịch thưởng xem trong hợp đồng Cấp độ và Cửa hàng Mây. Snapshot cũ có `level_up.rewards: []` khi phát lại. XP và Coin không thu hồi khi hoàn tiền.
5. **Mã giảm giá thưởng**: mô hình dữ liệu và `inventory` có sẵn, nhưng việc CẤP mã nằm sau cờ cấu hình `MISSION_COUPON_REWARDS_ENABLED` (mặc định tắt) cho đến khi đối soát tiền theo luật "mã admin trừ hoa hồng nền tảng, tối đa 0,5×platform_fee×giá" được sửa và kiểm thử (xem mục 4b của bản thiết kế). Khi tắt, `reward.coupon` luôn `null`.
6. Cấp độ: `LevelsConfig`; seed mở rộng đến cấp 20; từ cấp 21 dùng `1700 + (L − 20) × 50` XP để đạt cấp `L`.

## Chi tiết mặc định của backend

- Điểm qua trắc nghiệm chương là 70%. Chỉ cần một lượt làm bài do server chấm đạt ngưỡng. Ngưỡng được chụp tại thời điểm gán.
- Nhiệm vụ học đều hoàn thành một lần mỗi khóa sau khi học ít nhất 3 ngày khác nhau trong cùng tuần (thứ Hai đến Chủ nhật theo giờ Việt Nam). Hoàn thành bài, nộp trắc nghiệm hoặc lưu bài thực hành đã vượt kiểm thử đều tính là hoạt động học.
- Nhiệm vụ ngày hết hạn nhận thưởng tại mốc reset. Một lượt nhận thành công được trả lại nguyên kết quả khi gọi lại, kể cả khi đã qua ngày mới.
- GET bổ sung nhiệm vụ còn thiếu cho quyền ghi danh đang hoạt động. Mẫu bị tắt dừng gán mới. Các mục đã gán giữ cấu hình tại thời điểm gán.
