"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Minus, MessageCircle } from "pulsoicon-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/user";
import { LearningAgentProvider } from "../learning_detail/agent/agent-context";
import { AssistantVoiceProvider, useAssistantVoice } from "./voice-provider";

const AccountPanel = dynamic(() => import("./account-panel"), { loading: () => <p role="status" className="p-4 text-sm text-muted-foreground">Đang mở Hannes…</p> });
function AssistantSurface() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const voice = useAssistantVoice();
  const inLesson = pathname.startsWith("/learning/");
  return <>
    <div className={inLesson ? "hidden" : undefined}>
      <Button size="icon" className={`fixed ${voice?.active ? "bottom-28" : "bottom-6"} right-6 z-50 h-14 w-14 rounded-full shadow-lg`} onClick={() => { setLoaded(true); setOpen(value => !value); }} aria-label={open ? "Thu nhỏ Hannes" : "Mở trợ lý Hannes"} aria-expanded={open}><MessageCircle className="h-6 w-6" /></Button>
      {loaded && <section data-agent-private aria-label="Hannes · Trợ lý của bạn" className={`${open ? "flex" : "hidden"} fixed bottom-24 left-3 right-3 z-50 h-[min(680px,calc(100dvh-120px))] flex-col overflow-hidden rounded-2xl border border-primary-pastel bg-surface shadow-xl sm:left-auto sm:right-6 sm:w-[440px]`}>
        <header className="flex items-center justify-between border-b border-border bg-primary-light px-4 py-3"><div><p className="text-sm font-semibold">Hannes</p><p className="text-xs text-muted-foreground">Trợ lý học tập của bạn</p></div><Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Thu nhỏ khung Hannes"><Minus size="1em" /></Button></header>
        <div className="min-h-0 flex-1"><AccountPanel /></div>
      </section>}
    </div>
  </>;
}
export default function AssistantRoot({ children }: { children: React.ReactNode; accessToken?: string }) {
  const userId = useUserStore(state => state.user?.id);
  return <LearningAgentProvider key={userId || "anonymous"}><AssistantVoiceProvider>
    {children}{userId && <AssistantSurface />}
  </AssistantVoiceProvider></LearningAgentProvider>;
}
