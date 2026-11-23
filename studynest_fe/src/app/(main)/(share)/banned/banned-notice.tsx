"use client";

import Link from "next/link";
import { useState } from "react";
import { Cloud, LifeBuoy, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui";
import { CloudBlob, GlassCard, IconBubble } from "@/components/user/home/landing-ui";
import { logoutEverywhere } from "@/lib/auth/logout";

export default function BannedNotice() {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await logoutEverywhere();
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-76px)] items-center justify-center overflow-hidden bg-gradient-to-b from-surface-muted via-surface to-background px-5 py-16">
      <CloudBlob className="-left-24 top-10 h-64 w-96" />
      <CloudBlob className="-right-32 bottom-8 h-72 w-[28rem] bg-primary-pastel/40" />
      <GlassCard tilt={false} className="relative w-full max-w-lg rounded-[2rem] p-8 text-center sm:p-10">
        <IconBubble tone="vanilla" shape="circle" className="mx-auto mb-6 size-16">
          <ShieldAlert className="size-8" aria-hidden="true" />
        </IconBubble>
        <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Cloud className="size-4" aria-hidden="true" /> Mây Mây
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tài khoản đang bị tạm khóa
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
          Tài khoản của bạn hiện không thể truy cập. Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ đội ngũ hỗ trợ để
          được xem xét lại.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <LifeBuoy className="size-4" aria-hidden="true" /> Liên hệ hỗ trợ
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={busy}
            className="min-h-11 rounded-full px-6"
          >
            <LogOut className="size-4" aria-hidden="true" /> Đăng xuất
          </Button>
        </div>
      </GlassCard>
    </main>
  );
}
