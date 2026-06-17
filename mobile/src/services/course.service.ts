import { api } from './api'
import type {
  RecommendedCourseResponse,
  NewestCourseResponse,
  TopRatedCourseResponse,
  TopViewCourseResponse,
  BestSellerCourseResponse,
  CourseDetail,
  PreviewLesson,
  AvailableDiscountsResponse,
  DiscountApplyResponse,
  CheckoutResponse,
  MyCoursesResponse,
  Category,
  CategoryWithChildren,
  CategoryWithTopics,
} from '../types/course'

// ── Purchase / My Courses ─────────────────────────────────────────────────────
export interface GetMyCoursesParams {
  page?: number
  size?: number
  keyword?: string
  category_id?: string
  level?: string
  language?: string
  sort_by?: 'enrolled_at' | 'created_at' | 'rating_avg' | 'views' | 'progress'
  order?: 'asc' | 'desc'
}

export const purchaseService = {
  getMyCourses: (params?: GetMyCoursesParams) =>
    api.get<MyCoursesResponse>('/purchases/courses', { params }),
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoryService = {
  getCategories: () =>
    api.get<CategoryWithChildren[]>('/categories'),

  getAllCategories: () =>
    api.get<Category[]>('/categories/all'),

  getCategoriesWithTopics: () =>
    api.get<CategoryWithTopics[]>('/categories/subcategories'),
}

// ── Course Service ────────────────────────────────────────────────────────────
export const courseService = {
  // ── Gợi ý cá nhân hóa ─────────────────────────────────────────────────────
  getRecommended: () =>
    api.get<RecommendedCourseResponse>('/courses/feed/recommend'),

  // ── Mới nhất ───────────────────────────────────────────────────────────────
  getNewest: (params?: { limit?: number; cursor?: string; category_slug?: string }) =>
    api.get<NewestCourseResponse>('/courses/feed/newest', { params }),

  // ── Đánh giá cao ───────────────────────────────────────────────────────────
  getTopRated: (params?: { limit?: number; cursor?: string; category_slug?: string }) =>
    api.get<TopRatedCourseResponse>('/courses/feed/top-rated', { params }),

  // ── Xem nhiều ──────────────────────────────────────────────────────────────
  getTopViews: (params?: { limit?: number; cursor?: string; category_slug?: string }) =>
    api.get<TopViewCourseResponse>('/courses/feed/top-view', { params }),

  // ── Bán chạy ───────────────────────────────────────────────────────────────
  getBestSellers: (params?: { limit?: number; cursor?: string; category_slug?: string }) =>
    api.get<BestSellerCourseResponse>('/courses/feed/best-sellers', { params }),

  // ── Chi tiết khóa học ────────────────────────────────────────────────────────
  getDetail: (slug: string) =>
    api.get<CourseDetail>(`/courses/${slug}/detail-info-by-slug`),

  getDetailById: (courseId: string) =>
    api.get<CourseDetail>(`/courses/${courseId}/detail-info`),

  // ── Preview videos ─────────────────────────────────────────────────────────
  getPreview: (courseId: string) =>
    api.get<PreviewLesson[]>(`/courses/${courseId}/preview`),

  // ── Kiểm tra đăng ký ────────────────────────────────────────────────────────
  checkEnrollment: (courseId: string) =>
    api.get<{ is_enroll: boolean }>(`/courses/${courseId}/is_enroll`),

  // ── Đăng ký khóa học ────────────────────────────────────────────────────────
  enroll: (courseId: string) =>
    api.post<{ message: string }>(`/courses/${courseId}/enroll`),

  // ── Yêu thích ────────────────────────────────────────────────────────────────
  toggleFavorite: (courseId: string) =>
    api.post<{ is_favourite: boolean; message: string }>(
      `/favourites/${courseId}`
    ),

  getFavorites: () =>
    api.get<{
      favourites: {
        id: string
        course_id?: string
      }[]
    }>('/favourites'),

  // ── Discount / Mã giảm giá ─────────────────────────────────────────────────
  getAvailableDiscounts: (courseIds: string[]) =>
    api.post<AvailableDiscountsResponse>('/users/discounts/available', {
      course_ids: courseIds,
    }),

  applyDiscount: (courseIds: string[], discountInput: string) =>
    api.post<DiscountApplyResponse>('/users/discounts/apply', {
      course_ids: courseIds,
      discount_input: discountInput,
    }),

  // ── Checkout / Thanh toán ─────────────────────────────────────────────────
  checkout: (courseIds: string[], discountCode?: string) =>
    api.post<CheckoutResponse>('/user/transaction/courses/checkout', {
      course_ids: courseIds,
      ...(discountCode ? { discount_code: discountCode } : {}),
    }),
}
