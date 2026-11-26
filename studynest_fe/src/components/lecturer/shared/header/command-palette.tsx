"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Command,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  Plus,
  RotateCcw,
  Search,
  Tag,
  User,
  Wallet,
  X,
  type PulsoIcon,
} from "pulsoicon-react";

interface CommandItem {
  id: string;
  group: "Tạo mới tức thì" | "Điều hướng nhanh";
  label: string;
  description: string;
  href: string;
  keywords: string;
  icon: PulsoIcon;
  accent: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "create-course",
    group: "Tạo mới tức thì",
    label: "Tạo khóa học mới",
    description: "Khởi tạo giáo trình, chương bài và xuất bản",
    href: "/lecturer/courses/create",
    keywords: "tao khoa hoc moi course create",
    icon: Plus,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    id: "create-combo",
    group: "Tạo mới tức thì",
    label: "Tạo combo lộ trình",
    description: "Đóng gói nhiều khóa học với giá ưu đãi",
    href: "/lecturer/combos/create",
    keywords: "tao combo lo trinh bundle create",
    icon: Library,
    accent:
      "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
  {
    id: "create-discount",
    group: "Tạo mới tức thì",
    label: "Tạo mã giảm giá & Coupon",
    description: "Mở xưởng khuyến mãi khóa học và combo",
    href: "/lecturer/discounts",
    keywords: "ma giam gia coupon khuyen mai discount",
    icon: Tag,
    accent:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
  {
    id: "create-withdraw",
    group: "Tạo mới tức thì",
    label: "Tạo yêu cầu rút tiền",
    description: "Chuyển Coin từ ví khả dụng về tài khoản ngân hàng",
    href: "/lecturer/withdraw/create",
    keywords: "rut tien withdraw ngan hang vi",
    icon: ArrowDownToLine,
    accent: "bg-success-bg text-success-foreground border-success-border",
  },
  {
    id: "nav-contracts",
    group: "Điều hướng nhanh",
    label: "Hợp đồng điện tử & Chứng thư X.509",
    description: "Xem hợp đồng đã ký, tải PDF PAdES và ký phụ lục khóa học",
    href: "/lecturer/contracts",
    keywords: "hop dong dien tu chu ky so contract pki x509 pdf",
    icon: FileText,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    id: "nav-home",
    group: "Điều hướng nhanh",
    label: "Tổng quan giảng viên",
    description: "Bảng điều hành chính của giảng viên",
    href: "/lecturer",
    keywords: "tong quan trang chu home dashboard studio",
    icon: LayoutDashboard,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    id: "nav-stats",
    group: "Điều hướng nhanh",
    label: "Thống kê & Báo cáo chuyên sâu",
    description: "Phân tích doanh thu, học viên và hiệu suất",
    href: "/lecturer/dashboard",
    keywords: "thong ke bao cao doanh thu stats analytics",
    icon: BarChart3,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    id: "nav-courses",
    group: "Điều hướng nhanh",
    label: "Quản lý khóa học",
    description: "Danh sách khóa học, chương bài, tài nguyên & câu hỏi",
    href: "/lecturer/courses",
    keywords: "khoa hoc chuong bai tai nguyen cau hoi courses",
    icon: BookOpen,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    id: "nav-combos",
    group: "Điều hướng nhanh",
    label: "Xưởng Combo & Lộ trình",
    description: "Quản lý và bật/tắt mở bán các gói combo",
    href: "/lecturer/combos",
    keywords: "combo lo trinh bundles",
    icon: Library,
    accent:
      "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
  {
    id: "nav-refund",
    group: "Điều hướng nhanh",
    label: "Trạm hoàn tiền",
    description: "Thẩm định, chấp thuận hoặc từ chối hồ sơ hoàn tiền",
    href: "/lecturer/refund",
    keywords: "hoan tien refund tranh chap",
    icon: RotateCcw,
    accent:
      "bg-destructive-bg text-destructive-foreground border-destructive-border",
  },
  {
    id: "nav-hold",
    group: "Điều hướng nhanh",
    label: "Kho tạm giữ & Lịch giải ngân",
    description: "Theo dõi đếm ngược các khoản tiền đang hold",
    href: "/lecturer/hold",
    keywords: "hold tam giu giai ngan escrow",
    icon: Clock,
    accent:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
  {
    id: "nav-wallet",
    group: "Điều hướng nhanh",
    label: "Ví giảng viên",
    description: "Xem số dư khả dụng và lịch sử dòng tiền",
    href: "/lecturer/wallets",
    keywords: "vi wallet so du coin",
    icon: Wallet,
    accent: "bg-success-bg text-success-foreground border-success-border",
  },
  {
    id: "nav-profile",
    group: "Điều hướng nhanh",
    label: "Hồ sơ giảng viên",
    description: "Cập nhật thông tin cá nhân và giới thiệu",
    href: "/lecturer/profile",
    keywords: "ho so profile tai khoan",
    icon: User,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    id: "nav-student",
    group: "Điều hướng nhanh",
    label: "Chuyển về chế độ học viên",
    description: "Quay lại trang chủ Mây Mây",
    href: "/",
    keywords: "hoc vien student trang chu",
    icon: GraduationCap,
    accent:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
];

interface SkyCommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function SkyCommandPalette({ open, onClose }: SkyCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const executeSelection = (href: string) => {
    onClose();
    router.push(href);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) =>
          filtered.length === 0 ? 0 : (prev + 1) % filtered.length,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) =>
          filtered.length === 0
            ? 0
            : (prev - 1 + filtered.length) % filtered.length,
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (filtered[activeIndex]) {
          executeSelection(filtered[activeIndex].href);
        } else if (query.trim()) {
          executeSelection(
            `/lecturer/courses?search=${encodeURIComponent(query.trim())}`,
          );
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, query, onClose]);

  if (!open) return null;

  const grouped = {
    "Tạo mới tức thì": filtered.filter((i) => i.group === "Tạo mới tức thì"),
    "Điều hướng nhanh": filtered.filter((i) => i.group === "Điều hướng nhanh"),
  };

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-foreground/25 px-4 pt-16 backdrop-blur-sm sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Sky Quick Launcher"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[28px] border border-primary-pastel bg-surface/95 shadow-ambient-lg backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ô nhập lệnh */}
        <div className="flex items-center gap-3 border-b border-primary-pastel/60 bg-gradient-to-r from-primary-light/65 via-surface to-accent-vanilla/50 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-surface text-primary shadow-2xs">
            <Command animated={false} className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập lệnh, tên phân khu hoặc tìm khóa học..."
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng lệnh"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Danh sách kết quả */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="space-y-3 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                Không có lệnh trùng khớp với &ldquo;{query}&rdquo;
              </p>
              <button
                type="button"
                onClick={() =>
                  executeSelection(
                    `/lecturer/courses?search=${encodeURIComponent(query.trim())}`,
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light/70 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-light cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Tìm khóa học &ldquo;{query.trim()}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(
                Object.entries(grouped) as Array<
                  [CommandItem["group"], CommandItem[]]
                >
              ).map(([groupTitle, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupTitle}>
                    <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {groupTitle}
                    </p>
                    <ul className="space-y-1">
                      {items.map((item) => {
                        runningIndex += 1;
                        const currentIdx = runningIndex;
                        const Icon = item.icon;
                        const isActive = currentIdx === activeIndex;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIndex(currentIdx)}
                              onClick={() => executeSelection(item.href)}
                              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                                isActive
                                  ? "border-primary-pastel bg-primary-light/65 shadow-2xs"
                                  : "border-transparent hover:bg-background"
                              }`}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.accent}`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {item.label}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                              <ArrowRight
                                className={`h-4 w-4 shrink-0 transition-transform ${
                                  isActive
                                    ? "translate-x-0.5 text-primary"
                                    : "text-border"
                                }`}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {/* Gợi ý tìm khóa học trực tiếp khi đang gõ */}
              {query.trim() && (
                <div className="border-t border-border/70 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeSelection(
                        `/lecturer/courses?search=${encodeURIComponent(query.trim())}`,
                      )
                    }
                    className="flex w-full items-center justify-between gap-2 rounded-2xl border border-primary-pastel/70 bg-accent-vanilla/55 px-3.5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent-vanilla cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-primary" />
                      Tìm trong danh mục khóa học: &ldquo;{query.trim()}&rdquo;
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer phím tắt */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-background/80 px-5 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{" "}
              Di chuyển
            </span>
            <span>
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              Mở nhanh
            </span>
          </div>
          <span>
            <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>{" "}
            Đóng
          </span>
        </div>
      </div>
    </div>
  );
}
