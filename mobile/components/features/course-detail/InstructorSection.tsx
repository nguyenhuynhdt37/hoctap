import React from 'react'
import { View, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Ionicons } from '@expo/vector-icons'

interface Instructor {
  id: string
  fullname: string
  avatar: string | null
  instructor_description: string | null
  student_count: number | null
  course_count: number | null
  rating_avg: number | null
  evaluated_count: number | null
}

interface Props {
  instructor: Instructor
  isDark?: boolean
}

export function InstructorSection({ instructor, isDark = false }: Props) {
  const { t } = useTranslation()

  return (
    <View className={`mt-5 p-6 rounded-[32px] border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm shadow-zinc-200/50'}`}>
      <View className="flex-row items-center gap-3 mb-6">
        <View className={`w-10 h-10 rounded-2xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
          <Ionicons name="person" size={20} color="#10B981" />
        </View>
        <Text className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {t('course_detail.instructor')}
        </Text>
      </View>

      <View className="flex-row items-start gap-5">
        <View className={`w-16 h-16 rounded-2xl items-center justify-center flex-shrink-0 overflow-hidden ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
          {instructor.avatar ? (
            <Image
              source={{ uri: instructor.avatar }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-xl font-black text-emerald-600">
              {instructor.fullname?.charAt(0) ?? 'I'}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <Text className={`text-base font-black mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {instructor.fullname}
          </Text>

          {instructor.instructor_description && (
            <Text
              className={`text-xs font-medium leading-relaxed mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}
              numberOfLines={4}
            >
              {instructor.instructor_description}
            </Text>
          )}

          <View className="flex-row flex-wrap gap-2">
            <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Text className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">
                {t('course_detail.instructor_courses_count', { count: instructor.course_count ?? 0 })}
              </Text>
            </View>

            <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {(instructor.student_count ?? 0).toLocaleString()} {t('course_detail.students')}
              </Text>
            </View>

            {instructor.rating_avg && (
              <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text className="text-[11px] font-black text-yellow-600 uppercase tracking-widest">
                  {instructor.rating_avg.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}
