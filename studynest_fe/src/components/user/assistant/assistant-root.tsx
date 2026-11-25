"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Bot, Maximize2, Minimize2, Minus, Shield, Zap } from "pulsoicon-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/user";
import { LearningAgentProvider, useLearningAgent } from "../learning_detail/agent/agent-context";
import { AssistantVoiceProvider, useAssistantVoice } from "./voice-provider";

const AccountPanel = dynamic(() => import("./account-panel"), {
  loading: () => (
    <div role="status" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span>Đang khởi tạo Mây Mây Co-Pilot Studio…</span>
    </div>
  ),
});

function AssistantSurface() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const voice = useAssistantVoice();
  const agent = useLearningAgent();

  useEffect(() => {
    try {
      if (sessionStorage.getItem("maymay:copilot-open") === "1") {
        setLoaded(true);
        setOpen(true);
      }
      if (sessionStorage.getItem("maymay:copilot-expanded") === "1") {
        setExpanded(true);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const updateOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    setOpen(prev => {
      const val = typeof next === "function" ? next(prev) : next;
      try {
        sessionStorage.setItem("maymay:copilot-open", val ? "1" : "0");
      } catch {
        // Ignore
      }
      return val;
    });
  };

  const updateExpanded = (next: boolean | ((prev: boolean) => boolean)) => {
    setExpanded(prev => {
      const val = typeof next === "function" ? next(prev) : next;
      try {
        sessionStorage.setItem("maymay:copilot-expanded", val ? "1" : "0");
      } catch {
        // Ignore
      }
      return val;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLoaded(true);
        updateOpen(value => !value);
      }
    };
    const onOpenAssistant = () => {
      setLoaded(true);
      updateOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("maymay:open-assistant", onOpenAssistant);
    window.addEventListener("maymay:quick-prompt", onOpenAssistant);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("maymay:open-assistant", onOpenAssistant);
      window.removeEventListener("maymay:quick-prompt", onOpenAssistant);
    };
  }, []);

  const modeLabel =
    agent?.permissionMode === "autoPilot"
      ? "Auto-Pilot"
      : agent?.permissionMode === "default"
        ? "Hỏi trước"
        : "Plan";
  const modeVariant =
    agent?.permissionMode === "autoPilot"
      ? "primary"
      : agent?.permissionMode === "default"
        ? "vanilla"
        : "lavender";

  return (
    <div>
      {/* Floating Co-Pilot Launcher Pill */}
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
          updateOpen(value => !value);
        }}
        aria-label={open ? "Thu nhỏ Mây Mây Co-Pilot" : "Mở Mây Mây Co-Pilot"}
        aria-expanded={open}
        className={`group fixed ${voice?.active ? "bottom-28" : "bottom-6"} right-6 z-50 flex items-center gap-2.5 rounded-full border border-primary-pastel bg-surface/95 py-2 pl-2.5 pr-4 shadow-[0_12px_36px_rgba(53,111,167,0.22)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_16px_42px_rgba(53,111,167,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
          {agent?.busy ? (
            <Zap animated={false} className="h-5 w-5 animate-pulse motion-reduce:animate-none" />
          ) : (
            <Bot animated={false} className="h-5 w-5" />
          )}
          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${
              agent?.busy ? "animate-ping bg-primary" : "bg-success-foreground"
            }`}
          />
        </span>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-tight text-foreground">Mây Mây Co-Pilot</span>
            <span className="rounded-md border border-primary-pastel bg-primary-light px-1.5 py-0.2 text-[10px] font-semibold text-primary">
              ⌘K
            </span>
          </div>
          <p className="max-w-[155px] truncate text-[11px] text-muted-foreground">
            {agent?.busy ? agent.status || "Đang điều khiển màn hình…" : "Điều khiển màn hình · Học tập"}
          </p>
        </div>
      </button>

      {/* Floating Hannes-Lite Co-Pilot Studio Panel */}
      {loaded && (
        <section
          data-agent-private
          aria-label="Mây Mây · Co-Pilot Studio"
          className={`${
            open ? "flex" : "hidden"
          } fixed bottom-24 left-3 right-3 z-50 flex-col overflow-hidden rounded-3xl border border-primary-pastel bg-surface/95 shadow-[0_24px_64px_rgba(40,92,144,0.22)] backdrop-blur-xl transition-all duration-300 sm:left-auto sm:right-6 ${
            expanded
              ? "h-[min(820px,calc(100dvh-110px))] sm:w-[600px]"
              : "h-[min(700px,calc(100dvh-116px))] sm:w-[460px]"
          }`}
        >
          {/* Ambient Pastel Top Header */}
          <header className="relative flex items-center justify-between gap-2 border-b border-primary-pastel/70 bg-gradient-to-r from-primary-light/85 via-surface to-secondary-light/45 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface shadow-2xs">
                <img src="/logo/maymay-mark.svg" alt="Mây Mây" className="h-5 w-5 object-contain" />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-surface bg-primary"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-display text-sm font-bold text-foreground">Mây Mây Co-Pilot</p>
                  <Badge variant="info" size="sm" className="px-1.5 py-0 text-[10px]">
                    Hannes-Lite
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {pathname === "/"
                    ? "Đang quan sát: Trang chủ"
                    : pathname.startsWith("/courses")
                      ? "Đang quan sát: Khám phá khóa học"
                      : `Đang quan sát: ${pathname}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {agent && (
                <button
                  type="button"
                  onClick={() => agent.cyclePermissionMode()}
                  title="Đổi chế độ quyền Co-Pilot (Shift+Tab)"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Badge variant={modeVariant} size="sm" className="cursor-pointer gap-1">
                    <Shield animated={false} className="h-3 w-3" />
                    <span>{modeLabel}</span>
                  </Badge>
                </button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => updateExpanded(v => !v)}
                aria-label={expanded ? "Thu gọn kích thước khung" : "Mở rộng khung Co-Pilot"}
                title={expanded ? "Thu gọn khung" : "Mở rộng khung Studio"}
                className="h-8 w-8 rounded-xl"
              >
                {expanded ? <Minimize2 animated={false} size="1em" /> : <Maximize2 animated={false} size="1em" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => updateOpen(false)}
                aria-label="Thu nhỏ khung Mây Mây"
                className="h-8 w-8 rounded-xl"
              >
                <Minus animated={false} size="1em" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <AccountPanel />
          </div>
        </section>
      )}
    </div>
  );
}

export default function AssistantRoot({ children }: { children: React.ReactNode; accessToken?: string }) {
  const userId = useUserStore(state => state.user?.id);
  const roles = useUserStore(state => state.user?.roles);
  const pathname = usePathname();
  // Một Co-Pilot duy nhất cho học viên và giảng viên; không hoạt động trong khu vực quản trị.
  const allowed = Boolean(roles?.some(role => role === "USER" || role === "LECTURER")) && !pathname.startsWith("/admin");
  return (
    <LearningAgentProvider key={userId || "anonymous"}>
      <AssistantVoiceProvider>
        {children}
        {userId && allowed && <AssistantSurface />}
      </AssistantVoiceProvider>
    </LearningAgentProvider>
  );
}
