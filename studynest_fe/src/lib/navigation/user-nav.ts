/**
 * BẢN ĐỒ ĐIỀU HƯỚNG NGƯỜI DÙNG — nguồn sự thật duy nhất.
 *
 * Header (đảo mây trên desktop + ngăn kéo di động) chỉ đọc từ file này.
 * Script `tests/test-user-nav-coverage.cjs` quét mọi thuộc tính href trong file
 * này để chắc chắn mỗi route tĩnh của người dùng đều có lối vào. Vì vậy mỗi
 * route phải là một chuỗi hằng trong thuộc tính href, không ghép bằng template/biến.
 */
import {
  Bell,
  BookOpen,
  Bot,
  CircleHelp,
  Flag,
  Trophy,
  Gift,
  GraduationCap,
  Heart,
  LayoutGrid,
  ListChecks,
  LogIn,
  Map,
  Network,
  Package,
  Receipt,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  Undo2,
  UserPlus,
  UserRound,
  UsersRound,
  Wallet,
  Route,
  type LucideIcon,
} from "lucide-react";

/** Ai nhìn thấy mục này. `member` gồm cả giảng viên và quản trị. */
export type NavAudience = "all" | "guest" | "member" | "lecturer" | "admin" | "aspiring-lecturer";

export type NavTone = "blue" | "pink" | "lavender" | "vanilla";

/** Huy hiệu động; header tự điền giá trị từ dữ liệu thật. */
export type NavBadgeKey = "unread" | "missions" | "balance";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavItem {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  audience: NavAudience;
  /** `wide` = ô lớn chiếm cả hàng trong lưới nhóm. */
  size?: "wide";
  badge?: NavBadgeKey;
  /** Lối nhanh phụ hiển thị dạng chip dưới ô. */
  children?: NavLink[];
}

export interface NavGroup {
  id: "learn" | "explore" | "wallet" | "account";
  label: string;
  tagline: string;
  tone: NavTone;
  icon: LucideIcon;
  items: NavItem[];
}

export interface Viewer {
  signedIn: boolean;
  isLecturer: boolean;
  isAdmin: boolean;
}

export const HOME_HREF = "/";

