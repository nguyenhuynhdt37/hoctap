'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronRight, Code, CircleAlert, Eye, Zap } from 'pulsoicon-react';
import type { AgentEvent } from './contracts';
import { activityEvent, toolLabel } from './activity';
import { useLearningAgent } from './agent-context';

type Call = { name: string; state: string; args?: unknown; result?: unknown; error?: unknown; ms?: number };

export function AgentActivity({ events = [], running = false }: { events?: AgentEvent[]; running?: boolean }) {
  const agent = useLearningAgent();
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const isDetailed = expanded || Boolean(agent?.detailedTranscript);

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const visible = events.map(activityEvent).filter((e): e is AgentEvent => e !== null);
  const calls = new Map<string, Call>();
  let plan: string[] = [];
  for (const event of visible) {
    const p = event.payload;
    if (Array.isArray(p.steps)) plan = p.steps.filter((s): s is string => typeof s === 'string');
    if (!event.type.startsWith('tool.')) continue;
    const name = String(p.name || p.tool_name || '');
    const key = String(p.tool_call_id || name || event.id);
    const previous = calls.get(key);
    calls.set(key, {
      ...previous,
      name: name || previous?.name || '',
      state: event.type,
      ...('arguments' in p ? { args: p.arguments } : {}),
      ...('result' in p ? { result: p.result } : {}),
      ...(p.error || p.error_code ? { error: p.error || p.error_code } : {}),
      ...(typeof p.latency_ms === 'number' ? { ms: p.latency_ms } : {}),
    });
  }
  if (!visible.length && !running) return null;

  const savedMemories = visible
    .filter(e => e.type === 'memory.saved')
    .reduce((sum, e) => sum + Number(e.payload.count || 0), 0);
  const context = visible.findLast(e => e.type === 'context.resolved');
  const imageCount = Number(context?.payload.image_count || 0);
  const usage = visible.findLast(e => e.type === 'context.usage')?.payload;
  const contextPercent = typeof usage?.percent === 'number' ? usage.percent : null;
  const usedTokens = typeof usage?.used_tokens === 'number' ? usage.used_tokens : null;
  const windowTokens = typeof usage?.context_window_tokens === 'number' ? usage.context_window_tokens : null;
  const terminal = visible.findLast(e => e.type.startsWith('run.') && e.type !== 'run.started');
  const failed = terminal && ['run.failed', 'run.expired'].includes(terminal.type);
  const started = Date.parse(visible.find(e => e.type === 'run.started')?.timestamp || '');
  const ended = Date.parse(terminal?.timestamp || '');
  const elapsed =
    Number.isFinite(started) && (running || Number.isFinite(ended))
      ? Math.max(0, Math.floor(((running ? now : ended) - started) / 1000))
      : null;
  const activeCall = [...calls.values()].findLast(
    call => !['tool.completed', 'tool.failed', 'tool.denied'].includes(call.state)
  );
  const status = running
    ? activeCall
      ? activeCall.state === 'tool.awaiting_approval'
        ? 'Đang chờ xác nhận'
        : toolLabel(activeCall.name)
      : !context
        ? 'Đang chuẩn bị ngữ cảnh'
        : 'Đang xử lý câu trả lời'
    : terminal?.type === 'run.cancelled'
      ? 'Đã dừng'
      : terminal?.type === 'run.partially_completed'
        ? 'Hoàn tất một phần'
        : failed
          ? 'Chưa hoàn tất'
          : 'Đã xử lý';

  const compactSummary = [...calls.values()]
    .map(c => toolLabel(c.name))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3)
    .join(' · ');

  return (
    <section className="mb-3 min-w-0 text-xs" aria-label="Tiến trình thực hiện">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={isDetailed}
          onClick={() => setExpanded(value => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-primary-pastel/60 bg-primary-light/35 px-3 py-1.5 text-left text-muted-foreground transition-colors hover:bg-primary-light/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {running ? (
            <Zap animated={false} className="h-3.5 w-3.5 shrink-0 animate-pulse text-primary motion-reduce:animate-none" />
          ) : failed ? (
            <CircleAlert animated={false} solid className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
          ) : (
            <Check animated={false} className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            {running ? '⏺ ' : '✻ '}
            {status}
            {elapsed !== null && <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">({elapsed}s)</span>}
            {calls.size > 0 && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {calls.size} công cụ{compactSummary ? ` (${compactSummary})` : ''}
              </span>
            )}
          </span>
          <ChevronRight
            animated={false}
            size="1em"
            className={`shrink-0 transition-transform ${isDetailed ? 'rotate-90' : ''}`}
          />
        </button>
        {agent && (
          <button
            type="button"
            onClick={() => agent.setDetailedTranscript(v => !v)}
            title="Chuyển đổi hiển thị chi tiết (Ctrl+O)"
            aria-label="Chuyển đổi hiển thị chi tiết tiến trình"
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
              agent.detailedTranscript
                ? 'border-primary-pastel bg-primary-light text-primary'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye animated={false} className="inline h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {usage && usedTokens !== null && isDetailed && (
        <p
          className="mb-1 ml-3 mt-1.5 text-[11px] tabular-nums text-muted-foreground"
          title={`${String(usage.model || '')} · Ước tính gồm phần trả lời dự phòng. Tự nén khi vượt 80%.`}
        >
          Context {contextPercent !== null ? `~${contextPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% · ` : ''}
          ~{usedTokens.toLocaleString('vi-VN')}
          {windowTokens !== null
            ? ` / ${windowTokens.toLocaleString('vi-VN')} token`
            : ' token · chưa xác định giới hạn model'}
        </p>
      )}

      {isDetailed && (
        <div className="ml-3 mt-2 space-y-3 border-l-2 border-primary-pastel py-1.5 pl-4">
          <Stage active={running && !context} complete={!!context}>
            <span>
              {context
                ? 'Đã đọc ngữ cảnh được cấp quyền'
                : running
                  ? 'Đang chuẩn bị ngữ cảnh…'
                  : 'Yêu cầu đã kết thúc'}
            </span>
            {imageCount > 0 && <p className="mt-1 text-muted-foreground">Đã nạp {imageCount} ảnh để phân tích.</p>}
          </Stage>
          {visible.some(event => event.type === 'context.compacted') && (
            <Stage complete>
              {visible.some(event => event.type === 'context.compacted' && event.payload.method === 'semantic_checkpoint')
                ? 'Đã cập nhật checkpoint ngữ nghĩa · lịch sử gốc vẫn được lưu'
                : 'Đã tối ưu dữ liệu gửi model · chưa thay cho checkpoint ngữ nghĩa'}
            </Stage>
          )}
          {plan.length > 0 && (
            <Stage complete={!running}>
              <p className="mb-1.5 font-medium">Kế hoạch thực hiện</p>
              <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                {plan.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Stage>
          )}
          {[...calls].map(([key, call]) => (
            <ToolStep key={key} call={call} running={running} />
          ))}
          {savedMemories > 0 && <Stage complete>Đã cập nhật {savedMemories} mục bộ nhớ dài hạn</Stage>}
          {running && !activeCall && (
            <Stage active>
              <p role="status" className="text-primary">
                {context ? (calls.size ? 'Đang tổng hợp kết quả…' : 'Đang phân tích yêu cầu…') : 'Đang tiếp nhận yêu cầu…'}
              </p>
            </Stage>
          )}
          {!running && !calls.size && <p className="text-muted-foreground">Trả lời trực tiếp, không chạy công cụ.</p>}
        </div>
      )}
    </section>
  );
}

function Stage({
  children,
  active,
  complete,
  warning,
}: {
  children: React.ReactNode;
  active?: boolean;
  complete?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="relative min-w-0 leading-relaxed text-foreground">
      <span
        aria-hidden="true"
        className={`absolute -left-[23px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-surface ${
          warning ? 'text-warning-foreground' : 'text-primary'
        }`}
      >
        {complete ? (
          <Check animated={false} className="h-3 w-3" />
        ) : (
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              active
                ? 'animate-pulse bg-primary motion-reduce:animate-none'
                : warning
                  ? 'bg-warning-foreground'
                  : 'bg-border'
            }`}
          />
        )}
      </span>
      {children}
    </div>
  );
}

function ToolStep({ call, running }: { call: Call; running: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const done = call.state === 'tool.completed';
  const outcome = call.result && typeof call.result === 'object' ? (call.result as Record<string, unknown>) : {};
  const unverified =
    done &&
    (outcome.verified === false ||
      outcome.passed === false ||
      (typeof outcome.exit_code === 'number' && outcome.exit_code !== 0));
  const error = ['tool.failed', 'tool.denied'].includes(call.state);
  const waiting = call.state === 'tool.awaiting_approval';
  const active = running && !done && !error;
  const state = unverified
    ? 'Chưa đạt'
    : done
      ? 'Xong'
      : error
        ? 'Lỗi'
        : waiting
          ? 'Chờ xác nhận'
          : running
            ? 'Đang chạy'
            : 'Đã dừng';
  const args = call.args && typeof call.args === 'object' ? (call.args as Record<string, unknown>) : {};
  const command = typeof args.command === 'string' ? `$ ${args.command}` : typeof args.sql === 'string' ? args.sql : '';
  return (
    <Stage active={active} complete={done && !unverified} warning={error || unverified}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        className="flex w-full flex-wrap items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Code animated={false} size="1em" className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 font-medium">⏺ {toolLabel(call.name)}</span>
        <span className={error || unverified ? 'text-warning-foreground' : 'text-muted-foreground'}>{state}</span>
        {call.ms !== undefined && (
          <span className="tabular-nums text-muted-foreground">{(call.ms / 1000).toFixed(2)}s</span>
        )}
        <ChevronRight
          animated={false}
          size="1em"
          className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>
      <code className="mt-0.5 block break-all text-[11px] text-muted-foreground">⎿ {call.name}</code>
      {expanded && (
        <div className="mt-2 space-y-2 overflow-hidden rounded-xl border border-border bg-background p-3">
          {call.args !== undefined && <Output label={command ? 'Lệnh thực thi' : 'Đầu vào'} value={command || call.args} />}
          {call.result !== undefined && <Output label="Kết quả" value={call.result} />}
          {call.error !== undefined && <p className="break-words text-warning-foreground">{String(call.error)}</p>}
          {active && (
            <p role="status" className="text-muted-foreground">
              {waiting ? 'Chờ bạn xem lại và xác nhận.' : 'Đang chờ kết quả công cụ…'}
            </p>
          )}
        </div>
      )}
    </Stage>
  );
}

function Output({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
