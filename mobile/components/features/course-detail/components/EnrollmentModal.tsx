import React from 'react'
import { View, Modal, Pressable, Image, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { formatCurrency } from '@/src/utils/format'
import type { EnrollmentModalProps } from '../types'

export function EnrollmentModal({
  isOpen,
  onClose,
  course,
  totalDuration,
  isEnrolling,
  enrollSuccess,
  onEnroll,
  finalPrice,
  isDark = false,
}: EnrollmentModalProps & { isDark?: boolean }) {
  const { t } = useTranslation()

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h} ${t('common.time.hours')} ${m} ${t('common.time.mins')}`
    if (m > 0) return `${m} ${t('common.time.mins')}`
    return `${seconds} s`
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60 p-6">
        <View className={`w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl ${isDark ? 'bg-zinc-950 border border-white/5' : 'bg-white'}`}>
          {!enrollSuccess ? (
            <>
              <View className="px-6 pt-10 pb-8 bg-emerald-600 items-center">
                <View className="w-20 h-20 rounded-3xl bg-white/20 items-center justify-center mb-5 rotate-12">
                  <Ionicons name="school" size={32} color="white" />
                </View>
                <Text className="text-white text-2xl font-black text-center mb-2 tracking-tight">{t('course_detail.checkout.confirm_title')}</Text>
                <Text className="text-emerald-100 text-sm text-center px-4 font-medium opacity-80">{t('course_detail.checkout.confirm_subtitle')}</Text>
              </View>

              <View className="p-8">
                <View className={`flex-row gap-4 mb-8 p-4 rounded-[32px] border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                  <Image
                    source={course.thumbnail_url ? { uri: course.thumbnail_url } : require('@/assets/images/onboarding_world.png')}
                    className="w-20 h-20 rounded-2xl"
                    resizeMode="cover"
                  />
                  <View className="flex-1 justify-center">
                    <Text className={`font-black leading-tight mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <View className="flex-row items-center gap-2 mb-1">
                      <Ionicons name="time-outline" size={12} color={isDark ? '#52525b' : '#a1a1aa'} />
                      <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatDuration(totalDuration)}</Text>
                    </View>
                    <Text className="text-xl font-black text-emerald-600">{formatCurrency(finalPrice)}</Text>
                  </View>
                </View>

                <View className={`p-6 rounded-[32px] mb-8 ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50'}`}>
                  <Text className={`font-black text-xs uppercase tracking-widest mb-4 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                    {t('course_detail.checkout.benefits_title')}
                  </Text>
                  {[
                    t('course_detail.lifetime_access'),
                    t('course_detail.completion_certificate'),
                    t('course_detail.support_24_7'),
                    t('course_detail.full_money_back')
                  ].map((item, i) => (
                    <View key={i} className="flex-row items-center gap-3 mb-3">
                      <View className="w-5 h-5 rounded-full bg-emerald-500/20 items-center justify-center">
                        <Ionicons name="checkmark" size={10} color="#10B981" />
                      </View>
                      <Text className={`text-xs font-bold ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={onClose}
                    disabled={isEnrolling}
                    className={`flex-1 py-4 px-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
                  >
                    <Text className={`text-center font-black text-xs uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable 
                    onPress={onEnroll} 
                    disabled={isEnrolling} 
                    className="flex-1 py-4 px-4 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-500/20"
                  >
                    {isEnrolling ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <View className="flex-row items-center justify-center gap-2">
                        <Ionicons name="rocket" size={14} color="white" />
                        <Text className="text-white text-xs font-black uppercase tracking-widest">{t('course_detail.checkout.enroll_now')}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <View className="px-8 py-16 items-center">
              <View className="w-24 h-24 rounded-full items-center justify-center mb-8 bg-emerald-500/10">
                <Ionicons name="checkmark-circle" size={56} color="#10B981" />
              </View>
              <Text className={`text-2xl font-black mb-3 text-center tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {t('course_detail.checkout.success_title')}
              </Text>
              <Text className={`text-center mb-8 font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {t('course_detail.checkout.success_subtitle')}
              </Text>
              <Pressable onPress={onClose} className="w-full py-4 rounded-2xl bg-emerald-600">
                <Text className="text-white text-center font-black uppercase tracking-widest">{t('common.close')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}