export const USER_NAV: NavGroup[] = [
  {
    id: "learn",
    label: "Học tập",
    tagline: "Bay tiếp hành trình của bạn",
    tone: "blue",
    icon: BookOpen,
    items: [
      { id: "my-learning", href: "/my-learning", label: "Khóa học của tôi", description: "Quay lại đúng bài đang học dở", icon: BookOpen, audience: "member", size: "wide" },
      { id: "my-paths", href: "/lo-trinh/cua-toi", label: "Lộ trình của tôi", description: "Các chặng bạn đang theo", icon: Route, audience: "member" },
      { id: "review", href: "/review", label: "Ôn tập", description: "Nhắc lại đúng lúc để nhớ lâu", icon: ListChecks, audience: "member" },
      { id: "mastery", href: "/mastery", label: "Bản đồ năng lực", description: "Chỗ đã vững, chỗ cần luyện", icon: Network, audience: "member" },
      { id: "goals", href: "/goals", label: "Mục tiêu", description: "Đặt đích đến cho tuần này", icon: Target, audience: "member" },
      { id: "missions", href: "/missions", label: "Nhiệm vụ", description: "Làm xong để nhận thưởng", icon: Flag, audience: "member", badge: "missions" },
      { id: "levels", href: "/levels", label: "Cấp độ & phần thưởng", description: "Xem các cấp đã đạt và quà ở mỗi chặng", icon: Trophy, audience: "member" },
      { id: "ai", href: "/chat-sql", label: "Hỏi Mây AI", description: "Hỏi bài, Mây giải thích từng bước", icon: Bot, audience: "member" },
    ],
  },
  {
    id: "explore",
    label: "Khám phá & mua",
    tagline: "Tìm khóa học hợp với bạn",
    tone: "pink",
    icon: Map,
    items: [
      {
        id: "courses", href: "/courses", label: "Khóa học", description: "Chọn theo cấp học và môn", icon: BookOpen, audience: "all", size: "wide",
        children: [
          { href: "/courses?level=tieu-hoc", label: "Tiểu học · Lớp 1–5" },
          { href: "/courses?level=thcs", label: "THCS · Lớp 6–9" },
          { href: "/courses?level=thpt", label: "THPT · Lớp 10–12" },
        ],
      },
      { id: "combo", href: "/combo", label: "Combo", description: "Gói khóa học tiết kiệm hơn", icon: Package, audience: "all" },
      { id: "paths", href: "/lo-trinh", label: "Lộ trình", description: "Chặng học dựng sẵn theo mục tiêu", icon: Map, audience: "all" },
      { id: "instructors", href: "/instructors", label: "Giáo viên", description: "Gặp những người dẫn đường", icon: UsersRound, audience: "all" },
      {
        id: "favorites", href: "/favorites", label: "Yêu thích", description: "Khóa học bạn đã thả tim", icon: Heart, audience: "member",
        children: [{ href: "/favorites/instructors", label: "Giáo viên yêu thích" }],
      },
      { id: "shop", href: "/shop", label: "Cửa hàng", description: "Dùng Coin đổi đồ trang trí cho hồ sơ", icon: ShoppingBag, audience: "member" },
      { id: "gifts", href: "/gifts", label: "Quà tặng", description: "Quà và ưu đãi dành cho bạn", icon: Gift, audience: "member" },
      { id: "combo-orders", href: "/combo/don-hang", label: "Đơn combo", description: "Theo dõi các gói đã mua", icon: ShoppingBag, audience: "member" },
    ],
  },
  {
    id: "wallet",
    label: "Ví & thanh toán",
    tagline: "Tiền học phí rõ ràng, an tâm",
    tone: "vanilla",
    icon: Wallet,
    items: [
      { id: "wallet", href: "/wallets", label: "Ví của tôi", description: "Số dư và nạp tiền", icon: Wallet, audience: "member", size: "wide", badge: "balance" },
      { id: "transactions", href: "/wallets/transactions", label: "Lịch sử giao dịch", description: "Mọi khoản vào ra của ví", icon: Receipt, audience: "member" },
      {
        // `/refunds/my_refund` hiển thị cùng một màn hình với trang này (xem ngoại lệ trong script kiểm tra).
        id: "refunds", href: "/refunds/my-requests", label: "Hoàn tiền", description: "Các yêu cầu bạn đã gửi", icon: Undo2, audience: "member",
        children: [
          { href: "/refunds/refundable", label: "Khóa có thể hoàn" },
          { href: "/refunds/create", label: "Tạo yêu cầu" },
        ],
      },
    ],
  },
  {
    id: "account",
    label: "Tài khoản",
    tagline: "Của riêng bạn",
    tone: "lavender",
    icon: UserRound,
    items: [
      { id: "login", href: "/login", label: "Đăng nhập", description: "Vào lại bầu trời của bạn", icon: LogIn, audience: "guest", size: "wide" },
      { id: "register", href: "/register", label: "Đăng ký miễn phí", description: "Tạo tài khoản chỉ mất một phút", icon: UserPlus, audience: "guest" },
      { id: "profile", href: "/profile", label: "Hồ sơ", description: "Thông tin và ảnh đại diện", icon: UserRound, audience: "member" },
      { id: "notifications", href: "/notifications", label: "Thông báo", description: "Tin mới dành cho bạn", icon: Bell, audience: "member", badge: "unread" },
      { id: "personalize", href: "/personalize", label: "Cá nhân hóa", description: "Chọn lớp và môn bạn quan tâm", icon: SlidersHorizontal, audience: "member" },
      { id: "help", href: "/help", label: "Trợ giúp", description: "Câu hỏi thường gặp, liên hệ Mây", icon: CircleHelp, audience: "all" },
      { id: "lecturer", href: "/lecturer", label: "Bảng điều khiển giảng viên", description: "Quản lý khóa học của bạn", icon: LayoutGrid, audience: "lecturer", size: "wide" },
      { id: "admin", href: "/admin", label: "Quản trị", description: "Khu vực dành cho quản trị viên", icon: LayoutGrid, audience: "admin", size: "wide" },
      { id: "become-lecturer", href: "/welcome", label: "Trở thành giảng viên", description: "Mở lớp và chia sẻ kiến thức", icon: GraduationCap, audience: "aspiring-lecturer", size: "wide" },
    ],
  },
];

/** Lối chính hiển thị ngay trên đảo khi gọn (đúng thứ tự ngoài thanh). */
export const PRIMARY_LINKS: NavLink[] = [
  { href: "/courses", label: "Khóa học" },
  { href: "/combo", label: "Combo & lộ trình" },
  { href: "/instructors", label: "Giáo viên" },
  { href: "/help", label: "Trợ giúp" },
];

export function isVisibleTo(audience: NavAudience, viewer: Viewer): boolean {
  switch (audience) {
    case "all": return true;
    case "guest": return !viewer.signedIn;
    case "member": return viewer.signedIn;
    case "lecturer": return viewer.signedIn && viewer.isLecturer;
    case "admin": return viewer.signedIn && viewer.isAdmin && !viewer.isLecturer;
    case "aspiring-lecturer": return viewer.signedIn && !viewer.isLecturer && !viewer.isAdmin;
  }
}

/** Nhóm/mục hiển thị cho từng loại người xem; nhóm rỗng bị bỏ. */
export function getNavFor(viewer: Viewer): NavGroup[] {
  return USER_NAV
    .map((group) => ({ ...group, items: group.items.filter((item) => isVisibleTo(item.audience, viewer)) }))
    .filter((group) => group.items.length > 0);
}

export function hrefPath(href: string): string {
  return href.split(/[?#]/)[0] || "/";
}

/** Đang đứng đúng trang này (dùng cho `aria-current="page"`). */
export function isCurrentPage(pathname: string, href: string): boolean {
  if (href.includes("?")) return false;
  return pathname === hrefPath(href);
}

/** Đang ở trong khu vực của mục này (trang con), dùng cho nhấn mạnh phụ. */
export function isInSection(pathname: string, href: string): boolean {
  const path = hrefPath(href);
  return path !== "/" && pathname.startsWith(`${path}/`);
}
