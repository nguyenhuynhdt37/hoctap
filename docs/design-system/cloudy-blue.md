# Cloudy Blue Design System — StudyNest UI/UX Specification

> **Phong cách chủ đạo**: Korean Pastel Minimalism — mềm mại (soft), thoáng đãng (airy), cao cấp (premium), biên tập (editorial), tĩnh tại (calm), thân thiện (friendly) và thanh lịch (elegant).  
> **Đối tượng mục tiêu**: Học sinh THPT lớp 10–12 (cân bằng hài hòa cho cả nam và nữ).

---

## 1. Triết lý Thiết kế (Design Philosophy)

1. **Tựa như một bộ trang phục phối màu Pastel cao cấp**:
   - **70% Không gian trung tính sáng**: Trắng tinh khiết (`#FFFFFF`) và trắng ánh xanh mây (`#F6FAFF`), kết hợp bề mặt kem ấm (`#FFF9F6`) để tạo nhịp điệu thị giác.
   - **20% Xanh Pastel chủ đạo**: `#BFD7ED` và `#E8F2FA` cho vùng nhấn nhẹ, badge, pill, hover state và card highlight; sử dụng `#356FA7` (hover `#285C90`) cho các nút hành động chính (Primary CTA) nhằm đảm bảo độ tương phản chữ trắng đạt chuẩn WCAG AA (`5.26:1`).
   - **10% Điểm nhấn tinh tế**: Hồng phấn (`#F7C9D9` / `#FCE8EF`), Tím oải hương (`#E3D5F5`) và Vani ấm (`#F8E9C9`). Không lạm dụng tất cả các màu nhấn trên cùng một màn hình.
2. **Những điều tuyệt đối tránh (Anti-Patterns)**:
   - Không dùng màu neon, xanh lục/ngọc chói (`#00bba7`, `#10b981`, `#00a73d`).
   - Không dùng gradient gắt trên mọi nút bấm và thẻ card (gradient pastel nhẹ chỉ dùng cho Hero hoặc CTA banner lớn).
   - Không dùng đổ bóng dày, đen đặc (`shadow-2xl`); ưu tiên khoảng trắng, viền mảnh `#E7EEF7` và ambient shadow siêu nhẹ.

---

## 2. Hệ thống Màu sắc & Semantic Tokens (Color System)

Toàn bộ token được khai báo trong [`studynest_fe/src/app/globals.css`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/globals.css) tại `:root` và ánh xạ vào `@theme inline` của Tailwind CSS v4.

### 2.1. Bảng màu Nền tảng (Foundational Palette)

| Nhóm | Tên màu | Mã Hex | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Primary** | Primary Pastel Blue | `#BFD7ED` | Viền nhấn, pill, trạng thái chọn nhẹ, biểu đồ |
| **Primary** | Primary Light | `#E8F2FA` | Nền badge, nền icon, hover nhẹ, skeleton |
| **Primary** | Primary Action | `#356FA7` | Nút CTA chính, liên kết, focus ring, trạng thái active |
| **Primary** | Primary Action Hover | `#285C90` | Hover/Active của nút CTA chính |
| **Secondary** | Secondary Pastel Pink | `#F7C9D9` | Điểm nhấn phụ, viền ưu đãi, biểu đồ |
| **Secondary** | Secondary Light | `#FCE8EF` | Nền badge nổi bật, tag chiến dịch |
| **Accents** | Lavender Accent | `#E3D5F5` | Điểm nhấn phụ (Mới ra mắt, tag cấp độ) |
| **Accents** | Vanilla Accent | `#F8E9C9` | Điểm nhấn phụ (Đánh giá sao, chú ý nhẹ) |
| **Surfaces** | Background | `#F6FAFF` | Nền tổng thể của trang (App background) |
| **Surfaces** | Surface | `#FFFFFF` | Nền thẻ Card, Modal, Header, Dropdown, Table |
| **Surfaces** | Alternate Surface | `#FFF9F6` | Nền section xen kẽ, thẻ Testimonial, ưu đãi |
| **Typography** | Text Primary | `#3D4A5A` | Tiêu đề và nội dung chính (Contrast `8.5:1` trên nền trắng) |
| **Typography** | Text Secondary | `#6F7C8C` | Nội dung phụ, mô tả, nhãn (Contrast `4.52:1` trên nền trắng) |
| **Typography** | Text Subtle | `#8190A3` | Placeholder, metadata phụ không trọng yếu |
| **Borders** | Border / Divider | `#E7EEF7` | Viền card, đường kẻ phân cách mảnh |
| **States** | Success | Bg `#E4F3E9` / Fg `#276749` | Hoàn thành, miễn phí, xác thực thành công |
| **States** | Warning | Bg `#FFF1D9` / Fg `#875415` | Chờ xử lý, lưu ý, đếm ngược |
| **States** | Destructive / Danger | Bg `#FCE8E8` / Fg `#A23C46` | Lỗi form, xóa, cảnh báo quan trọng |

### 2.2. Danh sách Semantic CSS Tokens

