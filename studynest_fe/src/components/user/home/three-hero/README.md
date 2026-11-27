# Three.js Hero "Hành trình qua các tầng mây"

## Kiến trúc
- `contract.ts`: kiểu chung, `LEVELS`, `SKY_BY_LEVEL`, `HeroQuality`, hàm camera. Không sửa tùy tiện.
- `progressRef` (`{current: 0..1}`) do `ScrollThreeHero` ghi (đã làm mượt) và được Canvas/Cards đọc trong `useFrame`, không dùng React state.
- 3 tầng: Tiểu học (0), THCS (0.5), THPT (1).
- Các file: `ScrollThreeHero` (hero gọn, chọn cấp học bằng nút), `ThreeHeroCanvas`/`SkyGradient`/`CloudField` (cảnh 3D), `FloatingCards` (thẻ nổi), `useHeroQuality.ts` + `ThreeHeroFallback.tsx` (chất lượng và dự phòng tĩnh).

## Chỉnh tier chất lượng
Sửa `QUALITY_TIERS` (dpr, cloudCount, enableDepthBlur, enableHtmlCards) và hàm `computeQuality()` trong `useHeroQuality.ts`
(ngưỡng: rộng < 768, `hardwareConcurrency`, `deviceMemory`, `devicePixelRatio`, `connection.saveData`).
Render đầu luôn là tier `low` (an toàn SSR), sau mount mới nâng cấp.

## Test fallback
- Chrome DevTools > Rendering > "Emulate CSS media feature prefers-reduced-motion: reduce".
- Tắt WebGL: `chrome://flags` > tắt "WebGL", hoặc chặn `getContext` trong console trước khi tải.
- Hooks: `useReducedMotionPreference()`, `useWebGLSupport()` (null khi chưa kiểm tra). Dùng fallback nếu reduced = true hoặc webgl === false.
