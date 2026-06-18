import React from 'react'
import { View, Text } from 'react-native'
import { useColorScheme } from 'nativewind'
import { GamificationCard } from '../shared/GamificationCard'
import { Feather } from '@expo/vector-icons'
import { GamificationColors } from '../tokens'

interface StreakCalendarViewProps {
  activeDates: string[]
  isDark?: boolean
}

export function StreakCalendarView({ activeDates, isDark: propIsDark }: StreakCalendarViewProps) {
  const { colorScheme } = useColorScheme()
  const isDark = propIsDark !== undefined ? propIsDark : colorScheme === 'dark'

  const activeSet = new Set(activeDates)

  // Generate last 30 days (oldest first)
  const last30Days: Date[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    last30Days.push(d)
  }

  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return (
    <GamificationCard isDark={isDark}>
      <View className="flex-row items-center mb-4">
        <View className="w-8 h-8 rounded-full bg-orange-500/10 items-center justify-center mr-2.5 border border-orange-500/10">
          <Feather name="calendar" size={16} color={GamificationColors.streak.DEFAULT} />
        </View>
        <Text className={`font-black text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Lịch sử 30 ngày qua
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between" style={{ gap: 4 }}>
        {last30Days.map((date, idx) => {
          const dateStr = formatDate(date)
          const isActive = activeSet.has(dateStr)
          const isToday = date.toDateString() === today.toDateString()

          return (
            <View 
              key={idx} 
              className="w-[12%] aspect-square items-center justify-center mb-1.5"
            >
              <View
                className={`w-full h-full rounded-full items-center justify-center border ${
                  isActive
                    ? 'bg-orange-500 border-orange-600 shadow-sm'
                    : isToday
                      ? 'border-orange-500 bg-orange-500/10'
                      : isDark ? 'bg-zinc-800/40 border-white/5' : 'bg-zinc-50 border-zinc-100'
                }`}
                style={isActive ? {
                  shadowColor: '#F97316',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 2
                } : {}}
              >
                <Text
                  className={`text-[10px] font-black ${
                    isActive
                      ? 'text-white'
                      : isToday
                        ? 'text-orange-500 font-bold'
                        : isDark ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  {date.getDate()}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </GamificationCard>
  )
}
