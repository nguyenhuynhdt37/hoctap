"use client";

import { createContext, useCallback, useContext, useState } from "react";
import VoiceDialog, { type VoiceDialogProps } from "../learning_detail/chat/voice/voice-dialog";
import { useRouter } from "next/navigation";
import api from "@/lib/utils/fetcher/client/axios";
import toast from "react-hot-toast";
import { useLearningAgent } from "../learning_detail/agent/agent-context";

type Request = Pick<VoiceDialogProps, "lessonId" | "lessonTitle" | "onSourceClick" | "onClose"> & { accessToken?: string };
type VoiceRequest = Omit<Request, "accessToken">;
const Context = createContext<{ open: (request: Request) => Promise<void>; active: boolean } | null>(null);
export const useAssistantVoice = () => useContext(Context);

export function AssistantVoiceProvider({ children }: { children: React.ReactNode; accessToken?: string }) {
  const agent = useLearningAgent();
  const router = useRouter();
  const [request, setRequest] = useState<VoiceRequest | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [active, setActive] = useState(false);
  const updateState = useCallback((state: string) => setActive(["connecting", "listening", "thinking", "speaking"].includes(state)), []);
  const open = useCallback(async ({ lessonId, lessonTitle, onSourceClick, onClose }: Request) => {
    if (!request || !active) {
      await agent?.prepareSession();
      setRequest({ lessonId, lessonTitle, onSourceClick, onClose });
    }
    setMinimized(false);
  }, [agent?.prepareSession, request, active]);
  return <Context.Provider value={{ open, active }}>
    {children}
    {request && <VoiceDialog {...request} agentSessionId={agent?.sessionId} onAgentEvent={agent?.handleEvent}
      onSourceClick={source => {
        if (source.lesson_id && request.lessonId && agent?.snapshot().lesson_id !== request.lessonId) {
          void api.get(`/agent/lessons/${source.lesson_id}/destination`).then(async ({ data }) => {
            await api.post(`/learning/${data.course_id}/active/${data.lesson_id}`, {});
            router.push(`/learning/${encodeURIComponent(data.course_slug)}`);
          }).catch(() => toast.error("Chưa mở được bài học nguồn."));
        } else request.onSourceClick(source);
      }}
      onStateChange={updateState}
      minimized={minimized} onMinimize={() => setMinimized(true)} onExpand={() => setMinimized(false)}
      onClose={threadId => { setActive(false); setRequest(null); request.onClose(threadId); }} />}
  </Context.Provider>;
}
