'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  Code,
  Compass,
  Eye,
  FileText,
  MousePointerClick,
  Shield,
  X,
  Zap,
} from 'pulsoicon-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PermissionMode, TelekinesisAction, XRayTarget } from './contracts';

const MODE_META: Record<PermissionMode, { label: string; badge: 'primary' | 'vanilla' | 'lavender'; hint: string }> = {
  autoPilot: {
    label: 'Auto-Pilot',
    badge: 'primary',
    hint: 'Mây Mây tự động điều khiển màn hình, tua video, cuộn trang & chỉ điểm (Shift+Tab để đổi)',
  },
  default: {
    label: 'Hỏi trước',
    badge: 'vanilla',
    hint: 'Hỏi xác nhận trước khi áp dụng thay đổi code hoặc điền form (Shift+Tab để đổi)',
  },
  plan: {
    label: 'Chỉ đọc & Plan',
    badge: 'lavender',
    hint: 'Chỉ đọc bài học và lập kế hoạch, không thao tác lên màn hình (Shift+Tab để đổi)',
  },
};

function inspectDomNode(el: HTMLElement): XRayTarget | null {
  if (el.closest('[data-agent-private], [data-agent-exclude]')) return null;
  const target =
    el.closest<HTMLElement>(
      'button, a[href], [role="button"], [role="tab"], input, textarea, h1, h2, h3, p, pre, code, li, [data-learning-info], [data-learning-quiz-questions]'
    ) || el;
  if (target.closest('[data-agent-private], [data-agent-exclude]')) return null;
  const r = target.getBoundingClientRect();
  if (r.width < 12 || r.height < 12) return null;
  const name = (
    target.getAttribute('aria-label') ||
    target.getAttribute('title') ||
    target.getAttribute('placeholder') ||
    target.innerText ||
    target.tagName
  )
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 140);
  const text = (target.innerText || target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 420);
  const href =
    target instanceof HTMLAnchorElement
      ? (() => {
          try {
            const u = new URL(target.href, window.location.origin);
            return u.origin === window.location.origin ? u.pathname + u.search : undefined;
          } catch {
            return undefined;
          }
        })()
      : undefined;
  return {
    tag: target.tagName.toLowerCase(),
    role: target.getAttribute('role') || target.tagName.toLowerCase(),
    name: name || target.tagName.toLowerCase(),
    text,
    ...(href ? { href } : {}),
    rect: {
      x: Math.round(r.left),
      y: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    },
  };
}

