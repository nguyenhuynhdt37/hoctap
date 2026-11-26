"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cloud,
  Coins,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Key,
  Lock,
  PenTool,
  RefreshCw,
  ShieldCheck,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { SigningWorkspace } from "@/components/shared/digital-contract/signing-studio";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useUserStore } from "@/stores/user";
import type { ContractDetail, DigitalCertificateInfo } from "@/types/contract";

interface MasterContractStatus {
  has_signed_master: boolean;
  is_countersigned?: boolean;
  is_pending_countersign?: boolean;
  can_access_portal?: boolean;
  contract_id: string | null;
  contract_number: string | null;
  status: string | null;
  signed_at: string | null;
  countersigned_at?: string | null;
}

const LEGAL_PILLARS = [
  {
    icon: Coins,
    title: "Chia sẻ doanh thu 70% / 30%",
    desc: "Tỷ lệ doanh thu, tỷ giá 1 Coin = 10.000 đ và lịch rút tiền được ghi rõ thành bảng biểu pháp lý.",
    accent:
      "border-accent-vanilla-border bg-accent-vanilla/75 text-accent-vanilla-foreground",
  },
  {
    icon: Key,
    title: "Chứng thư số X.509 & PAdES",
    desc: "Cấp chứng thư số RSA-2048 định danh riêng, tải bản PDF chuẩn Times New Roman nhúng chữ ký số.",
    accent: "border-primary-pastel bg-primary-light text-primary",
  },
  {
    icon: Lock,
    title: "Niêm phong toàn vẹn SHA-256",
    desc: "Khóa chống sửa đổi, lưu trữ bất biến và tra cứu xác thực trực tuyến bất cứ lúc nào qua mã QR.",
    accent: "border-success-border bg-success-bg text-success-foreground",
  },
];

function formatDateTime(val?: string | null): string {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
}

