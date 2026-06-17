export type LecturerScreen =
  | 'home'
  | 'dashboard'
  | 'courses'
  | 'course-create'
  | 'course-edit'
  | 'course-stats'
  | 'course-students'
  | 'student-detail'
  | 'chapters'
  | 'lesson-create'
  | 'lesson-edit'
  | 'quizzes'
  | 'resources'
  | 'discounts'
  | 'discount-create'
  | 'discount-edit'
  | 'wallet'
  | 'wallet-detail'
  | 'withdraw'
  | 'withdraw-create'
  | 'refunds'
  | 'refund-detail'
  | 'holds'
  | 'notifications'
  | 'profile'
  | 'payouts'
  | 'welcome'

export interface LecturerCourseMock {
  id: string
  title: string
  status: 'approved' | 'pending' | 'draft' | 'rejected'
  category: string
  revenue: number
  students: number
  lessons: number
  sections: number
  rating: number
  views: number
  progress: number
}

export const lecturerCourses: LecturerCourseMock[] = [
  {
    id: 'course-ai',
    title: 'AI Foundation for Product Builders',
    status: 'approved',
    category: 'Artificial Intelligence',
    revenue: 84200000,
    students: 1248,
    lessons: 42,
    sections: 9,
    rating: 4.8,
    views: 18400,
    progress: 92,
  },
  {
    id: 'course-react',
    title: 'React Native Production Workflow',
    status: 'pending',
    category: 'Mobile Development',
    revenue: 31750000,
    students: 486,
    lessons: 31,
    sections: 7,
    rating: 4.6,
    views: 9200,
    progress: 74,
  },
  {
    id: 'course-python',
    title: 'Python Data Automation',
    status: 'draft',
    category: 'Data Engineering',
    revenue: 12800000,
    students: 219,
    lessons: 18,
    sections: 5,
    rating: 4.4,
    views: 4100,
    progress: 48,
  },
]

export const lecturerStudents = [
  { id: 's1', name: 'Nguyen Minh Anh', course: lecturerCourses[0].title, progress: 86, lastActive: '2h', paid: true },
  { id: 's2', name: 'Tran Bao Chau', course: lecturerCourses[1].title, progress: 52, lastActive: '1d', paid: true },
  { id: 's3', name: 'Le Quoc Huy', course: lecturerCourses[0].title, progress: 100, lastActive: '3d', paid: false },
]

export const lecturerLessons = [
  { id: 'l1', title: 'Welcome and course outcomes', type: 'video', duration: '08:30', preview: true },
  { id: 'l2', title: 'Prompt patterns for real products', type: 'quiz', duration: '12 questions', preview: false },
  { id: 'l3', title: 'Build a small AI assistant', type: 'code', duration: '45:00', preview: false },
]

export const lecturerDiscounts = [
  { id: 'd1', code: 'LAUNCH30', type: 'percent', value: '30%', status: 'running', uses: 84 },
  { id: 'd2', code: 'WELCOME100K', type: 'fixed', value: '100K', status: 'upcoming', uses: 0 },
  { id: 'd3', code: 'OLDSTUDENT', type: 'percent', value: '15%', status: 'expired', uses: 210 },
]

export const lecturerTransactions = [
  { id: 'tx1', title: 'AI Foundation enrollment', amount: 349000, status: 'completed', date: '17/06' },
  { id: 'tx2', title: 'React Native enrollment', amount: 259000, status: 'holding', date: '16/06' },
  { id: 'tx3', title: 'Refund hold released', amount: 129000, status: 'pending', date: '15/06' },
]

export const lecturerRefunds = [
  { id: 'r1', student: 'Nguyen Minh Anh', course: lecturerCourses[0].title, amount: 349000, status: 'pending' },
  { id: 'r2', student: 'Tran Bao Chau', course: lecturerCourses[1].title, amount: 259000, status: 'approved' },
]

export const lecturerNotifications = [
  { id: 'n1', title: 'New refund request', body: 'A student requested a refund for AI Foundation.', unread: true },
  { id: 'n2', title: 'Course approved', body: 'React Native Production Workflow passed review.', unread: false },
  { id: 'n3', title: 'Payout scheduled', body: 'Your next payout will be available tomorrow.', unread: false },
]

export const lecturerResources = [
  { id: 'res1', name: 'Prompt checklist.pdf', lesson: lecturerLessons[1].title, type: 'PDF', size: '1.4 MB' },
  { id: 'res2', name: 'starter-code.zip', lesson: lecturerLessons[2].title, type: 'ZIP', size: '420 KB' },
]
