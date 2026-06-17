import React from 'react'
import { View, Pressable, ScrollView, Image } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { getFullImageUrl } from '@/src/utils/image'
import type { CourseSection } from '@/src/types/course'
import { ListSection } from './components/ListSection'
import { ExpandableDescription } from './components/ExpandableDescription'

interface Props {
  course: any
  flatSections: CourseSection[]
  onPreviewLesson: (lessonId: string) => void
  isDark?: boolean
  reviews?: any[]
}

function formatSeconds(s: number | null) {
  if (!s) return '00:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function parseList(v: string | string[] | null | undefined): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map(String).filter(Boolean)
  if (typeof v !== 'string') return []
  const trimmed = v.trim()
  if (!trimmed) return []
  try {
    const p = JSON.parse(trimmed)
    if (Array.isArray(p)) return p.map(String).filter(Boolean)
  } catch { }
  const separators = /[\n•·\-–—*•◆▪▸]\s*/;
  const items = trimmed.split(separators).map(s => s.trim()).filter(Boolean)
  if (items.length > 1) return items
  if (items.length === 1 && items[0].includes(',')) {
    const commaItems = items[0].split(',').map(s => s.trim()).filter(Boolean)
    if (commaItems.length > 1) return commaItems
  }
  return [trimmed]
}

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function Badge({ isDark, icon, children }: { isDark: boolean; icon?: string; children: React.ReactNode }) {
  return (
    <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
      {icon === 'star' && <Ionicons name="star" size={11} color="#F59E0B" />}
      <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{children}</Text>
    </View>
  )
}

