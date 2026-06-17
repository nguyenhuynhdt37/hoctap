import { Stack } from 'expo-router'
import { Colors } from '../../src/constants/theme'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  )
}
