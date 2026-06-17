"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HiAcademicCap, HiBookOpen, HiChat, HiDocumentText, HiInformationCircle, HiQuestionMarkCircle, HiShieldCheck } from "react-icons/hi";
import { AboutSection } from "./sections/about-section";
import { BlogSection } from "./sections/blog-section";
import { ContactSection } from "./sections/contact-section";
import { FaqSection } from "./sections/faq-section";
import { InstructorsSection } from "./sections/instructors-section";
import { PrivacyPolicySection } from "./sections/privacy-policy-section";
import { PrivacySection } from "./sections/privacy-section";
import { SupportSection } from "./sections/support-section";
import { TermsSection } from "./sections/terms-section";

interface HelpMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const helpMenuItems: HelpMenuItem[] = [
  { id: "help", label: "Trung tâm trợ giúp", icon: HiQuestionMarkCircle },
  { id: "terms", label: "Điều khoản sử dụng", icon: HiDocumentText },
  { id: "privacy-policy", label: "Chính sách bảo mật", icon: HiShieldCheck },
  { id: "privacy", label: "Quyền riêng tư", icon: HiShieldCheck },
  { id: "faq", label: "FAQ", icon: HiQuestionMarkCircle },
  { id: "about", label: "Giới thiệu", icon: HiInformationCircle },
  { id: "instructors", label: "Giảng viên", icon: HiAcademicCap },
  { id: "contact", label: "Liên hệ", icon: HiChat },
  { id: "support", label: "Hỗ trợ", icon: HiChat },
  { id: "blog", label: "Blog", icon: HiBookOpen },
];

interface HelpCenterProps {
  activeSection?: string;
}

export default function HelpCenter({ activeSection }: HelpCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSection, setCurrentSection] = useState<string>(
    activeSection || "help"
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (activeSection) {
      setCurrentSection(activeSection);
    } else {
      const slug = pathname.split("/").pop() || "help";
      setCurrentSection(slug);
    }
  }, [activeSection, pathname]);

  const handleMenuClick = (sectionId: string) => {
    setCurrentSection(sectionId);
    if (sectionId === "help") {
      router.push("/help");
    } else {
      router.push(`/help/${sectionId}`);
    }
  };

  const renderContent = () => {
    switch (currentSection) {
      case "help":
        return <SupportSection />;
      case "terms":
        return <TermsSection />;
      case "privacy-policy":
        return <PrivacyPolicySection />;
      case "privacy":
        return <PrivacySection />;
      case "faq":
        return <FaqSection />;
      case "about":
        return <AboutSection />;
      case "instructors":
        return <InstructorsSection />;
      case "contact":
        return <ContactSection />;
      case "support":
        return <SupportSection />;
      case "blog":
        return <BlogSection />;
      default:
        return <SupportSection />;
    }
  };

  const activeItem = helpMenuItems.find((item) => item.id === currentSection);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo and Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-3 group flex-shrink-0"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity blur-lg" />
                <img
                  src="/logo/studynest-logo.svg"
                  alt="StudyNest Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-xl font-black text-gray-900 tracking-wide">
                    STUDY
                  </span>
                  <span className="text-xl font-black text-teal-500 ml-0.5">
                    NEST
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500 tracking-widest uppercase -mt-1">
                  Spreading Knowledge
                </span>
              </div>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
              {helpMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                        : "text-gray-700 hover:bg-gray-50 hover:text-teal-600"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                {isMobileMenuOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col gap-1">
                {helpMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleMenuClick(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "text-gray-700 hover:bg-gray-50 hover:text-teal-600"
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Full Width Blog Style */}
      <main className="w-full">
        {/* Hero Section */}
        {activeItem && (
          <div className="w-full bg-gradient-to-br from-teal-50 to-emerald-50 border-b border-gray-200 py-12 lg:py-16">
            <div className="max-w-4xl mx-auto px-4 lg:px-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center">
                  <activeItem.icon className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-teal-600 uppercase tracking-wide">
                    Trung tâm trợ giúp
                  </div>
                </div>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {activeItem.label}
              </h1>
            </div>
          </div>
        )}

        {/* Content Section */}
        <article className="w-full">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 lg:py-16">
            <div className="prose prose-lg prose-teal max-w-none">
              {renderContent()}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

