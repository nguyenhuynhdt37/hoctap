import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function requestNotificationPermissions() {
  if (!Notifications) {
    console.log('[Notification] expo-notifications is not available in Expo Go');
    return false;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });
    }

    return true;
  } catch (e) {
    console.warn('[Notification] requestNotificationPermissions error:', e);
    return false;
  }
}

export async function showLocalNotification(title: string, body: string, data?: any) {
  if (!Notifications) {
    console.log('[Notification] local notification skipped (Expo Go):', title, body);
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // show immediately
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    });
  } catch (e) {
    console.warn('[Notification] showLocalNotification error:', e);
  }
}

// Configure how notifications are handled when the app is foregrounded
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[Notification] setNotificationHandler error:', e);
  }
}

export function handleNotificationNavigation(url?: string, action?: string) {
  if (action === 'review_session') {
    router.push('/(app)/profile' as any);
    return;
  }

  if (!url) return;

  // Map web URLs to mobile routes
  if (url.startsWith('/learning/')) {
    const match = url.match(/^\/learning\/([^?#]+)(.*)$/);
    if (match) {
      const slug = match[1];
      const query = match[2] || '';
      router.push(`/(app)/learning/${slug}${query}` as any);
    }
  } 
  else if (url === '/my-learning') {
    router.push('/(app)/(tabs)/my-learn' as any);
  }
  else if (url.startsWith('/course/') || url.startsWith('/courses/')) {
    const slug = url.split('/').pop();
    router.push(`/(app)/course/${slug}` as any);
  }
  else if (url.includes('/wallets/') || url.includes('/refunds/')) {
    router.push('/(app)/(tabs)/my-learn' as any);
  }
}