```css
:root {
  --color-background: #F6FAFF;
  --color-foreground: #3D4A5A;
  --color-surface: #FFFFFF;
  --color-surface-muted: #FFF9F6;

  --color-primary: #356FA7;
  --color-primary-foreground: #FFFFFF;
  --color-primary-hover: #285C90;
  --color-primary-pastel: #BFD7ED;
  --color-primary-light: #E8F2FA;

  --color-secondary: #FCE8EF;
  --color-secondary-foreground: #3D4A5A;
  --color-secondary-pastel: #F7C9D9;

  --color-accent: #E3D5F5;
  --color-accent-foreground: #3D4A5A;
  --color-accent-vanilla: #F8E9C9;

  --color-muted: #E8F2FA;
  --color-muted-foreground: #6F7C8C;
  --color-subtle-foreground: #8190A3;

  --color-border: #E7EEF7;
  --color-input: #E7EEF7;
  --color-ring: #356FA7;

  --color-success: #E4F3E9;
  --color-success-foreground: #276749;
  --color-warning: #FFF1D9;
  --color-warning-foreground: #875415;
  --color-destructive: #FCE8E8;
  --color-destructive-foreground: #A23C46;

  --color-chart-1: #356FA7;
  --color-chart-2: #7BAFD4;
  --color-chart-3: #F7C9D9;
  --color-chart-4: #E3D5F5;
  --color-chart-5: #F8E9C9;
}
```

### 2.3. Bảng Ánh xạ từ Màu Cũ sang Semantic Tokens Mới (Migration Mapping)

| Màu Hardcode / Class Cũ | Vai trò Cũ | Token / Giá trị Cloudy Blue Mới |
| :--- | :--- | :--- |
| `#00bba7`, `#00a73d`, `bg-green-600`, `bg-teal-600` | Primary CTA / Brand | `var(--color-primary)` (`#356FA7`) |
| `#00a896`, `#009b8a`, `hover:bg-green-700` | Primary CTA Hover | `var(--color-primary-hover)` (`#285C90`) |
| `#e0f7f5`, `bg-green-50`, `bg-emerald-50`, `bg-teal-50` | Light Tint Surface / Pill | `var(--color-primary-light)` (`#E8F2FA`) hoặc `var(--color-background)` (`#F6FAFF`) |
| `#b3f0ea`, `border-green-100`, `border-teal-100` | Soft Border | `var(--color-border)` (`#E7EEF7`) hoặc `var(--color-primary-pastel)` (`#BFD7ED`) |
| `bg-gradient-to-r from-green-600 to-emerald-600` | Nút bấm / Tiêu đề chữ | Nút đặc `bg-[#356FA7]` / Chữ `text-[#3D4A5A]` kèm `.font-display` |
| `text-gray-900`, `#111827` | Heading / Body chính | `var(--color-foreground)` (`#3D4A5A`) |
| `text-gray-600`, `text-gray-500`, `#6b7280` | Body phụ / Subtext | `var(--color-muted-foreground)` (`#6F7C8C`) |

---

## 3. Hệ thống Chữ viết (Typography)

Định nghĩa tại [`studynest_fe/src/app/fonts.ts`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/fonts.ts) thông qua `next/font/google` với `display: "swap"` và subset `vietnamese` đầy đủ:

- **Font UI & Body (`--font-sans`)**: `"Be Vietnam Pro"`, fallback `sans-serif`. Trọng lượng: `400, 500, 600, 700`. Dùng cho toàn bộ giao diện ứng dụng, navigation, dashboard, form, card và bảng biểu.
- **Font Display & Editorial (`--font-display` / `.font-display`)**: `"Lora"`, fallback `serif`. Trọng lượng: `500, 600, 700`. **Chỉ sử dụng có chọn lọc** ở Hero headline, tiêu đề Section trang chủ, hoặc tiêu đề chiến dịch/editorial cần điểm nhấn.

### Type Scale Tokens

