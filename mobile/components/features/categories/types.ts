import type { CategoryWithChildren, CategoryWithTopics, Topic } from '@/src/types/course'

export interface CategoryCardProps {
  category: CategoryWithChildren
  onPress?: (category: CategoryWithChildren) => void
  onChildPress?: (category: { id: string; name: string; slug: string }) => void
  isExpanded?: boolean
  onToggle?: () => void
}

export interface CategoryItemProps {
  item: { id: string; name: string; slug: string }
  onPress?: (item: { id: string; name: string; slug: string }) => void
  isDark?: boolean
}