export function TelekinesisOverlay({
  busy,
  status,
  permissionMode,
  xrayActive,
  onToggleXray,
  onPickXrayTarget,
  onQuickPrompt,
  onCycleMode,
  onStop,
}: {
  busy: boolean;
  status: string;
  permissionMode: PermissionMode;
  xrayActive: boolean;
  onToggleXray: () => void;
  onPickXrayTarget: (target: XRayTarget) => void;
  onQuickPrompt: (prompt: string) => void;
  onCycleMode: () => void;
  onStop: () => void;
}) {
  const [activeAction, setActiveAction] = useState<TelekinesisAction | null>(null);
  const [hoveredXray, setHoveredXray] = useState<XRayTarget | null>(null);
  const [selectionBar, setSelectionBar] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const onTelekinesis = (event: Event) => {
      const detail = (event as CustomEvent<TelekinesisAction>).detail;
      if (!detail) return;
      setActiveAction(detail);
    };
    window.addEventListener('maymay:telekinesis', onTelekinesis);
    return () => window.removeEventListener('maymay:telekinesis', onTelekinesis);
  }, []);

  useEffect(() => {
    if (!activeAction) return;
    const duration = activeAction.kind === 'highlight' ? 6500 : 3200;
    const timer = window.setTimeout(() => {
      setActiveAction(current => (current?.id === activeAction.id ? null : current));
    }, duration);
    return () => window.clearTimeout(timer);
  }, [activeAction]);

  // X-Ray Inspector pointer tracking
  useEffect(() => {
    if (!xrayActive) {
      setHoveredXray(null);
      return;
    }
    let raf = 0;
    const onMove = (event: MouseEvent) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const el = document.elementFromPoint(event.clientX, event.clientY);
        if (!(el instanceof HTMLElement)) {
          setHoveredXray(null);
          return;
        }
        setHoveredXray(inspectDomNode(el));
      });
    };
    const onClick = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (!(el instanceof HTMLElement)) return;
      if (el.closest('[data-agent-private]')) return;
      const target = inspectDomNode(el);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      onPickXrayTarget(target);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggleXray();
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [xrayActive, onPickXrayTarget, onToggleXray]);

  // Smart Text Selection Floating Telekinesis Bar
  useEffect(() => {
    const onMouseUp = (event: MouseEvent) => {
      if (xrayActive) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-agent-private], input, textarea')) {
        return;
      }
      window.setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() || '';
        if (text.length < 6 || text.length > 1500 || !sel || sel.rangeCount === 0) {
          setSelectionBar(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const r = range.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) {
          setSelectionBar(null);
          return;
        }
        setSelectionBar({
          text,
          x: Math.min(window.innerWidth - 280, Math.max(16, Math.round(r.left + r.width / 2 - 130))),
          y: Math.max(12, Math.round(r.top - 46)),
        });
      }, 20);
    };
    const onScroll = () => setSelectionBar(null);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [xrayActive]);

  const rect = activeAction?.rect;
  const cursorX = rect ? Math.min(window.innerWidth - 40, Math.max(16, rect.x + rect.width / 2)) : null;
  const cursorY = rect ? Math.min(window.innerHeight - 40, Math.max(16, rect.y + rect.height / 2)) : null;
  const modeInfo = MODE_META[permissionMode];

  if (!busy && !activeAction && !xrayActive && !selectionBar) return null;

  return (
    <div
      data-agent-private
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
    >
      {/* Ambient Cloudy Blue Telekinesis Border Glow */}
      {(busy || activeAction || xrayActive) && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 border-2 transition-opacity duration-300 ${
            xrayActive
              ? 'border-dashed border-primary shadow-[inset_0_0_32px_rgba(53,111,167,0.18)]'
              : 'border-primary-pastel/70 shadow-[inset_0_0_28px_rgba(53,111,167,0.12)]'
          }`}
        />
      )}

      {/* X-Ray Inspector Hover Target Box */}
      {xrayActive && hoveredXray && (
        <div
          style={{
            transform: `translate3d(${Math.max(2, hoveredXray.rect.x - 4)}px, ${Math.max(2, hoveredXray.rect.y - 4)}px, 0)`,
            width: `${Math.max(24, hoveredXray.rect.width + 8)}px`,
            height: `${Math.max(24, hoveredXray.rect.height + 8)}px`,
          }}
          className="pointer-events-none absolute left-0 top-0 rounded-xl border-2 border-primary bg-primary-light/30 shadow-[0_0_0_3px_rgba(191,215,237,0.6)] transition-all duration-75"
        >
          <div className="absolute -top-8 left-0 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary-pastel bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
            <Compass animated={false} className="h-3 w-3" />
            <span>
              [{hoveredXray.role}] {hoveredXray.name.slice(0, 48)} · Nhấn để ghim vào Mây Mây
            </span>
          </div>
        </div>
      )}

      {/* Floating Smart Selection Telekinesis Bar */}
      {selectionBar && !xrayActive && (
        <div
          style={{
            transform: `translate3d(${selectionBar.x}px, ${selectionBar.y}px, 0)`,
          }}
          className="pointer-events-auto absolute left-0 top-0 z-[96] flex items-center gap-1 rounded-full border border-primary-pastel bg-surface/95 p-1 shadow-lg backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => {
              const snippet = selectionBar.text.slice(0, 600);
              setSelectionBar(null);
              window.getSelection()?.removeAllRanges();
              onQuickPrompt(`Giải thích chi tiết và dễ hiểu đoạn này giúp mình:\n"${snippet}"`);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Bot animated={false} className="h-3 w-3" />
            <span>Giải thích với Mây</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const snippet = selectionBar.text.slice(0, 600);
              setSelectionBar(null);
              window.getSelection()?.removeAllRanges();
              onQuickPrompt(`Tóm tắt ý chính và cho ví dụ thực tế về đoạn này:\n"${snippet}"`);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
          >
            <FileText animated={false} className="h-3 w-3" />
            <span>Tóm tắt & Ví dụ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const snippet = selectionBar.text.slice(0, 600);
              setSelectionBar(null);
              window.getSelection()?.removeAllRanges();
              onQuickPrompt(`Tạo 1 câu hỏi trắc nghiệm nhanh để mình ôn tập đoạn kiến thức này:\n"${snippet}"`);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
          >
            <Code animated={false} className="h-3 w-3" />
            <span>Đố nhanh</span>
          </button>
          <button
            type="button"
            aria-label="Đóng thanh chọn"
            onClick={() => setSelectionBar(null)}
            className="rounded-full p-1 text-muted-foreground hover:bg-primary-light hover:text-foreground"
          >
            <X animated={false} className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Spotlight Highlight Ring around target DOM element */}
      {rect && (
        <div
          style={{
            transform: `translate3d(${Math.max(4, rect.x - 6)}px, ${Math.max(4, rect.y - 6)}px, 0)`,
            width: `${Math.max(32, rect.width + 12)}px`,
            height: `${Math.max(28, rect.height + 12)}px`,
          }}
          className="pointer-events-none absolute left-0 top-0 rounded-2xl border-2 border-primary bg-primary-light/25 shadow-[0_0_0_4px_rgba(191,215,237,0.55),0_12px_32px_rgba(53,111,167,0.22)] transition-all duration-300 ease-out"
        >
          {activeAction?.note && (
            <div className="pointer-events-auto absolute -top-11 left-0 flex max-w-xs items-center gap-1.5 rounded-xl border border-primary-pastel bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-md">
              <Eye animated={false} className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{activeAction.note}</span>
              <button
                type="button"
                aria-label="Đóng khung chỉ điểm"
                onClick={() => setActiveAction(null)}
                className="ml-1 rounded-md p-0.5 text-muted-foreground hover:bg-primary-light hover:text-foreground"
              >
                <X animated={false} className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Ghost Cursor gliding to target coordinate */}
      {cursorX !== null && cursorY !== null && (
        <div
          style={{
            transform: `translate3d(${cursorX}px, ${cursorY}px, 0)`,
          }}
          className="pointer-events-none absolute left-0 top-0 flex items-center gap-2 transition-transform duration-300 ease-out"
        >
          <span className="relative flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary-pastel bg-primary text-primary-foreground shadow-md">
            <MousePointerClick animated={false} className="h-3.5 w-3.5" />
          </span>
          <span className="whitespace-nowrap rounded-full border border-primary-pastel bg-surface/95 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm backdrop-blur-xs">
            Mây Mây · {activeAction?.label}
          </span>
        </div>
      )}

      {/* Floating Bottom-Center Co-Pilot HUD Pill */}
      {(busy || activeAction || xrayActive) && (
        <div className="pointer-events-auto fixed bottom-5 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-primary-pastel bg-surface/95 px-3.5 py-2 shadow-lg backdrop-blur-md">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-primary">
            {busy ? (
              <Zap animated={false} className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none" />
            ) : xrayActive ? (
              <Compass animated={false} className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Bot animated={false} className="h-3.5 w-3.5" />
            )}
          </span>

          <span className="max-w-[260px] truncate text-xs font-medium text-foreground sm:max-w-[380px]">
            {xrayActive
              ? 'Chế độ X-Ray: Rê chuột và nhấn vào bất kỳ nút/đoạn nào trên trang để hỏi hoặc ra lệnh (Esc để thoát)'
              : activeAction?.label || status || 'Mây Mây Co-Pilot đang đồng hành…'}
          </span>

          <button
            type="button"
            onClick={onCycleMode}
            title={modeInfo.hint}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Badge variant={modeInfo.badge} size="sm" className="cursor-pointer gap-1">
              <Shield animated={false} className="h-3 w-3" />
              <span>{modeInfo.label}</span>
            </Badge>
          </button>

          {xrayActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleXray}
              className="h-6 rounded-full px-2.5 py-0 text-[11px]"
            >
              Tắt X-Ray
            </Button>
          )}
          {busy && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-6 rounded-full px-2.5 py-0 text-[11px]"
            >
              Dừng
            </Button>
          )}
          {!busy && !xrayActive && activeAction && (
            <button
              type="button"
              aria-label="Ẩn thanh trạng thái Mây Mây"
              onClick={() => setActiveAction(null)}
              className="rounded-full p-1 text-muted-foreground hover:bg-primary-light hover:text-foreground"
            >
              <X animated={false} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
