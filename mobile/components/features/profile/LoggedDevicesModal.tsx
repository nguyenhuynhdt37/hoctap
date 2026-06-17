import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert, Modal, Platform, Dimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from 'react-i18next';
import { authService } from '@/src/services/auth.service';
import { Session } from '@/src/types/auth';
import { resolveIPLocation, formatLocation } from '@/src/utils/geo';
import { Smartphone, Monitor, Globe, X, CheckCircle2, Trash2, Shield, MapPin, Clock, Info, ChevronRight, Zap, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface LoggedDevicesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LoggedDevicesModal({ visible, onClose }: LoggedDevicesModalProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authService.getSessions();
      setSessions(data.sessions);
      
      const locMap: Record<string, string> = {};
      await Promise.all(data.sessions.map(async (s) => {
        if (s.ip_address) {
          const loc = await resolveIPLocation(s.ip_address);
          locMap[s.id] = formatLocation(loc);
        }
      }));
      setLocations(locMap);
    } catch (error) {
      console.error('❌ [Sessions] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchSessions();
    }
  }, [visible, fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRevokingId(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSelectedSession(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đăng xuất thiết bị này');
    } finally {
      setRevokingId(null);
    }
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Vừa xong';
    try {
      const lastUsed = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - lastUsed.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Đang hoạt động';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return `${diffDays} ngày trước`;
    } catch {
      return 'Vừa xong';
    }
  };

  const getDeviceIcon = (userAgent: string | null, deviceType: string | null) => {
    const ua = (userAgent || '').toLowerCase();
    if (deviceType === 'WEB' || ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
      return <Monitor size={22} color={isDark ? '#fff' : '#18181b'} strokeWidth={2} />;
    }
    return <Smartphone size={22} color={isDark ? '#fff' : '#18181b'} strokeWidth={2} />;
  };

  const SessionCard = ({ session, index }: { session: Session; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: 100 + index * 50, type: 'spring', damping: 20 }}
      className="mb-4"
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedSession(session);
        }}
        className={`p-5 rounded-[40px] border overflow-hidden ${
          session.is_current 
            ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-100 shadow-sm')
            : (isDark ? 'bg-white/5 border-white/10' : 'bg-white border-zinc-100 shadow-sm')
        }`}
      >
        <View className="flex-row items-center">
          <View className={`w-14 h-14 rounded-full items-center justify-center ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`}>
            {getDeviceIcon(session.user_agent, session.device_type)}
          </View>
          <View className="flex-1 ml-4">
            <View className="flex-row items-center">
              <Text className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {session.device_name || session.device_type || 'Thiết bị lạ'}
              </Text>
              {session.is_current && (
                <View className="ml-3 px-2.5 py-1 bg-emerald-500 rounded-full">
                  <Text className="text-[9px] font-black text-white uppercase tracking-widest">Hiện tại</Text>
                </View>
              )}
            </View>
            <Text className="text-[10px] text-zinc-500 mt-1 font-medium" numberOfLines={1}>
              {locations[session.id] || session.ip_address || 'Không có địa chỉ IP'}
            </Text>
            <View className="flex-row items-center mt-1">
              <View className={`w-1.5 h-1.5 rounded-full mr-2 ${session.is_current || (new Date().getTime() - new Date(session.last_used_at || '').getTime() < 60000) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
              <Text className="text-[10px] font-bold text-zinc-400">
                {formatRelativeTime(session.last_used_at)}
              </Text>
            </View>
          </View>
          <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`}>
            <ChevronRight size={16} color={isDark ? '#52525b' : '#a1a1aa'} />
          </View>
        </View>
      </Pressable>
    </MotiView>
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <AnimatePresence>
          {visible && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
            >
              <Pressable className="flex-1" onPress={onClose} />
            </MotiView>
          )}
        </AnimatePresence>

        <MotiView
          from={{ translateY: SCREEN_H }}
          animate={{ translateY: 0 }}
          exit={{ translateY: SCREEN_H }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ height: '90%' }}
          className={`w-full rounded-t-[56px] overflow-hidden border-t ${isDark ? 'bg-zinc-950 border-white/10' : 'bg-zinc-50 border-zinc-100'}`}
        >
          {Platform.OS === 'ios' && <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} className="absolute inset-0" />}
          
          <LinearGradient
            colors={isDark ? ['#10b98115', 'transparent', 'transparent'] : ['#10b98110', 'transparent', 'transparent']}
            className="absolute inset-0"
          />

          <View className="flex-1 p-8">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-10">
              <View>
                <Text className={`text-4xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Phiên đăng nhập
                </Text>
                <View className="flex-row items-center mt-2">
                  <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
                    {sessions.length} Thiết bị đang hoạt động
                  </Text>
                </View>
              </View>
              <Pressable 
                onPress={onClose}
                className={`w-14 h-14 rounded-full items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`}
              >
                <X size={24} color={isDark ? '#fff' : '#000'} strokeWidth={2.5} />
              </Pressable>
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <MotiView
                  animate={{ rotate: '360deg' }}
                  transition={{ loop: true, duration: 1000, type: 'timing' }}
                >
                  <Zap size={32} color="#10b981" fill="#10b981" />
                </MotiView>
                <Text className="text-zinc-500 mt-6 font-black uppercase tracking-widest text-[10px]">Đang đồng bộ...</Text>
              </View>
            ) : (
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Security Card */}
                <View className={`p-6 rounded-[40px] mb-8 overflow-hidden border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white border-emerald-100 shadow-sm'}`}>
                  <View className="flex-row items-center mb-3">
                    <ShieldCheck size={18} color="#10b981" strokeWidth={2.5} />
                    <Text className="text-xs font-black text-emerald-500 ml-3 uppercase tracking-widest">Bảo vệ tài khoản</Text>
                  </View>
                  <Text className={`text-sm leading-6 font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Chúng tôi theo dõi hoạt động đăng nhập để bảo vệ tài khoản của bạn. Hãy đăng xuất ngay nếu thấy thiết bị lạ.
                  </Text>
                </View>

                {sessions.map((session, i) => (
                  <SessionCard key={session.id} session={session} index={i} />
                ))}

                <View className="h-20" />
              </ScrollView>
            )}
          </View>

          {/* Footer Blur Actions */}
          {!loading && sessions.length > 1 && (
            <View className="absolute bottom-10 left-8 right-8">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  Alert.alert('Đăng xuất tất cả', 'Hành động này sẽ đăng xuất tất cả các thiết bị ngoại trừ thiết bị hiện tại.', [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Xác nhận', style: 'destructive', onPress: async () => {
                      await authService.logoutOthers();
                      fetchSessions();
                    }}
                  ]);
                }}
                className="h-20 rounded-[40px] bg-red-500 items-center justify-center flex-row"
                style={{
                  shadowColor: '#ef4444',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Trash2 size={22} color="white" strokeWidth={2.5} />
                <Text className="ml-4 text-base font-black text-white uppercase tracking-widest">Đăng xuất tất cả</Text>
              </Pressable>
            </View>
          )}
        </MotiView>

        {/* Device Detail Overlay */}
        <AnimatePresence>
          {selectedSession && (
            <Modal transparent animationType="none" visible={!!selectedSession}>
              <View className="flex-1 justify-center items-center p-8 bg-black/80">
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`w-full rounded-[48px] p-8 border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-100'}`}
                >
                  <View className="items-center mb-8">
                    <View className={`w-24 h-24 rounded-full items-center justify-center mb-6 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                      {getDeviceIcon(selectedSession.user_agent, selectedSession.device_type)}
                    </View>
                    <Text className={`text-2xl font-black tracking-tighter text-center ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {selectedSession.device_name || 'Chi tiết thiết bị'}
                    </Text>
                    <Text className="text-zinc-500 text-center mt-2 px-4 font-medium text-xs">
                      {selectedSession.user_agent}
                    </Text>
                  </View>

                  <View className="gap-3 mb-10">
                    <View className={`flex-row items-center p-5 rounded-[32px] ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`}>
                      <MapPin size={18} color="#10b981" />
                      <View className="ml-4">
                        <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Địa chỉ IP</Text>
                        <Text className={`text-sm font-bold mt-1 ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                          {selectedSession.ip_address || 'Không có địa chỉ'}
                        </Text>
                      </View>
                    </View>
                    <View className={`flex-row items-center p-5 rounded-[32px] ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`}>
                      <Clock size={18} color="#10b981" />
                      <View className="ml-4">
                        <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hoạt động cuối</Text>
                        <Text className={`text-sm font-bold mt-1 ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                          {selectedSession.last_used_at ? new Date(selectedSession.last_used_at).toLocaleString('vi-VN') : 'Vừa xong'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-4">
                    <Pressable
                      onPress={() => setSelectedSession(null)}
                      className={`flex-1 h-16 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                    >
                      <Text className={`font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Đóng</Text>
                    </Pressable>
                    {!selectedSession.is_current && (
                      <Pressable
                        onPress={() => handleRevoke(selectedSession.id)}
                        disabled={revokingId === selectedSession.id}
                        className="flex-1 h-16 rounded-full bg-red-500 items-center justify-center"
                      >
                        {revokingId === selectedSession.id ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text className="font-black text-white uppercase tracking-widest">Đăng xuất</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                </MotiView>
              </View>
            </Modal>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
}
