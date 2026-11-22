"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/states";
import api from "@/lib/utils/fetcher/client/axios";
import { useEffect, useId, useRef, useState } from "react";
import { HiCloud } from "react-icons/hi";

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

function readError(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response
    ?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiftRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GiftRecipient | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
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
    if (!open || selected) return;
    const keyword = query.trim();
    if (keyword.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      api
        .get<{ recipients: GiftRecipient[] }>(
          `/learning/player/${courseId}/recipients`,
          { params: { q: keyword } },
        )
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
  }, [courseId, open, query, selected]);

  async function confirmTransfer() {
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    try {
      await api.post(`/learning/player/${courseId}/transfer`, {
        recipient_user_id: selected.user_id,
      });
      onTransferred();
    } catch (requestError) {
      setError(readError(requestError, "Không chuyển được khóa học"));
      setPending(false);
    }
  }

  if (!open) return null;

  const keyword = query.trim();
  const title = selected ? "Chuyển quyền truy cập" : "Tặng khóa học";

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-foreground/10 backdrop-blur-[1px]"
        onClick={pending ? undefined : onClose}
      />
      <div className="absolute left-3 right-3 top-[4.5rem] sm:left-auto sm:right-6 sm:w-full sm:max-w-md">
        <span
          aria-hidden
          className="absolute -top-2 right-5 z-10 hidden h-4 w-4 rotate-45 border-l border-t border-border bg-surface sm:block"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-[20px] border border-border bg-surface text-foreground shadow-lg outline-none"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border bg-background/70 px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                <HiCloud className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {courseTitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              aria-label="Đóng hộp thoại"
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary-light hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {selected ? (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-primary-pastel bg-primary-light/55 px-3 py-3">
                  <Initial name={selected.fullname} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selected.fullname}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.email}
                    </p>
                  </div>
                </div>
                <Alert variant="warning" title="Bạn sẽ mất quyền truy cập">
                  Lịch sử học và tiến độ của bạn vẫn được giữ nguyên.{" "}
                  {selected.fullname} nhận một khóa học mới, chưa có lịch sử
                  truy cập, tiến độ 0%.
                </Alert>
              </>
            ) : (
              <>
                <Input
                  label="Tìm người nhận"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setError(null);
                  }}
                  placeholder="Tên hoặc email"
                  autoComplete="off"
                />
                <div role="listbox" aria-label="Người nhận" className="space-y-1.5">
                  {keyword.length < 2 && (
                    <p className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                      Nhập ít nhất 2 ký tự để hiện danh sách.
                    </p>
                  )}
                  {searching && (
                    <p className="px-1 text-sm text-muted-foreground">Đang tìm</p>
                  )}
                  {!searching && keyword.length >= 2 && results.length === 0 && (
                    <p className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
                      Không thấy người phù hợp.
                    </p>
                  )}
                  {results.map((person) => (
                    <button
                      key={person.user_id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      disabled={person.already_owns}
                      onClick={() => {
                        setError(null);
                        setSelected(person);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-primary-pastel hover:bg-primary-light/45 disabled:cursor-not-allowed disabled:bg-background disabled:opacity-70"
                    >
                      <Initial name={person.fullname} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {person.fullname}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {person.email}
                        </span>
                      </span>
                      {person.already_owns && (
                        <Badge variant="neutral" size="sm">
                          Đã sở hữu khóa học
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            {error && (
              <p className="text-sm text-destructive-foreground" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-background/70 px-5 py-4">
            {selected ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelected(null);
                    setError(null);
                  }}
                  disabled={pending}
                >
                  Quay lại
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void confirmTransfer()}
                  isLoading={pending}
                  loadingText="Đang chuyển"
                >
                  Chuyển khóa học
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={onClose}>
                Đóng
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
