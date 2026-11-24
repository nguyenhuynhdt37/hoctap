import type { ActionReceipt, ActionRequest, EditorPatch, ScreenContextSnapshot } from './contracts';

type ActionHandler = (args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>;
interface Definition { execute: ActionHandler; verify: (result: unknown) => boolean; mutation?: boolean; timeout?: number }
const plainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export const stringArg = (args: Record<string, unknown>, key: string): string => {
  const value = args[key];
  if (typeof value !== 'string' || !value || value.length > 200) throw new Error(`Tham số ${key} không hợp lệ.`);
  return value;
};
export const numberArg = (args: Record<string, unknown>, key: string, min: number, max: number): number => {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Tham số ${key} không hợp lệ.`);
  return value;
};

/** Revisions and exact expected text are checked for every hunk before any buffer is changed. */
export function applyEditorPatches(files: Record<string, string>, patches: unknown): Record<string, string> {
  if (!Array.isArray(patches) || patches.length === 0 || patches.length > 30) throw new Error('Bản sửa không hợp lệ.');
  const groups = new Map<string, EditorPatch[]>();
  for (const raw of patches) {
    if (!plainObject(raw) || typeof raw.file_id !== 'string' || !Object.prototype.hasOwnProperty.call(files, raw.file_id) ||
      !Number.isInteger(raw.start) || !Number.isInteger(raw.end) || typeof raw.expected_text !== 'string' || typeof raw.replacement !== 'string') throw new Error('Vùng sửa không hợp lệ.');
    const patch = raw as unknown as EditorPatch;
    if (patch.start < 0 || patch.end < patch.start || patch.end > files[patch.file_id].length || patch.replacement.length > 100000 ||
      files[patch.file_id].slice(patch.start, patch.end) !== patch.expected_text) throw new Error('Code đã thay đổi. Hãy tạo lại bản sửa.');
    groups.set(patch.file_id, [...(groups.get(patch.file_id) || []), patch]);
  }
  const result = { ...files };
  for (const [id, values] of groups) {
    const ordered = values.sort((a, b) => b.start - a.start);
    let boundary = files[id].length + 1;
    for (const patch of ordered) {
      if (patch.end > boundary) throw new Error('Các vùng sửa chồng lên nhau.');
      result[id] = result[id].slice(0, patch.start) + patch.replacement + result[id].slice(patch.end);
      boundary = patch.start;
    }
  }
  return result;
}

/** Only registered callbacks execute; no selectors, script evaluation, or browser globals. */
export class ActionRegistry {
  private actions = new Map<string, Definition>();
  private receipts = new Map<string, { fingerprint: string; promise: Promise<ActionReceipt> }>();
  private navigationCount = 0;
  isNavigating() { return this.navigationCount > 0; }
  private pending = new Map<string, AbortController>();
  constructor(private snapshot: () => ScreenContextSnapshot) {}
  register(name: string, definition: Definition) {
    this.actions.set(name, definition);
    return () => { if (this.actions.get(name) === definition) this.actions.delete(name); };
  }
  capabilities() { return [...this.actions.keys()].sort(); }
  cancel() { this.pending.forEach(c => c.abort()); }
  dispatch(request: ActionRequest, signal?: AbortSignal): Promise<ActionReceipt> {
    const existing = this.receipts.get(request.action_id);
    const fingerprint = JSON.stringify(request);
    if (existing) {
      if (existing.fingerprint !== fingerprint) return Promise.resolve({ page_instance_id: request.page_instance_id, context_revision: request.context_revision, lesson_id: request.lesson_id, status: 'failed', verified: false, error: 'Mã thao tác đã được dùng cho một yêu cầu khác.' });
      return existing.promise;
    }
    const task = this.execute(request, signal);
    this.receipts.set(request.action_id, { fingerprint, promise: task });
    // Keep bounded receipts for the page lifetime. Server also rejects duplicate mutations.
    if (this.receipts.size > 256) this.receipts.delete(this.receipts.keys().next().value!);
    return task;
  }
  private async execute(request: ActionRequest, signal?: AbortSignal): Promise<ActionReceipt> {
    const receipt = (status: ActionReceipt['status'], result?: unknown, error?: string): ActionReceipt => ({
      page_instance_id: request.page_instance_id, context_revision: request.context_revision, lesson_id: request.lesson_id,
      status, verified: status === 'completed', ...(result !== undefined ? { result } : {}), ...(error ? { error } : {}),
    });
    const current = this.snapshot();
    const revisionDelta = current.revision - request.context_revision;
    const currentLesson = current.lesson_id ?? null;
    const requestedLesson = request.lesson_id ?? null;
    if (
      current.page_instance_id !== request.page_instance_id ||
      revisionDelta < 0 ||
      (revisionDelta > 0 && Boolean(request.approval_id)) ||
      (requestedLesson !== null && currentLesson !== requestedLesson) ||
      !Number.isFinite(Date.parse(request.expires_at)) ||
      Date.parse(request.expires_at) <= Date.now()
    )
      return receipt('stale_context', undefined, 'Màn hình đã thay đổi hoặc lệnh hết hạn.');
    const definition = this.actions.get(request.name);
    if (!definition || !plainObject(request.arguments)) return receipt('failed', undefined, 'Thao tác không khả dụng trên màn hình này.');
    if (definition.mutation && !request.approval_id) return receipt('failed', undefined, 'Bản sửa cần được bạn xác nhận trước.');
    if (signal?.aborted) return receipt('cancelled');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    this.pending.set(request.action_id, controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const navigating = ['learning.navigate_lesson', 'learning.next_lesson', 'learning.previous_lesson', 'mcp.browser_click', 'mcp.browser_navigate'].includes(request.name);
    if (navigating) this.navigationCount++;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Thao tác quá thời gian.')); }, definition.timeout ?? 15000);
      });
      const result = await Promise.race([definition.execute(request.arguments, controller.signal), timeout]);
      if (controller.signal.aborted) return receipt('cancelled');
      if (!definition.verify(result)) return receipt('failed', result, 'Chưa xác minh được kết quả thao tác.');
      const completed = receipt('completed', result);
      if (request.name.startsWith('learning.') && plainObject(result) && typeof result.lesson_id === 'string') completed.lesson_id = result.lesson_id;
      return completed;
    } catch (error) {
      return receipt(controller.signal.aborted ? 'cancelled' : 'failed', undefined, error instanceof Error ? error.message : 'Không thực hiện được thao tác.');
    } finally {
      if (navigating) this.navigationCount--;
      clearTimeout(timer); signal?.removeEventListener('abort', abort); this.pending.delete(request.action_id);
    }
  }
}
export async function waitForState(check: () => boolean, signal: AbortSignal, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (!check()) {
    if (signal.aborted) throw new DOMException('Đã hủy', 'AbortError');
    if (Date.now() > deadline) throw new Error('Màn hình chưa đạt trạng thái yêu cầu.');
    await new Promise(resolve => setTimeout(resolve, 60));
  }
}
