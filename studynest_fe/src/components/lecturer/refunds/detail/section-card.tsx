import { Card } from "@/components/ui";
import { type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, icon, children }: SectionCardProps) {
  return (
    <Card variant="surface" className="p-6">
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  );
}

