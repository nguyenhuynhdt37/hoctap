"use client";

import LandingDynamicIsland from "@/components/user/home/cinematic/LandingDynamicIsland";
import { usePathname } from "next/navigation";

/**
 * Header toàn cục: thay thanh header cũ bằng Dynamic Island (kèm logo góc trái).
 * Trang chủ tự render island riêng để truyền hành vi cuộn/chọn cấp học.
 */
const Header = () => {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  // Các trang auth dùng video toàn màn hình nên không cần khoảng đệm phía trên
  const isFullBleed = ["/login", "/register", "/email_authentication"].some(
    (path) => pathname?.startsWith(path)
  );

  return (
    <>
      <LandingDynamicIsland />
      {!isFullBleed && <div className="h-20" aria-hidden="true" />}
    </>
  );
};

export default Header;
