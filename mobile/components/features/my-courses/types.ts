import type { MyCourseItem } from '@/src/types/course'

export interface MyCoursesFilters {
  keyword: string
  sort_by: 'enrolled_at' | 'created_at' | 'rating_avg' | 'views' | 'progress'
  order: 'asc' | 'desc'
}

export interface MyCourseCardProps {
  course: MyCourseItem
  onPress?: (course: MyCourseItem) => void
}
