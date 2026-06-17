import React from 'react'
import { View, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MotiView } from '@/src/lib/moti'
import { Text } from '@/components/ui/Text'
import { formatCurrency } from '@/src/utils/format'

import { useTranslation } from 'react-i18next'

interface WalletCardProps {
  summary: any
}

export function WalletCard({ summary }: WalletCardProps) {
  const { t } = useTranslation()
  return (
    <View className="px-6">
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ borderRadius: 32 }}
        className="shadow-2xl shadow-emerald-500/40"
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 32, padding: 32 }}
          className="h-[240px] justify-between overflow-hidden relative"
        >
          {/* Soft Glow Ambient */}
          <View className="absolute top-[-40] right-[-40] w-60 h-60 bg-white/10 rounded-full blur-[40px]" />
          
          <View className="z-10">
            <Text className="text-emerald-100/60 text-[11px] font-bold uppercase tracking-[2px] mb-3">
              {t('wallet_screen.balance', 'Số dư hiện tại')}
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-5xl font-black text-white tracking-tighter">
                {formatCurrency(summary?.balance || 0).split(' ')[0]}
              </Text>
              <Text className="text-xl font-bold text-emerald-100/40 ml-3">VND</Text>
            </View>
          </View>

          <View className="z-10 flex-row justify-between items-end">
            <View>
              <Text className="text-white/40 text-[10px] font-black tracking-[1.5px] uppercase mb-1.5">
                STUDYNEST PREMIUM
              </Text>
              <Text className="text-white font-bold text-xl tracking-[4px]">
                {summary?.id ? `**** **** **** ${summary.id.slice(-4)}` : '•••• •••• •••• ••••'}
              </Text>
            </View>
            <View className="w-14 h-14 rounded-[20px] bg-white/20 items-center justify-center border border-white/30 backdrop-blur-md">
                <Image 
                    source={require('../../../../assets/images/icon.png')} 
                    className="w-9 h-9" 
                    resizeMode="contain"
                />
            </View>
          </View>
        </LinearGradient>
      </MotiView>
    </View>
  )
}
