"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Gift, Mail, Search, UserCheck, X } from "pulsoicon-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/states";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";

interface GiftRecipient {
  user_id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  already_owns: boolean;
}

interface GiftTransferDialogProps {
  open: boolean;
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onTransferred: () => void;
}

type GiftMode = "transfer" | "email";

function readError(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function GiftTransferDialog({
  open,
  courseId,
  courseTitle,
  onClose,
  onTransferred,
}: GiftTransferDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<GiftMode>("transfer");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiftRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GiftRecipient | null>(null);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftSentSuccess, setGiftSentSuccess] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("transfer");
      setQuery("");
      setResults([]);
      setSelected(null);
      setRecipientEmail("");
      setGiftSentSuccess(null);
      setError(null);
      setPending(false);
      setSearching(false);
      return;
    }
    panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open || mode !== "transfer" || selected) return;
    const keyword = query.trim();
    if (keyword.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setError(null);
    const timer = window.setTimeout(() => {
      api
        .get<{ recipients: GiftRecipient[] }>(`/learning/player/${courseId}/recipients`, {
          params: { q: keyword },
        })
        .then((response) => {
          if (!cancelled) setResults(response.data.recipients ?? []);
        })
        .catch((requestError) => {
          if (!cancelled) {
            setResults([]);
            setError(readError(requestError, "Không tìm được người nhận"));
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [courseId, open, mode, query, selected]);

  async function confirmTransfer() {
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    try {
      await api.post(`/learning/player/${courseId}/transfer`, {
        recipient_user_id: selected.user_id,
      });
      showToast.success(`Đã chuyển quyền học khóa này cho ${selected.fullname}!`);
      onTransferred();
    } catch (requestError) {
      setError(readError(requestError, "Không chuyển được khóa học"));
      setPending(false);
    }
  }

  async function submitEmailGift(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = recipientEmail.trim();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError("Vui lòng nhập đúng định dạng email người nhận.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api.post(`/learning/player/${courseId}/gifts`, {
        recipient_email: cleaned,
      });
      setGiftSentSuccess(cleaned);
      showToast.success(`Đã gửi quà tặng khóa học tới ${cleaned}!`);
    } catch (requestError) {
      setError(readError(requestError, "Không gửi được quà tặng qua email lúc này."));
    } finally {
      setPending(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const keyword = query.trim();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs">
      <div
        className="absolute inset-0"
        onClick={pending ? undefined : onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[calc(100dvh-4rem)] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-primary-pastel bg-surface text-foreground shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-primary-pastel/70 bg-gradient-to-r from-secondary/45 via-surface to-primary-light/60 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-secondary-pastel bg-surface text-secondary-foreground shadow-2xs">
              <Gift className="size-5" animated={false} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-bold text-foreground">
                Tặng khóa học
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{courseTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng hộp thoại"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary-light hover:text-foreground disabled:opacity-60"
          >
            <X className="size-4" animated={false} aria-hidden="true" />
          </button>
        </div>

        {/* Switcher 2 chế độ */}
        <div className="border-b border-border/70 bg-background/50 px-5 py-2.5">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-surface p-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode("transfer");
                setError(null);
                setGiftSentSuccess(null);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-colors cursor-pointer",
                mode === "transfer"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UserCheck className="size-3.5" animated={false} aria-hidden="true" />
              <span>Chuyển quyền học</span>
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode("email");
                setSelected(null);
                setError(null);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-colors cursor-pointer",
                mode === "email"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Mail className="size-3.5" animated={false} aria-hidden="true" />
              <span>Gửi quà qua Email</span>
            </button>
          </div>
        </div>

        {/* Nội dung từng chế độ */}
        <div className="overflow-y-auto p-5">
          {mode === "transfer" ? (
            selected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-primary-pastel bg-primary-light/35 p-3.5">
                  <Initial name={selected.fullname} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {selected.fullname}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
                  </div>
                </div>

                <Alert variant="warning" title="Lưu ý trước khi chuyển quyền">
                  Quyền học khóa <strong>{courseTitle}</strong> của bạn sẽ được chuyển sang cho{" "}
                  <strong>{selected.fullname}</strong>. Bạn sẽ không còn truy cập khóa học này nữa.
                </Alert>

                {error && <Alert variant="destructive">{error}</Alert>}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setSelected(null)}
                  >
                    Chọn lại
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    isLoading={pending}
                    disabled={pending}
                    onClick={() => void confirmTransfer()}
                  >
                    Xác nhận chuyển quyền
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Tìm tài khoản bạn bè trên Mây Mây theo <strong>tên</strong> hoặc{" "}
                  <strong>email</strong> để chuyển quyền sở hữu khóa học này.
                </p>

                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    animated={false}
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nhập tên hoặc email người nhận (từ 2 ký tự)..."
                    className="pl-9"
                  />
                </div>

                {error && <Alert variant="destructive">{error}</Alert>}

                <div className="max-h-60 space-y-1.5 overflow-y-auto">
                  {searching && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Đang tìm người nhận…
                    </p>
                  )}

                  {!searching && keyword.length >= 2 && results.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
                      Không tìm thấy tài khoản nào khớp với “{keyword}”. Bạn có thể thử tab{" "}
                      <strong>Gửi quà qua Email</strong>!
                    </p>
                  )}

                  {!searching &&
                    results.map((recipient) => (
                      <button
                        key={recipient.user_id}
                        type="button"
                        disabled={recipient.already_owns}
                        onClick={() => setSelected(recipient)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/60 p-2.5 text-left transition-colors hover:border-primary-pastel hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Initial name={recipient.fullname} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-foreground">
                              {recipient.fullname}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {recipient.email}
                            </div>
                          </div>
                        </div>
                        {recipient.already_owns ? (
                          <Badge variant="default" className="shrink-0 text-[10px]">
                            Đã sở hữu
                          </Badge>
                        ) : (
                          <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-bold text-primary">
                            Chọn
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )
          ) : giftSentSuccess ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="grid size-12 place-items-center rounded-full border border-success-border bg-success-bg text-success-foreground">
                <Check className="size-6" animated={false} aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-foreground">
                Đã gửi lời mời nhận quà!
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Người nhận tại <strong>{giftSentSuccess}</strong> có thể mở hộp thư hoặc mục quà tặng để nhận khóa học này.
              </p>
              <Button size="sm" className="mt-4" onClick={onClose}>
                Hoàn tất
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void submitEmailGift(e)} className="space-y-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Nhập email của bạn bè hoặc người thân để gửi món quà khóa học{" "}
                <strong>{courseTitle}</strong> trực tiếp qua hộp thư.
              </p>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Email người nhận
                </label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="vd: banbe@example.com"
                  required
                />
              </div>

              {error && <Alert variant="destructive">{error}</Alert>}

              <div className="flex items-center justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onClose}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={pending}
                  disabled={pending}
                  leftIcon={<Gift className="size-3.5" />}
                >
                  Gửi quà ngay
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
