interface TimelineItemProps {
  title: string;
  timeLabel: string;
  description?: string | null;
  isDone: boolean;
  isActive: boolean;
  isLast: boolean;
}

export function TimelineItem({
  title,
  timeLabel,
  description,
  isDone,
  isActive,
  isLast,
}: TimelineItemProps) {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div
          className={`w-4 h-4 rounded-full border-2 ${
            isDone
              ? "border-green-500 bg-green-500"
              : isActive
                ? "border-yellow-500 bg-yellow-100"
                : "border-gray-300 bg-white"
          }`}
        />
        {!isLast && <div className="flex-1 w-px bg-gray-200 mt-1" />}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{title}</span>
          <span className="text-xs text-gray-500">{timeLabel}</span>
        </div>
        {description && (
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

