import { View, Pressable, Text, Animated } from 'react-native'
import { useTheme } from '@/src/hooks/useTheme'
import { cn } from '@/src/lib/utils'
import { Feather } from '@expo/vector-icons'
import { useRef, useEffect } from 'react'
import * as Haptics from 'expo-haptics'

export function ThemeToggle({ minimal = false }: { minimal?: boolean }) {
  const { preference, setPreference, colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  
  const scaleAnim = useRef(new Animated.Value(1)).current

  const toggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start()
    
    setPreference(isDark ? 'light' : 'dark')
  }

  if (minimal) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable 
          onPress={toggleTheme}
          className="w-12 h-12 rounded-full items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg shadow-black/5"
        >
          <Feather 
            name={isDark ? "moon" : "sun"} 
            size={22} 
            color={isDark ? "#FDE047" : "#F59E0B"} 
          />
        </Pressable>
      </Animated.View>
    )
  }

  const options = [
    { id: 'system', label: 'Tự động', iconName: 'settings' },
    { id: 'light', label: 'Sáng', iconName: 'sun' },
    { id: 'dark', label: 'Tối', iconName: 'moon' },
  ] as const

  return (
    <View className="flex-row items-center gap-2">
      {options.map((opt) => {
        const active = preference === opt.id
        return (
          <Pressable
            key={opt.id}
            onPress={() => setPreference(opt.id)}
            className="flex-1"
          >
            <View
              className={cn(
                "rounded-2xl border-2 items-center justify-center py-3 gap-1.5",
                active ? "border-primary bg-primary/10" : "border-border bg-card"
              )}
            >
              <Feather name={opt.iconName as any} size={20} color={active ? '#10B981' : '#8FA0AE'} />
              <Text
                className={cn(
                  "text-xs font-bold",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
