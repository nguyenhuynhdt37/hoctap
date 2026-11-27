import { Globe } from "@/components/ui/server-icons";
import Image from "next/image";
import Link from "next/link";

const footerGroups = [
  {
    title: "Khám phá",
    links: [
      { href: "/courses", label: "Khóa học" },
      { href: "/combo", label: "Combo và lộ trình" },
      { href: "/instructors", label: "Đội ngũ giáo viên" },
    ],
  },
  {
    title: "Trợ giúp",
    links: [
      { href: "/help", label: "Trung tâm trợ giúp" },
      { href: "/help/contact", label: "Liên hệ" },
      { href: "/help/about", label: "Về Mây Mây" },
    ],
  },
  {
    title: "Chính sách",
    links: [
      { href: "/help/terms", label: "Điều khoản sử dụng" },
      { href: "/help/privacy-policy", label: "Bảo mật và quyền riêng tư" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="user-container py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
          <div>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-xl font-semibold text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
              <Image src="/logo/studynest-logo.svg" alt="" width={36} height={36} />
              Mây Mây
            </Link>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-foreground/85">
              Nền tảng học trực tuyến cho học sinh từ lớp 1 đến lớp 12.
            </p>
          </div>

          <nav aria-label="Điều hướng cuối trang" className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            {footerGroups.map(({ title, links }) => (
              <div key={title} className="min-w-0">
                <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
                <ul>
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <Link href={href} className="inline-flex min-h-10 items-center rounded-md py-1 text-sm leading-snug text-foreground/85 underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm text-foreground/85">
          <p>© 2026 Mây Mây</p>
          <span className="inline-flex items-center gap-2">
            <Globe aria-hidden="true" className="size-4 text-primary" />
            Tiếng Việt
          </span>
        </div>
      </div>
    </footer>
  );
}
