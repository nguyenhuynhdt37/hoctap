'use client';
import { useEffect } from 'react';
import { Mic, CircleStop } from 'pulsoicon-react';
import { Button } from '@/components/ui/button';
import { useDictation } from './use-dictation';

export function DictationButton({ getValue, onValueChange, disabled, onBusyChange }: {
  getValue: () => string; onValueChange: (value: string) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const dictation = useDictation(getValue, onValueChange);
  const active = dictation.state !== 'idle';
  useEffect(() => { onBusyChange?.(active); }, [active, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => { if (disabled) dictation.stop(); }, [disabled, dictation.stop]);
  return <div className="relative">
    <Button size="icon" variant={active ? 'destructive' : 'ghost'}
      aria-label={active ? 'Dừng nhập bằng giọng nói' : 'Nhập bằng giọng nói'}
      aria-pressed={active} aria-busy={dictation.state === 'requesting' || dictation.state === 'finishing'}
      disabled={Boolean(disabled && !active) || dictation.state === 'finishing'}
      title={active ? 'Dừng mic và chốt chữ đang nhận' : 'Nói để chữ hiện ngay trong ô chat, chưa gửi tin nhắn'}
      onClick={() => active ? dictation.stop() : void dictation.start()}>
      {active ? <CircleStop size="1em" solid /> : <Mic size="1em" />}
    </Button>
    {active && <span role="status" aria-live="polite" className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-xl border border-primary-pastel bg-primary-light p-2 text-xs text-foreground">
      {dictation.state === 'recording' ? 'Đang nghe · chữ hiện trực tiếp. Nhấn để dừng.' : dictation.state === 'requesting' ? 'Đang kết nối micro…' : 'Mic đã tắt · đang chốt phần chữ cuối…'}
    </span>}
    {dictation.error && <p role="alert" className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-warning-border bg-warning-bg p-2 text-xs text-warning-foreground">{dictation.error}</p>}
  </div>;
}
