"use client";

interface TargetAudienceSectionProps {
  targetAudience: string[];
}

export default function TargetAudienceSection({
  targetAudience,
}: TargetAudienceSectionProps) {
  if (!targetAudience || targetAudience.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Đối tượng học viên
      </h2>
      <ul className="space-y-3">
        {targetAudience.map((audience, index) => (
          <li
            key={index}
            className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-100"
          >
            <span className="text-teal-500 mt-1 text-sm">•</span>
            <span className="text-gray-700 text-sm">{audience}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

