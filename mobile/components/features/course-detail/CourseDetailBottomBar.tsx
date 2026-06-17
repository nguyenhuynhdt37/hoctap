import React, { useState } from 'react'
import { View, useColorScheme, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Ionicons } from '@expo/vector-icons'
import { courseService } from '@/src/services/course.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { useToastStore } from '@/src/stores/toast.store'
import { EnrollmentModal } from './components/EnrollmentModal'
import { formatCurrency } from '@/src/utils/format'
import type { CourseDetail, CourseSection } from '@/src/types/course'

interface Props {
  course: NonNullable<CourseDetail['course']>
  isDark?: boolean
}

export function CourseDetailBottomBar({ course, isDark = false }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  const totalDurationSeconds = (course.sections || []).reduce(
    (total: number, section: CourseSection) =>
      total + (section.lessons || []).reduce((l: number, lesson: any) => l + (lesson.duration || 0), 0),
    0
  )

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    try {
      setIsEnrolling(true)
      if (course.base_price > 0) {
        await courseService.checkout([course.id])
        useToastStore.getState().show({
          title: t('common.success'),
          message: t('course_detail.enroll_success'),
          type: 'success'
        })
        setEnrollSuccess(true)
        setTimeout(() => router.push(`/learning/${course.slug}` as any), 1500)
      } else {
        await courseService.enroll(course.id)
        useToastStore.getState().show({
          title: t('common.success'),
          message: t('course_detail.enroll_success'),
          type: 'success'
        })
        setEnrollSuccess(true)
        setTimeout(() => router.push(`/learning/${course.slug}` as any), 1500)
      }
    } catch (err: any) {
      Alert.alert(
        t('common.error'), 
        err?.response?.data?.detail ?? err?.response?.data?.message ?? t('common.error')
      )
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <>
      <View
        className={`px-6 py-5 border-t ${isDark
          ? 'bg-zinc-950/90 border-white/5'
          : 'bg-white/90 border-zinc-100'
          }`}
        style={{ paddingBottom: 34 }}
      >
        <View className="flex-row items-center gap-6">
          <View className="flex-1">
             <Text className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
               {course.base_price === 0 ? t('common.free') : t('course_detail.price')}
             </Text>
             <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>
               {course.base_price === 0 ? t('common.free') : formatCurrency(course.base_price)}
             </Text>
          </View>

          <Pressable 
            onPress={() => setIsEnrollModalOpen(true)}
            className="bg-emerald-600 px-8 py-4 rounded-[24px] shadow-xl shadow-emerald-500/20 active:opacity-80"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="rocket" size={16} color="white" />
              <Text className="text-white text-sm font-black uppercase tracking-widest">
                {course.base_price === 0 ? t('common.enroll') : t('course_detail.buy_now')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <EnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false)
          setEnrollSuccess(false)
        }}
        course={course}
        totalDuration={totalDurationSeconds}
        isEnrolling={isEnrolling}
        enrollSuccess={enrollSuccess}
        onEnroll={handleEnroll}
        finalPrice={course.base_price}
        isDark={isDark}
      />
    </>
  )
}
