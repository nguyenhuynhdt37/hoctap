import React from 'react'
import { View, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Feather, Ionicons } from '@expo/vector-icons'
import type { CourseSection } from '@/src/types/course'

interface Props {
  sections: CourseSection[]
  expandedSections: Set<string>
  onToggleSection: (sectionId: string) => void
  onExpandAll?: (expand: boolean) => void
  isAllExpanded?: boolean
  onPreviewLesson?: (lessonId: string) => void
  courseId?: string
  isDark?: boolean
}

export function CurriculumSection({
  sections,
  expandedSections,
  onToggleSection,
  onExpandAll,
  isAllExpanded,
  onPreviewLesson,
  isDark = false,
}: Props) {
  const { t } = useTranslation()

  const formatSeconds = (s: number | null) => {
    if (!s) return '00:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <View className={`mt-5 p-6 rounded-[32px] border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm shadow-zinc-200/50'}`}>
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-3">
          <View className={`w-10 h-10 rounded-2xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <Ionicons name="book" size={20} color="#10B981" />
          </View>
          <Text className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {t('course_detail.curriculum')}
          </Text>
        </View>
        {onExpandAll && (
          <Pressable onPress={() => onExpandAll(!isAllExpanded)} hitSlop={10}>
            <Text className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
              {isAllExpanded ? t('common.collapse_all') : t('common.expand_all')}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="gap-3">
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.has(section.id)
          const totalDuration = section.lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0)

          return (
            <View key={section.id} className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
              <Pressable
                onPress={() => onToggleSection(section.id)}
                className="flex-row items-center px-4 py-4"
              >
                <View className={`w-9 h-9 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm shadow-black/5'}`}>
                  <Text className="text-[11px] font-black text-emerald-600">{sIdx + 1}</Text>
                </View>
                <View className="flex-1 mr-2">
                  <Text className={`text-sm font-black leading-tight ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`} numberOfLines={2}>
                    {section.title}
                  </Text>
                  <Text className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {section.lessons.length} {t('course_detail.lessons_count_label')} • {formatSeconds(totalDuration)}
                  </Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={isDark ? '#3f3f46' : '#a1a1aa'} />
              </Pressable>

              {isExpanded && (
                <View className={`border-t bg-white/50 dark:bg-black/20 ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                  {section.lessons.map((lesson, idx, arr) => (
                    <View
                      key={lesson.id}
                      className={`flex-row items-center px-4 py-4 ${idx < arr.length - 1 ? `border-b ${isDark ? 'border-white/5' : 'border-zinc-50'}` : ''}`}
                    >
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-2.5">
                          <Feather name={lesson.is_preview ? "unlock" : "lock"} size={12} color={lesson.is_preview ? "#10B981" : isDark ? "#3f3f46" : "#d1d5db"} />
                          <Text className={`text-xs font-bold flex-1 ${isDark ? 'text-zinc-400' : 'text-gray-700'}`} numberOfLines={2}>
                            {lesson.title}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2 mt-1.5 ml-5">
                           <Ionicons name="time-outline" size={10} color={isDark ? '#3f3f46' : '#d1d5db'} />
                           <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatSeconds(lesson.duration)}</Text>
                        </View>
                      </View>
                      {lesson.is_preview && onPreviewLesson && (
                        <Pressable
                          onPress={() => onPreviewLesson(lesson.id)}
                          className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
                        >
                          <Text className="text-emerald-600 text-[11px] font-black uppercase tracking-widest">{t('common.preview')}</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
