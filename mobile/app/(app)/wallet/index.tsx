import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'

import { walletService } from '@/src/services/wallet.service'
import { formatCurrency, formatDate } from '@/src/utils/format'
import type { WalletTransaction } from '@/src/types/wallet'

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000]
const MIN_TOP_UP = 50000

export default function WalletScreen() {
  const { t } = useTranslation()
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = useMemo(() => createColors(isDark), [isDark])
  const styles = useMemo(() => createStyles(colors), [colors])

  const [amount, setAmount] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const summaryQuery = useQuery({
    queryKey: ['wallet-summary'],
    queryFn: walletService.getSummary,
  })

  const txQuery = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions({ limit: 10 }),
  })

  const depositMutation = useMutation({
    mutationFn: (value: number) => walletService.createDeposit(value),
    onSuccess: async (data) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      if (data.approve_url) {
        const canOpen = await Linking.canOpenURL(data.approve_url)
        if (canOpen) {
          await Linking.openURL(data.approve_url)
        } else {
          Alert.alert(
            t('wallet_screen.payment_error_title', 'Không mở được thanh toán'),
            t('wallet_screen.payment_error_message', 'Vui lòng thử lại sau.')
          )
        }
      }
    },
    onError: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert(
        t('wallet_screen.top_up_failed_title', 'Nạp tiền thất bại'),
        t('wallet_screen.top_up_failed_message', 'Không thể tạo phiên thanh toán. Vui lòng thử lại.')
      )
    },
  })

  const numericAmount = Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
  const transactions = txQuery.data?.transactions ?? []
  const balance = summaryQuery.data?.balance ?? 0
  const totalIn = summaryQuery.data?.total_in ?? 0
  const totalOut = summaryQuery.data?.total_out ?? 0

  const handleRefresh = async () => {
    setRefreshing(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await Promise.all([summaryQuery.refetch(), txQuery.refetch()])
    } finally {
      setRefreshing(false)
    }
  }

  const handleQuickAmount = async (value: number) => {
    setAmount(String(value))
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleDeposit = () => {
    if (numericAmount < MIN_TOP_UP) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert(
        t('wallet_screen.invalid_amount_title', 'Số tiền chưa hợp lệ'),
        t('wallet_screen.invalid_amount_message', 'Số tiền nạp tối thiểu là 50.000 VND.')
      )
      return
    }

    depositMutation.mutate(numericAmount)
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Quay lại')}
          activeOpacity={0.7}
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/')
            }
          }}
          style={styles.iconButton}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>{t('wallet_screen.title', 'Ví của tôi')}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.refresh', 'Làm mới')}
          activeOpacity={0.7}
          onPress={handleRefresh}
          style={styles.iconButton}
        >
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>{t('wallet_screen.balance', 'Số dư hiện tại')}</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </View>
          <View style={styles.walletIcon}>
            <Feather name="credit-card" size={24} color="#ffffff" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatItem
            label={t('wallet_screen.total_in', 'Tổng nạp')}
            value={formatCurrency(totalIn)}
            icon="arrow-down-left"
            color={colors.primary}
            styles={styles}
          />
          <View style={styles.statDivider} />
          <StatItem
            label={t('wallet_screen.total_out', 'Tổng chi')}
            value={formatCurrency(totalOut)}
            icon="arrow-up-right"
            color={colors.danger}
            styles={styles}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('wallet_screen.top_up', 'Nạp tiền')}</Text>
            <Feather name="shield" size={18} color={colors.primary} />
          </View>

          <Text style={styles.fieldLabel}>{t('wallet_screen.quick_top_up', 'Nạp nhanh')}</Text>
          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((value) => {
              const selected = amount === String(value)
              return (
                <TouchableOpacity
                  key={value}
                  activeOpacity={0.78}
                  onPress={() => handleQuickAmount(value)}
                  style={[styles.quickButton, selected && styles.quickButtonActive]}
                >
                  <Text style={[styles.quickText, selected && styles.quickTextActive]}>
                    {formatCurrency(value)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.fieldLabel, styles.amountLabel]}>{t('wallet_screen.amount_label', 'Số tiền')}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={amount}
              onChangeText={(value) => setAmount(value.replace(/[^\d]/g, ''))}
              placeholder={t('wallet_screen.min_amount_hint', 'Tối thiểu 50.000')}
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              returnKeyType="done"
              style={styles.input}
            />
            <Text style={styles.currency}>VND</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            disabled={depositMutation.isPending}
            onPress={handleDeposit}
            style={[styles.depositButton, depositMutation.isPending && styles.disabled]}
          >
            {depositMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <FontAwesome5 name="paypal" size={18} color="#ffffff" />
                <Text style={styles.depositText}>
                  {t('wallet_screen.confirm_top_up', 'Xác nhận nạp tiền')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.helperText}>{t('wallet_screen.paypal_info', 'Thanh toán an toàn qua PayPal')}</Text>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>{t('wallet_screen.history', 'Lịch sử giao dịch')}</Text>
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => router.push('/wallet/transactions')}
          >
            <Text style={styles.historyCount}>{t('wallet_screen.view_all', 'Xem tất cả')}</Text>
          </TouchableOpacity>
        </View>

        {txQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="inbox" size={30} color={colors.muted} />
            <Text style={styles.emptyText}>{t('wallet_screen.empty.history', 'Chưa có giao dịch nào')}</Text>
          </View>
        ) : (
          <View style={styles.transactionList}>
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} styles={styles} colors={colors} t={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatItem({
  label,
  value,
  icon,
  color,
  styles,
}: {
  label: string
  value: string
  icon: keyof typeof Feather.glyphMap
  color: string
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1a` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <View style={styles.statCopy}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function TransactionRow({
  tx,
  styles,
  colors,
  t,
}: {
  tx: WalletTransaction
  styles: ReturnType<typeof createStyles>
  colors: ReturnType<typeof createColors>
  t: TFunction
}) {
  const isIn = tx.direction === 'in' || tx.type === 'deposit'
  const iconName = tx.type === 'purchase' ? 'shopping-cart' : isIn ? 'plus' : 'repeat'
  const accent = isIn ? colors.primary : tx.type === 'purchase' ? colors.info : colors.warning

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.txIcon, { backgroundColor: `${accent}1a` }]}>
        <Feather name={iconName} size={19} color={accent} />
      </View>
      <View style={styles.txContent}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {tx.description || t(`wallet_screen.types.${tx.type}`, tx.type)}
        </Text>
        <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
      </View>
      <View style={styles.txAmountWrap}>
        <Text style={[styles.txAmount, { color: isIn ? colors.primary : colors.text }]}>
          {isIn ? '+' : '-'}
          {formatCurrency(tx.amount).replace(' VND', '')}
        </Text>
        <Text style={[styles.txStatus, { color: tx.status === 'completed' ? colors.primary : colors.warning }]}>
          {t(`wallet_screen.status.${tx.status}`, tx.status)}
        </Text>
      </View>
    </View>
  )
}

function createColors(isDark: boolean) {
  return {
    screen: isDark ? '#09090b' : '#ffffff',
    card: isDark ? '#18181b' : '#f8fafc',
    elevated: isDark ? '#111113' : '#ffffff',
    border: isDark ? '#27272a' : '#e5e7eb',
    text: isDark ? '#fafafa' : '#09090b',
    subtext: isDark ? '#a1a1aa' : '#52525b',
    muted: isDark ? '#71717a' : '#a1a1aa',
    primary: '#10b981',
    primaryDark: '#059669',
    danger: '#f43f5e',
    info: '#3b82f6',
    warning: '#f59e0b',
  }
}

function createStyles(colors: ReturnType<typeof createColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    header: {
      height: 64,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 20,
      paddingBottom: 120,
      gap: 18,
    },
    balanceCard: {
      minHeight: 190,
      borderRadius: 28,
      padding: 26,
      backgroundColor: colors.primary,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    balanceLabel: {
      color: '#d1fae5',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    balanceValue: {
      color: '#ffffff',
      fontSize: 34,
      lineHeight: 42,
      fontWeight: '900',
    },
    walletIcon: {
      alignSelf: 'flex-end',
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    statItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    statCopy: {
      flex: 1,
      minWidth: 0,
    },
    statLabel: {
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    statValue: {
      fontSize: 13,
      fontWeight: '800',
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 10,
    },
    section: {
      borderRadius: 28,
      padding: 22,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 22,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    fieldLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    quickButton: {
      minWidth: '47%',
      flexGrow: 1,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    quickButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    quickText: {
      color: colors.subtext,
      fontSize: 14,
      fontWeight: '800',
    },
    quickTextActive: {
      color: '#ffffff',
    },
    amountLabel: {
      marginTop: 24,
    },
    inputWrap: {
      height: 64,
      borderRadius: 22,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
      paddingVertical: 0,
    },
    currency: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '900',
      marginLeft: 10,
    },
    depositButton: {
      height: 62,
      borderRadius: 22,
      marginTop: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      backgroundColor: colors.primary,
      gap: 10,
    },
    disabled: {
      opacity: 0.65,
    },
    depositText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
    },
    helperText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 14,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    historyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    historyCount: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '900',
    },
    loading: {
      paddingVertical: 40,
    },
    emptyBox: {
      paddingVertical: 42,
      alignItems: 'center',
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.subtext,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 10,
    },
    transactionList: {
      gap: 10,
    },
    transactionRow: {
      minHeight: 74,
      borderRadius: 22,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    txIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    txContent: {
      flex: 1,
      minWidth: 0,
    },
    txTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    txDate: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    txAmountWrap: {
      alignItems: 'flex-end',
      marginLeft: 12,
    },
    txAmount: {
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 3,
    },
    txStatus: {
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
  })
}
