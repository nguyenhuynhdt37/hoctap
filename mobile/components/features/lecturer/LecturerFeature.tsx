import React, { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, TextInput, View, useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileQuestion,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  User,
  Users,
  Wallet,
} from 'lucide-react-native'
import { Text } from '@/components/ui'
import {
  lecturerCourses,
  lecturerDiscounts,
  lecturerLessons,
  lecturerNotifications,
  lecturerRefunds,
  lecturerResources,
  lecturerStudents,
  lecturerTransactions,
  type LecturerScreen,
} from './mock-data'

interface LecturerFeatureProps {
  screen?: LecturerScreen
}

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

const accent = '#14b8a6'

const quickNav: Array<{ screen: LecturerScreen; key: string; icon: IconComponent; route: string }> = [
  { screen: 'dashboard', key: 'dashboard', icon: LayoutDashboard, route: '/(lecturer)/lecturer/dashboard' },
  { screen: 'courses', key: 'courses', icon: BookOpen, route: '/(lecturer)/lecturer/courses' },
  { screen: 'chapters', key: 'chapters', icon: FolderOpen, route: '/(lecturer)/lecturer/chapters' },
  { screen: 'lesson-create', key: 'lessons', icon: Library, route: '/(lecturer)/lecturer/lessons/create' },
  { screen: 'discounts', key: 'discounts', icon: Tag, route: '/(lecturer)/lecturer/discounts' },
  { screen: 'wallet', key: 'wallet', icon: Wallet, route: '/(lecturer)/lecturer/wallets' },
  { screen: 'refunds', key: 'refunds', icon: Receipt, route: '/(lecturer)/lecturer/refund' },
  { screen: 'holds', key: 'holds', icon: ShieldCheck, route: '/(lecturer)/lecturer/hold' },
  { screen: 'resources', key: 'resources', icon: FileText, route: '/(lecturer)/lecturer/resources' },
  { screen: 'notifications', key: 'notifications', icon: Bell, route: '/(lecturer)/lecturer/notifications' },
  { screen: 'profile', key: 'profile', icon: User, route: '/(lecturer)/lecturer/profile' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900 ${className}`}>
      {children}
    </View>
  )
}

function StatCard({ icon: Icon, label, value, tone = 'teal' }: { icon: IconComponent; label: string; value: string; tone?: 'teal' | 'amber' | 'blue' | 'rose' }) {
  const colors = {
    teal: ['bg-teal-500/10', '#14b8a6'],
    amber: ['bg-amber-500/10', '#f59e0b'],
    blue: ['bg-blue-500/10', '#3b82f6'],
    rose: ['bg-rose-500/10', '#f43f5e'],
  } as const
  return (
    <Panel className="flex-1 min-w-[150px]">
      <View className={`w-10 h-10 rounded-full ${colors[tone][0]} items-center justify-center mb-3`}>
        <Icon size={19} color={colors[tone][1]} strokeWidth={2.5} />
      </View>
      <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</Text>
      <Text className="text-xl font-black text-zinc-950 dark:text-white mt-1">{value}</Text>
    </Panel>
  )
}

function StatusPill({ label, tone = 'teal' }: { label: string; tone?: 'teal' | 'amber' | 'rose' | 'zinc' }) {
  const cls = {
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    zinc: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  }[tone]
  return <Text className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${cls}`}>{label}</Text>
}

