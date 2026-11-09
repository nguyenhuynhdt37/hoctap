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
      <div className="absolute inset-0 bg-[#3D4A5A]/10 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute right-6 top-[4.75rem] w-full max-w-md bg-white rounded-[20px] shadow-lg border border-[#E7EEF7]">
        <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-l border-t border-[#E7EEF7] rotate-45" />
        <div className="px-5 py-4 border-b border-[#E7EEF7] flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-semibold text-[#3D4A5A] truncate">
              Tiến độ học tập
            </h3>
            <p className="text-xs text-[#6F7C8C] truncate">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F6FAFF] text-[#6F7C8C] hover:text-[#3D4A5A] transition-colors cursor-pointer"
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
                  className="fill-[#356FA7]"
                  style={{ fontWeight: 700, fontSize: 22 }}
                >
                  {percent}%
                </text>
              </svg>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#6F7C8C]">Hoàn thành</span>
                  <span className="font-semibold text-[#356FA7]">
                    {percent}%
                  </span>
                </div>
                <div className="w-full bg-[#E8F2FA] rounded-full h-2.5">
                  <div
                    className="bg-[#356FA7] h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-[#F6FAFF] border border-[#E7EEF7]">
                  <div className="text-[11px] text-[#6F7C8C] mb-1">
                    Bài đã hoàn thành
                  </div>
                  <div className="text-xl font-bold text-[#3D4A5A] tabular-nums">
                    {completedLessons}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F6FAFF] border border-[#E7EEF7]">
                  <div className="text-[11px] text-[#6F7C8C] mb-1">
                    Tổng số bài
                  </div>
                  <div className="text-xl font-bold text-[#3D4A5A] tabular-nums">
                    {totalLessons}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F6FAFF] border border-[#E7EEF7] col-span-2">
                  <div className="text-[11px] text-[#6F7C8C] mb-1">
                    Tổng thời lượng
                  </div>
                  <div className="text-base font-semibold text-[#3D4A5A]">
                    {totalDurationLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#E7EEF7] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#356FA7] text-white hover:bg-[#285C90] text-sm font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
