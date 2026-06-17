import { categoryService, courseService, purchaseService } from '@/src/services/course.service'
import { favoriteService } from '@/src/services/favorite.service'
import { notificationService } from '@/src/services/notification.service'
import { walletService } from '@/src/services/wallet.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { learningService } from '@/components/features/learning/services/learning.service'
import { STATIC_SEARCH_ITEMS } from './static-index'
import type { GlobalSearchItem } from './types'

type AnyRecord = Record<string, any>

const COURSE_FEED_LIMIT = 24
const OWNED_COURSE_LIMIT = 50
const CURRICULUM_COURSE_LIMIT = 12

function compactKeywords(values: unknown[]): string[] {
  return values
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map(String)
    .map(value => value.trim())
    .filter(Boolean)
}

function uniqueById(items: GlobalSearchItem[]): GlobalSearchItem[] {
  const map = new Map<string, GlobalSearchItem>()
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item)
  }
  return Array.from(map.values())
}

function responseData<T>(result: PromiseSettledResult<{ data: T }>): T | null {
  return result.status === 'fulfilled' ? result.value.data : null
}

function asyncData<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null
}

function courseRoute(course: AnyRecord): string {
  return course.slug ? `/(app)/course/${course.slug}` : '/(app)/(tabs)/explore'
}

function courseDescription(course: AnyRecord): string {
  const instructor = course.instructor?.fullname ?? course.instructor?.name
  const category = course.category_name
  const pieces = compactKeywords([
    category,
    instructor ? `Giảng viên: ${instructor}` : '',
    course.level,
    course.language,
    course.rating_avg || course.rating ? `Đánh giá ${course.rating_avg ?? course.rating}` : '',
    typeof course.progress_percent === 'number' ? `Tiến độ ${course.progress_percent}%` : '',
  ])
  return pieces.length > 0 ? pieces.join(' · ') : 'Khóa học trong hệ thống'
}

function toCourseItem(course: AnyRecord, source: string): GlobalSearchItem | null {
  if (!course?.id || !course?.title) return null

  return {
    id: `course:${course.id}`,
    title: course.title,
    description: courseDescription(course),
    type: 'course',
    route: courseRoute(course),
    icon: 'book',
    keywords: compactKeywords([
      source,
      course.slug,
      course.category_name,
      course.level,
      course.language,
      course.tags,
      course.instructor?.fullname,
      course.instructor?.name,
    ]),
    alias: compactKeywords([
      'course',
      'khóa học',
      'instructor',
      'giảng viên',
      course.instructor?.fullname,
      course.instructor?.name,
    ]),
  }
}

