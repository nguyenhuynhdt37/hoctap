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
