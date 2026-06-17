import { type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

