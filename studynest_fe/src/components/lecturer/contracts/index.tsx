"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Key,
  Lock,
  PenTool,
  ShieldCheck,
  X,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import SigningStudioModal, {
  formatContractDateTime,
  getContractStatusMeta,
} from "@/components/shared/digital-contract/signing-studio";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  ContractDetail,
  ContractListResponse,
  DigitalCertificateInfo,
} from "@/types/contract";

function renderFormalMarkdown(text: string): React.ReactNode[] {
  const rawLines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const trimmed = rawLines[i].trim();
    if (!trimmed) {
      nodes.push(<div key={`sp-${i}`} className="h-1" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tblStart = i;
      const tblLines: string[] = [];
      while (
        i < rawLines.length &&
        rawLines[i].trim().startsWith("|") &&
        rawLines[i].trim().endsWith("|")
      ) {
        tblLines.push(rawLines[i].trim());
        i += 1;
      }
      const rows = tblLines
        .map((l) => l.slice(1, -1).split("|").map((c) => c.trim()))
        .filter((cells) => !cells.every((c) => /^[:\-\s]+$/.test(c)));

      if (rows.length > 0) {
        const [headerRow, ...bodyRows] = rows;
        nodes.push(
          <div key={`tbl-${tblStart}`} className="my-3 overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[13px] leading-[1.55]">
              <thead>
                <tr className="bg-gray-100">
                  {headerRow.map((cell, ci) => (
                    <th
                      key={ci}
                      className="border border-black px-3 py-2 text-left font-bold text-black"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`border border-black px-3 py-2 align-top text-black ${
                          ci === 0 ? "font-semibold" : ""
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      nodes.push(
        <h2
          key={`h-${i}`}
          className="pt-3.5 text-[14.5px] font-bold uppercase tracking-wide text-black"
        >
          {trimmed.replace(/^#+\s*/, "")}
        </h2>,
      );
    } else if (trimmed.startsWith("- ")) {
      nodes.push(
        <p key={`li-${i}`} className="pl-5 -indent-3 text-justify">
          – {trimmed.slice(2)}
        </p>,
      );
    } else {
      nodes.push(
        <p key={`p-${i}`} className="text-justify">
          {trimmed}
        </p>,
      );
    }
    i += 1;
  }

  return nodes;
}

const AUDIT_LABELS: Record<string, string> = {
  created: "Khởi tạo văn bản hợp đồng",
  otp_sent: "Gửi mã OTP xác thực",
  signed: "Giảng viên ký số PKI X.509",
  countersigned: "Nền tảng Mây Mây đồng ký Bên A",
  pdf_downloaded: "Xuất bản PDF có chữ ký số",
  verified: "Kiểm tra toàn vẹn SHA-256",
  revoked: "Thu hồi hiệu lực hợp đồng",
};

export default function LecturerContractsStudio() {
  const [studioOpen, setStudioOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certPin, setCertPin] = useState("");
  const [certCccd, setCertCccd] = useState("");
  const [issuingCert, setIssuingCert] = useState(false);

  const { data: certResp, mutate: mutateCert } = useSWR<{
    has_certificate: boolean;
    certificate: DigitalCertificateInfo | null;
  }>("/lecturer/contracts/certificate", (url: string) =>
    api.get(url).then((r) => r.data),
  );

  // Chỉ lấy đúng 1 bản Hợp đồng Khung Giảng viên duy nhất
  const {
    data: listResp,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR<ContractListResponse>(
    "/lecturer/contracts?contract_type=LECTURER_MASTER&limit=10",
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const primaryItem = useMemo(() => {
    const items = listResp?.items ?? [];
    return (
      items.find(
        (c) => c.status === "countersigned" || c.status === "signed",
      ) ||
      items[0] ||
      null
    );
  }, [listResp?.items]);

  const {
    data: contract,
    isLoading: detailLoading,
    mutate: mutateDetail,
  } = useSWR<ContractDetail>(
    primaryItem ? `/lecturer/contracts/${primaryItem.id}` : null,
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false },
  );

  const certificate = certResp?.certificate ?? null;
  const isSigned =
    contract?.status === "signed" || contract?.status === "countersigned";
  const statusMeta = getContractStatusMeta(contract?.status || "draft");

  async function handleStartSign() {
    if (contract) {
      setStudioOpen(true);
      return;
    }
    setCreating(true);
    try {
      await api.post("/lecturer/contracts/draft", {
        contract_type: "LECTURER_MASTER",
      });
      await mutateList();
      setStudioOpen(true);
    } catch {
      toast.error("Không thể khởi tạo Hợp đồng Giảng viên.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDownloadPdf() {
    if (!contract) return;
    try {
      const res = await api.get(`/lecturer/contracts/${contract.id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract.contract_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        isSigned
          ? `Đã tải PDF chính thức (PAdES) ${contract.contract_number}.pdf`
          : `Đã tải PDF bản thảo ${contract.contract_number}.pdf`,
      );
    } catch {
      toast.error("Không thể xuất tệp PDF hợp đồng.");
    }
  }

  async function handleIssueCertificate() {
    if (certPin.trim().length < 6 || !/^\d+$/.test(certPin.trim())) {
      toast.error("Mã PIN ký số phải gồm tối thiểu 6 chữ số.");
      return;
    }
    if (certCccd.trim().length < 9) {
      toast.error("Vui lòng nhập số CCCD hợp lệ.");
      return;
    }
    setIssuingCert(true);
    try {
      await api.post("/lecturer/contracts/certificate/issue", {
        pin: certPin.trim(),
        cccd: certCccd.trim(),
      });
      toast.success("Đã cấp lại chứng thư số X.509 thành công!");
      setCertModalOpen(false);
      setCertPin("");
      await mutateCert();
    } catch {
      toast.error("Không thể cấp chứng thư số.");
    } finally {
      setIssuingCert(false);
    }
  }

  if (listLoading || (primaryItem && detailLoading)) {
    return (
      <main className="mx-auto max-w-[1360px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="h-28 animate-pulse rounded-3xl border border-border bg-surface" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-[680px] animate-pulse rounded-3xl border border-border bg-surface lg:col-span-8" />
          <div className="h-96 animate-pulse rounded-3xl border border-border bg-surface lg:col-span-4" />
        </div>
      </main>
    );
  }

  // Trường hợp giảng viên chưa có bản hợp đồng nào
  if (!contract) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-foreground">
        <section className="rounded-[2rem] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/75 via-surface to-accent-vanilla/40 p-10 text-center shadow-[0_24px_60px_-20px_rgba(53,111,167,0.2)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary-pastel bg-surface text-primary shadow-xs">
            <FileText size={28} animated={false} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-foreground">
            Bạn chưa ký Hợp đồng Khung Giảng viên
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Mỗi giảng viên trên Mây Mây sở hữu một bản Hợp đồng Điện tử duy nhất
            chuẩn PKI X.509 / PAdES để bảo vệ quyền lợi chia sẻ doanh thu 70/30
            và bản quyền khóa học.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              isLoading={creating}
              loadingText="Đang soạn thảo hợp đồng..."
              onClick={() => void handleStartSign()}
            >
              <PenTool size={16} />
              Soạn &amp; Ký Hợp đồng Điện tử ngay
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1380px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Top Formal Summary Header */}
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-r from-primary-light/85 via-surface to-accent-vanilla/40 p-5 shadow-[0_18px_44px_-20px_rgba(53,111,167,0.18)] sm:p-6 lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3 py-0.5 text-[11px] font-semibold text-primary">
              <ShieldCheck size={12} animated={false} />
              Hợp đồng Đối tác Duy nhất
            </span>
            <code className="rounded-lg bg-surface px-2.5 py-0.5 font-mono text-xs font-bold text-foreground shadow-2xs">
              {contract.contract_number}
            </code>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {contract.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isSigned
              ? `Đã ký điện tử lúc ${formatContractDateTime(contract.signed_at)} · Hiệu lực trọn đời trên Mây Mây`
              : "Bản thảo chưa hoàn tất ký điện tử — Vui lòng ký để kích hoạt đầy đủ hồ sơ pháp lý."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isSigned && (
            <Button size="sm" onClick={() => setStudioOpen(true)}>
              <PenTool size={14} />
              Ký điện tử ngay
            </Button>
          )}
          <Button
            size="sm"
            variant={isSigned ? "primary" : "outline"}
            onClick={() => void handleDownloadPdf()}
          >
            <Download size={14} />
            {isSigned ? "Tải PDF Chính thức (PAdES)" : "Xuất PDF Bản thảo"}
          </Button>
          {isSigned && (
            <Link
              href={`/verify-contract/${contract.contract_number}`}
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-primary-pastel bg-surface px-3.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
            >
              Xác thực công khai
              <ExternalLink size={13} animated={false} />
            </Link>
          )}
        </div>
      </section>

      {/* Main 2-Column Layout: A4 Formal Paper (8 cols) + Legal Verification Sidebar (4 cols) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT (8/12): Formal A4 White Paper — Times New Roman — Chống Copy */}
        <section className="rounded-[2rem] border border-border/80 bg-[#EEF1F5] p-3 sm:p-6 lg:col-span-8">
          <article
            onCopy={(e) => {
              e.preventDefault();
              toast(
                "Văn bản hợp đồng được bảo vệ chống sao chép. Vui lòng dùng nút Tải PDF.",
              );
            }}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            className="mx-auto w-full select-none border border-gray-400 bg-white px-6 py-10 text-black shadow-[0_10px_34px_rgba(15,23,42,0.08)] sm:px-14 sm:py-14"
          >
            {/* Quốc hiệu - Tiêu ngữ */}
            <div className="text-center">
              <p className="text-[14px] font-bold uppercase tracking-wide text-black sm:text-[15px]">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="mt-0.5 text-[13px] font-bold text-black sm:text-[14px]">
                Độc lập - Tự do - Hạnh phúc
              </p>
              <div className="mx-auto mt-1.5 h-[1px] w-44 bg-black" />
            </div>

            {/* Tiêu đề & Số hợp đồng */}
            <div className="mt-7 text-center">
              <h2 className="text-[18px] font-bold uppercase leading-snug text-black sm:text-[20px]">
                {contract.title}
              </h2>
              <p className="mt-1.5 text-[13px] font-bold text-black">
                Số: {contract.contract_number}
              </p>
            </div>

            {/* Căn cứ pháp lý */}
            <div className="mt-6 space-y-1 border-y border-gray-300 py-3.5 text-[13px] italic leading-[1.65] text-black">
              <p>
                - Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam
                hiện hành;
              </p>
              <p>
                - Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 về giá trị pháp
                lý của hợp đồng và chữ ký điện tử;
              </p>
              <p>
                - Căn cứ nhu cầu và năng lực hợp tác giữa Nền tảng Giáo dục Mây
                Mây và Giảng viên / Đối tác.
              </p>
            </div>

            {/* Toàn văn điều khoản + 3 Bảng biểu chuẩn Times New Roman */}
            <div className="mt-5 space-y-2.5 text-[14px] leading-[1.75] text-black">
              {renderFormalMarkdown(contract.rendered_content)}
            </div>

            {/* Khung Ký & Đóng dấu điện tử 2 bên */}
            <div className="mt-12 grid grid-cols-1 gap-6 border-t-2 border-black pt-8 sm:grid-cols-2">
              <div className="flex flex-col items-center border border-gray-300 p-5 text-center">
                <p className="text-xs font-bold uppercase text-black">
                  ĐẠI DIỆN BÊN A
                </p>
                <p className="text-[11px] italic text-gray-700">
                  (Nền tảng Học tập Trực tuyến Mây Mây)
                </p>
                <div className="mt-5 w-full border border-gray-800 bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-black">
                  <p className="font-bold uppercase">
                    ✓{" "}
                    {contract.status === "countersigned"
                      ? "ĐÃ ĐỒNG KÝ ĐIỆN TỬ"
                      : "XÁC THỰC HỆ THỐNG MÂY MÂY"}
                  </p>
                  <p>Tổ chức: May May Education Platform</p>
                  <p>Chứng thư: Mây Mây Digital CA (X.509)</p>
                  {contract.countersigned_at && (
                    <p>
                      Ngày đồng ký:{" "}
                      {formatContractDateTime(contract.countersigned_at)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center border border-gray-300 p-5 text-center">
                <p className="text-xs font-bold uppercase text-black">
                  ĐẠI DIỆN BÊN B
                </p>
                <p className="text-[11px] italic text-gray-700">
                  (Giảng viên / Đối tác ký điện tử)
                </p>

                <div className="mt-4 flex min-h-[68px] w-full items-center justify-center">
                  {contract.signature_image_data ? (
                    <img
                      src={contract.signature_image_data}
                      alt="Chữ ký Bên B"
                      className="max-h-16 object-contain"
                    />
                  ) : (
                    <p className="text-xl font-bold italic text-black">
                      {contract.party_b.fullname}
                    </p>
                  )}
                </div>

                <div
                  className={`mt-2 w-full border p-3 text-left text-[11px] leading-relaxed ${
                    isSigned
                      ? "border-black bg-gray-50 text-black"
                      : "border-dashed border-gray-400 bg-white text-gray-700"
                  }`}
                >
                  <p className="font-bold uppercase">
                    {isSigned
                      ? "✓ ĐÃ KÝ ĐIỆN TỬ (PKI X.509)"
                      : "CHỜ KÝ XÁC NHẬN ĐIỆN TỬ"}
                  </p>
                  <p>Họ và tên: {contract.party_b.fullname}</p>
                  <p>CCCD/Định danh: {contract.signer_cccd || "—"}</p>
                  {contract.signed_at && (
                    <p>
                      Thời điểm ký: {formatContractDateTime(contract.signed_at)}
                    </p>
                  )}
                  {contract.cert_serial && (
                    <p className="truncate font-mono text-[10px]">
                      Serial: {contract.cert_serial}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {contract.document_hash && (
              <div className="mt-8 border-t border-gray-300 pt-4 text-[10.5px] text-gray-700">
                <p className="font-semibold text-black">
                  MÃ BĂM XÁC THỰC TOÀN VẸN SHA-256
                </p>
                <p className="mt-1 break-all font-mono">
                  {contract.document_hash}
                </p>
              </div>
            )}
          </article>
        </section>

        {/* RIGHT (4/12): Sticky Legal Proof, X.509 Certificate & Audit Trail */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-4">
          {/* Cryptographic Integrity Card */}
          <div className="rounded-3xl border border-primary-pastel/75 bg-surface p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <ShieldCheck size={16} animated={false} className="text-primary" />
                Chứng thực Mật mã
              </h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  contract.integrity?.valid
                    ? "border-success-border bg-success-bg text-success-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {contract.integrity?.valid ? "Nguyên vẹn 100%" : "Chưa ký số"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                ["Toàn vẹn toàn văn SHA-256", contract.integrity?.hash_match],
                ["Chữ ký bất đối xứng X.509", contract.integrity?.pki_signature_valid],
                ["Dấu niêm phong HMAC hệ thống", contract.integrity?.hmac_seal_valid],
              ].map(([label, ok]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 px-3 py-2"
                >
                  <span className="text-muted-foreground">{String(label)}</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      ok ? "text-success-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 size={13} animated={false} />
                    {ok ? "Hợp lệ" : "Chờ ký"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-primary-light/50 px-3 py-2 text-[11px] text-primary">
              <Lock size={12} animated={false} />
              <span>Văn bản khóa chống sao chép &amp; lưu trữ bất biến.</span>
            </div>
          </div>

          {/* X.509 Certificate Card */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Key size={16} animated={false} className="text-primary" />
                Chứng thư số X.509
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCertCccd(
                    certificate?.subject_cccd || contract.signer_cccd || "",
                  );
                  setCertModalOpen(true);
                }}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Đổi PIN / Cấp lại
              </button>
            </div>

            {certificate ? (
              <div className="space-y-1.5 rounded-2xl border border-border/80 bg-background/60 p-3.5 text-xs">
                <p className="font-bold text-foreground">
                  {certificate.subject_cn}
                </p>
                <p className="text-muted-foreground">
                  CCCD: <strong className="text-foreground">{certificate.subject_cccd || "—"}</strong>
                </p>
                <p className="truncate font-mono text-[11px] text-primary">
                  Serial: {certificate.serial_number}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  CA: {certificate.issuer_cn}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Hiệu lực đến: {formatContractDateTime(certificate.valid_until)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Chứng thư X.509 sẽ tự động được cấp khi bạn ký hợp đồng lần đầu.
              </p>
            )}
          </div>

          {/* Audit Trail Timeline */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Clock size={16} animated={false} className="text-primary" />
              Nhật ký Pháp lý
            </h2>

            <div className="space-y-2">
              {contract.audit_logs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {AUDIT_LABELS[log.action] || log.action}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {log.actor_name}
                      {log.ip_address ? ` · ${log.ip_address}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatContractDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Full-Screen Signing Studio (khi hợp đồng còn là bản thảo) */}
      <SigningStudioModal
        open={studioOpen}
        contract={contract}
        certificate={certificate}
        onClose={() => setStudioOpen(false)}
        onSigned={async () => {
          await Promise.all([mutateList(), mutateDetail(), mutateCert()]);
        }}
      />

      {/* Reissue Certificate Modal */}
      {certModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[2px]"
          onClick={() => setCertModalOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-3xl border border-primary-pastel bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                Đổi PIN / Cấp lại Chứng thư X.509
              </h3>
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-background"
              >
                <X size={16} animated={false} />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Cấp cặp khóa RSA-2048 mới bảo vệ bằng mã PIN của bạn (không làm
              thay đổi hợp đồng đã ký trước đó).
            </p>
            <label className="block space-y-1 text-xs">
              <span className="font-semibold text-foreground">Số CCCD *</span>
              <input
                type="text"
                value={certCccd}
                onChange={(e) => setCertCccd(e.target.value)}
                placeholder="Nhập 12 chữ số CCCD..."
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-semibold text-foreground">
                Mã PIN ký số mới (6+ chữ số) *
              </span>
              <input
                type="password"
                inputMode="numeric"
                value={certPin}
                onChange={(e) => setCertPin(e.target.value)}
                placeholder="Ví dụ: 123456"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-widest"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCertModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={issuingCert}
                onClick={() => void handleIssueCertificate()}
              >
                <Key size={14} />
                {issuingCert ? "Đang cấp..." : "Xác nhận cấp lại"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
