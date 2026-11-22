'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/utils/fetcher/client/axios';
import { activityEvent } from './activity';
import type { UploadedImage, MessageResponse } from '@/types/user/tutor-chat';
import { ActionRegistry, waitForState } from './action-registry';
import { registerBrowserWorkspace } from './browser-workspace';
import { consumeAgentEvents } from './agent-client';
import type { ActionRequest, AgentApproval, AgentEvent, ScreenActionResult, ScreenContextSnapshot } from './contracts';

export class AgentUnavailableError extends Error {}
export type SnapshotReader = () => Partial<ScreenContextSnapshot>;
type RegisterAction = ActionRegistry['register'];
interface AgentContextValue {
  registry: ActionRegistry;
  registerSnapshot: (key: string, reader: SnapshotReader) => () => void;
  changed: () => void;
  snapshot: () => ScreenContextSnapshot;
  send: (message: string, threadId: string | undefined, onDelta: (text: string) => void, onActivity?: (event: AgentEvent) => void, images?: UploadedImage[]) => Promise<MessageResponse>;
  stop: () => Promise<void>;
  approve: (approved: boolean) => Promise<void>;
  approval: AgentApproval | null;
  status: string;
  busy: boolean;
  plan: string[];
  completedActions: number;
  lastScreenAction: ScreenActionResult | null;
  contextSources: string[];
  sessionId?: string;
  prepareSession: () => Promise<string>;
  handleEvent: (event: AgentEvent, signal?: AbortSignal) => Promise<void>;
}
const Context = createContext<AgentContextValue | null>(null);
export function useLearningAgent() { return useContext(Context); }

