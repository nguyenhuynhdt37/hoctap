# AGENTS.md — Mây Mây Repository Instructions

## Design System & UI/UX Standard ("Cloudy Blue")

Toàn bộ giao diện người dùng trong `studynest_fe/` tuân thủ hệ thống thiết kế **Cloudy Blue** (Korean Pastel Minimalism: soft, airy, premium, editorial, calm, friendly, elegant).

- **Tài liệu chi tiết**: Xem [`docs/design-system/cloudy-blue.md`](file:///Users/huynh/codes/hoctap/docs/design-system/cloudy-blue.md)
- **Agent Skill**: Xem [`.agents/skills/cloudy-blue-design-system/SKILL.md`](file:///Users/huynh/codes/hoctap/.agents/skills/cloudy-blue-design-system/SKILL.md)
- **Design Tokens**: Khai báo tại [`studynest_fe/src/app/globals.css`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/globals.css)
- **Shared UI Components**: Đặt tại [`studynest_fe/src/components/ui/`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/ui/index.ts)

### Quy tắc bắt buộc khi phát triển tính năng UI mới:
1. Sử dụng semantic tokens (`--color-background`, `--color-surface`, `--color-primary`, `--color-foreground`, `--color-border`, v.v.) và các shared components trong `@/components/ui`.
2. Không hardcode các màu neon hoặc màu xanh lục/ngọc cũ (`#00bba7`, `#10b981`, `#00a73d`).
3. Sử dụng font `"Be Vietnam Pro"` cho toàn bộ UI/body và `"Lora"` (`.font-display`) có chọn lọc cho Hero/Editorial headings.
4. Đảm bảo độ tương phản đạt chuẩn WCAG AA (không đặt chữ trắng trên nền pastel nhạt).

## Icon System (PulsoIcon)

Toàn bộ icon trong `studynest_fe/` dùng **PulsoIcon** (https://pulsoicon.com, gói npm `pulsoicon-react`, giấy phép ISC, ~9.955 icon động). Đây là quy tắc bắt buộc, thay thế `lucide-react` và `react-icons`.

- **Import duy nhất từ `pulsoicon-react`**: `import { Bell, Trash2 } from "pulsoicon-react"`. Tên icon và prop giống `lucide-react` (`size` mặc định 24, `color`, `strokeWidth`, `absoluteStrokeWidth`, mọi thuộc tính SVG như `className`, `aria-hidden`, `aria-label`) và thêm `solid`, `animated`, `autoAnimated`, `play`.
- **Cấm** import icon từ `lucide-react`, `react-icons`, `@heroicons`, `@tabler/icons`, `@radix-ui/react-icons` hoặc thêm thư viện icon khác. Test `node studynest_fe/tests/test-icon-source.cjs` sẽ fail nếu vi phạm.
- **Cấm mọi icon Sparkles/HiSparkles hoặc hình sparkle** (kể cả icon PulsoIcon có tên chứa "sparkle"). Icon "AI" dùng `Bot`, icon nổi bật dùng `Star`.
- **Chuyển động**: icon mặc định chạy khi hover/focus vào button, a, label, `[role=button|link|tab|menuitem]` gần nhất. Giữ mặc định cho nút và link. Với icon chỉ trang trí trong danh sách dày hoặc vùng cuộn dài thì đặt `animated={false}`. Phải tôn trọng `prefers-reduced-motion`. Có thể đặt `data-icon-trigger` trên phần tử bất kỳ để làm trigger.
- **Truy cập**: icon trang trí dùng `aria-hidden="true"`; nút chỉ có icon phải có `aria-label` trên nút.
- **Màu và kích thước**: dùng `currentColor` theo token chữ (không hardcode màu neon hoặc `#00bba7`, `#10b981`, `#00a73d`); giữ `size`/`strokeWidth` nhất quán theo `docs/design-system/cloudy-blue.md`.
- **Tiền tệ trong game là "Coin"**: icon là `Coins`.
- **Next.js**: `pulsoicon-react` nằm trong `experimental.optimizePackageImports`; chỉ import theo tên (không `import *`). Phụ thuộc `motion` (>=12) là bắt buộc của gói này, khác `framer-motion`.
- Bảng ánh xạ icon cũ sang PulsoIcon: `docs/design-system/icons.md`.
