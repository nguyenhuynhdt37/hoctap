# CLAUDE.md — Mây Mây

Quy tắc chung của dự án nằm ở [`AGENTS.md`](./AGENTS.md) (Cloudy Blue design system, v.v.). Hãy đọc file đó trước. Mục dưới đây là quy tắc riêng về icon, bắt buộc với mọi thay đổi giao diện.

## Icon System (PulsoIcon)

Toàn bộ icon trong `studynest_fe/` dùng **PulsoIcon** (https://pulsoicon.com, gói `pulsoicon-react`). Không dùng thư viện icon nào khác.

1. Import icon **chỉ** từ `pulsoicon-react`, theo tên: `import { Bell, Coins } from "pulsoicon-react"`. Tên và prop giống `lucide-react`; thêm `solid`, `animated`, `autoAnimated`, `play`.
2. **Không** import từ `lucide-react`, `react-icons`, `@heroicons`, `@tabler/icons`, `@radix-ui/react-icons`. Chạy `node studynest_fe/tests/test-icon-source.cjs` để kiểm tra; test fail nếu vi phạm.
3. **Không** dùng icon Sparkles/HiSparkles hoặc bất kỳ hình sparkle nào. Icon AI dùng `Bot`; nổi bật dùng `Star`.
4. Chuyển động: giữ mặc định (chạy khi hover/focus) cho nút và link; icon trang trí trong danh sách dày hoặc vùng cuộn dài đặt `animated={false}`; phải tôn trọng `prefers-reduced-motion`.
5. Truy cập: icon trang trí `aria-hidden="true"`; nút chỉ có icon cần `aria-label`.
6. Màu `currentColor` theo semantic token của Cloudy Blue; không hardcode màu neon hay `#00bba7`, `#10b981`, `#00a73d`.
7. Icon tiền tệ Coin là `Coins`. Giao diện không hiển thị chữ "Peak".
8. Ánh xạ icon cũ sang PulsoIcon: `docs/design-system/icons.md`.
