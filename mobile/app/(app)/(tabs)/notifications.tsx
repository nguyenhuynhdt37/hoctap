import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Pressable, useColorScheme, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui';
import { useNotificationStore } from '@/src/stores/notification.store';
import { notificationService } from '@/src/services/notification.service';
import { Screen } from '@/components/layout/Screen';

import { LoggedDevicesModal } from '@/components/features/profile/LoggedDevicesModal';



export default function NotificationsTab() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const { notifications, unreadCount, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionsVisible, setSessionsVisible] = useState(false);

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 50 });
      setNotifications(res.data.items, res.data.unread);
    } catch (err) {
      console.error('Fetch notifications failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(false);
  };

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await notificationService.markAllAsRead();
      markAllAsRead();
    } catch (err) {
      console.error('Mark all as read failed:', err);
    }
  };

  const handlePressNotification = async (noti: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // 1. Đánh dấu đã đọc
    if (!noti.is_read) {
      try {
        await notificationService.markAsRead(noti.id);
        markAsRead(noti.id);
      } catch (err) {
        console.error('Mark as read failed:', err);
      }
    }

    // 2. Xử lý action review_session
    if (noti.action === 'review_session') {
      setSessionsVisible(true);
      return;
    }

    // 3. Điều hướng dựa trên url từ API
    if (noti.url) {
      let targetPath = noti.url;

      // Map web URLs to mobile routes
      if (targetPath.startsWith('/learning/')) {
        const slug = targetPath.split('/').pop();
        router.push(`/(app)/learning/${slug}` as any);
      } 
      else if (targetPath === '/my-learning') {
        router.push('/(app)/(tabs)/my-learn' as any);
      }
      else if (targetPath.startsWith('/course/') || targetPath.startsWith('/courses/')) {
        const slug = targetPath.split('/').pop();
        router.push(`/(app)/course/${slug}` as any);
      }
      else if (targetPath.includes('/wallets/') || targetPath.includes('/refunds/')) {
        // Hiện tại chuyển về tab My Learn hoặc Profile cho các mục này
        router.push('/(app)/(tabs)/my-learn' as any);
      }
    }
  };

  return (
    <Screen safeArea withTabBar className={isDark ? 'bg-zinc-950' : 'bg-white'}>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <Text className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t('notifications_screen.title')}</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead}>
            <Text className="text-emerald-500 font-bold text-sm">{t('notifications_screen.mark_all_read')}</Text>
          </Pressable>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem 
              notification={item} 
              isDark={isDark} 
              onPress={() => handlePressNotification(item)} 
              t={t}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#10B981" />
          }
          ListEmptyComponent={<EmptyNotifications isDark={isDark} t={t} />}
        />
      )}

      <LoggedDevicesModal 
        visible={sessionsVisible}
        onClose={() => setSessionsVisible(false)}
      />
    </Screen>
  );
}

function NotificationItem({ notification, isDark, onPress, t }: any) {
  const getIcon = () => {
    switch (notification.type) {
      case 'course': return 'book-outline';
      case 'payment': return 'card-outline';
      case 'security': return 'shield-checkmark-outline';
      case 'system': return 'settings-outline';
      default: return 'notifications-outline';
    }
  };

  const metadata = notification.metadata || notification.metadata_;
  const securitySession = notification.type === 'security' && metadata?.event === 'auth.new_session'
    ? metadata.session
    : null;

  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    if (securitySession?.ip_address) {
      import('@/src/utils/geo').then(({ resolveIPLocation, formatLocation }) => {
        resolveIPLocation(securitySession.ip_address).then(loc => {
          setLocation(formatLocation(loc));
        });
      });
    }
  }, [securitySession?.ip_address]);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return t('common.time.mins_ago', { count: diffMins });
    if (diffHours < 24) return t('common.time.hours_ago', { count: diffHours });
    return t('common.time.days_ago', { count: diffDays });
  };

  return (
    <Pressable 
      onPress={onPress}
      className={`p-4 rounded-3xl border ${
        notification.is_read 
          ? (isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-50 border-zinc-100')
          : (isDark ? 'bg-zinc-900 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-100')
      }`}
    >
      <View className="flex-row items-start">
        <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
          notification.is_read 
            ? (isDark ? 'bg-zinc-800' : 'bg-zinc-100')
            : (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100')
        }`}>
          <Ionicons 
            name={getIcon()} 
            size={24} 
            color={notification.is_read ? (isDark ? '#71717A' : '#A1A1AA') : '#10B981'} 
          />
        </View>
        
        <View className="flex-1 ml-4">
          <View className="flex-row items-center justify-between">
            <Text className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`} numberOfLines={1}>
              {notification.title}
            </Text>
            {!notification.is_read && (
              <View className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </View>
          <Text className={`text-xs mt-1 leading-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {notification.content}
          </Text>
          {securitySession && (
            <View className={`mt-3 rounded-2xl p-3 ${isDark ? 'bg-zinc-950/70' : 'bg-white/80'}`}>
              <Text className={`text-[11px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Thiết bị: {securitySession.device_type || 'Không rõ'}
              </Text>
              {location && (
                <Text className="text-[11px] mt-1 text-emerald-500 font-bold">
                  📍 {location}
                </Text>
              )}
              <Text className="text-[11px] mt-1 text-zinc-500">
                Phương thức: {securitySession.login_method || 'Không rõ'}
              </Text>
              <Text className="text-[11px] mt-1 text-zinc-500">
                IP: {securitySession.ip_address || 'Không rõ'}
              </Text>
              <Text className="text-[11px] mt-1 text-zinc-500" numberOfLines={2}>
                Máy: {securitySession.user_agent || 'Không rõ'}
              </Text>
            </View>
          )}
          <Text className="text-[10px] mt-2 text-zinc-500 font-medium">
            {getTimeAgo(notification.created_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyNotifications({ isDark, t }: { isDark: boolean; t: any }) {
  return (
    <View className="items-center justify-center py-20">
      <View className={`w-20 h-20 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
        <Feather name="bell-off" size={32} color={isDark ? '#3F3F46' : '#D4D4D8'} />
      </View>
      <Text className={`mt-6 text-base font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
        {t('notifications_screen.empty.title')}
      </Text>
      <Text className="mt-2 text-sm text-zinc-500 text-center px-10">
        {t('notifications_screen.empty.description')}
      </Text>
    </View>
  );
}
