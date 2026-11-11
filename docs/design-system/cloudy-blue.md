# Cloudy Blue Design System V2 — Mây Mây UI/UX & Token Architecture Specification

> **Phong cách chủ đạo**: Korean Pastel Minimalism — mềm mại (soft), thoáng đãng (airy), cao cấp (premium), biên tập (editorial), tĩnh tại (calm), thân thiện (friendly) và thanh lịch (elegant).  
> **Đối tượng mục tiêu**: Học sinh THPT lớp 10–12 (cân bằng hài hòa cho cả nam và nữ).

---

## 1. Triết lý Thiết kế (Design Philosophy)

1. **Tựa như một bộ trang phục phối màu Pastel cao cấp (70 / 20 / 10 Rule)**:
   - **70% Không gian trung tính sáng**: Trắng tinh khiết (`#FFFFFF`) và trắng ánh xanh mây (`#F6FAFF`), kết hợp bề mặt kem ấm (`#FFF9F6`) để tạo nhịp điệu thị giác.
   - **20% Xanh Pastel chủ đạo**: `#BFD7ED` và `#E8F2FA` cho vùng nhấn nhẹ, badge, pill, hover state và card highlight; sử dụng `#356FA7` (hover `#285C90`) cho các nút hành động chính (Primary CTA) nhằm đảm bảo độ tương phản chữ trắng đạt chuẩn WCAG AA (`5.26:1`).
   - **10% Điểm nhấn tinh tế**: Hồng phấn (`#F7C9D9` / `#FCE8EF`), Tím oải hương (`#E3D5F5`) và Vani ấm (`#F8E9C9`). Không lạm dụng tất cả các màu nhấn trên cùng một màn hình.
2. **Những điều tuyệt đối tránh (Anti-Patterns)**:
   - Không dùng màu neon, xanh lục/ngọc chói (`#00bba7`, `#10b981`, `#00a73d`).
   - Không tạo biến CSS tự tham chiếu (`--color-primary: var(--color-primary)`).
   - Không biến đổi toàn cục trạng thái thành công (`green-*`, `emerald-*`) thành màu xanh dương.
   - Không đặt chữ trắng (`#FFFFFF`) trực tiếp trên nền pastel nhạt (`#BFD7ED`, `#F7C9D9`, `#E3D5F5`, `#F8E9C9`).

---

## 2. Kiến trúc Token 2 Tầng: Primitive Tokens vs. Semantic Tokens

Toàn bộ hệ thống token được định nghĩa tại [`studynest_fe/src/app/globals.css`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/globals.css) theo kiến trúc 2 tầng tách biệt cho Tailwind CSS v4:

1. **Tầng 1 — Primitive Tokens (`:root` -> `--sn-*`)**:
   - Lưu trữ các giá trị màu sắc nguyên bản (`#hex`), font stack (`--sn-font-*`), bo góc, đổ bóng và chuyển động.
   - Không bao giờ khai báo biến `--color-*` trực tiếp trong `:root` để tránh xung đột hoặc tạo vòng lặp tự tham chiếu với `@theme inline`.
2. **Tầng 2 — Semantic Tokens (`@theme inline` -> `--color-*`, `--font-*`)**:
   - Ánh xạ các vai trò ngữ nghĩa (`background`, `surface`, `primary`, `secondary`, `accent`, `success`, `warning`, `destructive`, `info`, `disabled`, `chart-1..5`) từ các biến `--sn-*` ở Tầng 1.
   - Tự động sinh ra các Tailwind v4 utility classes chuẩn (`bg-primary`, `text-primary-foreground`, `bg-surface`, `border-border`, `bg-success-bg`, `text-success-foreground`, v.v.).

### 2.1. Bảng Màu Primitive (`:root`)

