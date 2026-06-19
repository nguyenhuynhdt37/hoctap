import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MotiView, AnimatePresence } from 'moti'
import { Feather } from '@expo/vector-icons'
import { useColorScheme } from 'nativewind'
import { GamificationColors } from '../tokens'

interface PeakBadgeProps {
  balance: number
  size?: 'sm' | 'md' | 'lg'
}

export function PeakBadge({ balance, size = 'md' }: PeakBadgeProps) {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  
  const prevBalance = useRef(balance)
  const [diff, setDiff] = useState<number | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (balance > prevBalance.current) {
      const difference = balance - prevBalance.current
      setDiff(difference)
      setKey((k) => k + 1)
      
      const timer = setTimeout(() => {
        setDiff(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
    prevBalance.current = balance
  }, [balance])

  const sizeConfig = {
    sm: {
      containerPadding: 'px-3 py-1.5',
      iconSize: 14,
      textSize: 'text-sm',
      labelSize: 'text-[9px]',
      gap: 1.5,
      diffOffset: -24,
    },
    md: {
      containerPadding: 'px-4 py-2',
      iconSize: 18,
      textSize: 'text-lg',
      labelSize: 'text-[11px]',
      gap: 2,
      diffOffset: -28,
    },
    lg: {
      containerPadding: 'px-5 py-3',
      iconSize: 22,
      textSize: 'text-2xl',
      labelSize: 'text-[13px]',
      gap: 3,
      diffOffset: -34,
    },
  }[size]

  return (
    <View className="items-center relative">
      <View
        className={`flex-row items-center rounded-full border ${sizeConfig.containerPadding} ${
          isDark 
            ? 'bg-amber-500/10 border-amber-500/20' 
            : 'bg-amber-50 border-amber-200'
        }`}
        style={{ gap: sizeConfig.gap }}
      >
        <Feather name="star" size={sizeConfig.iconSize} color={GamificationColors.peak.DEFAULT} />
        <Text className={`font-black text-amber-500 ${sizeConfig.textSize}`}>
          {balance.toLocaleString('vi-VN')}
        </Text>
        <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} ${sizeConfig.labelSize} uppercase tracking-wider`}>
          Peak
        </Text>
      </View>

      {/* Diff Floating Indicator */}
      <AnimatePresence>
        {diff !== null && (
          <MotiView
            key={key}
            from={{ opacity: 0, translateY: 0, scale: 0.8 }}
            animate={{ opacity: 1, translateY: sizeConfig.diffOffset, scale: 1.1 }}
            exit={{ opacity: 0, translateY: sizeConfig.diffOffset - 12, scale: 0.9 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 150,
            }}
            style={styles.floatingDiff}
          >
            <Text 
              className="font-black text-amber-500 text-sm shadow-sm" 
              style={{ 
                textShadowColor: 'rgba(245,158,11,0.4)', 
                textShadowOffset: { width: 0, height: 2 }, 
                textShadowRadius: 4 
              }}
            >
              +{diff}
            </Text>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  )
}

const styles = StyleSheet.create({
  floatingDiff: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
})