export function LearningAgentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageId = useRef('');
  const revision = useRef(0);
  const knownLesson = useRef<string | undefined>(undefined);
  const readers = useRef(new Map<string, SnapshotReader>());
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<string[]>([]);
  const [completedActions, setCompletedActions] = useState(0);
  const [lastScreenAction, setLastScreenAction] = useState<ScreenActionResult | null>(null);
  const [contextSources, setContextSources] = useState<string[]>([]);
  const seenEvents = useRef(new Set<string>());
  const [approval, setApproval] = useState<AgentApproval | null>(null);
  const [sessionId, setSessionId] = useState<string>();
  const session = useRef<string | undefined>(undefined);
  const sessionPromise = useRef<Promise<string> | null>(null);
  const run = useRef<string | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const contextSync = useRef<Promise<unknown>>(Promise.resolve());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRevision = useRef(-1);
  const snapshot = useCallback((): ScreenContextSnapshot => {
    if (!pageId.current) pageId.current = crypto.randomUUID();
    return { schema_version: 1, page_instance_id: pageId.current, revision: revision.current,
      captured_at: new Date().toISOString(), route: window.location.pathname,
      ...Object.assign({}, ...[...readers.current.values()].map(read => read())),
    };
  }, []);
  const registryRef = useRef<ActionRegistry | null>(null);
  if (!registryRef.current) registryRef.current = new ActionRegistry(snapshot);
  const registry = registryRef.current;
  useEffect(() => registerBrowserWorkspace(registry), [registry]);
  const flushContext = useCallback(() => {
    if (syncTimer.current) { clearTimeout(syncTimer.current); syncTimer.current = null; }
    if (!session.current) return Promise.resolve();
    const captured = { ...snapshot(), capabilities: registry.capabilities() };
    const id = session.current;
    const sync = contextSync.current.catch(() => undefined).then(async () => {
      if (captured.revision <= lastSyncedRevision.current) return;
      await api.put(`/agent/sessions/${id}/context`, captured);
      lastSyncedRevision.current = captured.revision;
    });
    contextSync.current = sync;
    return sync;
  }, [registry, snapshot]);
  const changed = useCallback(() => {
    revision.current += 1;
    const lesson = snapshot().lesson_id;
    if (knownLesson.current && knownLesson.current !== lesson && run.current && !registry.isNavigating()) {
      const activeRun = run.current; registry.cancel(); controller.current?.abort();
      void api.post(`/agent/runs/${activeRun}/cancel`, {}).catch(() => undefined);
      setApproval(null); setStatus('Đã dừng yêu cầu vì bạn chuyển bài học.');
    }
    knownLesson.current = lesson;
    if (session.current) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => { void flushContext().catch(() => undefined); }, 180);
    }
  }, [snapshot, registry, flushContext]);
  useEffect(() => { changed(); }, [pathname, changed]);
  const registerSnapshot = useCallback((key: string, reader: SnapshotReader) => {
    readers.current.set(key, reader);
    return () => { if (readers.current.get(key) === reader) readers.current.delete(key); };
  }, []);
  const ensureSession = useCallback(async () => {
    if (session.current) return session.current;
    if (!sessionPromise.current) sessionPromise.current = (async () => {
      const screen = snapshot();
      const response = await api.post<{ id: string }>('/agent/sessions', {
        page_instance_id: screen.page_instance_id, route: screen.route, course_id: screen.course_id,
        lesson_id: screen.lesson_id, capabilities: registry.capabilities(),
      }).catch(error => {
        if ([404, 503].includes(error?.response?.status)) throw new AgentUnavailableError('Agent chưa được bật; tiếp tục dùng trợ giảng hiện có.');
        throw error;
      });
      session.current = response.data.id; setSessionId(response.data.id); return response.data.id;
    })().finally(() => { sessionPromise.current = null; });
    return sessionPromise.current;
  }, [registry, snapshot]);
  const prepareSession = useCallback(async () => {
    const id = await ensureSession(); revision.current += 1;
    await flushContext();
    return id;
  }, [ensureSession, flushContext]);
  const handleEvent = useCallback(async (event: AgentEvent, signal?: AbortSignal) => {
    if (event.schema_version !== 1 || typeof event.run_id !== 'string' || !Number.isInteger(event.sequence)) return;
    const key = `${event.run_id}:${event.sequence}`;
    if (seenEvents.current.has(key)) return;
    seenEvents.current.add(key);
    if (seenEvents.current.size > 512) seenEvents.current.delete(seenEvents.current.values().next().value!);
    const payload = event.payload;
    if (event.type === 'run.started') { run.current = event.run_id; setBusy(true); setPlan([]); setCompletedActions(0); setLastScreenAction(null); setContextSources([]); }
    if (event.type === 'context.resolved') {
      const sources = Array.isArray(payload.sources) ? payload.sources.filter((item): item is string => typeof item === 'string') : [];
      setContextSources(sources);
    }
    if (event.type === 'context.compacting') setStatus('Đang nén ngữ nghĩa thành checkpoint hội thoại…');
    if (event.type === 'context.compaction_deferred') setStatus('Lịch sử cũ đang chờ nén nền; bản gốc vẫn được giữ.');
    if (event.type === 'context.compacted') setStatus(payload.method === 'semantic_checkpoint' ? 'Đã cập nhật checkpoint, đang tiếp tục…' : 'Đã tối ưu dữ liệu gửi model…');
    if (event.type === 'plan.created' || event.type === 'plan.updated') { setStatus('Đã lập các bước thực hiện.'); if (Array.isArray(payload.steps)) setPlan(payload.steps.filter((step): step is string => typeof step === 'string').map(step => step.slice(0, 300))); }
    if (event.type === 'tool.started') setStatus('Đang thực hiện yêu cầu của bạn…');
    if (event.type === 'tool.awaiting_approval') { setApproval(payload as unknown as AgentApproval); setStatus('Đang chờ bạn xác nhận bản sửa.'); }
    if (event.type === 'ui.action_requested') {
      const request = payload as unknown as ActionRequest;
      const receipt = await registry.dispatch(request, signal);
      if (syncTimer.current) await flushContext(); else await contextSync.current.catch(() => undefined);
      await api.post(`/agent/runs/${event.run_id}/actions/${request.action_id}/receipt`, receipt, { signal });
      setLastScreenAction({ name: request.name, arguments: request.arguments || {}, verified: receipt.verified, error: receipt.error });
      setStatus(receipt.verified ? 'Đã xác minh thao tác.' : receipt.error || 'Chưa thực hiện được thao tác.');
    }
    if (event.type === 'tool.completed') {
      setApproval(null); setCompletedActions(count => count + 1);
      if (payload.name === 'learning.complete_lesson') {
        window.dispatchEvent(new CustomEvent('maymay:lesson-completed'));
      }
    }
    if (event.type === 'memory.proposed' || event.type === 'memory.saved') window.dispatchEvent(new CustomEvent('maymay:memory-proposed'));
    if (['run.completed', 'run.partially_completed', 'run.cancelled', 'run.failed', 'run.expired'].includes(event.type)) {
      setBusy(false); setApproval(null);
      if (run.current === event.run_id) run.current = undefined;
      setStatus(event.type === 'run.completed' ? 'Đã trả lời.' : event.type === 'run.partially_completed' ? 'Đã hoàn tất một phần.' : event.type === 'run.cancelled' ? 'Đã dừng yêu cầu.' : 'Mây Mây chưa hoàn tất yêu cầu.');
    }
  }, [registry, flushContext]);
  const stop = useCallback(async () => {
    registry.cancel();
    const id = run.current;
    if (id) await api.post(`/agent/runs/${id}/cancel`, {}).catch(() => undefined);
    controller.current?.abort(); setApproval(null); setBusy(false); setStatus('Đã dừng. Những thao tác đã hoàn tất được giữ lại.');
  }, [registry]);
  useEffect(() => () => {
    registry.cancel(); controller.current?.abort();
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (run.current) void fetch(`/api/agent/runs/${run.current}/cancel`, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: '{}' });
  }, [registry]);
  const send = useCallback(async (message: string, threadId: string | undefined, onDelta: (text: string) => void, onActivity?: (event: AgentEvent) => void, images?: UploadedImage[]) => {
    if (run.current) throw new Error('Mây Mây đang xử lý một yêu cầu khác.');
    setBusy(true); setStatus('Đang đọc ngữ cảnh bài học…'); setApproval(null); setLastScreenAction(null); setContextSources([]);
    const abort = new AbortController(); controller.current = abort;
    let final: MessageResponse | undefined;
    let content = '';
    const activity: AgentEvent[] = [];
    try {
      if (/(?:pause|play|tua|phát video|dừng video|tốc độ video)/i.test(message) && registry.capabilities().includes('video.get_state')) {
        setStatus('Đang đợi trình phát video sẵn sàng…');
        await waitForState(() => Boolean(snapshot().video), abort.signal, 12000);
        // Let player onReady effects commit their context revision before taking
        // the request snapshot. Playback time itself never changes this revision.
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
      const id = await prepareSession();
      const response = await api.post<{ id: string }>('/agent/runs', { session_id: id, thread_id: threadId, message, images: images?.map(({url,file_size,mime_type,ocr_text})=>({url,file_size,mime_type,ocr_text})), idempotency_key: crypto.randomUUID() }, { signal: abort.signal });
      run.current = response.data.id;
      await consumeAgentEvents(response.data.id, async event => {
        const payload = event.payload;
        const entry = activityEvent(event);
        if (entry) { activity.push(entry); onActivity?.(entry); }
        if (event.type === 'message.delta' && typeof payload.delta === 'string') { content += payload.delta; onDelta(payload.delta); }
        await handleEvent(event, abort.signal);
        if (event.type === 'run.completed' || event.type === 'run.partially_completed') {
          final = (payload.message || payload.assistant_message || payload.result) as MessageResponse | undefined;
          setStatus(event.type === 'run.completed' ? 'Đã trả lời.' : 'Đã hoàn tất một phần.');
        }
        if (event.type === 'run.failed' || event.type === 'run.expired') throw new Error(String(payload.message || payload.error || 'Mây Mây chưa hoàn tất yêu cầu.'));
        if (event.type === 'run.cancelled') throw new DOMException('Đã hủy', 'AbortError');
      }, abort.signal);
      if (!final || typeof final.content !== 'string') {
        const result = await api.get(`/agent/runs/${response.data.id}`);
        final = result.data.message || result.data.assistant_message || result.data.response?.message || result.data.response;
      }
      if (!final || typeof final.content !== 'string') throw new Error(content ? 'Phản hồi chưa được xác nhận lưu. Hãy kiểm tra lịch sử.' : 'Mây Mây chưa trả về kết quả đã xác minh.');
      return { ...final, activity };
    } catch (error) {
      if (error instanceof AgentUnavailableError) setStatus('');
      else if (run.current) {
        const activeRun = run.current;
        const recovered = await api.get(`/agent/runs/${activeRun}`).catch(() => null);
        const recoveredMessage = recovered?.data.message || recovered?.data.response?.message || recovered?.data.response;
        if (['completed', 'partially_completed'].includes(recovered?.data.state) && typeof recoveredMessage?.content === 'string') return { ...recoveredMessage, activity } as MessageResponse;
        registry.cancel();
        await api.post(`/agent/runs/${activeRun}/cancel`, {}).catch(() => undefined);
        setStatus('Đã dừng yêu cầu chưa hoàn tất. Hãy kiểm tra lịch sử và trạng thái bài học.');
      }
      throw error;
    } finally { run.current = undefined; controller.current = null; setBusy(false); setApproval(null); }
  }, [prepareSession, handleEvent, registry, snapshot]);
  const approve = useCallback(async (approved: boolean) => {
    if (!approval || !run.current) return;
    const screen = snapshot();
    await api.post(`/agent/runs/${run.current}/approvals/${approval.approval_id}`, {
      decision: approved ? 'approved' : 'rejected', page_instance_id: screen.page_instance_id, context_revision: screen.revision,
    });
    setApproval(null); setStatus(approved ? 'Đã xác nhận. Đang kiểm tra phiên bản code…' : 'Đã từ chối bản sửa.');
  }, [approval, snapshot]);
  return <Context.Provider value={{ registry, registerSnapshot, changed, snapshot, send, stop, approve, approval, status, busy, plan, completedActions, lastScreenAction, contextSources, sessionId, prepareSession, handleEvent }}>{children}</Context.Provider>;
}

/** Handlers read current refs so registration never captures an obsolete editor buffer. */
export function useAgentAction(name: string, definition: Parameters<RegisterAction>[1]) {
  const agent = useLearningAgent();
  const current = useRef(definition); current.current = definition;
  useEffect(() => agent?.registry.register(name, {
    execute: (args, signal) => current.current.execute(args, signal), verify: result => current.current.verify(result),
    mutation: definition.mutation, timeout: definition.timeout,
  }), [agent?.registry, name, definition.mutation, definition.timeout]);
}
export function useAgentSnapshot(key: string, reader: SnapshotReader) {
  const agent = useLearningAgent(); const current = useRef(reader); current.current = reader;
  useEffect(() => agent?.registerSnapshot(key, () => current.current()), [agent?.registerSnapshot, key]);
}