| Vai trò Palette | Biến Primitive (`:root`) | Mã Hex | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Primary Action** | `--sn-blue-600` | `#356FA7` | Nút CTA chính, focus ring (Contrast `5.26:1` với `#FFFFFF`) |
| **Primary Hover** | `--sn-blue-700` | `#285C90` | Trạng thái hover của nút CTA chính |
| **Primary Active** | `--sn-blue-800` | `#1F4B77` | Trạng thái nhấn giữ (active) |
| **Pastel Blue** | `--sn-blue-200` | `#BFD7ED` | Viền nhấn, pill, trạng thái chọn nhẹ |
| **Light Blue** | `--sn-blue-100` | `#E8F2FA` | Nền badge, nền icon, skeleton, hover nhẹ |
| **Pastel Pink** | `--sn-pink-200` | `#F7C9D9` | Điểm nhấn phụ, viền ưu đãi, biểu đồ |
| **Light Pink** | `--sn-pink-100` | `#FCE8EF` | Nền nút phụ (Secondary), tag chiến dịch |
| **Pink Foreground** | `--sn-pink-800` | `#8A3B58` | Chữ độ tương phản cao trên nền hồng nhạt |
| **Lavender** | `--sn-lavender-100` | `#E3D5F5` | Điểm nhấn phụ (Tag cấp độ, mới ra mắt) |
| **Lavender Foreground** | `--sn-lavender-800` | `#593E7A` | Chữ độ tương phản cao trên nền tím lavender |
| **Vanilla** | `--sn-vanilla-100` | `#F8E9C9` | Điểm nhấn phụ ấm (Highlight, chú ý nhẹ) |
| **Vanilla Foreground** | `--sn-vanilla-800` | `#875415` | Chữ độ tương phản cao trên nền vàng kem |
| **Background** | `--sn-background` | `#F6FAFF` | Nền tổng thể của ứng dụng |
| **Surface** | `--sn-surface` | `#FFFFFF` | Nền Card, Modal, Input, Table, Header |
| **Warm Surface** | `--sn-surface-warm` | `#FFF9F6` | Nền section xen kẽ, thẻ Testimonial |
| **Main Text** | `--sn-foreground` | `#3D4A5A` | Văn bản chính (`8.54:1` trên `#FFFFFF`) |
| **Secondary Text** | `--sn-muted-foreground` | `#6F7C8C` | Văn bản phụ, mô tả (`4.52:1` trên `#FFFFFF`) |
| **Subtle Text** | `--sn-subtle-foreground` | `#8190A3` | Placeholder, metadata phụ không trọng yếu |
| **Border** | `--sn-border` | `#E7EEF7` | Viền card, input, đường phân cách mảnh |

### 2.2. Bảng Semantic Tokens & Tailwind Utilities (`@theme inline`)

| Nhóm Ngữ nghĩa | Biến Semantic (`@theme inline`) | Giá trị Tham chiếu | Tailwind Utility Tiêu biểu |
| :--- | :--- | :--- | :--- |
| **Surfaces** | `--color-background` | `var(--sn-background)` (`#F6FAFF`) | `bg-background` |
| | `--color-surface` | `var(--sn-surface)` (`#FFFFFF`) | `bg-surface` |
| | `--color-surface-muted` | `var(--sn-surface-warm)` (`#FFF9F6`) | `bg-surface-muted` |
| **Typography** | `--color-foreground` | `var(--sn-foreground)` (`#3D4A5A`) | `text-foreground` |
| | `--color-muted-foreground` | `var(--sn-muted-foreground)` (`#6F7C8C`) | `text-muted-foreground` |
| | `--color-subtle-foreground` | `var(--sn-subtle-foreground)` (`#8190A3`) | `text-subtle-foreground` |
| **Primary** | `--color-primary` | `var(--sn-blue-600)` (`#356FA7`) | `bg-primary`, `text-primary` |
| | `--color-primary-hover` | `var(--sn-blue-700)` (`#285C90`) | `hover:bg-primary-hover` |
| | `--color-primary-active` | `var(--sn-blue-800)` (`#1F4B77`) | `active:bg-primary-active` |
| | `--color-primary-foreground` | `var(--sn-white)` (`#FFFFFF`) | `text-primary-foreground` |
| | `--color-primary-pastel` | `var(--sn-blue-200)` (`#BFD7ED`) | `border-primary-pastel`, `bg-primary-pastel` |
| | `--color-primary-light` | `var(--sn-blue-100)` (`#E8F2FA`) | `bg-primary-light` |
| **Secondary** | `--color-secondary` | `var(--sn-pink-100)` (`#FCE8EF`) | `bg-secondary` |
| | `--color-secondary-hover` | `var(--sn-pink-200)` (`#F7C9D9`) | `hover:bg-secondary-hover` |
| | `--color-secondary-pastel` | `var(--sn-pink-200)` (`#F7C9D9`) | `border-secondary-pastel` |
| | `--color-secondary-foreground` | `var(--sn-pink-800)` (`#8A3B58`) | `text-secondary-foreground` |
| **Accents** | `--color-accent` | `var(--sn-lavender-100)` (`#E3D5F5`) | `bg-accent` |
| | `--color-accent-border` | `var(--sn-lavender-200)` (`#D1BCEF`) | `border-accent-border` |
| | `--color-accent-foreground` | `var(--sn-lavender-800)` (`#593E7A`) | `text-accent-foreground` |
| | `--color-accent-vanilla` | `var(--sn-vanilla-100)` (`#F8E9C9`) | `bg-accent-vanilla` |
| | `--color-accent-vanilla-border` | `var(--sn-vanilla-200)` (`#F2DBA8`) | `border-accent-vanilla-border` |
| | `--color-accent-vanilla-foreground` | `var(--sn-vanilla-800)` (`#875415`) | `text-accent-vanilla-foreground` |
| **Controls** | `--color-border` | `var(--sn-border)` (`#E7EEF7`) | `border-border` |
| | `--color-input` | `var(--sn-border)` (`#E7EEF7`) | `border-input` |
| | `--color-ring` | `var(--sn-blue-600)` (`#356FA7`) | `ring-ring`, `focus:border-ring` |
| | `--color-disabled` | `var(--sn-disabled-bg)` (`#EEF3F9`) | `disabled:bg-disabled` |
| | `--color-disabled-foreground` | `var(--sn-disabled-fg)` (`#8E9CB0`) | `disabled:text-disabled-foreground` |
| **Charts** | `--color-chart-1` .. `--color-chart-5` | `--sn-chart-1` .. `--sn-chart-5` | `#356FA7`, `#7BAFD4`, `#F7C9D9`, `#E3D5F5`, `#F8E9C9` |