export function LecturerFeature({ screen = 'home' }: LecturerFeatureProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isDark = useColorScheme() === 'dark'
  const [query, setQuery] = useState('')

  const title = t(`lecturer.screens.${screen}.title`, { defaultValue: t('lecturer.title') })
  const subtitle = t(`lecturer.screens.${screen}.subtitle`, { defaultValue: t('lecturer.subtitle') })
  const canGoBack = screen !== 'home'

  const navigate = useCallback((route: string) => router.push(route as any), [router])
  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return lecturerCourses
    return lecturerCourses.filter(course => `${course.title} ${course.category}`.toLowerCase().includes(q))
  }, [query])

  const renderCourse = useCallback(({ item }: { item: typeof lecturerCourses[number] }) => (
    <Pressable onPress={() => navigate('/(lecturer)/lecturer/courses/course-ai/edit')}>
      <Panel className="mb-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-black text-zinc-950 dark:text-white">{item.title}</Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{item.category}</Text>
          </View>
          <StatusPill
            label={t(`lecturer.status.${item.status}`)}
            tone={item.status === 'approved' ? 'teal' : item.status === 'pending' ? 'amber' : item.status === 'rejected' ? 'rose' : 'zinc'}
          />
        </View>
        <View className="flex-row gap-2 mt-4">
          <StatMini label={t('lecturer.metrics.students')} value={String(item.students)} />
          <StatMini label={t('lecturer.metrics.revenue')} value={formatCurrency(item.revenue)} />
          <StatMini label={t('lecturer.metrics.rating')} value={item.rating.toFixed(1)} />
        </View>
        <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-white/10">
          <Text className="text-xs text-zinc-500">{item.sections} {t('lecturer.metrics.sections')} · {item.lessons} {t('lecturer.metrics.lessons')}</Text>
          <ChevronRight size={18} color={isDark ? '#71717a' : '#a1a1aa'} />
        </View>
      </Panel>
    </Pressable>
  ), [isDark, navigate, t])

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-2 pb-4 bg-zinc-50 dark:bg-zinc-950">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => canGoBack ? router.back() : router.push('/(app)/(tabs)/profile' as any)}
            className="w-11 h-11 rounded-full bg-white dark:bg-zinc-900 items-center justify-center border border-zinc-200 dark:border-white/10"
          >
            {canGoBack ? <ArrowLeft size={20} color={isDark ? '#fff' : '#18181b'} /> : <Menu size={20} color={isDark ? '#fff' : '#18181b'} />}
          </Pressable>
          <View className="items-center">
            <Text className="text-xs font-bold uppercase text-teal-600 dark:text-teal-300">{t('lecturer.role')}</Text>
            <Text className="text-base font-black text-zinc-950 dark:text-white">{title}</Text>
          </View>
          <Pressable onPress={() => navigate('/(lecturer)/lecturer/notifications')} className="w-11 h-11 rounded-full bg-teal-500 items-center justify-center">
            <Bell size={19} color="white" />
          </Pressable>
        </View>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">{subtitle}</Text>
      </View>

      {screen === 'courses' ? (
        <View className="flex-1 px-5">
          <SearchBox query={query} setQuery={setQuery} placeholder={t('lecturer.search.courses')} />
          <FlatList
            data={filteredCourses}
            renderItem={renderCourse}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<CourseToolbar onCreate={() => navigate('/(lecturer)/lecturer/courses/create')} />}
          />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
          {renderScreen(screen, { t, navigate })}
        </ScrollView>
      )}
    </View>
  )
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
      <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</Text>
      <Text className="text-xs font-black text-zinc-900 dark:text-white mt-0.5" numberOfLines={1}>{value}</Text>
    </View>
  )
}

function SearchBox({ query, setQuery, placeholder }: { query: string; setQuery: (v: string) => void; placeholder: string }) {
  return (
    <View className="flex-row items-center px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 mb-4">
      <Search size={18} color="#9ca3af" />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        className="flex-1 ml-3 text-base text-zinc-900 dark:text-white"
      />
    </View>
  )
}

