import { useInfiniteQuery } from '@tanstack/react-query'
import { walletService } from '@/src/services/wallet.service'

export function useTransactions(filters: { status?: string; type?: string } = {}) {
  return useInfiniteQuery({
    queryKey: ['wallet-transactions-all', filters],
    queryFn: ({ pageParam = 1 }) => 
      walletService.getAllTransactions({ 
        page: pageParam, 
        limit: 15,
        ...filters
      }),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
    initialPageParam: 1,
  })
}
