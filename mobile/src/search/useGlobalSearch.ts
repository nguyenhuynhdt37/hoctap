import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildGlobalSearchItems } from './builders'
import { filterSearchItems } from './normalize'
import type { GlobalSearchItem } from './types'

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, value])

  return debouncedValue
}

export function useGlobalSearch(
  query: string,
  type: GlobalSearchItem['type'] | 'all'
) {
  const debouncedQuery = useDebouncedValue(query)

  const indexQuery = useQuery({
    queryKey: ['global-search-index'],
    queryFn: buildGlobalSearchItems,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })

  const results = useMemo(
    () => filterSearchItems(indexQuery.data ?? [], debouncedQuery, type),
    [debouncedQuery, indexQuery.data, type]
  )

  return {
    ...indexQuery,
    debouncedQuery,
    results,
    total: indexQuery.data?.length ?? 0,
  }
}
