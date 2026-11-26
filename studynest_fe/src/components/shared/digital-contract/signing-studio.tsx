"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Key,
  Lock,
  Mail,
  PenTool,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { ContractDetail, DigitalCertificateInfo } from "@/types/contract";

interface SigningWorkspaceProps {
  contract: ContractDetail;
  certificate: DigitalCertificateInfo | null;
  onClose?: () => void;
  closeLabel?: string;
  onSigned: (updated: ContractDetail) => Promise<void> | void;
  postSignAction?: React.ReactNode;
  signButtonLabel?: string;
  standalone?: boolean;
}

interface SigningStudioModalProps {
  open: boolean;
  contract: ContractDetail | null;
  certificate: DigitalCertificateInfo | null;
  onClose: () => void;
  onSigned: (updated: ContractDetail) => Promise<void> | void;
}

export function getContractTypeLabel(type: string): string {
  if (type === "LECTURER_MASTER") return "Hợp đồng Khung Giảng viên";
  if (type === "COURSE_PUBLISHING") return "Phụ lục Phát hành Khóa học";
  if (type === "COURSE_PURCHASE") return "Hợp đồng Mua & Cấp phép Khóa học";
  return type;
}

export function getContractStatusMeta(status: string) {
  switch (status) {
    case "countersigned":
      return {
        label: "Đã đồng ký 2 bên",
        badgeClass: "border-success-border bg-success-bg text-success-foreground",
      };
    case "signed":
      return {
        label: "Đã ký điện tử",
        badgeClass: "border-primary-pastel bg-primary-light text-primary",
      };
    case "pending_otp":
      return {
        label: "Đang chờ OTP",
        badgeClass:
          "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
      };
    case "revoked":
      return {
        label: "Đã thu hồi",
        badgeClass:
          "border-destructive-border bg-destructive-bg text-destructive-foreground",
      };
    default:
      return {
        label: "Bản thảo",
        badgeClass: "border-border bg-background text-muted-foreground",
      };
  }
}

