"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Settings } from "pulsoicon-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/states";
import api from "@/lib/utils/fetcher/client/axios";
import { MemoryControls } from "../learning_detail/agent/memory-controls";
import { GitHubConnection } from "./github-connection";
import { useAssistantVoice } from "./voice-provider";

const tabs = ["Giọng nói", "Bộ nhớ", "GitHub"] as const;

export function AssistantSettings() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<typeof tabs[number]>("Giọng nói");
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (open) heading.current?.focus(); }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <>
    <Button ref={trigger} variant="ghost" size="icon" aria-label="Cài đặt AI" aria-expanded={open} onClick={() => setOpen(true)}><Settings animated={false} className="h-5 w-5" /></Button>
    {open && <section aria-label="Cài đặt AI" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }} className="absolute inset-0 z-30 flex min-h-0 min-w-0 flex-col bg-surface text-foreground">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="icon" aria-label="Quay lại hội thoại" onClick={close}><ArrowLeft animated={false} size="1em" /></Button>
        <div><h3 ref={heading} tabIndex={-1} className="text-sm font-semibold outline-none">Cài đặt AI</h3><p className="text-xs text-muted-foreground">Tùy chỉnh trợ lý của bạn</p></div>
      </header>
      <nav aria-label="Nhóm cài đặt AI" className="flex gap-1 border-b border-border p-2">
        {tabs.map(item => <Button key={item} size="sm" variant={tab === item ? "pastel" : "ghost"} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</Button>)}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "Giọng nói" && <VoicePreferences />}
        {tab === "Bộ nhớ" && <MemoryControls embedded />}
        {tab === "GitHub" && <GitHubConnection embedded />}
      </div>
    </section>}
  </>;
}

function VoicePreferences() {
  const voice = useAssistantVoice();
  const [values, setValues] = useState({ voice: "eve", speed: 1, mic_threshold: 0.012 });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let live = true;
    void api.get("/agent/voice-settings").then(({ data }) => {
      if (live) { setValues({ voice: data.voice, speed: data.speed, mic_threshold: data.mic_threshold }); setLoaded(true); }
    }).catch(() => { if (live) setError("Chưa tải được cài đặt giọng nói. Đóng và mở lại để thử lại."); });
    return () => { live = false; };
  }, []);
  const disabled = !loaded || busy || voice?.active;
  return <form className="space-y-5" onChange={() => setSaved(false)} onSubmit={async event => {
    event.preventDefault(); if (disabled) return;
    setBusy(true); setError(""); setSaved(false);
    try { await api.put("/agent/voice-settings", values); setSaved(true); window.dispatchEvent(new Event("maymay:voice-settings-updated")); }
    catch { setError("Chưa lưu được cài đặt. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }}>
    <Select label="Giọng đọc" value={values.voice} disabled={disabled} onChange={event => setValues(current => ({ ...current, voice: event.target.value }))}>
      {["Eve", "Ara", "Rex", "Sal", "Leo"].map(name => <option key={name} value={name.toLowerCase()}>{name}</option>)}
    </Select>
    <label className="block text-sm">Nhịp nói · {values.speed.toFixed(2)}×<input aria-label="Tốc độ đọc" className="mt-3 block w-full accent-primary" type="range" min="0.75" max="1.25" step="0.05" value={values.speed} disabled={disabled} onChange={event => setValues(current => ({ ...current, speed: Number(event.target.value) }))} /></label>
    <label className="block text-sm">Lọc tiếng nhỏ · {Math.round(values.mic_threshold * 1000)}<input aria-label="Lọc tiếng nhỏ của micro" className="mt-3 block w-full accent-primary" type="range" min="0.008" max="0.045" step="0.001" value={values.mic_threshold} disabled={disabled} onChange={event => setValues(current => ({ ...current, mic_threshold: Number(event.target.value) }))} /></label>
    <p className="text-xs leading-relaxed text-muted-foreground">Tăng mức lọc nếu tiếng nền dễ ngắt lời. Nhịp nói là mức yêu cầu gần đúng và giữ nguyên âm sắc.</p>
    {voice?.active && <Alert variant="info" className="text-xs">Kết thúc cuộc gọi hiện tại để đổi cài đặt giọng nói.</Alert>}
    {error && <Alert variant="warning" className="text-xs">{error}</Alert>}
    {saved && <p role="status" className="text-xs text-primary">Đã lưu cài đặt cho tài khoản của bạn.</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" disabled={disabled} isLoading={busy}>Lưu cài đặt</Button>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => { setValues({ voice: "eve", speed: 1, mic_threshold: 0.012 }); setSaved(false); }}>Khôi phục giọng gốc</Button>
    </div>
  </form>;
}
