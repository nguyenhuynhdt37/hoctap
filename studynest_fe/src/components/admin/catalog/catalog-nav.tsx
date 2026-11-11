"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["/admin/catalog", "Cấp học & môn", "Cấu hình lớp, môn và đơn vị"],
  ["/admin/catalog/courses", "Khóa học", "Gán phân loại cho khóa học"],
  ["/admin/learning-paths", "Lộ trình", "Sắp chặng và tuyển chọn khóa"],
  ["/admin/bundles", "Combo & ưu đãi", "Đặt giá bán và mã giảm riêng"],
] as const;
export default function CatalogAdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Quản lý học tập"
      className="grid gap-2 rounded-2xl border border-border bg-surface p-2 sm:grid-cols-2 xl:grid-cols-4"
    >
      {links.map(([href, title, description], index) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={`min-w-0 rounded-xl px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${pathname === href ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary-light hover:text-primary"}`}
        >
          <span className="block font-semibold">{index + 1}. {title}</span>
          <span className={`mt-1 block text-xs leading-relaxed ${pathname === href ? "text-primary-foreground" : "text-muted-foreground"}`}>
            {description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
