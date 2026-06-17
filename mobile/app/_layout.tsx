import '../global.css';
import '../src/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ReanimatedLogLevel, configureReanimatedLogger } from 'react-native-reanimated';
import { useAuthStore } from '../src/stores/auth.store';
import { useThemeStore } from '../src/stores/theme.store';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold
} from '@expo-google-fonts/be-vietnam-pro';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NetworkErrorScreen } from '../components/ui/NetworkErrorScreen';
import { NetworkMonitor } from '../components/layout/NetworkMonitor';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { NotificationWS } from '../src/providers/NotificationWS';
import { GlobalToast } from '../components/ui/GlobalToast';

// Disable Reanimated strict mode
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setColorScheme } = useNativeWindColorScheme();
  const [fontsLoaded] = useFonts({
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-Medium': BeVietnamPro_500Medium,
    'BeVietnamPro-SemiBold': BeVietnamPro_600SemiBold,
    'BeVietnamPro-Bold': BeVietnamPro_700Bold,
    'BeVietnamPro-ExtraBold': BeVietnamPro_800ExtraBold,
  });

  const initialize = useAuthStore(s => s.initialize);
  const isLoading = useAuthStore(s => s.isLoading);
  const connectionError = useAuthStore(s => s.connectionError);
  const preference = useThemeStore(s => s.preference);
  const systemScheme = useColorScheme();

  const colorScheme = preference === 'system' ? (systemScheme ?? 'dark') : preference;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Sync NativeWind colorScheme with our store/system
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <NetworkMonitor>
            <NotificationWS />
            <GlobalToast />
            {connectionError ? (
              <NetworkErrorScreen />
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
                <Stack.Screen name="payment-result" />
                <Stack.Screen name="demo" />
              </Stack>
            )}
          </NetworkMonitor>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
