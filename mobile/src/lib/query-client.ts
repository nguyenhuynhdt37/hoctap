import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 phút
      retry: (failureCount, error) => {
        // KHÔNG retry 401 — interceptor axios sẽ tự refresh token.
        // TanStack Query retry=1 retry tất cả errors (kể cả 401),
        // gây race condition: retry chạy TRƯỚC khi refresh xong.
        if (failureCount >= 1) return false
        const status = (error as any)?.response?.status
        if (status === 401) return false
        return true
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false,
    },
  },
})
