import React from 'react'
import { View, ScrollView, Pressable, useColorScheme, Image } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'
import type { CourseCurriculum } from '../types'

interface CourseOverviewTabProps {
  curriculum: CourseCurriculum
  courseInfo?: any
}

export function CourseOverviewTab({ curriculum, courseInfo }: CourseOverviewTabProps) {
  const isDark = useColorScheme() === 'dark'
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}p`
    return `${mins} phút`
  }

  const course = courseInfo

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Top Image (Full width) */}
        {course?.thumbnail_url && (
          <Image 
            source={{ uri: course.thumbnail_url }} 
            className="w-full h-56"
            resizeMode="cover"
          />
        )}

        <View className="p-5">
          {/* Course Title & Subtitle */}
          <Text className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {curriculum.title}
          </Text>

          {course?.subtitle && (
            <Text className={`text-sm mt-3 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {course.subtitle}
            </Text>
          )}

          {/* Progress Section */}
          <View className={`mt-6 p-4 rounded-3xl ${isDark ? 'bg-zinc-900' : 'bg-emerald-50'}`}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-emerald-800'}`}>
                Tiến độ học tập
              </Text>
              <Text className="text-sm font-bold text-emerald-600">{curriculum.progress_percent}%</Text>
            </View>
            <View className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-emerald-100'}`}>
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${curriculum.progress_percent}%` }}
              />
            </View>
            <Text className="text-xs text-zinc-500 mt-2">
              Đã hoàn thành {curriculum.completed_lessons}/{curriculum.total_lessons} bài học
            </Text>
          </View>

          {/* Stats Grid */}
          <View className="flex-row mt-4 gap-3">
            {[
              { icon: 'play-circle', label: 'Bài học', value: curriculum.total_lessons, color: '#10B981' },
              { icon: 'time', label: 'Thời lượng', value: formatTime(curriculum.total_duration), color: '#10B981' },
              { icon: 'star', label: 'Đánh giá', value: course?.rating_avg?.toFixed(1) || '5.0', color: '#F59E0B' }
            ].map((stat, i) => (
              <View key={i} className={`flex-1 rounded-3xl p-4 ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text className={`text-lg font-bold mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {stat.value}
                </Text>
                <Text className="text-[10px] text-zinc-500 uppercase font-bold">{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Meta Badges */}
          <View className={`mt-3 p-4 rounded-3xl flex-row justify-between ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50'}`}>
            <View className="flex-row items-center">
              <Feather name="bar-chart" size={14} color="#71717A" />
              <Text className="text-xs text-zinc-500 ml-1.5 capitalize">
                {course?.level === 'beginner' ? 'Cơ bản' : course?.level === 'intermediate' ? 'Trung bình' : course?.level === 'advanced' ? 'Nâng cao' : 'Mọi cấp độ'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="globe" size={14} color="#71717A" />
              <Text className="text-xs text-zinc-500 ml-1.5">{course?.language === 'vi' ? 'Tiếng Việt' : 'English'}</Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="users" size={14} color="#71717A" />
              <Text className="text-xs text-zinc-500 ml-1.5">{course?.views?.toLocaleString() || 0} lượt xem</Text>
            </View>
          </View>

          {/* Instructor */}
          {course?.instructor && (
            <View className={`mt-4 p-4 rounded-3xl flex-row items-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
              {course.instructor.avatar ? (
                <Image source={{ uri: course.instructor.avatar }} className="w-12 h-12 rounded-full" />
              ) : (
                <View className="w-12 h-12 rounded-full bg-emerald-500 items-center justify-center">
                  <Text className="text-white font-bold text-lg">{course.instructor.fullname[0]}</Text>
                </View>
              )}
              <View className="ml-4 flex-1">
                <Text className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {course.instructor.fullname}
                </Text>
                <Text className="text-xs text-zinc-500">Giảng viên hướng dẫn</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description (Markdown manages its own padding) */}
        {courseInfo?.description && (
          <View className="mt-2">
            <View className="px-5">
              <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Giới thiệu khóa học
              </Text>
            </View>
            <View style={{ height: 500 }}>
              <MarkdownRenderer 
                content={courseInfo.description} 
                className="flex-1"
              />
            </View>
          </View>
        )}

        <View className="p-5">
          {/* Outcomes */}
          {courseInfo?.outcomes && courseInfo.outcomes.length > 0 && (
            <View className="mt-6">
              <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Bạn sẽ học được gì?
              </Text>
              <View className="gap-3">
                {(Array.isArray(courseInfo.outcomes) ? courseInfo.outcomes : courseInfo.outcomes.split('\n').filter(Boolean)).map((outcome: string, i: number) => (
                  <View key={i} className={`flex-row items-start p-4 rounded-2xl ${isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'}`}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" className="mt-0.5" />
                    <Text className={`text-sm ml-3 flex-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {outcome.replace(/^[•\-\*]\s*/, '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Requirements */}
          {courseInfo?.requirements && courseInfo.requirements.length > 0 && (
            <View className="mt-8">
              <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Yêu cầu
              </Text>
              <View className="gap-3">
                {(Array.isArray(courseInfo.requirements) ? courseInfo.requirements : courseInfo.requirements.split('\n').filter(Boolean)).map((req: string, i: number) => (
                  <View key={i} className="flex-row items-start">
                    <View className={`w-2 h-2 rounded-full mt-2 ${isDark ? 'bg-emerald-500/50' : 'bg-emerald-500/30'}`} />
                    <Text className={`text-sm ml-4 flex-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {req.replace(/^[•\-\*]\s*/, '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sections List */}
          <View className="mt-10 mb-40">
            <Text className={`text-lg font-bold mb-5 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Nội dung chi tiết
            </Text>
            <View className="gap-4">
              {curriculum.sections.map((section, index) => (
                <View key={section.id} className={`rounded-3xl p-5 border ${
                  isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
                }`}>
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 items-center justify-center">
                      <Text className="text-base font-bold text-emerald-600">{index + 1}</Text>
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {section.title}
                      </Text>
                      <Text className="text-xs text-zinc-500 mt-1">
                        {section.lessons.length} bài học • {formatTime(section.total_duration)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#3F3F46' : '#D4D4D8'} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
