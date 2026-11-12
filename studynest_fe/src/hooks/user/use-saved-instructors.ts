"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useUserStore } from "@/stores/user";
import type { SavedInstructorIdsResponse } from "@/types/user/instructor";

// Hàm fetch danh sách ID đã lưu chia theo các lô (batches) tối đa 30 ID theo contract
async function fetchBatchedSavedIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) {
    batches.push(ids.slice(i, i + 30));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const query = batch.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
      const res = await api.get<SavedInstructorIdsResponse>(
        `/users/instructors/saved/ids?${query}`
      );
      return res.data?.ids || [];
    })
  );

  return Array.from(new Set(results.flat()));
}

export function useSavedInstructors(instructorIds: string[] = []) {
  const router = useRouter();
  const { mutate: mutateCache } = useSWRConfig();
  const user = useUserStore((s) => s.user);

  // Ref lock chống double-click ngay lập tức trước khi React re-render
  const processingRef = useRef<Set<string>>(new Set());
  const [processingState, setProcessingState] = useState<Record<string, boolean>>({});

  // Lấy danh sách ID duy nhất, không bỏ sót khi danh sách > 30 items
  const uniqueIds = useMemo(() => {
    return Array.from(new Set(instructorIds.filter(Boolean)));
  }, [instructorIds]);

  const idsKey = useMemo(() => {
    return uniqueIds.slice().sort().join(",");
  }, [uniqueIds]);

  // Key SWR bắt buộc scope theo user.id
  const swrKey = user?.id && uniqueIds.length > 0 ? ["/users/instructors/saved/ids", user.id, idsKey] : null;

  const {
    data: savedIds,
    mutate,
    error: fetchError,
    isLoading,
  } = useSWR<string[]>(
    swrKey,
    () => fetchBatchedSavedIds(uniqueIds),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      onError: (err) => {
        console.error("Lỗi khi tải trạng thái lưu giáo viên:", err);
      },
    }
  );

  // Trạng thái sẵn sàng: guest hoặc rỗng luôn sẵn sàng; user có item phải hoàn tất fetch thành công
  const isReady = useMemo(() => {
    if (!user || uniqueIds.length === 0) return true;
    return savedIds !== undefined && !fetchError && !isLoading;
  }, [user, uniqueIds.length, savedIds, fetchError, isLoading]);

  const retry = useCallback(() => mutate(), [mutate]);

  const savedSet = useMemo(() => new Set(savedIds ?? []), [savedIds]);

  const isSaved = useCallback(
    (instructorId: string) => {
      return savedSet.has(instructorId);
    },
    [savedSet]
  );

  const isPending = useCallback(
    (instructorId: string) => {
      return Boolean(processingState[`${user?.id ?? "guest"}:${instructorId}`]);
    },
    [processingState, user?.id]
  );

  const toggleSave = useCallback(
    async (instructorId: string): Promise<boolean | null> => {
      if (!user) {
        const currentUrl =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/instructors";
        showToast.info("Vui lòng đăng nhập để lưu giáo viên vào danh sách theo dõi.");
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return null;
      }

      // Ngăn chặn quyết định PUT/DELETE sai lầm khi chưa đồng bộ xong hoặc fetch bị lỗi
      if (!isReady) {
        if (fetchError) {
          showToast.error("Không thể xác định trạng thái lưu giáo viên. Vui lòng bấm Thử lại.");
        } else {
          showToast.info("Đang đồng bộ trạng thái lưu giáo viên, vui lòng đợi trong giây lát.");
        }
        return null;
      }

      // Khóa ngay lập tức bằng Ref để chống double-click trước render (rapid toggle ignored -> return null)
      const ownerId = user.id;
      const operationKey = `${ownerId}:${instructorId}`;
      const operationCacheKey = swrKey;
      if (processingRef.current.has(operationKey)) {
        return null;
      }
      processingRef.current.add(operationKey);
      setProcessingState((prev) => ({ ...prev, [operationKey]: true }));

      const currentlySaved = savedSet.has(instructorId);

      try {
        if (currentlySaved) {
          await api.delete<{ saved: boolean }>(
            `/users/instructors/${encodeURIComponent(instructorId)}/saved`
          );

        } else {
          await api.put<{ saved: boolean }>(
            `/users/instructors/${encodeURIComponent(instructorId)}/saved`
          );

        }

        if (useUserStore.getState().user?.id !== ownerId) return null;
        showToast.success(currentlySaved ? "Đã bỏ lưu giáo viên." : "Đã lưu giáo viên.");
        // Update the captured owner/key, never a bound mutate that now points to another viewer.
        if (operationCacheKey) await mutateCache<string[]>(
          operationCacheKey,
          (prev: string[] = []) => {
            if (currentlySaved) {
              return prev.filter((id) => id !== instructorId);
            }
            return Array.from(new Set([...prev, instructorId]));
          },
          { revalidate: false }
        );

        return !currentlySaved;
      } catch (err) {
        if (useUserStore.getState().user?.id !== ownerId) return null;
        console.error("Lỗi khi thay đổi trạng thái lưu giáo viên:", err);
        showToast.error("Không thể thay đổi trạng thái lưu. Vui lòng thử lại sau.");
        throw err;
      } finally {
        processingRef.current.delete(operationKey);
        setProcessingState((prev) => {
          const next = { ...prev };
          delete next[operationKey];
          return next;
        });
      }
    },
    [user, isReady, fetchError, savedSet, router, mutateCache, swrKey]
  );

  return {
    isSaved,
    isPending,
    toggleSave,
    savedIds: savedIds ?? [],
    isReady,
    fetchError,
    retry,
  };
}
