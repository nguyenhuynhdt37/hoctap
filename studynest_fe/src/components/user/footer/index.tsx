import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Cấp học & Lộ trình */}
          <div>
            <h4 className="font-semibold text-foreground mb-5 text-sm tracking-wide uppercase">
              Lộ trình cấp học
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#grade-levels"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Tiểu học (Lớp 1 – Lớp 5)
                </Link>
              </li>
              <li>
                <Link
                  href="/#grade-levels"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Trung học cơ sở (Lớp 6 – Lớp 9)
                </Link>
              </li>
              <li>
                <Link
                  href="/#grade-levels"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Trung học phổ thông (Lớp 10 – Lớp 12)
                </Link>
              </li>
              <li>
                <Link
                  href="/#platform-experience"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Trải nghiệm phòng học trực tuyến
                </Link>
              </li>
              <li>
                <Link
                  href="/#courses-section"
                  className="text-primary hover:text-primary-hover transition-colors duration-200 text-sm leading-relaxed flex items-center font-semibold pt-1"
                >
                  Khám phá khóa học nổi bật →
                </Link>
              </li>
            </ul>
          </div>

          {/* Môn học trọng tâm */}
          <div>
            <h4 className="font-semibold text-foreground mb-5 text-sm tracking-wide uppercase">
              Môn học trọng tâm
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#subjects-section"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Toán học & Tư duy Logic
                </Link>
              </li>
              <li>
                <Link
                  href="/#subjects-section"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Tiếng Việt & Ngữ văn
                </Link>
              </li>
              <li>
                <Link
                  href="/#subjects-section"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Tiếng Anh & Ngoại ngữ
                </Link>
              </li>
              <li>
                <Link
                  href="/#subjects-section"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Khoa học Tự nhiên (Lý – Hóa – Sinh)
                </Link>
              </li>
              <li>
                <Link
                  href="/#subjects-section"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Tin học & Khoa học Máy tính
                </Link>
              </li>
            </ul>
          </div>

          {/* Về Mây Mây */}
          <div>
            <h4 className="font-semibold text-foreground mb-5 text-sm tracking-wide uppercase">
              Về Mây Mây
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help/about"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link
                  href="/help/instructors"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Đội ngũ giảng viên
                </Link>
              </li>
              <li>
                <Link
                  href="/help/contact"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link
                  href="/help/support"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Hỗ trợ học tập
                </Link>
              </li>
              <li>
                <Link
                  href="/help/blog"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Góc học tập & Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Hỗ trợ & Chính sách */}
          <div>
            <h4 className="font-semibold text-foreground mb-5 text-sm tracking-wide uppercase">
              Hỗ trợ & Chính sách
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link
                  href="/help/terms"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link
                  href="/help/privacy-policy"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link
                  href="/help/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Quyền riêng tư
                </Link>
              </li>
              <li>
                <Link
                  href="/help/faq"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm leading-relaxed flex items-center"
                >
                  Câu hỏi thường gặp (FAQ)
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold text-foreground">Mây</span>
                <span className="text-xl font-bold text-primary ml-1">Mây</span>
              </Link>
              <span className="text-muted-foreground text-sm">
                © 2026 Mây Mây • Nền tảng học tập trực tuyến Lớp 1 – 12.
              </span>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tiếng Việt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
