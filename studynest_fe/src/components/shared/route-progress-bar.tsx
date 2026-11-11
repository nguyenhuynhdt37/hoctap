"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * RouteProgressBar: Thanh tiến độ chuyển trang mỏng nhẹ ở đỉnh màn hình
 * theo ngôn ngữ thiết kế Cloudy Blue (Korean Pastel Minimalism).
 * Tự động kích hoạt khi click vào các liên kết nội bộ và biến mất khi trang tải xong.
 */
export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Khi đường dẫn hoặc query thay đổi, kết thúc loading
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Bắt sự kiện click các link nội bộ
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Bỏ qua nếu là link ngoài, mở tab mới, download hoặc hash anchor
      if (
        !href ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        targetAttr === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // Bỏ qua nếu click vào chính trang hiện tại
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) return;

      // Bắt đầu thanh tiến độ
      setLoading(true);
      setProgress(18);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 88;
          }
          const step = Math.random() * 12 + 4;
          return Math.min(prev + step, 88);
        });
      }, 200);
    };

    document.addEventListener("click", handleAnchorClick, true);

    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-[#6FA1D2] to-[#BFD7ED] shadow-[0_0_12px_rgba(53,111,167,0.6)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
