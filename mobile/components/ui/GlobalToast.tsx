import React from 'react';
import { View, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { Text } from './Text';
import { useToastStore, ToastMessage } from '@/src/stores/toast.store';
import { useColorScheme } from 'nativewind';

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const TOAST_COLORS = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-100 dark:border-emerald-500/20',
    icon: '#10B981',
    text: 'text-emerald-900 dark:text-emerald-100',
    desc: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-100 dark:border-red-500/20',
    icon: '#EF4444',
    text: 'text-red-900 dark:text-red-100',
    desc: 'text-red-700 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-100 dark:border-amber-500/20',
    icon: '#F59E0B',
    text: 'text-amber-900 dark:text-amber-100',
    desc: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-100 dark:border-blue-500/20',
    icon: '#3B82F6',
    text: 'text-blue-900 dark:text-blue-100',
    desc: 'text-blue-700 dark:text-blue-300',
  },
};

export function GlobalToast() {
  const toasts = useToastStore((s) => s.toasts);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View 
      className="absolute top-0 left-0 right-0 z-50 items-center" 
      pointerEvents="box-none"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      <AnimatePresence>
        {toasts.map((toast, index) => {
          const colors = TOAST_COLORS[toast.type];
          const Icon = TOAST_ICONS[toast.type];

          return (
            <MotiView
              key={toast.id}
              from={{ opacity: 0, translateY: -20, scale: 0.95 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              exit={{ opacity: 0, translateY: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={{
                width: '90%',
                marginBottom: 8,
                zIndex: 100 - index,
              }}
            >
              <View 
                className={`flex-row items-center p-4 rounded-2xl border shadow-sm ${colors.bg} ${colors.border}`}
                style={{
                  shadowColor: isDark ? '#000' : colors.icon,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <View className="mr-3">
                  <Icon size={24} color={colors.icon} strokeWidth={2.5} />
                </View>
                
                <View className="flex-1 mr-2">
                  <Text className={`text-sm font-black tracking-tight ${colors.text}`}>
                    {toast.title}
                  </Text>
                  {toast.message && (
                    <Text className={`text-xs font-medium mt-0.5 ${colors.desc}`}>
                      {toast.message}
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={() => hide(toast.id)}
                  hitSlop={10}
                  className="p-1 rounded-full bg-black/5 dark:bg-white/10"
                >
                  <X size={14} color={colors.icon} strokeWidth={3} />
                </Pressable>
              </View>
            </MotiView>
          );
        })}
      </AnimatePresence>
    </View>
  );
}
