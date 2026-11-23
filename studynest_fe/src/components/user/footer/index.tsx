import {
  CloudBlob,
  GlassCard,
  Reveal,
  SectionHeader,
  SectionShell,
} from "@/components/user/home/landing-ui";
import { cn } from "@/lib/utils";
import { ArrowRight, Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const footerGroups = [
  {
    title: "Lộ trình cấp học",
    links: [
      { href: "/#grade-levels", label: "Tiểu học (Lớp 1 – Lớp 5)" },
      { href: "/#grade-levels", label: "Trung học cơ sở (Lớp 6 – Lớp 9)" },
      { href: "/#grade-levels", label: "Trung học phổ thông (Lớp 10 – Lớp 12)" },
      { href: "/#platform-experience", label: "Trải nghiệm phòng học trực tuyến" },
      {
        href: "/#courses-section",
        label: "Khám phá khóa học nổi bật",
        featured: true,
      },
    ],
  },
  {
    title: "Môn học trọng tâm",
    links: [
      { href: "/#subjects-section", label: "Toán học & Tư duy Logic" },
      { href: "/#subjects-section", label: "Tiếng Việt & Ngữ văn" },
      { href: "/#subjects-section", label: "Tiếng Anh & Ngoại ngữ" },
      { href: "/#subjects-section", label: "Khoa học Tự nhiên (Lý – Hóa – Sinh)" },
      { href: "/#subjects-section", label: "Tin học & Khoa học Máy tính" },
    ],
  },
  {
    title: "Về Mây Mây",
    links: [
      { href: "/help/about", label: "Giới thiệu" },
      { href: "/instructors", label: "Đội ngũ giảng viên" },
      { href: "/help/contact", label: "Liên hệ" },
      { href: "/help/support", label: "Hỗ trợ học tập" },
      { href: "/help/blog", label: "Góc học tập & Blog" },
    ],
  },
  {
    title: "Hỗ trợ & Chính sách",
    links: [
      { href: "/help", label: "Trung tâm trợ giúp" },
      { href: "/help/terms", label: "Điều khoản sử dụng" },
      { href: "/help/privacy-policy", label: "Chính sách bảo mật" },
      { href: "/help/privacy", label: "Quyền riêng tư" },
      { href: "/help/faq", label: "Câu hỏi thường gặp (FAQ)" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface">
      <SectionShell
        clouds={false}
        className="bg-none!"
        innerClassName="pt-12! pb-10! md:pt-16! md:pb-14!"
      >
        <div className="grid items-start gap-9 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-12">
          <GlassCard tilt={false} className="relative isolate overflow-hidden p-5 sm:p-6">
            <CloudBlob className="-right-16 -bottom-16 h-40 w-52 bg-primary-pastel/70!" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -bottom-14 size-36 rounded-full border border-primary-pastel/80"
            />
            <SectionHeader
              align="left"
              title={
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-xl hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary-pastel bg-primary-light">
                    <Image src="/logo/studynest-logo.svg" alt="" width={30} height={30} />
                  </span>
                  <span>
                    Mây <span className="text-primary">Mây</span>
                  </span>
                </Link>
              }
              description="Nền tảng học tập trực tuyến cho học sinh Lớp 1 – 12."
              className="mb-0! gap-3! [&>h2]:text-2xl [&>p]:max-w-[27ch] [&>p]:text-sm [&>p]:text-foreground/85 md:[&>h2]:text-2xl md:[&>p]:text-sm"
            />
          </GlassCard>

          <nav
            aria-label="Điều hướng cuối trang"
            className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-x-4 xl:gap-x-6"
          >
            {footerGroups.map(({ title, links }, index) => (
              <Reveal key={title} delay={index * 0.08} className="min-w-0">
                <h3 className="mb-2 border-b border-border pb-3 text-sm leading-snug font-semibold text-foreground">
                  {title}
                </h3>
                <ul>
                  {links.map(({ href, label, featured }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-md py-1.5 text-sm leading-snug decoration-primary-pastel underline-offset-4 transition-colors hover:text-primary hover:underline",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none",
                          featured ? "font-semibold text-primary" : "text-foreground/85",
                        )}
                      >
                        <span>{label}</span>
                        {featured && (
                          <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </nav>
        </div>
      </SectionShell>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 text-sm text-foreground/85 sm:px-8">
          <p>© 2026 Mây Mây</p>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary">
            <Globe aria-hidden="true" className="size-4" />
            Tiếng Việt
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
