"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import api from "@/lib/utils/fetcher/client/axios";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

interface IncomingGift {
  gift_id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
}

export default function IncomingGifts() {
  const { data, error, isLoading, mutate } = useSWR("incoming-gifts", async () => {
    const response = await api.get<{ gifts: IncomingGift[] }>(
      "/learning/player/gifts/incoming",
    );
    return response.data.gifts;
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function claim(gift: IncomingGift) {
    setPendingId(gift.gift_id);
    setActionError(null);
    try {
      await api.post(`/learning/player/gifts/${gift.gift_id}/claim`);
      await mutate();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response
        ?.data?.detail;
      setActionError(
        typeof detail === "string" ? detail : "Không nhận được khóa học",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="user-container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Quà tặng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Đang tải quà tặng</p>
          )}
          {error && (
            <p className="text-sm text-destructive-foreground" role="alert">
              Không tải được danh sách quà tặng
            </p>
          )}
          {data && data.length === 0 && (
            <EmptyState title="Chưa có quà tặng" description="Khi có người tặng khóa học cho email này, quà sẽ hiện ở đây." />
          )}
          {data?.map((gift) => (
            <div
              key={gift.gift_id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{gift.course_title}</p>
                <p className="text-sm text-muted-foreground">
                  {gift.status === "fulfilled"
                    ? "Đã thanh toán, chờ bạn nhận"
                    : "Khóa học miễn phí, chờ bạn nhận"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  isLoading={pendingId === gift.gift_id}
                  loadingText="Đang nhận"
                  onClick={() => void claim(gift)}
                >
                  Nhận khóa học
                </Button>
                <Link
                  href={`/course/${gift.course_slug}`}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-sm font-medium text-foreground hover:bg-background"
                >
                  Xem khóa học
                </Link>
              </div>
            </div>
          ))}
          {actionError && (
            <p className="text-sm text-destructive-foreground" role="alert">
              {actionError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