---

## 3. Quy ước Màu Trạng thái (Status-Color Conventions)

Hệ thống phân tách chặt chẽ giữa **Màu nền (`-bg`)**, **Màu chữ/biểu tượng (`-foreground`)** và **Màu viền (`-border`)** để đảm bảo độ tương phản WCAG AA trên mọi badge, alert và toast:

| Trạng thái | Background Token | Foreground Token | Border Token | Cách dùng chuẩn trên Component |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `--color-success-bg` (`#E4F3E9`) | `--color-success-foreground` (`#276749`) | `--color-success-border` (`#C3E4CE`) | `bg-success-bg text-success-foreground border-success-border` |
| **Warning** | `--color-warning-bg` (`#FFF1D9`) | `--color-warning-foreground` (`#875415`) | `--color-warning-border` (`#F5D9A6`) | `bg-warning-bg text-warning-foreground border-warning-border` |
| **Destructive / Error** | `--color-destructive-bg` (`#FCE8E8`) | `--color-destructive-foreground` (`#A23C46`) | `--color-destructive-border` (`#F5C2C7`) | `bg-destructive-bg text-destructive-foreground border-destructive-border` |
| **Info** | `--color-info-bg` (`#E8F2FA`) | `--color-info-foreground` (`#285C90`) | `--color-info-border` (`#BFD7ED`) | `bg-info-bg text-info-foreground border-info-border` |

---

## 4. Chính sách Tương thích Màu Legacy (Legacy Compatibility Policy)

1. **`green-*` và `emerald-*` — Giữ nguyên ngữ nghĩa Success (KHÔNG BAO GIỜ remap sang màu xanh dương)**:
   - Nhiều bảng dữ liệu, badge trạng thái (`approved`, `completed`, `paid`, `active`, `refunded`), kết quả bài kiểm tra (`quiz`, `test-results`) trong các trang User, Lecturer và Admin sử dụng `green-*` và `emerald-*` để biểu thị trạng thái thành công.
   - Trong `globals.css`, `--color-green-50..900` và `--color-emerald-50..900` được ánh xạ vào thang màu **Pastel Success Sage Green** (`--sn-success-50..900`: `#F2F9F5` -> `#E4F3E9` -> `#276749` -> `#163B29`). Nhờ vậy, các trạng thái thành công luôn hiển thị màu xanh lá dịu mắt, hài hòa với Cloudy Blue và không bị biến thành màu xanh dương.
2. **`teal-*` — Lớp tương thích tạm thời cho màu thương hiệu cũ (`#00bba7`)**:
   - Một số trang phụ chưa refactor (như tab chi tiết bài học `learning_detail`, `help-center`, modal phụ) vẫn gọi `teal-*` như màu nhấn thương hiệu cũ.
   - `--color-teal-50..900` được ánh xạ tạm thời sang `--sn-blue-50..900` để giữ sự đồng nhất thị giác cho đến khi các trang đó được chuyển hoàn toàn sang semantic tokens (`primary` / `info`).
   - Khi viết mới hoặc refactor bất kỳ component nào, **bắt buộc dùng semantic tokens** (`bg-primary`, `bg-primary-light`, `text-primary`, `bg-success-bg`, `text-success-foreground`), không dùng `teal-*`, `green-*`, `emerald-*`.

---