| Token Class | Kích thước (Size) | Line Height | Font Family | Trọng lượng | Ứng dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.type-display` | `clamp(2.25rem, 4vw + 1rem, 3.5rem)` | `1.15` | `Lora` (`--font-display`) | `700` | Hero Headline |
| `.type-h1` | `clamp(1.875rem, 3vw + 0.5rem, 2.5rem)` | `1.2` | `Be Vietnam Pro` / `Lora` | `700` | Tiêu đề trang chính |
| `.type-h2` | `clamp(1.5rem, 2vw + 0.5rem, 2rem)` | `1.25` | `Be Vietnam Pro` / `Lora` | `700` | Tiêu đề Section |
| `.type-h3` | `1.25rem` (`20px`) | `1.3` | `Be Vietnam Pro` | `600` | Tiêu đề khối / Modal |
| `.type-h4` | `1.125rem` (`18px`) | `1.35` | `Be Vietnam Pro` | `600` | Tiêu đề Card khóa học |
| `.type-body-lg` | `1.125rem` (`18px`) | `1.65` | `Be Vietnam Pro` | `400` | Đoạn dẫn (Lead paragraph) |
| `.type-body` | `1rem` (`16px`) | `1.6` | `Be Vietnam Pro` | `400` | Nội dung mặc định |
| `.type-body-sm` | `0.875rem` (`14px`) | `1.5` | `Be Vietnam Pro` | `400–500` | Mô tả card, bảng, form |
| `.type-caption` | `0.75rem` (`12px`) | `1.4` | `Be Vietnam Pro` | `500` | Metadata, nhãn phụ |
| `.type-overline` | `0.75rem` (`12px`, uppercase, tracking `0.08em`) | `1.4` | `Be Vietnam Pro` | `600` | Eyebrow badge, nhóm mục |

---

## 4. Nền tảng Bố cục, Bo góc, Đổ bóng & Chuyển động (Design Foundations)

- **Spacing Scale**: Hệ số chuẩn `4px` (`0.25rem`), bố cục ưu tiên bội số `8px` (`8px, 16px, 24px, 32px, 48px, 64px`).
- **Border Radius**:
  - Control nhỏ, checkbox, tag nhỏ: `8px` (`--radius-sm` / `rounded-lg`)
  - Input, Select, Button: `12px` (`--radius-md` / `rounded-xl`)
  - Card khóa học, Card thống kê, Modal: `16px–20px` (`--radius-lg`..`--radius-xl` / `rounded-2xl`..`rounded-[20px]`)
  - Section banner lớn, Hero container: `24px–32px` (`--radius-2xl`..`--radius-3xl` / `rounded-[24px]`..`rounded-[32px]`)
  - Pill badge, Avatar: `9999px` (`--radius-full` / `rounded-full`)
- **Ambient Shadows**:
  - `--shadow-2xs`: `0 1px 2px 0 rgba(61, 74, 90, 0.03)`
  - `--shadow-xs`: `0 2px 8px -2px rgba(61, 74, 90, 0.05)`
  - `--shadow-sm`: `0 4px 16px -4px rgba(61, 74, 90, 0.06), 0 2px 6px -1px rgba(61, 74, 90, 0.03)`
  - `--shadow-md`: `0 8px 24px -6px rgba(61, 74, 90, 0.07), 0 4px 10px -2px rgba(61, 74, 90, 0.03)`
- **Motion & Reduced Motion**:
  - Thời lượng chuyển động chuẩn: `150ms–250ms` với `cubic-bezier(0.22, 1, 0.36, 1)`.
  - Hỗ trợ đầy đủ `@media (prefers-reduced-motion: reduce)` trong `globals.css`.

---

## 5. Thư viện Shared UI Components

Các component nền tảng đặt tại [`studynest_fe/src/components/ui/`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/index.ts):

1. **[`Button`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/button.tsx)**:
   - Variants: `primary` (`#356FA7`), `secondary` (`#FCE8EF`), `pastel` (`#E8F2FA`), `outline`, `ghost`, `destructive`.
   - Hỗ trợ `isLoading`, `disabled`, `leftIcon`, `rightIcon`, focus ring chuẩn `:focus-visible`.
2. **[`Badge`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/badge.tsx)**:
   - Variants: `default`, `primary`, `secondary`, `lavender`, `vanilla`, `success`, `warning`, `destructive`, `outline`.
3. **[`Input`, `Textarea`, `Select`, `Switch`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/input.tsx)**:
   - Hỗ trợ `error`, `hint`, `disabled`, focus ring `ring-[#356FA7]/20 border-[#356FA7]`.
4. **[`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/card.tsx)**:
   - Variants: `default` (`#FFFFFF`), `muted` (`#FFF9F6`), `pastel` (`#E8F2FA/60`), `outline`, kèm `interactive` hover nhẹ.
5. **[`Alert`, `Skeleton`, `EmptyState`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/states.tsx)**:
   - Trạng thái thông báo có icon đi kèm (không chỉ dựa vào màu sắc), skeleton màu `#E8F2FA` dịu mắt.

---

## 6. Tiêu chuẩn Accessibility (WCAG AA)

- **Độ tương phản văn bản**:
  - `#3D4A5A` trên `#FFFFFF` (`8.54:1` — AAA) và trên `#F6FAFF` (`8.12:1` — AAA).
  - `#6F7C8C` trên `#FFFFFF` (`4.52:1` — AA).
  - `#FFFFFF` trên `#356FA7` (`5.26:1` — AA).
  - Không bao giờ đặt chữ trắng (`#FFFFFF`) trực tiếp trên nền pastel nhạt (`#BFD7ED`, `#F7C9D9`, `#E3D5F5`, `#F8E9C9`).
- **Keyboard & Focus**:
  - Toàn bộ phần tử tương tác đều có `:focus-visible` với `outline: 2px solid #356FA7` và `outline-offset: 2px`.
- **Biểu đạt trạng thái đa kênh**:
  - Luôn kết hợp màu sắc với biểu tượng (icon) và nhãn văn bản rõ ràng cho các trạng thái Thành công, Cảnh báo, Lỗi.
