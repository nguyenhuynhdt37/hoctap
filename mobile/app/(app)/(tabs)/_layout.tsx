import React, { useEffect } from 'react'
import { MaterialTopTabs } from '@/components/navigation/MaterialTopTabs'
import { View, Pressable, Dimensions, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Home, Search, Bell, BookOpen, User, Bot } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  useSharedValue,
} from 'react-native-reanimated'
import { useColorScheme } from 'nativewind'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'

const { width } = Dimensions.get('window')
const TAB_BAR_WIDTH = width * 0.9

import { useNotificationStore } from '@/src/stores/notification.store'

function TabBarIcon({ isFocused, routeName }: { isFocused: boolean, routeName: string }) {
  const unreadCount = useNotificationStore(s => s.unreadCount)

  const getIcon = (color: string) => {
    const props = { size: 24, color, strokeWidth: isFocused ? 2.5 : 2 }
    if (routeName === 'index') return <Home {...props} />
    if (routeName === 'explore') return <Search {...props} />
    if (routeName === 'notifications') return <Bell {...props} />
    if (routeName === 'my-learn') return <BookOpen {...props} />
    if (routeName === 'ai-chat') return <Bot {...props} />
    return <User {...props} />
  }

  return (
    <View className="relative">
      {getIcon(isFocused ? '#FFFFFF' : '#4b5563')}
      {routeName === 'notifications' && unreadCount > 0 && (
        <View 
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-emerald-500 items-center justify-center"
          style={{ borderColor: isFocused ? '#10B981' : 'transparent' }}
        >
          <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  )
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const currentRouteName = state.routes[state.index].name
  const routes = state.routes.filter((r: any) => !['settings'].includes(r.name))
  const tabCount = routes.length
  const tabWidth = (TAB_BAR_WIDTH - 12) / tabCount
  
  const activeIndex = routes.findIndex((r: any) => r.name === state.routes[state.index].name)
  const offset = useSharedValue(activeIndex * tabWidth)

  useEffect(() => {
    if (activeIndex === -1) return

    offset.value = withSpring(activeIndex * tabWidth, {
      damping: 20,
      stiffness: 150,
      mass: 1,
    })
  }, [activeIndex, tabWidth])

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value },
    ],
  }))

  if (currentRouteName === 'settings') return null

  return (
    <View
      className="absolute left-0 right-0 items-center bg-transparent"
      style={{ bottom: insets.bottom - 12 }}
      pointerEvents="box-none"
    >
      <View
        style={{
          width: TAB_BAR_WIDTH,
          height: 74,
          borderRadius: 37,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.5 : 0.1,
          shadowRadius: 20,
          elevation: 12,
          backgroundColor: 'transparent',
        }}
      >
        <BlurView
          intensity={isDark ? 40 : 85}
          tint={isDark ? 'dark' : 'light'}
          style={{ 
            flex: 1,
            borderRadius: 37,
            overflow: 'hidden',
            borderWidth: 1, 
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}
        >
        {/* iOS 26 Solid Capsule Indicator - Perfectly Rounded */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 6,
              width: tabWidth - 6,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#10B981',
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              overflow: 'hidden',
            },
            animatedIndicatorStyle
          ]}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {routes.map((route: any, index: number) => {
          const isFocused = activeIndex === index
          
          const onPress = () => {
            if (isFocused) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            navigation.navigate(route.name)
          }

          return (
            <Pressable 
              key={route.key} 
              onPress={onPress}
              className="flex-1 items-center justify-center h-full"
            >
              <TabBarIcon isFocused={isFocused} routeName={route.name} />
            </Pressable>
          )
        })}
      </BlurView>
    </View>
  </View>
)
}



export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBar={(props) => <CustomTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{ 
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
      }}
    >
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="explore" />
      <MaterialTopTabs.Screen name="notifications" />
      <MaterialTopTabs.Screen name="my-learn" />
      <MaterialTopTabs.Screen name="ai-chat" />
      <MaterialTopTabs.Screen name="profile" />
      <MaterialTopTabs.Screen 
        name="settings" 
        options={{ 
          href: null,
        } as any} 
      />
    </MaterialTopTabs>
  )
}
