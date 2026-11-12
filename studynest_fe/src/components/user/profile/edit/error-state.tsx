import { EmptyState } from "@/components/ui/states";

interface ErrorStateProps {
  message: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-10">
      <EmptyState
        className="w-full max-w-md"
        title="Không thể tải hồ sơ"
        description={message}
      />
    </div>
  );
}
