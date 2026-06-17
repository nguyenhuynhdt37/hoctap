import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useColorScheme } from 'nativewind'

export function ScreenBackground({ children }: { children?: React.ReactNode }) {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View 
      style={[
        { flex: 1 }, 
        { backgroundColor: isDark ? '#09090b' : '#FFFFFF' }
      ]}
    >
      {children}
    </View>
  )
}