export function formatContractDateTime(val?: string | null) {
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

export function SigningWorkspace({
  contract,
  certificate,
  onClose,
  closeLabel = "Đóng",
  onSigned,
  postSignAction,
  signButtonLabel = "Ký điện tử & Phát hành",
  standalone = false,
}: SigningWorkspaceProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [agreed, setAgreed] = useState(false);
  const [cccd, setCccd] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [sigMode, setSigMode] = useState<"drawn" | "typed">("drawn");
  const [inkColor, setInkColor] = useState("#0F172A");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Step 3: PKI & OTP
  const [signingMethod, setSigningMethod] = useState<"cloud_pki" | "external_p12">(
    "cloud_pki",
  );
  const [pin, setPin] = useState("");
  const [resettingPin, setResettingPin] = useState(false);
  const [p12File, setP12File] = useState<File | null>(null);
  const [p12Password, setP12Password] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMaskedEmail, setOtpMaskedEmail] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedContract, setSignedContract] = useState<ContractDetail | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (contract) {
      const alreadySigned =
        contract.status === "signed" || contract.status === "countersigned";
      setStep(alreadySigned ? 4 : 1);
      setAgreed(alreadySigned);
      setCccd(contract.signer_cccd || certificate?.subject_cccd || "");
      setTaxCode(contract.signer_tax_code || "");
      setPin("");
      setOtpCode("");
      setOtpSent(false);
      setOtpMaskedEmail(null);
      setOtpCooldown(0);
      setP12File(null);
      setP12Password("");
      setHasDrawn(Boolean(contract.signature_image_data));
      setSignatureDataUrl(contract.signature_image_data || null);
      setSignedContract(alreadySigned ? contract : null);
    }
  }, [contract, certificate]);

  useEffect(() => {
    if (standalone || !onClose) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onEsc);
    };
  }, [standalone, onClose]);

  const activeData = signedContract || contract;
  const isCompleted =
    activeData.status === "signed" || activeData.status === "countersigned";

  const getPointerPos = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPointerPos(e, canvas);
    drawingRef.current = true;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const pos = getPointerPos(e, canvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handlePointerUp = () => {
    if (!drawingRef.current || !canvasRef.current) return;
    drawingRef.current = false;
    setSignatureDataUrl(canvasRef.current.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureDataUrl(null);
  };

  async function handleRequestOtp() {
    if (!contract || otpCooldown > 0) return;
    setSendingOtp(true);
    try {
      const res = await api.post(`/lecturer/contracts/${contract.id}/request-otp`);
      setOtpSent(true);
      setOtpMaskedEmail(res.data?.masked_email || null);
      setOtpCooldown(Number(res.data?.resend_cooldown_seconds) || 45);
      toast.success(
        res.data?.message || "Đã gửi mã OTP 6 chữ số tới hộp thư Email của bạn.",
      );
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể gửi mã OTP qua Email. Vui lòng thử lại sau.";
      toast.error(detail);
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSignSubmit() {
    if (!contract) return;
    if (!otpCode.trim()) {
      toast.error("Vui lòng nhập mã OTP 6 số.");
      return;
    }
    if (cccd.trim().length < 9) {
      toast.error("Vui lòng nhập số CCCD hợp lệ.");
      return;
    }

    setSigning(true);
    try {
      let res;
      if (signingMethod === "external_p12") {
        if (!p12File) {
          toast.error("Vui lòng chọn tệp chứng thư số (.p12 / .pfx).");
          setSigning(false);
          return;
        }
        const formData = new FormData();
        formData.append("otp_code", otpCode.trim());
        formData.append("signer_cccd", cccd.trim());
        if (taxCode.trim()) formData.append("signer_tax_code", taxCode.trim());
        formData.append("p12_password", p12Password);
        if (signatureDataUrl && sigMode === "drawn") {
          formData.append("signature_image_data", signatureDataUrl);
        }
        formData.append("signature_type", sigMode);
        formData.append("p12_file", p12File);

        res = await api.post(`/lecturer/contracts/${contract.id}/sign-p12`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        if (pin.trim().length < 6) {
          toast.error("Vui lòng nhập mã PIN ký số tối thiểu 6 chữ số.");
          setSigning(false);
          return;
        }
        res = await api.post(`/lecturer/contracts/${contract.id}/sign`, {
          otp_code: otpCode.trim(),
          signer_cccd: cccd.trim(),
          signer_tax_code: taxCode.trim() || null,
          pin: pin.trim(),
          signature_image_data: sigMode === "drawn" ? signatureDataUrl : null,
          signature_type: sigMode,
        });
      }

      const updated: ContractDetail = res.data;
      setSignedContract(updated);
      setStep(4);
      toast.success("Ký hợp đồng điện tử thành công! Đã đóng dấu mật mã PKI.");
      await onSigned(updated);
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể hoàn tất ký điện tử.";
      toast.error(detail);
    } finally {
      setSigning(false);
    }
  }

  async function handleResetPinAndReissueCert() {
    if (pin.trim().length < 6 || !/^\d+$/.test(pin.trim())) {
      toast.error("Nhập mã PIN mới (tối thiểu 6 chữ số) vào ô PIN rồi bấm Cấp lại.");
      return;
    }
    if (cccd.trim().length < 9) {
      toast.error("Vui lòng nhập CCCD hợp lệ ở Bước 1 trước.");
      return;
    }
    setResettingPin(true);
    try {
      await api.post("/lecturer/contracts/certificate/issue", {
        pin: pin.trim(),
        cccd: cccd.trim(),
      });
      toast.success("Đã cấp lại Chứng thư số X.509 với mã PIN mới! Bạn có thể bấm Ký ngay.");
    } catch {
      toast.error("Không thể cấp lại chứng thư số.");
    } finally {
      setResettingPin(false);
    }
  }

  async function handleDownloadPdf(id: string, contractNumber: string) {
    try {
      const res = await api.get(`/lecturer/contracts/${id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contractNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải bản PDF có nhúng chữ ký số PAdES!");
    } catch {
      toast.error("Không thể tải file PDF hợp đồng.");
    }
  }

  // Hiển thị live CCCD trên tờ giấy A4 khi người dùng gõ
  const liveDocumentText = activeData.rendered_content.replaceAll(
    "Sẽ xác nhận khi ký",
    cccd.trim() || "........................",
  );

  return (
    <div
      role={standalone ? undefined : "dialog"}
      aria-modal={standalone ? undefined : true}
      aria-label="Không gian Ký Hợp Đồng Điện Tử Toàn Màn Hình"
      className={
        standalone
          ? "fixed inset-0 z-[70] flex h-dvh flex-col overflow-hidden bg-[#EEF1F5] text-[#111827]"
          : "fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-[#EEF1F5] text-[#111827]"
      }
    >
      {/* Top Formal Document Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-300 bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-900">
            <FileText size={16} animated={false} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-gray-950">
                {activeData.title}
              </span>
              <code className="hidden rounded border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-800 sm:inline">
                {activeData.contract_number}
              </code>
            </div>
            <p className="text-[11px] text-gray-600">
              Văn bản pháp lý điện tử · Chuẩn chữ ký số PKI X.509 / PAdES
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void handleDownloadPdf(activeData.id, activeData.contract_number)
            }
          >
            <Download size={14} />
            {isCompleted ? "Tải PDF chính thức (PAdES)" : "Xuất PDF (Bản thảo)"}
          </Button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-100"
            >
              <X size={15} animated={false} />
              <span className="hidden sm:inline">{closeLabel}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Screen Split Workspace */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* LEFT (~70%): Formal White Paper A4 Legal Document (Giấy trắng mực đen · Times New Roman · Chống Copy) */}
        <section className="flex-1 overflow-y-auto px-3 py-6 sm:px-8 sm:py-10">
          <article
            onCopy={(e) => {
              e.preventDefault();
              toast("Văn bản hợp đồng được bảo vệ chống sao chép. Vui lòng dùng nút Xuất PDF.");
            }}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{
              fontFamily: '"Times New Roman", Times, Georgia, serif',
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            className="mx-auto min-h-[1120px] w-full max-w-[840px] select-none border border-gray-400 bg-white px-7 py-10 text-[#000000] shadow-[0_10px_34px_rgba(15,23,42,0.10)] sm:px-16 sm:py-14"
          >
            {/* Quốc hiệu - Tiêu ngữ chuẩn văn bản hành chính Việt Nam (NĐ 30/2020/NĐ-CP) */}
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
              <h1 className="text-[18px] font-bold uppercase leading-snug text-black sm:text-[20px]">
                {activeData.title}
              </h1>
              <p className="mt-1.5 text-[13px] font-bold text-black">
                Số: {activeData.contract_number}
              </p>
              {!isCompleted && (
                <p className="mt-1 text-[11.5px] italic text-gray-700">
                  (Bản thảo điện tử — Chống sao chép · Vui lòng đọc kỹ và hoàn tất ký số bên phải)
                </p>
              )}
            </div>

            {/* Căn cứ pháp lý */}
            <div className="mt-6 space-y-1 border-y border-gray-300 py-3.5 text-[13px] italic leading-[1.65] text-black">
              <p>- Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam hiện hành;</p>
              <p>- Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 về giá trị pháp lý của hợp đồng và chữ ký điện tử;</p>
              <p>- Căn cứ nhu cầu và năng lực hợp tác giữa Nền tảng Giáo dục Mây Mây và Giảng viên / Đối tác.</p>
            </div>

            {/* Toàn văn điều khoản & Bảng biểu chuẩn Times New Roman 14px */}
            <div className="mt-5 space-y-2.5 text-[14px] leading-[1.75] text-black">
              {(() => {
                const rawLines = liveDocumentText.split("\n");
                const nodes: React.ReactNode[] = [];
                let i = 0;

                while (i < rawLines.length) {
                  const trimmed = rawLines[i].trim();
                  if (!trimmed) {
                    nodes.push(<div key={`sp-${i}`} className="h-1" />);
                    i += 1;
                    continue;
                  }

                  // Render Markdown Table thành bảng pháp lý viền đen sắc nét
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
                      .filter(
                        (cells) =>
                          !cells.every((c) => /^[:\-\s]+$/.test(c)),
                      );
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
              })()}
            </div>

            {/* Khung Ký & Đóng dấu điện tử 2 bên cuối trang A4 */}
            <div className="mt-12 grid grid-cols-1 gap-6 border-t-2 border-black pt-8 sm:grid-cols-2">
              {/* Bên A */}
              <div className="flex flex-col items-center border border-gray-300 p-5 text-center">
                <p className="text-xs font-bold uppercase text-black">
                  ĐẠI DIỆN BÊN A
                </p>
                <p className="text-[11px] italic text-gray-700">
                  (Nền tảng Học tập Trực tuyến Mây Mây)
                </p>

                <div className="mt-5 w-full border border-gray-800 bg-gray-50 p-3 text-left text-[11px] leading-relaxed text-black">
                  <p className="font-bold uppercase">
                    ✓ {activeData.status === "countersigned"
                      ? "ĐÃ ĐỒNG KÝ ĐIỆN TỬ"
                      : "XÁC THỰC HỆ THỐNG MÂY MÂY"}
                  </p>
                  <p>Tổ chức: May May Education Platform</p>
                  <p>Chứng thư: Mây Mây Digital CA (X.509)</p>
                  {activeData.countersigned_at && (
                    <p>
                      Ngày đồng ký: {formatContractDateTime(activeData.countersigned_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Bên B */}
              <div className="flex flex-col items-center border border-gray-300 p-5 text-center">
                <p className="text-xs font-bold uppercase text-black">
                  ĐẠI DIỆN BÊN B
                </p>
                <p className="text-[11px] italic text-gray-700">
                  (Giảng viên / Đối tác ký điện tử)
                </p>

                <div className="mt-4 flex min-h-[72px] w-full items-center justify-center">
                  {sigMode === "drawn" && signatureDataUrl ? (
                    <img
                      src={signatureDataUrl}
                      alt="Chữ ký Bên B"
                      className="max-h-16 object-contain"
                    />
                  ) : (
                    <p className="font-display text-xl font-bold italic text-black">
                      {activeData.party_b.fullname}
                    </p>
                  )}
                </div>

                <div
                  className={`mt-2 w-full border p-3 text-left text-[11px] leading-relaxed ${
                    isCompleted
                      ? "border-black bg-gray-50 text-black"
                      : "border-dashed border-gray-400 bg-white text-gray-700"
                  }`}
                >
                  <p className="font-bold uppercase">
                    {isCompleted
                      ? "✓ ĐÃ KÝ ĐIỆN TỬ (PKI X.509)"
                      : "CHỜ KÝ XÁC NHẬN ĐIỆN TỬ"}
                  </p>
                  <p>Họ và tên: {activeData.party_b.fullname}</p>
                  <p>CCCD/Định danh: {cccd.trim() || "—"}</p>
                  {taxCode.trim() && <p>Mã số thuế: {taxCode.trim()}</p>}
                  {activeData.signed_at && (
                    <p>
                      Thời điểm ký: {formatContractDateTime(activeData.signed_at)}
                    </p>
                  )}
                  {activeData.cert_serial && (
                    <p className="truncate font-mono text-[10px]">
                      Serial: {activeData.cert_serial}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Chân trang xác thực SHA-256 */}
            <div className="mt-8 border-t border-gray-300 pt-4 text-[10.5px] text-gray-700">
              <p className="font-semibold text-black">
                THÔNG TIN XÁC THỰC TÍNH TOÀN VẸN HỒ SƠ ĐIỆN TỬ
              </p>
              <p className="mt-1 break-all font-mono">
                SHA-256:{" "}
                {activeData.document_hash ||
                  "(Mã băm mật mã sẽ được niêm phong ngay khi hoàn tất ký số)"}
              </p>
            </div>
          </article>
        </section>

        {/* RIGHT (~30%): Formal Signing Control Sidebar */}
        <aside className="flex max-h-[55vh] w-full shrink-0 flex-col border-t border-gray-300 bg-white lg:h-full lg:max-h-none lg:w-[400px] lg:border-l lg:border-t-0">
          {/* Stepper Bar */}
          <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold">
            {(
              [
                [1, "1. Định danh"],
                [2, "2. Chữ ký"],
                [3, "3. Ký PKI"],
              ] as const
            ).map(([idx, label]) => (
              <button
                key={idx}
                type="button"
                disabled={isCompleted || (idx > step && !agreed)}
                onClick={() => !isCompleted && setStep(idx)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1 transition-colors ${
                  step === idx
                    ? "bg-gray-900 text-white"
                    : step > idx || isCompleted
                      ? "text-gray-900"
                      : "text-gray-400"
                }`}
              >
                <span>{step > idx || isCompleted ? "✓" : ""}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Sidebar Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {step === 1 && !isCompleted && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-950">
                    Bước 1: Xác nhận Thông tin Bên B
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    Đọc kỹ toàn bộ văn bản bên trái. Thông tin CCCD sẽ được ghi
                    nhận trực tiếp vào chứng thư số X.509 và văn bản PDF.
                  </p>
                </div>

                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold text-gray-900">
                    Số CCCD / CMND định danh *
                  </span>
                  <input
                    type="text"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    placeholder="Nhập 12 chữ số CCCD..."
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-gray-900 focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold text-gray-900">
                    Mã số thuế cá nhân (tùy chọn)
                  </span>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    placeholder="Nhập mã số thuế nếu có..."
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-gray-900 focus:outline-none"
                  />
                </label>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-xs">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-gray-900"
                  />
                  <span className="leading-relaxed text-gray-800">
                    Tôi xác nhận đã đọc toàn văn hợp đồng số{" "}
                    <strong className="text-black">
                      {activeData.contract_number}
                    </strong>{" "}
                    và đồng ý ký kết bằng chữ ký điện tử có giá trị pháp lý theo
                    Luật Giao dịch điện tử 2023.
                  </span>
                </label>
              </div>
            )}

            {step === 2 && !isCompleted && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-950">
                    Bước 2: Chữ ký hiển thị trên văn bản
                  </h2>
                  <p className="mt-1 text-xs text-gray-600">
                    Chữ ký bạn vẽ sẽ hiển thị trực tiếp vào khung Bên B trên tờ
                    A4 bên trái và trong tệp PDF xuất ra.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-lg border border-gray-300 bg-gray-50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSigMode("drawn")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 font-semibold ${
                      sigMode === "drawn"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600"
                    }`}
                  >
                    <PenTool size={13} animated={false} />
                    Ký tay Canvas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode("typed")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 font-semibold ${
                      sigMode === "typed"
                        ? "bg-gray-900 text-white"
                        : "text-gray-600"
                    }`}
                  >
                    <FileText size={13} animated={false} />
                    Con dấu chữ ký
                  </button>
                </div>

                {sigMode === "drawn" ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Mực:</span>
                        {[
                          { color: "#0F172A", label: "Đen" },
                          { color: "#1E3A8A", label: "Xanh đậm" },
                        ].map((opt) => (
                          <button
                            key={opt.color}
                            type="button"
                            onClick={() => setInkColor(opt.color)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              inkColor === opt.color
                                ? "border-gray-900 bg-gray-100 text-gray-950"
                                : "border-gray-300 bg-white text-gray-600"
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: opt.color }}
                            />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black"
                      >
                        <RefreshCw size={12} animated={false} />
                        Xóa ký lại
                      </button>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-400 bg-white">
                      <canvas
                        ref={canvasRef}
                        width={560}
                        height={200}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className="h-44 w-full touch-none cursor-crosshair"
                      />
                      {!hasDrawn && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                          Ký tay vào khung này...
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-300 bg-gray-50 p-5 text-center">
                    <p className="text-[11px] font-bold uppercase text-gray-700">
                      Con dấu chữ ký điện tử mặc định
                    </p>
                    <p className="mt-2 font-display text-2xl font-bold italic text-black">
                      {activeData.party_b.fullname}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && !isCompleted && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-950">
                    Bước 3: Ký số Mật mã (PKI X.509) &amp; OTP
                  </h2>
                  <p className="mt-1 text-xs text-gray-600">
                    Mở khóa chứng thư số để tạo chữ ký mật mã RSA-PSS và niêm
                    phong toàn vẹn SHA-256.
                  </p>
                </div>

                {/* Method Selector */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSigningMethod("cloud_pki")}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      signingMethod === "cloud_pki"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-300 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-950">
                      <Key size={14} animated={false} />
                      Cloud PKI Mây Mây (X.509 + PIN)
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-600">
                      {certificate
                        ? `Chứng thư Serial ${certificate.serial_number.slice(0, 14)}...`
                        : "Tự động cấp chứng thư X.509 mới từ mã PIN 6 số."}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSigningMethod("external_p12")}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      signingMethod === "external_p12"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-300 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-950">
                      <Upload size={14} animated={false} />
                      Chứng thư số cá nhân (.p12 / .pfx)
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-600">
                      VNPT-CA, Viettel-CA, FPT-CA... (ký trong RAM, không lưu khóa).
                    </p>
                  </button>
                </div>

                {signingMethod === "cloud_pki" ? (
                  <div className="space-y-1.5">
                    <label className="block space-y-1.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                        <Lock size={13} animated={false} />
                        {certificate
                          ? "Nhập mã PIN ký số (6+ chữ số) *"
                          : "Đặt mã PIN ký số mới (6+ chữ số) *"}
                      </span>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Ví dụ: 123456"
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm tracking-widest text-gray-950 focus:border-gray-900 focus:outline-none"
                      />
                    </label>
                    {certificate && (
                      <div className="flex items-center justify-between text-[11px] text-gray-600">
                        <span>Quên mã PIN chứng thư cũ?</span>
                        <button
                          type="button"
                          disabled={resettingPin}
                          onClick={() => void handleResetPinAndReissueCert()}
                          className="font-semibold text-gray-950 underline hover:opacity-75 disabled:opacity-50"
                        >
                          {resettingPin
                            ? "Đang cấp lại..."
                            : "Đặt PIN mới & Cấp lại X.509"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-gray-300 bg-gray-50 p-3">
                    <label className="block text-xs font-semibold text-gray-900">
                      Tệp chứng thư (.p12 / .pfx) *
                      <input
                        type="file"
                        accept=".p12,.pfx"
                        onChange={(e) => setP12File(e.target.files?.[0] || null)}
                        className="mt-1.5 block w-full text-xs text-gray-700"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-gray-900">
                      Mật khẩu tệp .p12
                      <input
                        type="password"
                        value={p12Password}
                        onChange={(e) => setP12Password(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                      />
                    </label>
                  </div>
                )}

                {/* OTP Box */}
                <div className="space-y-2.5 rounded-xl border border-gray-300 bg-gray-50 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-950">
                      <Mail size={13} animated={false} />
                      Mã OTP xác thực Email
                    </span>
                    <button
                      type="button"
                      disabled={sendingOtp || otpCooldown > 0}
                      onClick={() => void handleRequestOtp()}
                      className="rounded-lg border border-gray-900 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-950 transition-colors hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingOtp
                        ? "Đang gửi..."
                        : otpCooldown > 0
                          ? `Gửi lại (${otpCooldown}s)`
                          : otpSent
                            ? "Gửi lại OTP"
                            : "Gửi mã OTP"}
                    </button>
                  </div>

                  {otpSent && (
                    <p className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-gray-700">
                      Mã xác thực 6 chữ số đã được gửi tới hộp thư{" "}
                      <strong className="font-semibold text-gray-950">
                        {otpMaskedEmail || activeData.party_b.email}
                      </strong>
                      . Hiệu lực trong 05 phút (kiểm tra cả thư mục Spam/Quảng cáo nếu chưa thấy).
                    </p>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Nhập 6 chữ số OTP từ Email..."
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 font-mono text-sm tracking-[0.25em] text-gray-950 focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {(step === 4 || isCompleted) && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-900 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-950">
                    <CheckCircle2 size={18} animated={false} />
                    Hợp đồng đã được Ký Điện Tử
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-700">
                    Văn bản bên trái đã được đóng băng và niêm phong mật mã
                    SHA-256 + PKI X.509. Bạn có thể tải bản PDF PAdES ngay bây giờ.
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-gray-200 p-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số hợp đồng:</span>
                    <strong className="font-mono text-black">
                      {activeData.contract_number}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thời điểm ký:</span>
                    <strong className="text-black">
                      {formatContractDateTime(activeData.signed_at)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Serial X.509:</span>
                    <strong className="max-w-[170px] truncate font-mono text-black">
                      {activeData.cert_serial || "—"}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  {postSignAction}
                  <Button
                    fullWidth
                    variant={postSignAction ? "outline" : "primary"}
                    onClick={() =>
                      void handleDownloadPdf(
                        activeData.id,
                        activeData.contract_number,
                      )
                    }
                  >
                    <Download size={15} />
                    Tải PDF có Chữ ký số PAdES
                  </Button>
                  <Link
                    href={`/verify-contract/${activeData.contract_number}`}
                    target="_blank"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    Mở trang Xác thực Công khai
                    <ExternalLink size={13} animated={false} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3.5">
            {step > 1 && !isCompleted ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 hover:bg-gray-100"
              >
                Quay lại
              </button>
            ) : onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 hover:bg-gray-100"
              >
                {closeLabel}
              </button>
            ) : (
              <span />
            )}

            {step === 1 && !isCompleted && (
              <button
                type="button"
                disabled={!agreed || cccd.trim().length < 9}
                onClick={() => setStep(2)}
                className="h-10 flex-1 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
              >
                Tiếp tục: Ký chữ ký hiển thị →
              </button>
            )}
            {step === 2 && !isCompleted && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="h-10 flex-1 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800"
              >
                Tiếp tục: Ký số PKI &amp; OTP →
              </button>
            )}
            {step === 3 && !isCompleted && (
              <button
                type="button"
                disabled={
                  signing ||
                  otpCode.trim().length < 6 ||
                  (signingMethod === "cloud_pki"
                    ? pin.trim().length < 6
                    : !p12File)
                }
                onClick={() => void handleSignSubmit()}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShieldCheck size={15} animated={false} />
                {signing ? "Đang niêm phong PKI..." : signButtonLabel}
              </button>
            )}
            {(step === 4 || isCompleted) && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white hover:bg-gray-800"
              >
                Hoàn tất
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function SigningStudioModal({
  open,
  contract,
  certificate,
  onClose,
  onSigned,
}: SigningStudioModalProps) {
  if (!open || !contract) return null;
  return (
    <SigningWorkspace
      contract={contract}
      certificate={certificate}
      onClose={onClose}
      onSigned={onSigned}
    />
  );
}