function CourseToolbar({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation()
  return (
    <View className="mb-3">
      <Pressable onPress={onCreate} className="flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-teal-500">
        <Plus size={18} color="white" />
        <Text className="text-white font-black">{t('lecturer.actions.create_course')}</Text>
      </Pressable>
    </View>
  )
}

function renderScreen(screen: LecturerScreen, ctx: { t: ReturnType<typeof useTranslation>['t']; navigate: (route: string) => void }) {
  const { t, navigate } = ctx
  if (screen === 'home') return <HomeView t={t} navigate={navigate} />
  if (screen === 'dashboard') return <DashboardView t={t} />
  if (screen.includes('course-') || screen === 'student-detail') return <CourseDetailView screen={screen} t={t} />
  if (screen === 'chapters') return <ChaptersView t={t} navigate={navigate} />
  if (screen.includes('lesson')) return <LessonFormView screen={screen} t={t} />
  if (screen === 'quizzes') return <QuizView t={t} />
  if (screen === 'resources') return <ResourcesView t={t} />
  if (screen.includes('discount')) return <DiscountView screen={screen} t={t} />
  if (screen.includes('wallet') || screen.includes('withdraw') || screen === 'payouts') return <MoneyView screen={screen} t={t} navigate={navigate} />
  if (screen.includes('refund')) return <RefundView screen={screen} t={t} />
  if (screen === 'holds') return <HoldView t={t} />
  if (screen === 'notifications') return <NotificationsView t={t} />
  if (screen === 'profile' || screen === 'welcome') return <ProfileLecturerView screen={screen} t={t} />
  return <HomeView t={t} navigate={navigate} />
}

function HomeView({ t, navigate }: { t: any; navigate: (route: string) => void }) {
  return (
    <View>
      <View className="rounded-3xl bg-teal-600 p-5 mb-5">
        <Text className="text-white/80 text-sm font-semibold">{t('lecturer.home.badge')}</Text>
        <Text className="text-white text-3xl font-black mt-2">{t('lecturer.home.heading')}</Text>
        <Text className="text-white/80 text-sm mt-2">{t('lecturer.home.description')}</Text>
      </View>
      <View className="flex-row flex-wrap gap-3 mb-5">
        <StatCard icon={CircleDollarSign} label={t('lecturer.metrics.revenue')} value={formatCurrency(128750000)} />
        <StatCard icon={Users} label={t('lecturer.metrics.students')} value="1,953" tone="blue" />
      </View>
      <View className="flex-row flex-wrap gap-3">
        {quickNav.map(item => (
          <Pressable key={item.key} onPress={() => navigate(item.route)} className="w-[48%]">
            <Panel>
              <item.icon size={22} color={accent} strokeWidth={2.5} />
              <Text className="text-sm font-black text-zinc-950 dark:text-white mt-3">{t(`lecturer.nav.${item.key}`)}</Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t(`lecturer.nav_desc.${item.key}`)}</Text>
            </Panel>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function DashboardView({ t }: { t: any }) {
  return (
    <View>
      <View className="flex-row flex-wrap gap-3 mb-4">
        <StatCard icon={CircleDollarSign} label={t('lecturer.metrics.revenue')} value={formatCurrency(128750000)} />
        <StatCard icon={GraduationCap} label={t('lecturer.metrics.courses')} value="12" tone="amber" />
        <StatCard icon={Users} label={t('lecturer.metrics.students')} value="1,953" tone="blue" />
        <StatCard icon={ClipboardList} label={t('lecturer.metrics.reviews')} value="842" tone="rose" />
      </View>
      <Panel className="mb-4">
        <Text className="text-lg font-black text-zinc-950 dark:text-white">{t('lecturer.dashboard.revenue_chart')}</Text>
        <View className="h-40 flex-row items-end gap-2 mt-4">
          {[40, 70, 55, 92, 76, 110, 88].map((h, idx) => <View key={idx} style={{ height: h }} className="flex-1 rounded-t-xl bg-teal-500/80" />)}
        </View>
      </Panel>
      <Panel>
        <Text className="text-lg font-black text-zinc-950 dark:text-white mb-3">{t('lecturer.dashboard.course_performance')}</Text>
        {lecturerCourses.map(course => <ProgressRow key={course.id} title={course.title} value={course.progress} />)}
      </Panel>
    </View>
  )
}

function ProgressRow({ title, value }: { title: string; value: number }) {
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-2">
        <Text className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex-1">{title}</Text>
        <Text className="text-sm font-black text-teal-500">{value}%</Text>
      </View>
      <View className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <View style={{ width: `${value}%` }} className="h-full rounded-full bg-teal-500" />
      </View>
    </View>
  )
}

function CourseDetailView({ screen, t }: { screen: LecturerScreen; t: any }) {
  const mode = screen.replace('course-', '')
  return (
    <View>
      <Panel className="mb-4">
        <Text className="text-lg font-black text-zinc-950 dark:text-white">{t(`lecturer.course.${mode}`)}</Text>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('lecturer.course.form_hint')}</Text>
      </Panel>
      {mode === 'students' || mode === 'student-detail' ? (
        lecturerStudents.map(student => <ListRow key={student.id} icon={Users} title={student.name} subtitle={`${student.course} · ${student.progress}%`} right={student.lastActive} />)
      ) : mode === 'stats' ? (
        <DashboardView t={t} />
      ) : (
        <FormMock fields={['title', 'category', 'price', 'description', 'requirements', 'outcomes']} t={t} />
      )}
    </View>
  )
}

function ChaptersView({ t, navigate }: { t: any; navigate: (route: string) => void }) {
  return (
    <View>
      {['Introduction', 'Core workflow', 'Production practice'].map((chapter, idx) => (
        <Panel key={chapter} className="mb-3">
          <Text className="text-base font-black text-zinc-950 dark:text-white">{idx + 1}. {chapter}</Text>
          {lecturerLessons.map(lesson => <Pressable key={lesson.id} onPress={() => navigate('/(lecturer)/lecturer/lessons/demo/edit')}><ListRow icon={lesson.type === 'quiz' ? FileQuestion : Library} title={lesson.title} subtitle={`${lesson.type} · ${lesson.duration}`} /></Pressable>)}
        </Panel>
      ))}
    </View>
  )
}

function LessonFormView({ screen, t }: { screen: LecturerScreen; t: any }) {
  return (
    <View>
      <Panel className="mb-4">
        <Text className="text-lg font-black text-zinc-950 dark:text-white">{t(screen === 'lesson-create' ? 'lecturer.lesson.create' : 'lecturer.lesson.edit')}</Text>
        <Text className="text-sm text-zinc-500 mt-1">{t('lecturer.lesson.types')}</Text>
      </Panel>
      <View className="flex-row gap-2 mb-4">
        {['video', 'quiz', 'code'].map(type => <StatusPill key={type} label={t(`lecturer.lesson.${type}`)} tone="teal" />)}
      </View>
      <FormMock fields={['lesson_title', 'lesson_type', 'duration', 'preview', 'content']} t={t} />
    </View>
  )
}

function QuizView({ t }: { t: any }) {
  return <SimpleList title={t('lecturer.quiz.title')} data={['AI fundamentals checkpoint', 'Prompt design quiz', 'Final project review']} icon={FileQuestion} />
}

function ResourcesView({ t }: { t: any }) {
  return <SimpleList title={t('lecturer.resources.title')} data={lecturerResources.map(r => `${r.name} · ${r.type} · ${r.size}`)} icon={FileText} />
}

function DiscountView({ screen, t }: { screen: LecturerScreen; t: any }) {
  if (screen !== 'discounts') return <FormMock fields={['code', 'discount_type', 'value', 'start_date', 'end_date', 'target_courses']} t={t} />
  return <SimpleList title={t('lecturer.discounts.title')} data={lecturerDiscounts.map(d => `${d.code} · ${d.value} · ${t(`lecturer.validity.${d.status}`)}`)} icon={Tag} />
}

function MoneyView({ screen, t, navigate }: { screen: LecturerScreen; t: any; navigate: (route: string) => void }) {
  return (
    <View>
      <View className="flex-row flex-wrap gap-3 mb-4">
        <StatCard icon={Wallet} label={t('lecturer.wallet.available')} value={formatCurrency(42750000)} />
        <StatCard icon={ShieldCheck} label={t('lecturer.wallet.holding')} value={formatCurrency(8700000)} tone="amber" />
      </View>
      {screen === 'withdraw-create' ? <FormMock fields={['amount', 'paypal_email', 'note']} t={t} /> : (
        <>
          <Pressable onPress={() => navigate('/(lecturer)/lecturer/withdraw/create')} className="mb-4 py-3 rounded-2xl bg-teal-500 items-center">
            <Text className="text-white font-black">{t('lecturer.actions.create_withdraw')}</Text>
          </Pressable>
          <SimpleList title={t('lecturer.wallet.transactions')} data={lecturerTransactions.map(tx => `${tx.title} · ${formatCurrency(tx.amount)} · ${tx.status}`)} icon={Receipt} />
        </>
      )}
    </View>
  )
}

function RefundView({ screen, t }: { screen: LecturerScreen; t: any }) {
  if (screen === 'refund-detail') return <FormMock fields={['decision', 'lecturer_comment', 'evidence']} t={t} />
  return <SimpleList title={t('lecturer.refunds.title')} data={lecturerRefunds.map(r => `${r.student} · ${r.course} · ${formatCurrency(r.amount)} · ${r.status}`)} icon={Receipt} />
}

function HoldView({ t }: { t: any }) {
  return <SimpleList title={t('lecturer.holds.title')} data={lecturerTransactions.map(tx => `${tx.title} · ${formatCurrency(tx.amount)} · hold`)} icon={ShieldCheck} />
}

function NotificationsView({ t }: { t: any }) {
  return <SimpleList title={t('lecturer.notifications.title')} data={lecturerNotifications.map(n => `${n.unread ? '• ' : ''}${n.title} · ${n.body}`)} icon={Bell} />
}

function ProfileLecturerView({ screen, t }: { screen: LecturerScreen; t: any }) {
  return (
    <View>
      <Panel className="mb-4 items-center">
        <View className="w-20 h-20 rounded-full bg-teal-500 items-center justify-center mb-3">
        <Text className="text-white text-2xl font-black">{t('lecturer.profile.initials')}</Text>
        </View>
        <Text className="text-xl font-black text-zinc-950 dark:text-white">{screen === 'welcome' ? t('lecturer.welcome.title') : t('lecturer.profile.mock_name')}</Text>
        <Text className="text-sm text-zinc-500 text-center mt-2">{t('lecturer.profile.description')}</Text>
      </Panel>
      <FormMock fields={['fullname', 'headline', 'bio', 'paypal_email', 'expertise']} t={t} />
    </View>
  )
}

function SimpleList({ title, data, icon: Icon }: { title: string; data: string[]; icon: IconComponent }) {
  return (
    <Panel>
      <Text className="text-lg font-black text-zinc-950 dark:text-white mb-3">{title}</Text>
      {data.map((item, idx) => <ListRow key={`${item}-${idx}`} icon={Icon} title={item.split(' · ')[0]} subtitle={item.split(' · ').slice(1).join(' · ')} />)}
    </Panel>
  )
}

function ListRow({ icon: Icon, title, subtitle, right }: { icon: IconComponent; title: string; subtitle?: string; right?: string }) {
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-zinc-100 dark:border-white/10">
      <View className="w-10 h-10 rounded-full bg-teal-500/10 items-center justify-center">
        <Icon size={18} color={accent} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-black text-zinc-900 dark:text-white">{title}</Text>
        {subtitle ? <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</Text> : null}
      </View>
      {right ? <Text className="text-xs font-bold text-zinc-400">{right}</Text> : <ChevronRight size={16} color="#a1a1aa" />}
    </View>
  )
}

function FormMock({ fields, t }: { fields: string[]; t: any }) {
  return (
    <Panel>
      {fields.map(field => (
        <View key={field} className="mb-4">
          <Text className="text-xs font-bold uppercase text-zinc-500 mb-2">{t(`lecturer.form.${field}`)}</Text>
          <View className="min-h-[48px] rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 justify-center">
            <Text className="text-sm text-zinc-400">{t('lecturer.form.placeholder')}</Text>
          </View>
        </View>
      ))}
      <Pressable className="py-3 rounded-2xl bg-teal-500 items-center">
        <Text className="text-white font-black">{t('lecturer.actions.save_draft')}</Text>
      </Pressable>
    </Panel>
  )
}

export default LecturerFeature
