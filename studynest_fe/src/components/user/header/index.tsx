"use client";

import LandingDynamicIsland from "@/components/user/home/cinematic/LandingDynamicIsland";
import { usePathname } from "next/navigation";

/**
 * Header toàn cục: thay thanh header cũ bằng Dynamic Island (kèm logo góc trái).
 * Trang chủ tự render island riêng để gắn nút bỏ qua video.
 */
const Header = () => {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return <LandingDynamicIsland />;
};

export default Header;
