import { SCANNED_PROJECT_SEARCH_ITEMS } from './generated-project-index'
import type { GlobalSearchItem, GlobalSearchSection } from './types'

export const SEARCH_SECTIONS: GlobalSearchSection[] = [
  { key: 'all', label: 'search.filters.all' },
  { key: 'course', label: 'search.filters.course' },
  { key: 'lesson', label: 'search.filters.lesson' },
  { key: 'category', label: 'search.filters.category' },
  { key: 'topic', label: 'search.filters.topic' },
  { key: 'wallet', label: 'search.filters.wallet' },
  { key: 'transaction', label: 'search.filters.transaction' },
  { key: 'notification', label: 'search.filters.notification' },
  { key: 'screen', label: 'search.filters.screen' },
  { key: 'feature', label: 'search.filters.feature' },
]

const CROSS_LANGUAGE_ALIASES = [
  'wallet', 'ví',
  'course', 'khóa học',
  'lesson', 'bài học',
  'instructor', 'giảng viên',
  'notification', 'thông báo',
  'transaction', 'giao dịch',
  'profile', 'hồ sơ',
  'settings', 'cài đặt',
  'language', 'ngôn ngữ',
  'category', 'danh mục',
  'search', 'tìm kiếm',
]

export const CURATED_SEARCH_ITEMS: GlobalSearchItem[] = [
  {
    id: 'feature:course-feed-semantic',
    title: 'Course discovery',
    description: 'Newest, recommended, top rated, trending and best seller courses.',
    type: 'feature',
    route: '/(app)/(tabs)',
    icon: 'trending-up',
    keywords: ['feed', 'newest', 'recommended', 'top rated', 'best sellers'],
    alias: ['khám phá khóa học', 'khóa học mới', 'gợi ý', 'đánh giá cao', 'bán chạy'],
  },
  {
    id: 'feature:learning-room-semantic',
    title: 'Learning room',
    description: 'Video lessons, quiz, code lesson, notes, resources, Q&A and progress.',
    type: 'feature',
    route: '/(app)/(tabs)/my-learn',
    icon: 'play-circle',
    keywords: ['video', 'quiz', 'code', 'notes', 'resources', 'qa', 'progress'],
    alias: ['phòng học', 'bài học', 'ghi chú', 'tài nguyên', 'hỏi đáp', 'tiến độ'],
  },
  {
    id: 'feature:wallet-topup-semantic',
    title: 'Wallet top up',
    description: 'Create a deposit, pay with PayPal and update wallet balance.',
    type: 'wallet',
    route: '/(app)/wallet',
    icon: 'plus-circle',
    keywords: ['top up', 'deposit', 'paypal', 'balance'],
    alias: ['nạp tiền', 'nạp ví', 'số dư', 'thanh toán'],
  },
  {
    id: 'feature:profile-edit-semantic',
    title: 'Edit profile',
    description: 'Update personal information, skills, interests, education and goals.',
    type: 'profile',
    route: '/(app)/(tabs)/profile',
    icon: 'edit-2',
    keywords: ['edit', 'skills', 'interests', 'education', 'goals'],
    alias: ['chỉnh sửa hồ sơ', 'kỹ năng', 'sở thích', 'học vấn', 'mục tiêu'],
  },
  {
    id: 'feature:notifications-read-semantic',
    title: 'Mark notifications as read',
    description: 'Read one notification or mark all notifications as read.',
    type: 'notification',
    route: '/(app)/(tabs)/notifications',
    icon: 'check-square',
    keywords: ['mark read', 'read all', 'unread'],
    alias: ['đánh dấu đã đọc', 'chưa đọc', 'thông báo'],
  },
]

export const STATIC_SEARCH_ITEMS: GlobalSearchItem[] = [
  ...SCANNED_PROJECT_SEARCH_ITEMS.map(item => ({
    ...item,
    keywords: [...item.keywords, ...CROSS_LANGUAGE_ALIASES],
  })),
  ...CURATED_SEARCH_ITEMS,
]
