import { useState } from 'react'
import { Linking } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { walletService } from '@/src/services/wallet.service'

export function useWallet() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Queries
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['wallet-summary'],
    queryFn: walletService.getSummary,
  })

  const { data: txData, isLoading: isLoadingTx, refetch: refetchTx } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions({ limit: 10 }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await Promise.all([refetchSummary(), refetchTx()])
    setRefreshing(false)
  }

  // Mutations
  const depositMutation = useMutation({
    mutationFn: (val: number) => walletService.createDeposit(val),
    onSuccess: (data) => {
      if (data.approve_url) {
        Linking.openURL(data.approve_url)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      // msg handled in component if needed
    }
  })

  const handleDeposit = () => {
    const val = parseInt(amount.replace(/[^\d]/g, ''))
    if (!val || val < 50000) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }
    depositMutation.mutate(val)
  }

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString())
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  return {
    summary,
    txData,
    isLoadingSummary,
    isLoadingTx,
    amount,
    setAmount,
    refreshing,
    onRefresh,
    handleDeposit,
    handleQuickAmount,
    isDepositing: depositMutation.isPending,
    t
  }
}
