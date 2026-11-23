"use client";

import { Alert, Button, Skeleton } from "@/components/ui";
import { hubErrorMessage, isHubUnavailable, unavailableMessage } from "@/lib/learning-hub/errors";
import { RefreshCw } from "lucide-react";

export function HubLoadError({
  error,
  title = "Không thể tải dữ liệu học tập",
  message,
  onRetry,
  isRetrying = false,
}: {
  error?: unknown;
  title?: string;
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  if (isHubUnavailable(error)) return <Alert variant="info" title={unavailableMessage} className="rounded-2xl" />;

  return (
    <Alert variant="destructive" title={title} className="rounded-2xl">
      <p className="text-sm text-destructive-foreground">{hubErrorMessage(error, message)}</p>
      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          isLoading={isRetrying}
          loadingText="Đang thử lại…"
          leftIcon={<RefreshCw className="size-3.5" />}
        >
          Thử lại
        </Button>
      </div>
    </Alert>
  );
}

export function HubPageSkeleton({ label = "Đang tải trang học tập" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
    >
      <Skeleton className="h-32 w-full motion-reduce:animate-none" />
      <Skeleton className="h-24 w-full motion-reduce:animate-none" />
    </div>
  );
}
