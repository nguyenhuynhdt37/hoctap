"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  GraduationCap,
  ShieldCheck,
  Wallet,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { SigningWorkspace } from "@/components/shared/digital-contract/signing-studio";
import { LECTURER_ACTIVATION_COIN_FEE } from "@/components/lecturer/welcome/become";
import { useBecomeInstructor } from "@/hooks/useBecomeInstructor";
import {
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  formatVnd,
} from "@/lib/learning-hub/coin-logic";
import { useCoinBalances } from "@/lib/learning-hub/shop-hooks";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import type { ContractDetail, DigitalCertificateInfo } from "@/types/contract";

export default function WelcomeSignContractPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const {
    data: coins,
    isLoading: coinsLoading,
    mutate: mutateCoins,
  } = useCoinBalances();
  const {
    becomeInstructor,
    isLoading: activating,
    lastError: activationError,
  } = useBecomeInstructor();

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [autoPayStatus, setAutoPayStatus] = useState<
    "idle" | "paying" | "done" | "error"
  >("idle");
  const initiatedRef = useRef(false);
  const autoPaidRef = useRef(false);

  const { data: certResp, mutate: mutateCert } = useSWR<{
    has_certificate: boolean;
    certificate: DigitalCertificateInfo | null;
  }>(
    user ? "/lecturer/contracts/certificate" : null,
    (url: string) => api.get(url).then((r) => r.data).catch(() => null),
    { revalidateOnFocus: false },
  );

  const paidCoin = coins?.paid ?? 0;
  const rateVnd = coins?.rateVnd ?? DEFAULT_COIN_VND_RATE;
  const hasEnoughCoins = paidCoin >= LECTURER_ACTIVATION_COIN_FEE;
  const missingCoins = Math.max(0, LECTURER_ACTIVATION_COIN_FEE - paidCoin);
  const isAlreadyLecturer = Boolean(user?.roles?.includes("LECTURER"));
  const hasSignedContract =
    contract?.status === "signed" || contract?.status === "countersigned";

  // Khi đã đăng nhập & đủ 100 Coin (hoặc đã là Giảng viên) → tự động tải/khởi tạo Hợp đồng Khung Giảng viên
  useEffect(() => {
    if (
      !user ||
      coinsLoading ||
      (!hasEnoughCoins && !isAlreadyLecturer) ||
      initiatedRef.current
    ) {
      return;
    }
    initiatedRef.current = true;

    async function initDraft() {
      setCreating(true);
      setInitError(null);
      try {
        // Kiểm tra trước xem user đã ký Hợp đồng Khung Giảng viên chưa để tránh tạo bản thảo trùng
        const existingRes = await api.get("/lecturer/contracts", {
          params: { contract_type: "LECTURER_MASTER", limit: 5 },
        });
        const existingItems = existingRes.data?.items ?? [];
        const signedMaster = existingItems.find(
          (item: { status: string; id: string }) =>
            item.status === "signed" || item.status === "countersigned",
        );
        if (signedMaster) {
          const detailRes = await api.get(`/lecturer/contracts/${signedMaster.id}`);
          setContract(detailRes.data);
          return;
        }

        const res = await api.post("/lecturer/contracts/draft", {
          contract_type: "LECTURER_MASTER",
        });
        setContract(res.data);
      } catch {
        setInitError("Không thể khởi tạo bản thảo hợp đồng điện tử.");
        initiatedRef.current = false;
      } finally {
        setCreating(false);
      }
    }

    void initDraft();
  }, [user, coinsLoading, hasEnoughCoins, isAlreadyLecturer]);

  // Chưa đăng nhập
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
            <ShieldCheck size={24} animated={false} />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Vui lòng đăng nhập để ký hợp đồng điện tử
          </h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Bạn cần đăng nhập tài khoản Mây Mây để kiểm tra số dư 100 Coin và
            tiến hành ký Hợp đồng Khung Giảng viên.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link
              href="/welcome"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-primary-light/50"
            >
              <ArrowLeft size={14} animated={false} />
              Quay lại
            </Link>
            <Button size="sm" onClick={() => router.push("/login")}>
              Đăng nhập ngay
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Đang kiểm tra số dư xu
  if (coinsLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 text-sm text-muted-foreground">
        Đang kiểm tra số dư Coin vàng và chuẩn bị văn bản hợp đồng...
      </main>
    );
  }

  // Không đủ 100 Coin → Chặn trước khi ký, hướng dẫn nạp xu (không chặn nếu đã ký / đang thanh toán / đã kích hoạt xong)
  if (
    !isAlreadyLecturer &&
    !hasSignedContract &&
    autoPayStatus !== "paying" &&
    autoPayStatus !== "done" &&
    !hasEnoughCoins
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-warning-bg text-warning-foreground">
              <AlertTriangle size={22} animated={false} />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Số dư Coin vàng chưa đủ để ký hợp đồng
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Phí kích hoạt tư cách Giảng viên trọn đời là{" "}
                <strong className="text-foreground">
                  {formatCoin(LECTURER_ACTIVATION_COIN_FEE)}
                </strong>{" "}
                (≈ {formatVnd(LECTURER_ACTIVATION_COIN_FEE * rateVnd)}). Vui lòng
                nạp thêm xu trước khi tiến hành ký điện tử.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-primary-light/35 p-4 text-xs">
            <div>
              <span className="text-muted-foreground">Coin vàng hiện có</span>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatCoin(paidCoin)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Cần nạp thêm</span>
              <p className="mt-1 text-lg font-bold text-destructive-foreground">
                +{formatCoin(missingCoins)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Link
              href="/welcome"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-primary-light/50"
            >
              <ArrowLeft size={14} animated={false} />
              Quay lại trang Chào mừng
            </Link>
            <Button onClick={() => router.push("/wallets")}>
              <Wallet size={15} />
              Nạp thêm {formatCoin(missingCoins)} ngay
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Đang tạo bản thảo hợp đồng
  if (creating || !contract) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          {initError ? (
            <>
              <p className="text-sm font-bold text-destructive-foreground">
                {initError}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  initiatedRef.current = false;
                  setInitError(null);
                  router.refresh();
                }}
              >
                Thử lại
              </Button>
            </>
          ) : (
            <>
              <p className="font-display text-base font-bold text-foreground">
                Đang soạn thảo Hợp đồng Điện tử...
              </p>
              <p className="text-xs text-muted-foreground">
                Số dư Coin vàng khả dụng:{" "}
                <strong className="text-foreground">{formatCoin(paidCoin)}</strong>{" "}
                (đủ điều kiện kích hoạt 100 Coin).
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  const runActivationPayment = async () => {
    setAutoPayStatus("paying");
    const ok = await becomeInstructor({
      autoRedirect: true,
      redirectDelayMs: 2000,
    });
    await mutateCoins();
    if (ok) {
      setAutoPayStatus("done");
    } else {
      setAutoPayStatus("error");
    }
  };

  // Render trang ký số riêng toàn màn hình — giấy trắng mực đen A4
  return (
    <SigningWorkspace
      standalone
      contract={contract}
      certificate={certResp?.certificate ?? null}
      closeLabel="Về trang Chào mừng"
      signButtonLabel="Ký điện tử & Thanh toán 100 Coin"
      onClose={() => router.push("/welcome")}
      onSigned={async (updated) => {
        setContract(updated);
        await mutateCert();
        if (autoPaidRef.current || isAlreadyLecturer) return;
        autoPaidRef.current = true;
        toast.loading("Đã ký điện tử! Đang tự động thanh toán 100 Coin & kích hoạt Giảng viên...", {
          id: "auto-activate-lecturer",
          duration: 3000,
        });
        await runActivationPayment();
        toast.dismiss("auto-activate-lecturer");
      }}
      postSignAction={
        autoPayStatus === "done" || isAlreadyLecturer ? (
          <div className="space-y-2.5 rounded-2xl border border-success-border bg-success-bg/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-success-foreground">
              <CheckCircle2 size={16} animated={false} />
              <span>Đã thanh toán 100 Coin &amp; kích hoạt Giảng viên!</span>
            </div>
            <p className="text-[11px] leading-relaxed text-foreground">
              {autoPayStatus === "done"
                ? "Hệ thống đang tự động chuyển bạn sang Kênh Giảng viên..."
                : "Tài khoản của bạn đã hoàn tất kích hoạt tư cách Giảng viên."}
            </p>
            <Button
              fullWidth
              size="md"
              onClick={() => router.push("/lecturer")}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>Vào Kênh Giảng viên ngay</span>
                <ArrowRight size={15} animated={false} />
              </span>
            </Button>
          </div>
        ) : autoPayStatus === "paying" || activating ? (
          <div className="space-y-2 rounded-2xl border border-primary-pastel bg-primary-light/60 p-4 text-center">
            <div className="mx-auto flex items-center justify-center gap-2 text-xs font-bold text-primary">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Đang tự động thanh toán 100 Coin &amp; kích hoạt...</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Vui lòng giữ nguyên trang trong giây lát để hoàn tất kích hoạt tư cách Giảng viên.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 rounded-2xl border border-primary-pastel bg-primary-light/40 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Coins size={14} animated={false} className="text-primary" />
                <span>Phí kích hoạt Giảng viên</span>
              </span>
              <strong className="text-sm font-bold text-primary">100 Coin</strong>
            </div>
            {autoPayStatus === "error" && activationError && (
              <p className="rounded-xl border border-destructive-border bg-destructive-bg px-3 py-2 text-[11px] font-medium text-destructive-foreground">
                {activationError}
              </p>
            )}
            <Button
              fullWidth
              size="lg"
              isLoading={activating}
              loadingText="Đang trừ 100 Coin & kích hoạt..."
              onClick={() => void runActivationPayment()}
            >
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap size={17} animated={false} />
                <span>
                  {autoPayStatus === "error"
                    ? "Thử thanh toán lại 100 Coin & Kích hoạt"
                    : "Thanh toán 100 Coin & Trở thành Giảng viên"}
                </span>
              </span>
            </Button>
          </div>
        )
      }
    />
  );
}