function SectionCard({ title, icon, isDark, children }: { title: string; icon: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <View className={`rounded-[32px] border overflow-hidden ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-50 shadow-sm shadow-zinc-200/50'}`}>
      <View className="px-6 pt-6 pb-5">
        <View className="flex-row items-center gap-3 mb-5">
          <View className={`w-10 h-10 rounded-2xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <Ionicons name={icon as any} size={20} color="#10B981" />
          </View>
          <Text className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{title}</Text>
        </View>
        {children}
      </View>
    </View>
  )
}

function OutcomesSection({ course, isDark }: { course: any; isDark: boolean }) {
  const { t } = useTranslation()
  const items = parseList(course.outcomes).map((text: string) => ({ text, icon: 'checkmark-circle' }))
  if (!items.length) return null
  return (
    <View className="px-4 mb-5">
      <SectionCard title={t('course_detail.outcomes')} icon="flash" isDark={isDark}>
        <ListSection items={items} isDark={isDark} bulletColor="#10B981" maxVisible={5} />
      </SectionCard>
    </View>
  )
}

function TagsSection({ course, isDark }: { course: any; isDark: boolean }) {
  const { t } = useTranslation()
  if (!course.tags?.length) return null
  return (
    <View className="px-4 mb-5">
      <SectionCard title={t('course_detail.related_topics')} icon="bookmark-outline" isDark={isDark}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2.5">
            {course.tags.map((tag: string, i: number) => (
              <View key={i} className={`px-4 py-2 rounded-full border ${isDark ? 'bg-zinc-800 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                <Text className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SectionCard>
    </View>
  )
}

function CurriculumSection({ flatSections, isDark, onPreviewLesson }: {
  flatSections: CourseSection[]; isDark: boolean; onPreviewLesson: (id: string) => void
}) {
  const { t } = useTranslation()
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set())
  const [expandAll, setExpandAll] = React.useState(false)

  const toggle = (id: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleAll = () => {
    if (expandAll) setExpandedSections(new Set())
    else setExpandedSections(new Set(flatSections.map(s => s.id)))
    setExpandAll(p => !p)
  }

  const totalDuration = flatSections.reduce((sum, s) => sum + (s.lessons ?? []).reduce((l, les) => l + (les.duration ?? 0), 0), 0)
  const totalLessons = flatSections.reduce((sum, sumS) => sum + (sumS.lessons ?? []).length, 0)

  return (
    <View className="px-4 mb-5">
      <SectionCard title={t('course_detail.curriculum')} icon="book" isDark={isDark}>
        <View className="flex-row items-center justify-between mb-6 px-1">
          <View className="flex-row gap-4">
             <View className="items-center">
               <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('course_detail.sections_count', { count: flatSections.length })}</Text>
             </View>
             <View className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 self-center" />
             <View className="items-center">
               <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('course_detail.lessons_count', { count: totalLessons })}</Text>
             </View>
          </View>
           <Pressable onPress={toggleAll} hitSlop={10}>
            <Text className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
              {expandAll ? t('common.collapse_all') : t('common.expand_all')}
            </Text>
          </Pressable>
        </View>

        <View className="gap-3">
          {flatSections.map((section, sIdx) => {
            const isOpen = expandedSections.has(section.id)
            const secDur = (section.lessons ?? []).reduce((s, l) => s + (l.duration ?? 0), 0)
            return (
              <View key={section.id} className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                <Pressable onPress={() => toggle(section.id)} className="flex-row items-center px-4 py-4">
                   <View className={`w-9 h-9 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm shadow-black/5'}`}>
                    <Text className="text-[11px] font-black text-emerald-600">{sIdx + 1}</Text>
                  </View>
                  <View className="flex-1 mr-2">
                     <Text className={`text-sm font-black leading-tight ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`} numberOfLines={2}>{section.title}</Text>
                    <Text className={`text-[11px] font-bold uppercase tracking-widest mt-1.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {section.lessons?.length ?? 0} {t('course_detail.lessons_count_label')} • {formatSeconds(secDur)}
                    </Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={isDark ? '#3f3f46' : '#a1a1aa'} />
                </Pressable>
                {isOpen && (
                  <View className={`border-t bg-white/50 dark:bg-black/20 ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                    {(section.lessons ?? []).map((lesson, idx, arr) => (
                      <View key={lesson.id} className={`flex-row items-center px-4 py-4 ${idx < arr.length - 1 ? `border-b ${isDark ? 'border-white/5' : 'border-zinc-50'}` : ''}`}>
                        <View className="flex-1 mr-4">
                          <View className="flex-row items-center gap-2.5">
                            <Feather name={lesson.is_preview ? "unlock" : "lock"} size={12} color={lesson.is_preview ? "#10B981" : isDark ? "#3f3f46" : "#d1d5db"} />
                            <Text className={`text-xs font-bold flex-1 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`} numberOfLines={2}>{lesson.title}</Text>
                          </View>
                           <View className="flex-row items-center gap-2 mt-1.5 ml-5">
                             <Ionicons name="time-outline" size={11} color={isDark ? '#3f3f46' : '#d1d5db'} />
                             <Text className={`text-[11px] font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatSeconds(lesson.duration)}</Text>
                          </View>
                        </View>
                        {lesson.is_preview && (
                           <Pressable onPress={() => onPreviewLesson(lesson.id)} className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
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
      </SectionCard>
    </View>
  )
}

function DescriptionSection({ course, isDark }: { course: any; isDark: boolean }) {
  const { t } = useTranslation()
  if (!course.description) return null
  return (
    <View className="px-4 mb-5">
      <SectionCard title={t('course_detail.description')} icon="document-text" isDark={isDark}>
        <ExpandableDescription content={course.description} isDark={isDark} maxLines={7} />
      </SectionCard>
    </View>
  )
}

function RequirementsSection({ course, isDark }: { course: any; isDark: boolean }) {
  const { t } = useTranslation()
  const items = parseList(course.requirements).map((text: string) => ({ text }))
  if (!items.length) return null
  return (
    <View className="px-4 mb-5">
      <SectionCard title={t('course_detail.requirements')} icon="shield-checkmark" isDark={isDark}>
        <ListSection items={items} isDark={isDark} bulletColor="#10B981" maxVisible={4} />
      </SectionCard>
    </View>
  )
}

function InstructorSection({ course, isDark }: { course: any; isDark: boolean }) {
  const { t } = useTranslation()
  if (!course.instructor) return null
  const { instructor } = course
  return (
    <View className="px-4 mb-5">
      <SectionCard title={t('course_detail.instructor')} icon="person" isDark={isDark}>
        <View className="flex-row items-start gap-4">
          <View className={`w-16 h-16 rounded-2xl items-center justify-center flex-shrink-0 overflow-hidden ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            {instructor.avatar ? (
              <Image source={{ uri: getFullImageUrl(instructor.avatar) ?? '' }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-xl font-black text-emerald-600">{(instructor.fullname ?? 'N').charAt(0)}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className={`text-base font-black mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{instructor.fullname}</Text>
            {instructor.instructor_description && (
              <ExpandableDescription content={instructor.instructor_description} isDark={isDark} maxLines={5} />
            )}
          </View>
        </View>
        <View className="flex-row gap-2 flex-wrap mt-5">
          <Badge isDark={isDark}>{t('course_detail.instructor_courses_count', { count: instructor.course_count ?? 0 })}</Badge>
          <Badge isDark={isDark}>{formatCount(instructor.student_count ?? 0)} {t('course_detail.students')}</Badge>
          {instructor.rating_avg && <Badge isDark={isDark} icon="star">{instructor.rating_avg.toFixed(1)}</Badge>}
        </View>
      </SectionCard>
    </View>
  )
}

function ReviewsSection({ reviews, isDark }: { reviews?: any[]; isDark: boolean }) {
  const { t } = useTranslation()
  if (!reviews?.length) return null
  return (
    <View className="px-4 pb-10">
      <SectionCard title={`${t('course_detail.reviews')} (${reviews.length})`} icon="star" isDark={isDark}>
        <View className="gap-4">
          {reviews.map(rv => (
            <View key={rv.id} className={`p-4 rounded-3xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3">
                  <View className={`w-9 h-9 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm shadow-black/5'}`}>
                    <Text className={`text-xs font-black ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>{(rv.user_fullname ?? 'U').charAt(0)}</Text>
                  </View>
                  <View>
                    <Text className={`text-xs font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{rv.user_fullname ?? t('common.user')}</Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Ionicons key={star} name="star" size={10} color={star <= rv.rating ? "#F59E0B" : isDark ? "#27272a" : "#e4e4e7"} />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
              <Text className={`text-sm font-medium leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{rv.content}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </View>
  )
}

export function CourseDetailContent({ course, flatSections, onPreviewLesson, reviews, isDark = false }: Props) {
  return (
    <View className="pt-4">
      <OutcomesSection course={course} isDark={isDark} />
      <CurriculumSection flatSections={flatSections} isDark={isDark} onPreviewLesson={onPreviewLesson} />
      <DescriptionSection course={course} isDark={isDark} />
      <RequirementsSection course={course} isDark={isDark} />
      <InstructorSection course={course} isDark={isDark} />
      <ReviewsSection reviews={reviews} isDark={isDark} />
      <TagsSection course={course} isDark={isDark} />
    </View>
  )
}
