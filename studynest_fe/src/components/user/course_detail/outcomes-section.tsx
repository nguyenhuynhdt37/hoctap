"use client";

import { HiCheckCircle, HiLightningBolt } from "react-icons/hi";

interface OutcomesSectionProps {
  outcomes: string[];
}

export default function OutcomesSection({
  outcomes,
}: OutcomesSectionProps) {
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <div className="bg-teal-50 rounded-lg shadow-sm border border-teal-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
          <HiLightningBolt className="h-4 w-4 text-white" />
        </div>
        Bạn sẽ học được gì
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {outcomes.map((outcome, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-100 hover:shadow-sm transition-shadow"
          >
            <HiCheckCircle className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 font-medium">{outcome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