## 5. Ví dụ Triển khai Đúng vs. Sai (Correct vs. Incorrect Examples)

### 5.1. Định nghĩa CSS Tokens trong `globals.css`

```css
/* ❌ SAI (INCORRECT): Biến tự tham chiếu trong @theme inline hoặc trộn lẫn primitive với semantic */
:root {
  --color-primary: #356FA7;
}
@theme inline {
  --color-primary: var(--color-primary); /* Lỗi vòng lặp tự tham chiếu! */
  --color-green-600: #356FA7;            /* Sai ngữ nghĩa: biến trạng thái Success thành màu xanh dương! */
}

/* ✅ ĐÚNG (CORRECT): Tách biệt Primitive (--sn-*) trong :root và Semantic (--color-*) trong @theme inline */
:root {
  --sn-blue-600: #356FA7;
  --sn-success-100: #E4F3E9;
  --sn-success-700: #276749;
}
@theme inline {
  --color-primary: var(--sn-blue-600);
  --color-success-bg: var(--sn-success-100);
  --color-success-foreground: var(--sn-success-700);
}
```

### 5.2. Sử dụng Token trong React / Tailwind Components

```tsx
// ❌ SAI (INCORRECT): Hardcode mã hex, đặt chữ trắng trên nền pastel nhạt, hoặc dùng class legacy
<button className="bg-[#BFD7ED] text-white hover:bg-[#00bba7]">
  Đăng ký học
</button>
<span className="bg-green-100 text-blue-700">Đã hoàn thành</span>

// ✅ ĐÚNG (CORRECT): Sử dụng Semantic Utilities hoặc Shared UI Primitives từ @/components/ui
import { Button, Badge } from "@/components/ui";

<Button variant="primary">Đăng ký học</Button>
// Hoặc dùng semantic classes:
<button className="bg-primary text-primary-foreground hover:bg-primary-hover">
  Đăng ký học
</button>

<Badge variant="success">Đã hoàn thành</Badge>
// Hoặc dùng semantic status classes:
<span className="bg-success-bg text-success-foreground border border-success-border">
  Đã hoàn thành
</span>
```

---

## 6. Hệ thống Chữ viết (Typography)

Định nghĩa tại [`studynest_fe/src/app/fonts.ts`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/fonts.ts) thông qua `next/font/google` với `display: "swap"` và subset `vietnamese` đầy đủ:

- **Font UI & Body (`--font-sans` -> `var(--sn-font-sans)`)**: `"Be Vietnam Pro"`, fallback `sans-serif`. Trọng lượng: `400, 500, 600, 700`. Dùng cho toàn bộ giao diện ứng dụng, navigation, dashboard, form, card và bảng biểu.
- **Font Display & Editorial (`--font-display` -> `var(--sn-font-display)` / `.font-display`)**: `"Lora"`, fallback `serif`. Trọng lượng: `500, 600, 700`. **Chỉ sử dụng có chọn lọc** ở Hero headline, tiêu đề Section trang chủ, hoặc tiêu đề chiến dịch/editorial cần điểm nhấn.

---

## 7. Thư viện Shared UI Components

Các component nền tảng đặt tại [`studynest_fe/src/components/ui/`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/index.ts) và sử dụng 100% semantic tokens:

1. **[`Button`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/button.tsx)**:
   - Variants: `primary` (`bg-primary text-primary-foreground`), `secondary` (`bg-secondary text-foreground`), `pastel` (`bg-primary-light text-primary`), `outline`, `ghost`, `destructive`.
2. **[`Badge`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/badge.tsx)**:
   - Variants: `default`, `primary`, `secondary`, `lavender`, `vanilla`, `success`, `warning`, `destructive`, `info`, `outline`.
3. **[`Input`, `Textarea`, `Select`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/input.tsx)**:
   - Sử dụng `bg-surface`, `border-input`, `text-foreground`, `placeholder:text-subtle-foreground`, `focus:border-ring`, `disabled:bg-disabled`.
4. **[`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/card.tsx)**:
   - Variants: `surface` (`bg-surface border-border`), `muted` (`bg-surface-muted border-border`), `pastel-blue`, `pastel-pink`.
5. **[`Alert`, `Skeleton`, `EmptyState`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/states.tsx)**:
   - `Alert` phân biệt rõ `info`, `success`, `warning`, `destructive` thông qua các bộ token `-bg`, `-foreground`, `-border`.
6. **[`HoverCard`, `HoverCardTrigger`, `HoverCardContent`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/hover-card.tsx)**:
   - Sử dụng `bg-surface`, `border-border`, `text-foreground`.
