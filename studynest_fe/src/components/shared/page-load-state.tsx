"use client";

import { useCookieUserStatus } from "@/components/shared/user-loader";
import { Alert, Button, EmptyState, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import { formatApiError } from "@/lib/utils/helpers/error";
import { useUserStore } from "@/stores/user";
import { isAxiosError } from "axios";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";

export function useProtectedPageSWR<T>(path: string) {
  const cookieStatus = useCookieUserStatus();
  // Wait for the cookie identity before using the account-scoped SWR key.
  const requestPath = isDpopMode || cookieStatus !== "pending" ? path : null;
  return useAuthedSWR<T>(requestPath, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
}

const accountCache = { provider: () => new Map() };

export function PageDataScope({ children }: { children: ReactNode }) {
  const userId = useUserStore((state) => state.user?.id);
  // Some existing screens use bare URL keys for their subsequent requests.
  return <SWRConfig key={userId ?? "guest"} value={accountCache}>{children}</SWRConfig>;
}

export function pageErrorMessage(error: unknown, fallback: string, network: string) {
  const response = isAxiosError(error) ? error.response : undefined;
  return response ? formatApiError({ response }, fallback) : network;
}

interface RetryProps {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function PageLoadError({ message, onRetry, retrying }: RetryProps) {
  return (
    <Alert variant="destructive">
      <p>{message}</p>
      <Button type="button" size="sm" variant="outline" className="mt-3" disabled={retrying} onClick={onRetry}>
        Thử lại
      </Button>
    </Alert>
  );
}

export function ProfileLoadError({ message, onRetry, retrying }: RetryProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-10">
      <EmptyState
        className="w-full max-w-md"
        title="Không thể tải hồ sơ"
        description={message}
        action={<Button type="button" disabled={retrying} onClick={onRetry}>Thử lại</Button>}
      />
    </div>
  );
}

export function RefundListSkeleton({ courses }: { courses?: boolean }) {
  return (
    <div role="status" aria-label="Đang tải danh sách" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      {!courses && <Skeleton className="h-20 w-full" />}
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className={courses ? "h-44 w-full" : "h-14 w-full"} />
        ))}
      </div>
    </div>
  );
}
