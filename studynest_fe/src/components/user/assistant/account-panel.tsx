"use client";

import { safeUUID } from "@/lib/utils/uuid";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send } from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import MessageBubble from "../learning_detail/chat/message-bubble";
import { AgentStatus } from "../learning_detail/agent/agent-status";
import { AssistantSettings } from "./assistant-settings";
import { useLearningAgent } from "../learning_detail/agent/agent-context";
import { useAssistantVoice } from "./voice-provider";
import { useChatImages, ChatImageAttachments, ChatImagePreviews } from "./chat-images";
import { DictationButton } from "./dictation-button";
import type { MessageSource, TutorMessage } from "@/types/user/tutor-chat";

export default function AccountAssistantPanel() {
  const agent = useLearningAgent();
  const voice = useAssistantVoice();
  const router = useRouter();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [before, setBefore] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dictating, setDictating] = useState(false);
  const attachments = useChatImages();
  const mounted = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  const inputElement = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (dictating && inputElement.current) inputElement.current.scrollTop = inputElement.current.scrollHeight; }, [dictating, input]);
  const historyPositioned = useRef(false);
  const load = useCallback(async (cursor?: string) => {
    const { data } = await api.get("/agent/conversation", { params: cursor ? { before: cursor } : {} });
    if (!mounted.current) return;
    setThreadId(data.thread.id);
    setBefore(data.before);
    const rows: TutorMessage[] = data.messages.map((item: TutorMessage & { created_at: string }) => ({ ...item, timestamp: new Date(item.created_at) }));
    setMessages(previous => cursor ? [...rows, ...previous] : rows);
    if (!cursor && !historyPositioned.current) { historyPositioned.current = true; requestAnimationFrame(() => end.current?.scrollIntoView({block:"nearest"})); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load().catch(() => setError("Chưa tải được lịch sử Hannes. Bạn có thể thử lại.")).finally(() => setLoading(false));
    return () => { mounted.current = false; };
  }, [load]);
  useEffect(() => { if (sending) end.current?.scrollIntoView({ block: "nearest" }); }, [messages, sending]);
  const sourceClick = (source: MessageSource) => {
    if (source.lesson_id) void api.get(`/agent/lessons/${encodeURIComponent(source.lesson_id)}/destination`).then(async ({ data }) => {
      await api.post(`/learning/${data.course_id}/active/${data.lesson_id}`, {});
      router.push(`/learning/${encodeURIComponent(data.course_slug)}`);
    }).catch(() => setError("Chưa mở được bài học nguồn hoặc quyền truy cập đã thay đổi."));
    else if (source.resource_url && /^https?:\/\//i.test(source.resource_url)) window.open(source.resource_url, "_blank", "noopener,noreferrer");
  };
  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const message = input.trim() || (attachments.images.length ? "Bạn hãy xem và giải thích ảnh này." : "");
    if (!agent || !message || sending || agent.busy || !attachments.ready || dictating) return;
    setError(""); setSending(true); setInput("");
    const id = safeUUID();
    const images = attachments.images;
    setMessages(previous => [...previous, { id: safeUUID(), role: "user", content: message, images, timestamp: new Date() }, { id, role: "assistant", content: "", timestamp: new Date(), isStreaming: true, activity: [] }]);
    try {
      const response = await agent.send(message, threadId, delta => {
        if (mounted.current) setMessages(previous => previous.map(item => item.id === id ? { ...item, content: item.content + delta } : item));
      }, activity => {
        if (mounted.current) setMessages(previous => previous.map(item => item.id === id ? { ...item, activity: [...(item.activity || []), activity] } : item));
      }, images);
      attachments.clear();
      if (mounted.current) {
        setThreadId(response.thread_id);
        setMessages(previous=>previous.map(item=>item.id===id ? {...item,id:response.id,content:response.content,sources:response.sources,activity:response.activity || item.activity,isStreaming:false,timestamp:new Date(response.created_at)} : item));
      }
      return true;
    } catch (cause) {
      if (mounted.current) {
        setInput(current => current || message);
        setError(cause instanceof Error ? cause.message : "Hannes chưa trả lời được. Vui lòng thử lại.");
        setMessages(previous => previous.map(item => item.id === id ? { ...item, isStreaming: false, content: item.content || "Yêu cầu chưa hoàn tất." } : item));
      }
    } finally { if (mounted.current) setSending(false); }
  };
  const startVoice = async () => {
    if (attachments.images.length && !(await send())) return;
    try { await voice?.open({ lessonTitle: "Hannes · Trợ lý tài khoản", onSourceClick: sourceClick, onClose: () => { void load().catch(() => undefined); } }); }
    catch { setError("Chưa mở được cuộc gọi. Vui lòng thử lại."); }
  };
  return <div data-agent-private onDragOver={event=>{if(event.dataTransfer.types.includes("Files"))event.preventDefault();}} onDrop={event=>{const files=Array.from(event.dataTransfer.files);if(files.length){event.preventDefault();if(!sending&&!dictating&&!voice?.active)void attachments.add(files);}}} className="relative flex h-full min-h-0 flex-col bg-surface">
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <AssistantSettings />
      <Button size="sm" variant="pastel" onClick={() => void startVoice()} disabled={agent?.busy || dictating || !attachments.ready} leftIcon={<Mic size="1em" />}>{voice?.active ? "Mở lại cuộc gọi" : "Trò chuyện bằng giọng nói"}</Button>
    </div>
    <AgentStatus />
    {error && <Alert variant="warning" className="mx-3 mt-2 text-xs">{error}<Button size="sm" variant="ghost" onClick={() => void load().then(() => setError("")).catch(() => undefined)}>Tải lại</Button></Alert>}
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-label="Hội thoại Hannes">
      {before && <Button variant="ghost" size="sm" onClick={() => void load(before).catch(() => setError("Chưa tải được tin nhắn cũ."))}>Xem tin nhắn trước</Button>}
      {loading ? <p role="status" className="text-sm text-muted-foreground">Đang tải hội thoại…</p> : messages.length === 0 && <div className="space-y-3 py-8"><h2 className="text-lg font-semibold">Mình là Hannes ☁️</h2><p className="text-sm leading-relaxed text-muted-foreground">Cùng học, tìm khóa học, đọc code GitHub và xem tiến độ của bạn. Bộ nhớ đi cùng tài khoản của bạn từ trang chủ đến bài học.</p><Button size="sm" variant="outline" onClick={() => setInput("Cho mình xem tiến độ các khóa học đang học từ dữ liệu tài khoản.")}>Xem tiến độ học tập</Button></div>}
      {messages.map(message => <MessageBubble key={message.id} message={message} onSourceClick={sourceClick} />)}
      <div ref={end} />
    </div>
    <ChatImagePreviews attachments={attachments} />
    <form onPaste={event=>{const files=Array.from(event.clipboardData.files);if(files.length&&!sending&&!dictating&&!voice?.active){event.preventDefault();void attachments.add(files);}}} onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
      <div className="flex flex-col"><ChatImageAttachments attachments={attachments} disabled={sending||dictating||voice?.active} /><DictationButton disabled={sending||voice?.active} onBusyChange={setDictating} getValue={()=>input} onValueChange={setInput} /></div>
      <textarea ref={inputElement} aria-label="Nhắn Hannes" placeholder="Hỏi Hannes hoặc dán ảnh vào đây…" rows={2} maxLength={12000} readOnly={dictating} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} className="min-h-12 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <Button type="submit" size="icon" disabled={(!input.trim() && !attachments.images.length) || !attachments.ready || loading || sending || dictating || agent?.busy || voice?.active} aria-label="Gửi cho Hannes"><Send size="1em" /></Button>
    </form>
  </div>;
}
