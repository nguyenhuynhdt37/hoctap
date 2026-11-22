'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/states';
import { Modal } from '@/components/ui/modal';
import { useLearningAgent } from './agent-context';
import type { EditorPatch } from './contracts';

export function AgentStatus() {
  const agent = useLearningAgent();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!agent) return null;
  const approve = async (value: boolean) => {
    setSubmitting(true); setError('');
    try { await agent.approve(value); } catch { setError('Không gửi được xác nhận. Bản sửa chưa được áp dụng.'); } finally { setSubmitting(false); }
  };
  const patches = Array.isArray(agent.approval?.arguments?.patches) ? agent.approval.arguments.patches as EditorPatch[] : [];
  const previews = Array.isArray(agent.approval?.preview) ? agent.approval.preview as Array<EditorPatch & { filename?: string }> : [];
  return <>
    {agent.status && (agent.busy || agent.approval) && <div className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-xl border border-primary-pastel bg-primary-light/50 px-3 py-2">
      <p role="status" aria-live="polite" className="text-xs leading-relaxed text-foreground">{agent.status}</p>
      {agent.busy && <Button variant="outline" size="sm" onClick={() => void agent.stop()}>Dừng</Button>}
    </div>}
    {agent.approval && <Modal open title="Xem lại thay đổi" description="Mây Mây chỉ áp dụng sau khi bạn đồng ý và phiên bản code vẫn khớp." onClose={() => void approve(false)} size="lg" closeOnOverlayClick={false}>
      <div className="space-y-4">
        {patches.length ? <div className="max-h-[55vh] space-y-3 overflow-auto">
          {patches.map((patch, index) => <div key={`${patch.file_id}-${index}`} className="overflow-hidden rounded-xl border border-border">
            <p className="bg-background px-3 py-2 text-xs font-semibold text-foreground">{previews.find(item => item.file_id === patch.file_id)?.filename || patch.file_id} · vị trí {patch.start}–{patch.end}</p>
            <div className="border-t border-border bg-destructive-bg p-3"><p className="mb-1 text-xs text-destructive-foreground">Trước</p><pre className="overflow-x-auto whitespace-pre text-xs text-foreground">{patch.expected_text || '(trống)'}</pre></div>
            <div className="border-t border-border bg-success-bg p-3"><p className="mb-1 text-xs text-success-foreground">Sau</p><pre className="overflow-x-auto whitespace-pre text-xs text-foreground">{patch.replacement || '(xóa đoạn này)'}</pre></div>
          </div>)}
        </div> : <p className="text-sm text-foreground">{agent.approval.tool_name === 'editor.undo_patch' ? 'Khôi phục code trước bản sửa gần nhất của Mây Mây. Chỉ khôi phục khi code chưa bị chỉnh tiếp.' : 'Cho phép Mây Mây thực hiện thay đổi này trong bài học hiện tại.'}</p>}
        {['mcp.browser_fill','mcp.browser_click'].includes(agent.approval.tool_name) && <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-xs">{JSON.stringify(agent.approval.arguments, null, 2)}</pre>}
        {error && <Alert variant="warning">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={submitting} onClick={() => void approve(false)}>Từ chối</Button><Button disabled={submitting} onClick={() => void approve(true)}>Đồng ý áp dụng</Button></div>
      </div>
    </Modal>}
  </>;
}