export default function RequireLecturerContract({
  children,
}: {
  children: ReactNode;
}) {
  const user = useUserStore((s) => s.user);
  const [signingDraft, setSigningDraft] = useState<ContractDetail | null>(null);
  const [openingDraft, setOpeningDraft] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const {
    data: status,
    isLoading,
    mutate: mutateStatus,
  } = useSWR<MasterContractStatus>(
    "/lecturer/contracts/status",
    (url: string) => api.get(url).then((r) => r.data),
    {
      revalidateOnFocus: true,
      // Tự động kiểm tra mỗi 15 giây khi đang chờ Bên A (Admin) đồng ký
      refreshInterval: (latest) =>
        latest?.status === "signed" || latest?.is_pending_countersign
          ? 15000
          : 0,
    },
  );

  const canAccessPortal = Boolean(
    status && (status.can_access_portal || status.status === "countersigned"),
  );
  const isPendingCountersign = Boolean(
    status && (status.is_pending_countersign || status.status === "signed"),
  );

  const { data: certResp, mutate: mutateCert } = useSWR<{
    has_certificate: boolean;
    certificate: DigitalCertificateInfo | null;
  }>(
    status && !canAccessPortal && !isPendingCountersign
      ? "/lecturer/contracts/certificate"
      : null,
    (url: string) => api.get(url).then((r) => r.data).catch(() => null),
    { revalidateOnFocus: false },
  );

  async function openSignWorkspace() {
    setOpeningDraft(true);
    try {
      const res = await api.post("/lecturer/contracts/draft", {
        contract_type: "LECTURER_MASTER",
      });
      setSigningDraft(res.data);
    } catch (error: unknown) {
      const detail = (
        error as { response?: { data?: { detail?: string } } }
      )?.response?.data?.detail;
      toast.error(
        typeof detail === "string" && detail.trim()
          ? detail
          : "Không thể khởi tạo văn bản hợp đồng điện tử.",
      );
    } finally {
      setOpeningDraft(false);
    }
  }

  async function handleRecheckStatus() {
    setCheckingStatus(true);
    try {
      const next = await mutateStatus();
      if (next?.can_access_portal || next?.status === "countersigned") {
        toast.success(
          "Ban Quản Trị đã đồng ký xác nhận! Đang mở Không gian Giảng viên...",
        );
      } else {
        toast(
          "Hợp đồng vẫn đang chờ Ban Quản Trị Mây Mây (Bên A) đồng ký xác nhận.",
        );
      }
    } catch {
      toast.error("Không thể kiểm tra trạng thái hợp đồng.");
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleDownloadSignedPdf() {
    if (!status?.contract_id || !status?.contract_number) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(
        `/lecturer/contracts/${status.contract_id}/pdf`,
        { responseType: "blob" },
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${status.contract_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải bản PDF hợp đồng (đã ký Bên B).");
    } catch {
      toast.error("Không thể tải tệp PDF hợp đồng.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (isLoading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-primary-pastel/70 bg-surface px-5 py-3.5 text-sm font-medium text-muted-foreground shadow-xs">
          <ShieldCheck size={18} className="animate-pulse text-primary" />
          Đang xác thực Hợp đồng Điện tử Giảng viên...
        </div>
      </div>
    );
  }

  // CHỈ cho vào không gian /lecturer/* khi đã đủ chữ ký 2 bên (countersigned)
  if (canAccessPortal) {
    return <>{children}</>;
  }

  const initials = (user?.fullname || user?.email || "GV")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // MÀN HÌNH CHỜ BAN QUẢN TRỊ (BÊN A) ĐỒNG KÝ — Cloudy Blue Waiting Lounge
  if (isPendingCountersign) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-primary-light/85 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent-vanilla/65 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-secondary-light/55 blur-3xl" />
        </div>

        <div className="w-full max-w-5xl">
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/85 via-surface/95 to-accent-vanilla/50 p-6 shadow-[0_32px_72px_-24px_rgba(53,111,167,0.22)] backdrop-blur-md sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              {/* Left (7/12): Status Explanation & 3-Step Dual-Signature Progress */}
              <div className="space-y-6 lg:col-span-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg px-3.5 py-1 text-xs font-bold text-warning-foreground shadow-2xs">
                    <Clock size={13} animated={false} className="animate-pulse" />
                    Chờ Bên A đồng ký xác nhận
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-3 py-1 text-xs font-semibold text-primary">
                    <Cloud size={12} animated={false} />
                    Mây Mây Digital Trust · PKI X.509
                  </span>
                </div>

                <div className="space-y-3">
                  <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl">
                    Hợp đồng của bạn đang{" "}
                    <span className="text-primary">chờ Mây Mây đồng ký</span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Cảm ơn bạn đã hoàn tất ký số điện tử (Bên B). Theo quy trình
                    pháp lý 2 chiều của Mây Mây, Ban Quản Trị (Bên A) sẽ kiểm
                    duyệt hồ sơ và đóng dấu đồng ký điện tử.{" "}
                    <strong className="text-foreground">
                      Không gian Giảng viên sẽ tự động mở khóa ngay khi có đủ
                      chữ ký cả 2 bên.
                    </strong>
                  </p>
                </div>

                {/* 3-Step Dual-Signature Timeline */}
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 rounded-2xl border border-success-border bg-success-bg/70 p-3.5 text-xs">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-success text-white">
                      <CheckCircle2 size={15} animated={false} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-success-foreground">
                        1. Bên B (Giảng viên) đã ký số PKI X.509
                      </p>
                      <p className="mt-0.5 text-[11px] text-success-foreground/85">
                        Đã niêm phong lúc {formatDateTime(status.signed_at)} ·
                        Số HĐ:{" "}
                        <code className="font-mono font-bold">
                          {status.contract_number}
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-warning-border bg-warning-bg/80 p-3.5 text-xs shadow-2xs">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-warning-foreground/15 text-warning-foreground">
                      <Clock size={15} animated={false} className="animate-pulse" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-warning-foreground">
                        2. Đang chờ Bên A (Ban Quản Trị Mây Mây) đồng ký
                      </p>
                      <p className="mt-0.5 text-[11px] text-warning-foreground/85">
                        Hệ thống tự động kiểm tra trạng thái mỗi 15 giây. Bạn sẽ
                        nhận được thông báo ngay khi hợp đồng có hiệu lực.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-surface/75 p-3.5 text-xs opacity-75">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground">
                      <Lock size={14} animated={false} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        3. Mở khóa toàn bộ Không gian Giảng viên
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Tạo khóa học, phát hành mã ưu đãi, quản lý học viên và
                        rút Coin doanh thu.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <ArrowLeft size={14} animated={false} />
                    Về trang chủ
                  </Link>
                </div>
              </div>

              {/* Right (5/12): Contract Dossier Card */}
              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-[2rem] border border-primary-pastel bg-surface shadow-[0_24px_60px_-20px_rgba(53,111,167,0.24)]">
                  <div className="border-b border-primary-pastel/60 bg-gradient-to-r from-primary-light/85 via-surface to-accent-vanilla/50 p-5">
                    <div className="flex items-center gap-3">
                      {user?.avatar ? (
                        <img
                          src={getImageUrl(user.avatar)}
                          alt={user.fullname || "Giảng viên"}
                          className="h-12 w-12 rounded-2xl object-cover ring-2 ring-surface shadow-xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-xs">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          <GraduationCap size={12} animated={false} />
                          Hồ sơ chờ kích hoạt
                        </span>
                        <p className="truncate text-sm font-bold text-foreground">
                          {user?.fullname || "Giảng viên Mây Mây"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="space-y-2.5 rounded-2xl border border-border/80 bg-background/60 p-4 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Số hợp đồng
                        </span>
                        <code className="rounded bg-surface px-2 py-0.5 font-mono font-bold text-foreground">
                          {status.contract_number || "—"}
                        </code>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Thời điểm Bên B ký
                        </span>
                        <strong className="text-foreground">
                          {formatDateTime(status.signed_at)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Trạng thái hiện tại
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-bg px-2.5 py-0.5 text-[11px] font-bold text-warning-foreground">
                          Chờ Bên A đồng ký
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Button
                        size="lg"
                        fullWidth
                        isLoading={checkingStatus}
                        loadingText="Đang kiểm tra..."
                        onClick={() => void handleRecheckStatus()}
                      >
                        <RefreshCw size={15} />
                        Kiểm tra trạng thái đồng ký
                      </Button>

                      <Button
                        variant="outline"
                        fullWidth
                        isLoading={downloadingPdf}
                        loadingText="Đang tạo PDF..."
                        onClick={() => void handleDownloadSignedPdf()}
                      >
                        <Download size={15} />
                        Tải PDF hợp đồng (Bản Bên B đã ký)
                      </Button>

                      {status.contract_number && (
                        <Link
                          href={`/verify-contract/${status.contract_number}`}
                          target="_blank"
                          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          Xem trang Xác thực Công khai
                          <ExternalLink size={13} animated={false} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Đang mở trang ký số giấy trắng mực đen toàn màn hình
  if (signingDraft) {
    return (
      <SigningWorkspace
        standalone
        contract={signingDraft}
        certificate={certResp?.certificate ?? null}
        closeLabel="Quay lại cổng xác thực"
        onClose={() => setSigningDraft(null)}
        onSigned={async () => {
          await Promise.all([mutateStatus(), mutateCert()]);
          setSigningDraft(null);
          toast.success(
            "Đã ký số thành công (Bên B)! Hồ sơ đã chuyển tới Ban Quản Trị Mây Mây để đồng ký xác nhận.",
          );
        }}
      />
    );
  }

  // Cổng Xác Thực Hợp Đồng Pháp Lý — Dành cho Giảng viên chưa ký
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      {/* Ambient Cloud Sky Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-primary-light/85 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent-vanilla/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-secondary-light/55 blur-3xl" />
      </div>

      <div className="w-full max-w-6xl">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/90 via-surface/95 to-accent-vanilla/40 p-6 shadow-[0_32px_72px_-24px_rgba(53,111,167,0.22)] backdrop-blur-md sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left (7/12): Editorial Copy + 3 Legal Pillars */}
            <div className="space-y-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
                  <Cloud size={13} animated={false} />
                  Mây Mây Digital Trust · PKI X.509
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-bold text-success-foreground">
                  <CheckCircle2 size={12} animated={false} />
                  Miễn phí ký cho Giảng viên hiện hữu
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl">
                  Hoàn tất{" "}
                  <span className="text-primary">Hợp đồng Điện tử</span> để mở
                  khóa Không gian Giảng viên
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Theo tiêu chuẩn bảo mật và minh bạch pháp lý mới của Mây Mây
                  (Luật Giao dịch điện tử 2023), mọi tài khoản Giảng viên cần sở
                  hữu{" "}
                  <strong>
                    01 bản Hợp đồng Khung Đối tác đã ký đầy đủ 2 bên
                  </strong>{" "}
                  trước khi quản lý khóa học, phát hành mã giảm giá và rút Coin.
                </p>
              </div>

              {/* 3 Legal Pillars */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LEGAL_PILLARS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/85 bg-surface/90 p-4 shadow-2xs backdrop-blur-sm"
                    >
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${item.accent}`}
                      >
                        <Icon size={17} animated={false} />
                      </span>
                      <h2 className="mt-3 text-xs font-bold text-foreground">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ArrowLeft size={14} animated={false} />
                  Về trang chủ
                </Link>
              </div>
            </div>

            {/* Right (5/12): Floating Legal Partner Pass Card */}
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-[2rem] border border-primary-pastel bg-surface shadow-[0_24px_60px_-20px_rgba(53,111,167,0.26)]">
                {/* Identity Header */}
                <div className="border-b border-primary-pastel/60 bg-gradient-to-r from-primary-light/85 via-surface to-accent-vanilla/50 p-5">
                  <div className="flex items-center gap-3">
                    {user?.avatar ? (
                      <img
                        src={getImageUrl(user.avatar)}
                        alt={user.fullname || "Giảng viên"}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-surface shadow-xs"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-xs">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        <GraduationCap size={12} animated={false} />
                        Hồ sơ Giảng viên
                      </span>
                      <p className="truncate text-sm font-bold text-foreground">
                        {user?.fullname || "Giảng viên Mây Mây"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Quick Steps */}
                <div className="space-y-4 p-6">
                  <div className="space-y-2.5 text-xs">
                    {[
                      {
                        num: "01",
                        title: "Đọc văn bản A4 chuẩn pháp lý",
                        sub: "9 Điều khoản & 3 Bảng biểu trích xuất từ hệ thống",
                      },
                      {
                        num: "02",
                        title: "Ký tay & Xác thực PKI X.509",
                        sub: "Đặt mã PIN 6 số (hoặc tải tệp .p12) + xác nhận OTP Email",
                      },
                      {
                        num: "03",
                        title: "Ban Quản Trị (Bên A) đồng ký & Mở khóa",
                        sub: "Khi đủ chữ ký 2 bên, Không gian Giảng viên sẽ tự động mở khóa",
                      },
                    ].map((s) => (
                      <div
                        key={s.num}
                        className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background/60 p-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary-light font-mono text-[11px] font-bold text-primary">
                          {s.num}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">{s.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {s.sub}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-success-border/70 bg-success-bg/50 px-3.5 py-2.5 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-success-foreground">
                      <FileText size={14} animated={false} />
                      Phí ký hợp đồng bổ sung
                    </span>
                    <strong className="font-bold text-success-foreground">
                      0 Coin (Miễn phí)
                    </strong>
                  </div>

                  <Button
                    size="lg"
                    fullWidth
                    isLoading={openingDraft}
                    loadingText="Đang soạn văn bản A4..."
                    onClick={() => void openSignWorkspace()}
                    className="shadow-[0_14px_30px_-10px_rgba(53,111,167,0.55)]"
                  >
                    <PenTool size={16} />
                    <span>Mở Hợp đồng A4 &amp; Ký điện tử</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
