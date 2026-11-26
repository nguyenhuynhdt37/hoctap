"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  ShieldCheck,
} from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import type { PublicVerifyResponse } from "@/types/contract";
import {
  formatContractDateTime,
  getContractStatusMeta,
  getContractTypeLabel,
} from "@/components/shared/digital-contract/signing-studio";

export default function PublicVerifyContractPage() {
  const params = useParams<{ contract_number: string }>();
  const contractNumber = params?.contract_number ?? "";

  const { data, error, isLoading } = useSWR<PublicVerifyResponse>(
    contractNumber ? `/contracts/verify/${encodeURIComponent(contractNumber)}` : null,
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const isValid = Boolean(data?.integrity?.valid && data?.status !== "revoked");
  const statusMeta = getContractStatusMeta(data?.status || "");

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={14} />
            Về Mây Mây
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
            <Cloud size={13} animated={false} />
            Cổng Xác Thực Hợp Đồng Số
          </span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-primary-pastel/80 bg-surface shadow-[0_24px_60px_-20px_rgba(53,111,167,0.22)]">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Đang kiểm tra chữ ký mật mã SHA-256 &amp; X.509...
            </div>
          ) : error || !data ? (
            <div className="p-10 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive-bg text-destructive-foreground">
                <AlertTriangle size={26} animated={false} />
              </div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Không tìm thấy mã hợp đồng điện tử
              </h1>
              <p className="text-xs text-muted-foreground">
                Mã <code>{contractNumber}</code> không tồn tại trên hệ thống Mây Mây.
              </p>
            </div>
          ) : (
            <>
              <div
                className={`p-8 text-center ${
                  isValid
                    ? "bg-gradient-to-br from-success-bg/80 via-primary-light/50 to-surface"
                    : "bg-gradient-to-br from-destructive-bg/70 via-surface to-surface"
                }`}
              >
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border shadow-sm ${
                    isValid
                      ? "border-success-border bg-surface text-success-foreground"
                      : "border-destructive-border bg-surface text-destructive-foreground"
                  }`}
                >
                  {isValid ? (
                    <ShieldCheck size={32} animated={false} />
                  ) : (
                    <AlertTriangle size={32} animated={false} />
                  )}
                </div>
                <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
                  {isValid
                    ? "Hợp đồng Điện tử Hợp lệ & Nguyên vẹn"
                    : data.status === "revoked"
                      ? "Hợp đồng đã bị Thu hồi hiệu lực"
                      : "Cảnh báo Toàn vẹn Chữ ký số"}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Đã đối chiếu trực tiếp mã băm SHA-256, dấu niêm phong HMAC và
                  chữ ký số PKI X.509.
                </p>
              </div>

              <div className="space-y-3 p-6 text-xs">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Số hợp đồng</span>
                  <code className="rounded-lg bg-primary-light px-2.5 py-1 font-mono font-bold text-primary">
                    {data.contract_number}
                  </code>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-semibold ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Loại hợp đồng</span>
                  <strong className="text-foreground">
                    {getContractTypeLabel(data.contract_type)}
                  </strong>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Bên B (Người ký)</span>
                  <strong className="text-foreground">{data.signer_name}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Thời điểm ký điện tử</span>
                  <strong className="text-foreground">
                    {formatContractDateTime(data.signed_at)}
                  </strong>
                </div>
                {data.countersigned_at && (
                  <div className="flex items-center justify-between border-b border-border/70 pb-3">
                    <span className="text-muted-foreground">
                      Bên A (Mây Mây) đồng ký
                    </span>
                    <strong className="text-success-foreground">
                      {formatContractDateTime(data.countersigned_at)}
                    </strong>
                  </div>
                )}

                {/* 3 Crypto Checks */}
                <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
                  {[
                    ["Toàn vẹn SHA-256", data.integrity.hash_match],
                    ["Chữ ký PKI X.509", data.integrity.pki_signature_valid],
                    ["Niêm phong HMAC", data.integrity.hmac_seal_valid],
                  ].map(([label, ok]) => (
                    <div
                      key={String(label)}
                      className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 font-semibold ${
                        ok
                          ? "border-success-border bg-success-bg/60 text-success-foreground"
                          : "border-destructive-border bg-destructive-bg/60 text-destructive-foreground"
                      }`}
                    >
                      <CheckCircle2 size={14} animated={false} />
                      <span>{String(label)}</span>
                    </div>
                  ))}
                </div>

                {data.integrity.document_hash && (
                  <div className="pt-2">
                    <p className="text-muted-foreground">Mã băm SHA-256:</p>
                    <p className="mt-1 break-all rounded-xl bg-background p-3 font-mono text-[11px] text-foreground">
                      {data.integrity.document_hash}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
