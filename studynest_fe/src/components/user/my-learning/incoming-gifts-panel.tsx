"use client";

import { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowRight, CheckCircle2, Gift, Mail } from "pulsoicon-react";
import useSWR from "swr";
import { Button, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";

export interface IncomingGiftItem {
  gift_id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: "claimable" | "fulfilled" | string;
  sender_id?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
}

interface IncomingGiftsResponse {
  gifts: IncomingGiftItem[];
}

interface IncomingGiftsPanelProps {
  onClaimed?: () => void;
}

const fetchIncomingGifts = async () => {
  const res = await api.get<IncomingGiftsResponse>("/learning/player/gifts/incoming");
  return res.data;
};

export function IncomingGiftsPanel({ onClaimed }: IncomingGiftsPanelProps) {
  const { data, error, isLoading, mutate } = useSWR<IncomingGiftsResponse>(
    "/learning/player/gifts/incoming",
    fetchIncomingGifts,
    { revalidateOnFocus: false },
  );
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const gifts = data?.gifts ?? [];

  const handleClaim = async (gift: IncomingGiftItem) => {
    if (claimingId) return;
    setClaimingId(gift.gift_id);
    try {
      await api.post(`/learning/player/gifts/${gift.gift_id}/claim`);
      confetti({
        particleCount: 110,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#356FA7", "#7BAFD4", "#BFD7ED", "#F7C9D9", "#E3D5F5", "#F8E9C9"],
      });
      showToast.success(`Chúc mừng! Bạn đã nhận khóa học “${gift.course_title}”.`);
      await mutate();
      onClaimed?.();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      showToast.error(
        typeof detail === "string" && detail.trim()
          ? detail
          : "Không thể nhận quà tặng lúc này. Vui lòng thử lại.",
      );
    } finally {
      setClaimingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((k) => (
          <Skeleton key={k} className="h-36 rounded-[24px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[24px] border-destructive/30 bg-destructive-bg/40 p-6 text-center">
        <p className="text-sm font-bold text-destructive-foreground">
          Không tải được danh sách quà tặng lúc này.
        </p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void mutate()}>
          Thử tải lại
        </Button>
      </Card>
    );
  }

  if (gifts.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-primary-pastel bg-surface/80 p-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-secondary-pastel bg-secondary/50 text-secondary-foreground">
          <Gift className="size-7" animated={false} aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Hộp quà tặng hiện đang trống
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
          Khi bạn bè hoặc người thân tặng khóa học tới email tài khoản của bạn, món quà sẽ xuất hiện ngay tại đây để bạn mở và vào học chỉ với 1 chạm!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {gifts.map((gift) => {
        const isClaimable = gift.status === "claimable";
        const isClaiming = claimingId === gift.gift_id;
        return (
          <div
            key={gift.gift_id}
            className="flex flex-col justify-between gap-4 rounded-[24px] border border-secondary-pastel/80 bg-gradient-to-br from-secondary/35 via-surface to-primary-light/35 p-5 shadow-xs transition-all hover:border-primary-pastel"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-secondary-pastel bg-surface text-secondary-foreground shadow-2xs">
                <Gift className="size-6" animated={false} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {isClaimable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                      <Mail className="size-3" animated={false} aria-hidden="true" />
                      Chờ bạn mở quà
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[10px] font-extrabold text-success-foreground">
                      <CheckCircle2 className="size-3" animated={false} aria-hidden="true" />
                      Đã nhận thành công
                    </span>
                  )}
                </div>
                <h3 className="mt-2 line-clamp-2 font-display text-base font-bold text-foreground">
                  {gift.course_title}
                </h3>
                {gift.sender_name && (
                  <div className="mt-2">
                    {gift.sender_id ? (
                      <Link
                        href={`/members/${gift.sender_id}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary-pastel/70 bg-surface py-1 pr-3 pl-1 text-xs transition-colors hover:bg-primary-light/60"
                      >
                        {gift.sender_avatar ? (
                          <img
                            src={getImageUrl(gift.sender_avatar)}
                            alt={gift.sender_name}
                            className="size-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                            {gift.sender_name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate text-muted-foreground">
                          Gửi từ <strong className="text-foreground">{gift.sender_name}</strong>
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Gửi từ <strong className="text-foreground">{gift.sender_name}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              {isClaimable ? (
                <Button
                  size="sm"
                  isLoading={isClaiming}
                  disabled={Boolean(claimingId)}
                  onClick={() => void handleClaim(gift)}
                  leftIcon={<Gift className="size-3.5" />}
                >
                  Nhận khóa học ngay
                </Button>
              ) : (
                <Link
                  href={`/learning/${gift.course_slug}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Vào học ngay
                  <ArrowRight className="size-3.5" animated={false} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
