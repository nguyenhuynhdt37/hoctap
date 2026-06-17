import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationStore } from '../stores/notification.store';
import { useWebSocket } from '../hooks/websocket/useWebSocket';
import { authService } from '../services/auth.service';
import { notificationService } from '../services/notification.service';
import * as Haptics from 'expo-haptics';
import { showLocalNotification, requestNotificationPermissions, handleNotificationNavigation } from '../utils/notifications';
import { resolveIPLocation, formatLocation } from '../utils/geo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { SecurityAlertModal } from '../../components/features/auth/SecurityAlertModal';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function NotificationWS() {
  const handledSecurityAlerts = useRef<Set<string>>(new Set());
  const hasCheckedLaunchNotiRef = useRef(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState<{ session: any; location: string; eventKey?: string } | null>(null);
  
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const clearTokens = useAuthStore(s => s.clearTokens);
  const addNotification = useNotificationStore(s => s.addNotification);
  const setNotifications = useNotificationStore(s => s.setNotifications);
  const unreadCount = useNotificationStore(s => s.unreadCount);
  
  const unreadCountRef = useRef(unreadCount);
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const registerPush = async () => {
        if (isExpoGo) {
          console.log('📱 [PushToken] Skipped register push token (Expo Go).');
          return;
        }
        try {
          const granted = await requestNotificationPermissions();
          if (granted) {
            let projectId = undefined;
            try {
              const ConstantsMod = require('expo-constants').default;
              projectId = ConstantsMod?.expoConfig?.extra?.eas?.projectId ?? ConstantsMod?.easConfig?.projectId;
            } catch (e) {
              console.warn('[PushToken] expo-constants projectId check failed:', e);
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
              ...(projectId ? { projectId } : {})
            });
            
            if (tokenData?.data) {
              console.log('📱 [PushToken] Retrieved Expo push token:', tokenData.data);
              await notificationService.registerPushToken(
                tokenData.data,
                Platform.OS.toUpperCase()
              );
              console.log('✅ [PushToken] Registered push token with backend successfully.');
            }
          }
        } catch (pushErr) {
          console.warn('⚠️ [PushToken] Registering push token failed (ignoring to prevent crash):', pushErr);
        }
      };

      registerPush();

      notificationService.getNotifications({ limit: 20 })
        .then(res => {
          setNotifications(res.data.items, res.data.unread);
        })
        .catch(err => console.error('❌ [WS] Fetch initial notifications failed:', err));
    }
  }, [isAuthenticated, user, setNotifications]);

  useEffect(() => {
    if (!Notifications) return;

    const navigateFromNotification = (url?: string, action?: string) => {
      setTimeout(() => {
        handleNotificationNavigation(url, action);
      }, 500);
    };

    if (!hasCheckedLaunchNotiRef.current) {
      hasCheckedLaunchNotiRef.current = true;
      // Handle app launch from notification (terminated state)
      Notifications.getLastNotificationResponseAsync().then((response: any) => {
        if (response) {
          const noti = response.notification.request.content.data as any;
          if (noti) {
            const url = noti.url || noti.url_;
            const action = noti.action;
            navigateFromNotification(url, action);
          }
        }
      });
    }

    // Handle clicks while app is in background or active
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const noti = response.notification.request.content.data as any;
      if (noti) {
        const url = noti.url || noti.url_;
        const action = noti.action;
        navigateFromNotification(url, action);
      }
    });

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const role_name = user?.roles?.[0] || 'USER';

  const showNewSessionAlert = useCallback(async (session: any, eventKey?: string) => {
    const currentSessionId = await SecureStore.getItemAsync('session_id');
    if (!session?.id || session.id === currentSessionId) return;

    const dedupeKey = eventKey || session.id;
    if (handledSecurityAlerts.current.has(dedupeKey)) return;
    handledSecurityAlerts.current.add(dedupeKey);

    const deviceLabel = session.device_type || 'Thiết bị mới';
    const loginMethod = session.login_method || 'không rõ';
    const ipLabel = session.ip_address || 'không rõ';
    const userAgent = session.user_agent || 'Không rõ thiết bị';

    let locationStr = session.ip_address || 'vị trí không rõ';
    if (session.ip_address) {
      const loc = await resolveIPLocation(session.ip_address);
      if (loc) {
        locationStr = formatLocation(loc);
      }
    }

    showLocalNotification('Phát hiện đăng nhập mới', `${deviceLabel} vừa đăng nhập vào tài khoản của bạn.`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    setAlertData({ session, location: locationStr, eventKey });
    setAlertVisible(true);
  }, []);

  const handleMessageRef = useRef<((data: any) => Promise<void>) | undefined>(undefined);
  
  const handleMessage = useCallback(async (data: any) => {
    if (handleMessageRef.current) {
      await handleMessageRef.current(data);
    }
  }, []);

  useEffect(() => {
    handleMessageRef.current = async (data: any) => {
      console.log('📬 [WS] New Notification:', data);

      if (data?.type === 'auth.sessions_revoked') {
        const sessionId = await SecureStore.getItemAsync('session_id');
        const revokedSessionIds = data.data?.revoked_session_ids || [];
        if (sessionId && revokedSessionIds.includes(sessionId)) {
          showLocalNotification(
            'Phiên đăng nhập đã bị đăng xuất',
            'Thiết bị này đã bị đăng xuất vì phiên đăng nhập không còn hợp lệ.'
          );
          Alert.alert(
            'Đã đăng xuất',
            'Phiên đăng nhập trên thiết bị này đã bị thu hồi.',
            [{ text: 'OK' }]
          );
          await clearTokens();
        }
        return;
      }

      if (data?.type === 'auth.new_session') {
        const newSession = data.data?.session;
        await showNewSessionAlert(newSession, data.data?.notification_id);
        return;
      }
      
      if (data?.type === 'notification.created') {
        const noti = data.data;
        addNotification(noti);

        const metadata = noti.metadata || noti.metadata_;
        if (noti.type === 'security' && metadata?.event === 'auth.new_session') {
          await showNewSessionAlert(metadata.session, noti.id);
          return;
        }
        
        // 🔔 Trigger OS-level notification
        showLocalNotification(
          noti.title || 'Thông báo mới',
          noti.content || 'Bạn có một thông báo mới từ Studynest',
          noti
        );
        
        // Trigger haptics for new notification
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };
  }, [addNotification, clearTokens, showNewSessionAlert]);

  const handleConnect = useCallback(() => {
    console.log('✅ [WS] Notification channel connected');
  }, []);

  const handleDisconnect = useCallback(async (code?: number) => {
    console.log('🔴 [WS] Notification channel disconnected, code:', code);
    if (code === 1008) {
      console.log('🔒 [WS] Session expired or invalid (code 1008). Logging out...');
      showLocalNotification(
        'Phiên đăng nhập đã hết hạn',
        'Vui lòng đăng nhập lại.'
      );
      await clearTokens();
    }
  }, [clearTokens]);

  const { sendMessage, reconnect, isConnected } = useWebSocket({
    endpoint: '/api/v1/notifications/ws/notifications',
    enabled: isAuthenticated && !!user,
    role_name,
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const sendPresence = (type: 'presence.online' | 'presence.away') => {
      if (!isConnected) return;
      sendMessage({ type, sent_at: new Date().toISOString() });
    };

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        reconnect();
        // Không gọi sendPresence('presence.online') ở đây vì nó sẽ gửi khi isConnected = true (useEffect bên dưới)
        return;
      }

      sendPresence('presence.away');

      if (state === 'background') {
        if (unreadCountRef.current > 0) {
          showLocalNotification(
            'Bạn có thông báo chưa đọc',
            `Bạn có ${unreadCountRef.current} thông báo chưa đọc trong StudyNest.`
          );
        } else {
          showLocalNotification(
            'StudyNest đang chạy ngầm',
            'Ứng dụng đang hoạt động để cập nhật bài học và thông báo mới cho bạn.'
          );
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const heartbeat = setInterval(() => {
      if (AppState.currentState === 'active') {
        sendPresence('presence.online');
      }
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(heartbeat);
      sendPresence('presence.away');
      // Không gọi disconnect() ở đây vì useWebSocket đã lo việc dọn dẹp khi unmount.
    };
  }, [isAuthenticated, isConnected, reconnect, sendMessage, user]);

  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'presence.online', sent_at: new Date().toISOString() });
    }
  }, [isConnected, sendMessage]);

  return (
    <SecurityAlertModal
      visible={alertVisible}
      onClose={() => setAlertVisible(false)}
      session={alertData?.session}
      location={alertData?.location || ''}
      onConfirm={async () => {
        setAlertVisible(false);
        if (alertData?.eventKey) {
          await notificationService.markAsRead(alertData.eventKey);
        }
      }}
      onReject={async () => {
        setAlertVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
          if (alertData?.session?.id) {
            await authService.revokeSession(alertData.session.id);
            Alert.alert('Đã xử lý', 'Thiết bị lạ đã bị đăng xuất khỏi tài khoản của bạn.');
            if (alertData.eventKey) {
              await notificationService.markAsRead(alertData.eventKey);
            }
          }
        } catch (err) {
          Alert.alert('Lỗi', 'Không thể thu hồi phiên đăng nhập. Vui lòng kiểm tra lại trong phần Cài đặt.');
        }
      }}
    />
  );
}
