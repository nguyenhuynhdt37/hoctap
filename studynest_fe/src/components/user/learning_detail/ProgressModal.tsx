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
  const radius = 56; // px
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute right-6 top-[5rem] w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200">
        <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45" />
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              Tiến độ học tập
            </h3>
            <p className="text-xs text-gray-500 truncate">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
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
                    stroke="#E5E7EB"
                    strokeWidth="12"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="url(#grad)"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </g>
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14B8A6" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="fill-teal-700"
                  style={{ fontWeight: 800, fontSize: 24 }}
                >
                  {percent}%
                </text>
              </svg>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Hoàn thành</span>
                  <span className="font-semibold text-teal-700">
                    {percent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-white border border-teal-100">
                  <div className="text-[11px] text-gray-500 mb-1">
                    Bài đã hoàn thành
                  </div>
                  <div className="text-xl font-extrabold text-gray-900 tabular-nums">
                    {completedLessons}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-teal-100">
                  <div className="text-[11px] text-gray-500 mb-1">
                    Tổng số bài
                  </div>
                  <div className="text-xl font-extrabold text-gray-900 tabular-nums">
                    {totalLessons}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-teal-100 col-span-2">
                  <div className="text-[11px] text-gray-500 mb-1">
                    Tổng thời lượng
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    {totalDurationLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
