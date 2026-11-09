# Cloudy Blue Design System V2 — StudyNest Frontend Guide (`studynest_fe`)

> Tài liệu đầy đủ được đồng bộ tại [`docs/design-system/cloudy-blue.md`](file:///Users/huynh/codes/hoctap/docs/design-system/cloudy-blue.md).

## 1. Cấu trúc File Nền tảng trong `studynest_fe`

- **Primitive & Semantic Tokens**: [`src/app/globals.css`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/globals.css)
- **Cấu hình Font (`Be Vietnam Pro` & `Lora`)**: [`src/app/fonts.ts`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/fonts.ts)
- **Root Layout**: [`src/app/layout.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/layout.tsx)
- **Shared UI Primitives**: [`src/components/ui/index.ts`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/index.ts) (`Button`, `Badge`, `Input`, `Textarea`, `Select`, `Card`, `Alert`, `Skeleton`, `EmptyState`, `HoverCard`)

## 2. Nguyên tắc Kiến trúc Token (Primitive vs. Semantic)

1. **Primitive Tokens (`:root` -> `--sn-*`)**:
   - Chỉ khai báo mã màu gốc (`--sn-blue-600: #356FA7`, `--sn-background: #F6FAFF`, `--sn-success-100: #E4F3E9`, `--sn-success-700: #276749`, v.v.) và font stack (`--sn-font-sans`, `--sn-font-display`).
2. **Semantic Tokens (`@theme inline` -> `--color-*`, `--font-*`)**:
   - Ánh xạ một chiều từ `var(--sn-*)` sang `--color-*` và `--font-*`.
   - **Tuyệt đối cấm** viết biến tự tham chiếu như `--color-primary: var(--color-primary);`.

## 3. Quy ước Sử dụng Semantic Utilities

- **Surfaces & Text**: `bg-background`, `bg-surface`, `bg-surface-muted`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`.
- **Primary Brand & CTA**: `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active`, `bg-primary-light`, `border-primary-pastel`.
- **Secondary & Accents**: `bg-secondary text-secondary-foreground`, `bg-accent text-accent-foreground`, `bg-accent-vanilla text-accent-vanilla-foreground`.
- **Borders, Inputs & Focus**: `border-border`, `border-input`, `focus:border-ring`, `focus-visible:ring-ring`, `disabled:bg-disabled disabled:text-disabled-foreground`.
- **Status Tokens (Phân biệt rõ Background, Foreground, Border)**:
  - Success: `bg-success-bg text-success-foreground border-success-border`
  - Warning: `bg-warning-bg text-warning-foreground border-warning-border`
  - Destructive / Error: `bg-destructive-bg text-destructive-foreground border-destructive-border`
  - Info: `bg-info-bg text-info-foreground border-info-border`

## 4. Chính sách Tương thích Legacy (`green-*`, `emerald-*`, `teal-*`)

- **`green-*` & `emerald-*`**: Được giữ đúng ngữ nghĩa **Success** thông qua thang màu Pastel Sage Green (`--sn-success-50..900`). Không bao giờ biến đổi toàn cục trạng thái thành công sang màu xanh dương.
- **`teal-*`**: Được giữ tạm thời làm cầu nối tương thích sang `--sn-blue-*` cho các trang phụ chưa refactor vốn dùng `#00bba7`. Khi phát triển hoặc refactor component, luôn dùng semantic tokens thay vì `teal-*`.
