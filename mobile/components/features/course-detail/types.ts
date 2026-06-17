export interface CourseDetailSidebarProps {
  course: any
  router: any
  isDark?: boolean
}

export interface EnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  course: any
  totalDuration: number
  isEnrolling: boolean
  enrollSuccess: boolean
  onEnroll: () => void
  finalPrice: number
}

export interface DiscountItem {
  id: string
  discount_code: string
  name: string | null
  description: string | null
  discount_type: 'percent' | 'fixed'
  percent_value: number | null
  fixed_value: number | null
  end_at: string | null
}
