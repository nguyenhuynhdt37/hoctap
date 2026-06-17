import React, { useState, useMemo } from 'react'
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { Stack } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/layout/Screen'
import { BackButton } from '@/components/ui/BackButton'
import { useTransactions } from '@/components/features/wallet/hooks/useTransactions'
import { formatCurrency, formatDate } from '@/src/utils/format'
import { cn } from '@/src/lib/utils'
import type { WalletTransaction } from '@/src/types/wallet'

const FILTER_TYPES = [
  { label: 'wallet_screen.all', value: undefined },
  { label: 'wallet_screen.types.deposit', value: 'deposit' },
  { label: 'wallet_screen.types.purchase', value: 'purchase' },
  { label: 'wallet_screen.types.refund', value: 'refund' },
  { label: 'wallet_screen.types.withdrawal', value: 'withdrawal' },
]

export default function AllTransactionsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined)

  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useTransactions({ type: selectedType })

  const transactions = useMemo(() => 
    data?.pages.flatMap(page => page.transactions) ?? [], 
  [data])

  const renderTransactionItem = ({ item }: { item: WalletTransaction }) => {
    const isCredit = item.direction === 'in' || item.type === 'deposit' || item.type === 'refund'
    
    return (
      <View className="flex-row items-center justify-between py-5 border-b border-zinc-100 dark:border-white/5">
        <View className="flex-row items-center flex-1">
          <View className={cn(
            "w-12 h-12 rounded-2xl items-center justify-center",
            isCredit ? "bg-emerald-500/10" : "bg-rose-500/10"
          )}>
            <Feather 
              name={isCredit ? "arrow-down-left" : "arrow-up-right"} 
              size={20} 
              color={isCredit ? "#10b981" : "#ef4444"} 
            />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
              {item.description || t(`wallet_screen.types.${item.type.toLowerCase()}` as any)}
            </Text>
            <Text className="text-xs text-zinc-400 mt-1">
              {formatDate(item.created_at, 'HH:mm • DD/MM/YYYY')}
            </Text>
          </View>
        </View>
        <View className="items-end ml-4">
          <Text className={cn(
            "text-lg font-black tracking-tight",
            isCredit ? "text-emerald-500" : "text-rose-500"
          )}>
            {isCredit ? '+' : '-'}{formatCurrency(item.amount).split(' ')[0]}
          </Text>
          <View className={cn(
            "px-2 py-0.5 rounded-md mt-1",
            item.status === 'completed' ? "bg-emerald-500/10" : "bg-amber-500/10"
          )}>
            <Text className={cn(
              "text-[10px] font-bold uppercase",
              item.status === 'completed' ? "text-emerald-600" : "text-amber-600"
            )}>
              {t(`wallet_screen.status.${item.status.toLowerCase()}` as any)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <Screen safeArea={false} className="bg-white dark:bg-[#09090b]">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={{ paddingTop: insets.top + 10 }} className="px-6 pb-4 bg-white dark:bg-[#09090b] z-10 border-b border-zinc-100 dark:border-white/5">
        <View className="flex-row items-center justify-between mb-6">
          <BackButton />
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {t('wallet_screen.history')}
          </Text>
          <View className="w-12" />
        </View>

        {/* Filter Tabs */}
        <FlatList
          data={FILTER_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.label}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedType(item.value)}
              className={cn(
                "px-5 py-2.5 rounded-full mr-2 border",
                selectedType === item.value 
                  ? "bg-emerald-500 border-emerald-500" 
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/10"
              )}
            >
              <Text className={cn(
                "text-sm font-bold",
                selectedType === item.value ? "text-white" : "text-zinc-500 dark:text-zinc-400"
              )}>
                {t(item.label as any)}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl 
              refreshing={isRefetching} 
              onRefresh={refetch} 
              tintColor="#10b981"
            />
          }
          ListEmptyComponent={
            <View className="py-20 items-center justify-center">
              <View className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 items-center justify-center mb-4">
                <Feather name="list" size={32} color="#D1D5DB" />
              </View>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {t('wallet_screen.empty.history')}
              </Text>
              <Text className="text-sm text-zinc-500 text-center mt-2 px-10">
                {t('wallet_screen.empty.description')}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator color="#10b981" />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  )
}
