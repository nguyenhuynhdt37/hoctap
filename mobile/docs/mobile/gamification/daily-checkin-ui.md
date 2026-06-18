# Module UI 01 – Daily Check-in (React Native)

## 1. Tổng quan

Giao diện **Daily Check-in** cho mobile app HocTap. Hiển thị trực tiếp trên màn hình Home dưới dạng widget compact, mở Bottom Sheet chi tiết khi nhấn, và hiện Reward Popup khi nhận thưởng thành công.

**Công nghệ:**
- `react-native-reanimated` 4.x – tất cả animation
- `moti` shim (đã được thay bằng Reanimated thuần để tương thích RN 0.81)
- `expo-haptics` – feedback xúc giác
- `react-native-confetti-cannon` – confetti khi check-in thành công
- `@tanstack/react-query` – data fetching + cache
- `nativewind` + `tailwindcss` – styling

---

## 2. Cây thư mục

```
mobile/
├── src/services/
│   └── checkin.service.ts           ← Real API calls (GET/POST /gamification/checkin)
│
└── components/features/gamification/
    ├── tokens.ts                    ← Design System tokens (color, radius, shadow, motion, typography)
    │
    └── daily-checkin/
        ├── index.ts                 ← Barrel export
        ├── types.ts                 ← TypeScript types (mirrors backend DTOs)
        ├── mockData.ts              ← Mock data (không dùng nữa – dùng real API)
        ├── useDailyCheckin.ts       ← Hook: useQuery + useMutation
        ├── DailyCheckinCard.tsx     ← Widget chính trên Home
        │
        └── components/
            ├── CalendarDay.tsx      ← Ô ngày (checked/today/mystery/locked)
            ├── RewardBadge.tsx      ← Badge phần thưởng + StreakBadge
            ├── PeakAnimation.tsx    ← Coin bay + PeakCounter bounce
            ├── CheckinBottomSheet.tsx ← Bottom sheet chi tiết
            ├── RewardPopup.tsx      ← Modal thành công (confetti)
            ├── LoadingSkeleton.tsx  ← Shimmer skeleton (widget + sheet)
            └── EmptyErrorState.tsx  ← EmptyState + ErrorState
```

---

## 3. Component Tree

```
HomeFeature
└── DailyCheckinCard                   ← Widget compact (Home)
    ├── MiniCalendar                   ← 7 dots mini calendar strip
    ├── CheckinBottomSheet             ← Slide-up sheet (Reanimated)
    │   ├── StreakBadge (x2)           ← Streak hiện tại / cao nhất
    │   ├── PeakCounter                ← Số dư Peak với bounce
    │   ├── CalendarDay (x7)           ← Lưới ngày staggered entry
    │   ├── RewardBadge (today/next)   ← Phần thưởng hôm nay / mai
    │   └── CTA Button                 ← Nhận thưởng / Đã điểm danh
    └── RewardPopup                    ← Modal thành công
        ├── CheckCircle animation      ← Scale bounce + ring pulse
        ├── RewardBadge (lg)           ← Phần thưởng vừa nhận
        ├── Streak / Balance cards     ← Stats sau check-in
        ├── ConfettiCannon             ← 120 confetti particles
        └── Close Button
```

---

## 4. Danh sách Component

| Component | File | Tái sử dụng | Mô tả |
|-----------|------|-------------|-------|
| `DailyCheckinCard` | `DailyCheckinCard.tsx` | Home | Widget compact trên trang chủ |
| `CheckinBottomSheet` | `CheckinBottomSheet.tsx` | Daily Check-in | Bottom sheet chi tiết (slide-up Reanimated) |
| `CalendarDay` | `CalendarDay.tsx` | Mission, Achievement | Ô ngày với 4 trạng thái |
| `RewardBadge` | `RewardBadge.tsx` | Mission, Reward Shop | Badge phần thưởng (sm/md/lg) |
| `StreakBadge` | `RewardBadge.tsx` | Streak module | Badge streak với bounce |
| `PeakAnimation` | `PeakAnimation.tsx` | Reward Shop | Coin bay + label popup |
| `PeakCounter` | `PeakAnimation.tsx` | Wallet, Home | Counter với bounce khi thay đổi |
| `RewardPopup` | `RewardPopup.tsx` | Mission, Achievement | Modal thành công + confetti |
| `DailyCheckinWidgetSkeleton` | `LoadingSkeleton.tsx` | — | Shimmer skeleton widget |
| `DailyCheckinSheetSkeleton` | `LoadingSkeleton.tsx` | — | Shimmer skeleton sheet |
| `EmptyState` | `EmptyErrorState.tsx` | Gamification modules | Không có sự kiện |
| `ErrorState` | `EmptyErrorState.tsx` | Gamification modules | Lỗi mạng + nút retry |

---

## 5. Animation sử dụng

