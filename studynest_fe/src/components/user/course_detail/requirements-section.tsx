"use client";

interface RequirementsSectionProps {
  requirements: string[];
}

export default function RequirementsSection({
  requirements,
}: RequirementsSectionProps) {
  if (!requirements || requirements.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Yêu cầu</h2>
      <ul className="space-y-3">
        {requirements.map((req, index) => (
          <li
            key={index}
            className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100"
          >
            <span className="text-emerald-500 mt-1 text-sm">•</span>
            <span className="text-gray-700 text-sm">{req}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

