// ── Preview Lesson ───────────────────────────────────────────────────────────
export interface PreviewLesson {
  id: string
  title: string
  lesson_type: string
  position: number
  is_preview: boolean
  video_url: string | null
  duration: number | null
}

// ── Instructor (shared across course types) ────────────────────────────────────
export interface Instructor {
  id: string
  name: string
  avatar: string | null
}

// ── Recommended Course (from /courses/feed/recommend) ─────────────────────────
export interface RecommendedCourse {
  id: string
  title: string
  thumbnail: string | null
  slug: string
  instructor: Instructor
  similarity: number // 0.0 – 1.0
}

export interface RecommendedCourseResponse {
  items: RecommendedCourse[]
}

// ── Newest Course (from /courses/feed/newest) ───────────────────────────────
export interface CourseTag {
  id: string
  text: string
}

export interface NewestCourse {
  id: string
  title: string
  thumbnail: string | null
  base_price: number
  views: number
  slug: string
  rating: number
  enrolls: number
  tags: string[]
  instructor: Instructor | null
}

export interface NewestCourseResponse {
  items: NewestCourse[]
  next_cursor: string | null
}

// ── Top Rated Course ─────────────────────────────────────────────────────────
export interface TopRatedCourse extends NewestCourse {
  rating_avg: number
}

export interface TopRatedCourseResponse {
  items: TopRatedCourse[]
  next_cursor: string | null
}

// ── Top Viewed Course ────────────────────────────────────────────────────────
export interface TopViewCourse extends NewestCourse { }

export interface TopViewCourseResponse {
  items: TopViewCourse[]
  next_cursor: string | null
}

// ── Best Seller Course ────────────────────────────────────────────────────────
export interface BestSellerCourse extends NewestCourse { }

export interface BestSellerCourseResponse {
  items: BestSellerCourse[]
  next_cursor: string | null
}

// ── My Courses (Purchases) ────────────────────────────────────────────────────
export interface MyCourseItem {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  rating_avg: number
  total_length_seconds: number | null
  level: string | null
  language: string | null
  created_at: string
  enrolled_at: string
  category_name: string | null
  review_count: number
  avg_rating: number
  progress_percent: number
}

export interface MyCoursesResponse {
  page: number
  size: number
  total: number
  filters: {
    keyword: string | null
    category_id: string | null
    level: string | null
    language: string | null
    sort_by: string
    order: string
  }
  courses: MyCourseItem[]
}

// ── Categories ───────────────────────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  slug: string
}

export interface CategoryWithChildren extends Category {
  parent_reverse?: Category[]
}

export interface CategoryWithTopics {
  id: string
  name: string
  slug: string
  parent_id: string | null
  topics: Topic[]
}

export interface Topic {
  id: string
  name: string
  slug: string
}

// ── Discount Types ──────────────────────────────────────────────────────────────
export interface AvailableDiscount {
  id: string
  discount_code: string
  name: string
  discount_type: 'percent' | 'fixed'
  percent_value?: number
  fixed_value?: number
}

export interface AvailableDiscountsResponse {
  items: AvailableDiscount[]
}

export interface DiscountApplyResult {
  course_id: string
  applied: boolean
  reason?: string
  original_price: number
  final_price: number
  discounted_amount: number
}

export interface DiscountInfo {
  discount_id: string
  discount_code: string
  discount_name: string | null
  discount_description: string | null
  discount_applies_to: string | null
  discount_type: string | null
  discount_percent_value: number | null
  discount_fixed_value: number | null
  discount_usage_limit: number | null
  discount_usage_count: number | null
  discount_per_user_limit: number | null
  discount_is_active: boolean | null
  discount_is_hidden: boolean | null
  start_at: string | null
  end_at: string | null
  user_used_transactions: number | null
  user_remaining_uses: number | null
}

export interface DiscountApplyResponse {
  discount_id: string
  discount_code: string
  discount_name: string | null
  discount_description: string | null
  discount_applies_to: string | null
  discount_type: string | null
  discount_percent_value: number | null
  discount_fixed_value: number | null
  discount_usage_limit: number | null
  discount_usage_count: number | null
  discount_per_user_limit: number | null
  discount_is_active: boolean | null
  discount_is_hidden: boolean | null
  start_at: string | null
  end_at: string | null
  user_used_transactions: number | null
  user_remaining_uses: number | null
  items: DiscountApplyResult[]
}

// ── Checkout Types ──────────────────────────────────────────────────────────
export interface CheckoutResponse {
  message: string
  is_free: boolean
  transaction_id: string | null
  total_paid: string
  items: Array<{
    course_id: string
    price: string
    discount_amount: string
    applied_discount: boolean
  }>
}

export interface CourseSection {
  id: string
  title: string
  position: number
  lessons: CourseLesson[]
}

export interface CourseLesson {
  id: string
  title: string
  lesson_type: string
  position: number
  is_preview: boolean
  duration: number | null
}

export interface CourseDetail {
  status: 'ok' | 'empty'
  course?: {
    id: string
    title: string
    tags: string[]
    description: string
    level: string | null
    language: string | null
    last_updated: string | null
    rating: number | null
    slug: string
    rating_count: number
    total_enrolls: number
    views: number
    thumbnail_url: string | null
    outcomes: string | null
    currency: string | null
    base_price: number
    requirements: string | null
    target_audience: string | null
    promo_video_url: string | null
    instructor: {
      id: string
      fullname: string
      avatar: string | null
      instructor_description: string | null
      student_count: number | null
      course_count: number | null
      rating_avg: number | null
      evaluated_count: number | null
    } | null
    sections: CourseSection[]
  }
  category_chain: { id: string; name: string; slug: string }[]
  sample_reviews: {
    id: string
    user_id: string | null
    user_fullname: string | null
    user_avatar: string | null
    rating: number
    content: string
    created_at: string
  }[]
}