export async function buildGlobalSearchItems(): Promise<GlobalSearchItem[]> {
  const [
    categoriesResult,
    categoriesWithTopicsResult,
    newestResult,
    topRatedResult,
    topViewsResult,
    bestSellersResult,
    recommendedResult,
    myCoursesResult,
    favoritesResult,
    walletResult,
    transactionsResult,
    notificationsResult,
  ] = await Promise.allSettled([
    categoryService.getCategories(),
    categoryService.getCategoriesWithTopics(),
    courseService.getNewest({ limit: COURSE_FEED_LIMIT }),
    courseService.getTopRated({ limit: COURSE_FEED_LIMIT }),
    courseService.getTopViews({ limit: COURSE_FEED_LIMIT }),
    courseService.getBestSellers({ limit: COURSE_FEED_LIMIT }),
    courseService.getRecommended(),
    purchaseService.getMyCourses({ page: 1, size: OWNED_COURSE_LIMIT }),
    favoriteService.getFavorites({ page: 1, size: COURSE_FEED_LIMIT }),
    walletService.getSummary(),
    walletService.getAllTransactions({ page: 1, limit: 20 }),
    notificationService.getNotifications({ page: 1, limit: 30 }),
  ])

  const categories = responseData(categoriesResult) ?? []
  const categoriesWithTopics = responseData(categoriesWithTopicsResult) ?? []
  const myCourses = responseData(myCoursesResult)?.courses ?? []
  const feedCourses = [
    ...(responseData(newestResult)?.items ?? []),
    ...(responseData(topRatedResult)?.items ?? []),
    ...(responseData(topViewsResult)?.items ?? []),
    ...(responseData(bestSellersResult)?.items ?? []),
    ...(responseData(recommendedResult)?.items ?? []),
    ...(responseData(favoritesResult)?.items ?? []),
    ...myCourses,
  ]

  const curriculumResults = await Promise.allSettled(
    myCourses
      .filter(course => course.id)
      .slice(0, CURRICULUM_COURSE_LIMIT)
      .map(course => learningService.getCurriculum(course.id))
  )

  const items: GlobalSearchItem[] = [...STATIC_SEARCH_ITEMS]
  const user = useAuthStore.getState().user

  if (user?.id) {
    items.push({
      id: `profile:${user.id}`,
      title: user.fullname ?? user.email ?? 'User profile',
      description: user.bio ?? user.email ?? 'Current signed-in user profile',
      type: 'profile',
      route: '/(app)/(tabs)/profile',
      icon: 'user',
      keywords: compactKeywords([
        'profile',
        'hồ sơ',
        'user',
        'người dùng',
        user.fullname,
        user.email,
        user.bio,
      ]),
      alias: ['personal profile', 'hồ sơ cá nhân', 'account', 'tài khoản'],
    })
  }

  for (const category of categories) {
    items.push({
      id: `category:${category.id}`,
      title: category.name,
      description: category.parent_reverse?.length
        ? `${category.parent_reverse.length} danh mục con`
        : 'Danh mục khóa học',
      type: 'category',
      route: `/(app)/(tabs)/explore?category=${category.slug}`,
      icon: 'folder',
      keywords: compactKeywords([
        'category',
        'danh mục',
        category.slug,
        category.parent_reverse?.map(child => child.name),
      ]),
    })

    for (const child of category.parent_reverse ?? []) {
      items.push({
        id: `category:${child.id}`,
        title: child.name,
        description: `Danh mục con của ${category.name}`,
        type: 'category',
        route: `/(app)/(tabs)/explore?category=${child.slug}`,
        icon: 'folder',
        keywords: compactKeywords(['category', 'danh mục con', child.slug, category.name]),
      })
    }
  }

  for (const category of categoriesWithTopics) {
    for (const topic of category.topics ?? []) {
      items.push({
        id: `topic:${topic.id}`,
        title: topic.name,
        description: `Chủ đề trong ${category.name}`,
        type: 'topic',
        route: `/(app)/(tabs)/explore?topic=${topic.slug}`,
        icon: 'tag',
        keywords: compactKeywords(['topic', 'chủ đề', topic.slug, category.name, category.slug]),
      })
    }
  }

  for (const course of feedCourses) {
    const sourceCourse = course as AnyRecord
    const item = toCourseItem(sourceCourse, 'course')
    if (item) items.push(item)

    const instructorName = sourceCourse.instructor?.fullname ?? sourceCourse.instructor?.name
    const instructorId = sourceCourse.instructor?.id
    if (instructorName && instructorId) {
      items.push({
        id: `instructor:${instructorId}`,
        title: instructorName,
        description: `Instructor for ${sourceCourse.title}`,
        type: 'profile',
        route: courseRoute(sourceCourse),
        icon: 'user-check',
        keywords: compactKeywords([
          'instructor',
          'teacher',
          'giảng viên',
          'người dạy',
          sourceCourse.title,
          sourceCourse.slug,
        ]),
        alias: ['lecturer', 'mentor', 'giáo viên', 'giảng viên'],
      })
    }
  }

  const curricula = curriculumResults
    .map(asyncData)
    .filter((curriculum): curriculum is NonNullable<typeof curriculum> => Boolean(curriculum))

  for (const curriculum of curricula) {
    for (const section of curriculum.sections ?? []) {
      items.push({
        id: `lesson-section:${curriculum.course_id}:${section.id}`,
        title: section.title,
        description: `${curriculum.title} · ${section.total_lessons} bài học`,
        type: 'lesson',
        route: `/(app)/learning/${myCourses.find(course => course.id === curriculum.course_id)?.slug ?? curriculum.course_id}`,
        icon: 'list',
        keywords: compactKeywords(['section', 'chương học', curriculum.title, section.position]),
      })

      for (const lesson of section.lessons ?? []) {
        items.push({
          id: `lesson:${lesson.id}`,
          title: lesson.title,
          description: `${curriculum.title} · ${section.title} · ${lesson.lesson_type}`,
          type: 'lesson',
          route: `/(app)/learning/${myCourses.find(course => course.id === curriculum.course_id)?.slug ?? curriculum.course_id}?lessonId=${lesson.id}`,
          icon: lesson.lesson_type === 'quiz' ? 'help-circle' : lesson.lesson_type === 'code' ? 'code' : 'play-circle',
          keywords: compactKeywords([
            'lesson',
            'bài học',
            lesson.lesson_type,
            lesson.description,
            section.title,
            curriculum.title,
            lesson.position,
          ]),
        })
      }
    }
  }

  const wallet = asyncData(walletResult)
  if (wallet) {
    items.push({
      id: `wallet:${wallet.id}`,
      title: 'Số dư ví',
      description: `${wallet.balance.toLocaleString('vi-VN')} ${wallet.currency} · Vào ${wallet.total_in.toLocaleString('vi-VN')} · Ra ${wallet.total_out.toLocaleString('vi-VN')}`,
      type: 'wallet',
      route: '/(app)/wallet',
      icon: 'credit-card',
      keywords: compactKeywords(['wallet', 'ví', 'balance', 'số dư', wallet.currency, wallet.is_locked ? 'locked' : 'active']),
    })
  }

  for (const tx of asyncData(transactionsResult)?.transactions ?? []) {
    items.push({
      id: `transaction:${tx.id}`,
      title: tx.description || tx.transaction_code || 'Giao dịch ví',
      description: `${tx.type} · ${tx.status} · ${tx.amount.toLocaleString('vi-VN')} ${tx.currency}`,
      type: 'transaction',
      route: '/(app)/wallet/transactions',
      icon: tx.direction === 'out' ? 'arrow-up-right' : 'arrow-down-left',
      keywords: compactKeywords([
        'transaction',
        'giao dịch',
        tx.type,
        tx.method,
        tx.gateway,
        tx.status,
        tx.transaction_code,
        tx.order_id,
      ]),
    })
  }

  for (const notification of responseData(notificationsResult)?.items ?? []) {
    const route = notification.url?.startsWith('/') ? notification.url : '/(app)/(tabs)/notifications'
    items.push({
      id: `notification:${notification.id}`,
      title: notification.title,
      description: notification.content,
      type: 'notification',
      route,
      icon: notification.is_read ? 'bell' : 'bell-off',
      keywords: compactKeywords([
        'notification',
        'thông báo',
        notification.type,
        notification.action,
        notification.is_read ? 'đã đọc' : 'chưa đọc',
      ]),
    })
  }

  return uniqueById(items)
}