| Khu vực | Animation | Library | Chi tiết |
|---------|-----------|---------|---------|
| Widget card | Scale press | Reanimated spring | `damping: 18, stiffness: 280` |
| Widget entry | Fade + translateY | Reanimated timing + spring | 400ms fade, spring slide-up |
| Bottom sheet | Slide-up | Reanimated spring + timing | `damping: 26, stiffness: 220` |
| Backdrop | Fade in/out | Reanimated timing | 280ms |
| CalendarDay | Scale bounce (staggered) | Reanimated spring | delay = `index * 60ms` |
| CalendarDay "today" | Pulse | Reanimated repeat sequence | 900ms inhale/exhale |
| LoadingSkeleton | Shimmer opacity | Reanimated repeat | 750ms ↑↓ cycle |
| CheckCircle | Scale bounce + ring expand | Reanimated spring + sequence | Ring fade out |
| RewardBadge | Scale spring entry | Reanimated spring | `damping: 14, stiffness: 220` |
| StreakBadge | Number bounce | Reanimated sequence | Triggers on streak change |
| FlyingCoins | translateX/Y + scale + opacity | Reanimated spring + sequence | 5 coins, staggered 90ms |
| PeakCounter | Scale bounce | Reanimated sequence | Triggers on value change |
| RewardPopup | Translate + opacity | Reanimated spring + withDelay | Card slides up 80ms later |
| Confetti | Particle explosion | ConfettiCannon | 120 particles, 350ms delay |
| Haptic | Selection / Impact / Notification | expo-haptics | Press, claim, success |
| ErrorState | Shake | Reanimated sequence | 5-step shake on mount |
| EmptyState | Float | Reanimated repeat timing | -6px float loop |

---

## 6. API Integration

### Service: [`checkin.service.ts`](file:///Users/huynh/codes/hoctap/mobile/src/services/checkin.service.ts)

```typescript
// GET /api/v1/gamification/checkin
checkinService.getStatus() → Promise<CheckinStatusResponse>

// POST /api/v1/gamification/checkin  
checkinService.claim()    → Promise<CheckinClaimResponse>
```

Sử dụng `axios` instance có sẵn với:
- Auto-attach `Bearer` token
- Auto-refresh `401` token
- Debug logging trong DEV mode

### Hook: [`useDailyCheckin.ts`](file:///Users/huynh/codes/hoctap/mobile/components/features/gamification/daily-checkin/useDailyCheckin.ts)

```typescript
const { status, claimState, isLoading, isError, claimResult, claim, refresh } = useDailyCheckin()
```

| State | Mô tả |
|-------|-------|
| `status` | `CheckinStatusResponse` từ server (cached 5 phút) |
| `claimState` | `'idle' \| 'loading' \| 'success' \| 'already_claimed' \| 'error'` |
| `claimResult` | Response sau khi claim thành công |
| `claim()` | Gọi POST + cập nhật cache optimistically |
| `refresh()` | Force refetch từ server |

**Error handling:**
- `409 ALREADY_CHECKED_IN` → `claimState = 'already_claimed'` (không show error)
- Mọi lỗi khác → `claimState = 'error'`

---

## 7. Design System Tokens

File: [`tokens.ts`](file:///Users/huynh/codes/hoctap/mobile/components/features/gamification/tokens.ts)

| Token group | Mục đích |
|-------------|---------|
| `GamificationColors` | Emerald palette, peak gold, streak orange, state colors |
| `GamificationRadius` | xs(8) → 3xl(40) → full |
| `GamificationShadow` | sm, md, peak, glow presets |
| `GamificationMotion` | Spring presets: press, enter, bounce, slide |
| `GamificationTypography` | label, body, title, number, peak styles |

---

## 8. Trạng thái CalendarDay

| Status | Màu | Icon | Điều kiện |
|--------|-----|------|-----------|
| `checked` | Xanh emerald + glow | ✓ | `is_checked = true` |
| `today` | Xanh nhạt + border + pulse | ⭐ | `day_number = current_day_in_cycle` và chưa check-in |
| `mystery` | Tím + glow | 🎁 | `reward_type = mystery_box` |
| `locked` | Xám mờ | 🔒 | Các ngày chưa tới |

---

## 9. Kết nối với HomeFeature

[`HomeFeature.tsx`](file:///Users/huynh/codes/hoctap/mobile/components/features/home/HomeFeature.tsx) đã được cập nhật:
- Import `DailyCheckinCard` từ gamification module
- `DailyCheckinCard` render **giữa** `HomeHeader` và `RecommendedCourses`
- Pull-to-refresh invalidate cả `CHECKIN_QUERY_KEY`

---

## 10. Bước tiếp theo

> Module này đã hoàn thành. **Dừng lại tại đây.**

Các module tiếp theo (khi được giao):
- **Module UI 02** – Streak (Freeze, Restore, History)
- **Module UI 03** – Mission (Daily/Weekly)
- **Module UI 04** – Achievement & Badge
- **Module UI 05** – Leaderboard
