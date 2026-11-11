"use client";

interface ProgressModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  completedLessons: number;
  totalLessons: number;
  totalDurationLabel: string;
}

export default function ProgressModal(props: ProgressModalProps) {
  const {
    open,
    onClose,
    title,
    completedLessons,
    totalLessons,
    totalDurationLabel,
  } = props;
  if (!open) return null;

  const percent = Math.min(
    100,
    Math.max(
      0,
      Math.round(((completedLessons || 0) / (totalLessons || 0 || 1)) * 100)
    )
  );
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute right-6 top-[4.75rem] w-full max-w-md bg-white rounded-[20px] shadow-lg border border-border">
        <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-l border-t border-border rotate-45" />
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-semibold text-foreground truncate">
              Tiến độ học tập
            </h3>
            <p className="text-xs text-muted-foreground truncate">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            <div className="flex items-center justify-center">
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                className="block"
              >
                <g transform="rotate(-90 70 70)">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#E7EEF7"
                    strokeWidth="12"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="url(#cloudyBlueGrad)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </g>
                <defs>
                  <linearGradient id="cloudyBlueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#356FA7" />
                    <stop offset="100%" stopColor="#7BAFD4" />
                  </linearGradient>
                </defs>
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="fill-primary"
                  style={{ fontWeight: 700, fontSize: 22 }}
                >
                  {percent}%
                </text>
              </svg>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Hoàn thành</span>
                  <span className="font-semibold text-primary">
                    {percent}%
                  </span>
                </div>
                <div className="w-full bg-primary-light rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="text-[11px] text-muted-foreground mb-1">
                    Bài đã hoàn thành
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {completedLessons}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <div className="text-[11px] text-muted-foreground mb-1">
                    Tổng số bài
                  </div>
                  <div className="text-xl font-bold text-foreground tabular-nums">
                    {totalLessons}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border col-span-2">
                  <div className="text-[11px] text-muted-foreground mb-1">
                    Tổng thời lượng
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {totalDurationLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-sm font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
