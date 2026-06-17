import React, { useEffect, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'

export default function PaymentResultScreen() {
  const params = useLocalSearchParams<{
    status?: string
    order_id?: string
    redirect?: string
  }>()
  const queryClient = useQueryClient()
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = useMemo(() => createColors(isDark), [isDark])
  const styles = useMemo(() => createStyles(colors), [colors])
  const success = params.status === 'success'

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet-summary'] })
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
  }, [queryClient])

  const handleBackToWallet = () => {
    router.replace('/(app)/wallet' as any)
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: success ? colors.successSoft : colors.dangerSoft }]}>
          <Feather
            name={success ? 'check-circle' : 'x-circle'}
            size={42}
            color={success ? colors.success : colors.danger}
          />
        </View>

        <Text style={styles.title}>
          {success ? 'Nạp tiền thành công' : 'Thanh toán chưa hoàn tất'}
        </Text>
        <Text style={styles.message}>
          {success
            ? 'Ví của bạn đã được cập nhật. Có thể mất vài giây để số dư mới hiển thị.'
            : 'Giao dịch đã bị hủy hoặc chưa được PayPal xác nhận.'}
        </Text>

        {params.order_id ? (
          <Text style={styles.orderId} numberOfLines={1}>
            {params.order_id}
          </Text>
        ) : null}

        <TouchableOpacity activeOpacity={0.82} onPress={handleBackToWallet} style={styles.button}>
          <Text style={styles.buttonText}>Về ví của tôi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function createColors(isDark: boolean) {
  return {
    screen: isDark ? '#09090b' : '#ffffff',
    card: isDark ? '#18181b' : '#f8fafc',
    border: isDark ? '#27272a' : '#e5e7eb',
    text: isDark ? '#fafafa' : '#09090b',
    subtext: isDark ? '#a1a1aa' : '#52525b',
    primary: '#10b981',
    success: '#10b981',
    successSoft: isDark ? '#064e3b' : '#d1fae5',
    danger: '#f43f5e',
    dangerSoft: isDark ? '#4c0519' : '#ffe4e6',
  }
}

function createStyles(colors: ReturnType<typeof createColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    content: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 86,
      height: 86,
      borderRadius: 43,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 31,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 10,
    },
    message: {
      color: colors.subtext,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      textAlign: 'center',
      maxWidth: 320,
    },
    orderId: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      maxWidth: 280,
    },
    button: {
      height: 56,
      minWidth: 190,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginTop: 30,
      paddingHorizontal: 24,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
    },
  })
}
