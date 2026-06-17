import React from 'react';
import { View, Pressable, Modal, useColorScheme, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ShieldAlert, X, Smartphone, MapPin, ShieldCheck, ShieldX, ArrowRight } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface SecurityAlertModalProps {
  visible: boolean;
  onClose: () => void;
  session: any;
  location: string;
  onConfirm: () => void;
  onReject: () => void;
}

export function SecurityAlertModal({ 
  visible, 
  onClose, 
  session, 
  location, 
  onConfirm, 
  onReject 
}: SecurityAlertModalProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center p-6">
        <AnimatePresence>
          {visible && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80"
            >
              <Pressable className="flex-1" onPress={onClose} />
            </MotiView>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visible && (
            <MotiView
              from={{ opacity: 0, scale: 0.9, translateY: 20 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, translateY: 20 }}
              transition={{ type: 'spring', damping: 15 }}
              className={`w-full max-w-[400px] rounded-[48px] overflow-hidden border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-100'}`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.5,
                shadowRadius: 40,
                elevation: 20,
              }}
            >
              {Platform.OS === 'ios' && (
                <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} className="absolute inset-0" />
              )}
              
              <LinearGradient
                colors={isDark ? ['#10b98120', 'transparent'] : ['#10b98110', 'transparent']}
                className="absolute inset-0"
              />

              <View className="p-8 items-center">
                {/* Icon Header */}
                <MotiView
                  from={{ scale: 0.5, rotate: '15deg' }}
                  animate={{ scale: 1, rotate: '0deg' }}
                  transition={{ type: 'spring', delay: 100 }}
                  className="w-24 h-24 rounded-full items-center justify-center mb-6"
                >
                  <View className="absolute inset-0 bg-emerald-500 rounded-full opacity-20 animate-pulse" />
                  <View className="w-20 h-20 bg-emerald-500 rounded-full items-center justify-center">
                    <ShieldAlert size={40} color="white" strokeWidth={2.5} />
                  </View>
                </MotiView>

                <Text className={`text-3xl font-black text-center tracking-tighter leading-9 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Phát hiện đăng nhập lạ?
                </Text>
                
                <Text className="text-zinc-500 text-center mt-3 px-2 leading-6 font-medium">
                  Có một thiết bị vừa đăng nhập vào tài khoản của bạn. Vui lòng kiểm tra ngay!
                </Text>

                {/* Device Card */}
                <View className={`w-full mt-8 p-5 rounded-[32px] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-100'}`}>
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 items-center justify-center">
                      <Smartphone size={20} color="#10b981" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Thiết bị</Text>
                      <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`} numberOfLines={1}>
                        {session?.device_name || session?.device_type || 'Thiết bị không rõ'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 items-center justify-center">
                      <MapPin size={20} color="#10b981" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Vị trí</Text>
                      <Text className={`text-sm font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`} numberOfLines={1}>
                        {location || 'Vị trí không rõ'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Buttons */}
                <View className="w-full gap-4 mt-10">
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onConfirm();
                    }}
                    className={`h-16 rounded-full flex-row items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                  >
                    <ShieldCheck size={20} color={isDark ? '#a1a1aa' : '#71717a'} />
                    <Text className={`ml-3 text-base font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Xác nhận là tôi</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      onReject();
                    }}
                    style={{
                      shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                    }}
                    className="h-16 rounded-full flex-row items-center justify-center bg-red-500"
                  >
                    <ShieldX size={20} color="white" />
                    <Text className="ml-3 text-base font-black text-white uppercase tracking-widest">Không phải tôi</Text>
                    <ArrowRight size={18} color="white" className="ml-2" />
                  </Pressable>
                </View>

                <Pressable onPress={onClose} className="mt-8">
                  <Text className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Để sau</Text>
                </Pressable>
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
}
