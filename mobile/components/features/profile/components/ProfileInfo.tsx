/**
 * ProfileInfo - Hiển thị thông tin cá nhân: giới tính, ngày sinh, địa chỉ, sở thích, mục tiêu, phong cách học, ngày tham gia
 */
import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { User } from '@/src/types/auth'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import {
  User as UserIcon,
  Calendar,
  MapPin,
  Target,
  BookOpen,
  Clock,
  Sparkles
} from 'lucide-react-native'

interface ProfileInfoProps {
  user: User | null
}

interface InfoItemProps {
  Icon: React.ComponentProps<typeof UserIcon>['size'] extends number ? any : any
  label: string
  value: string
  index: number
  isDark: boolean
}

function InfoItem({ Icon, label, value, index, isDark }: InfoItemProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ delay: 100 + index * 80, type: 'spring' }}
      className="flex-row items-center py-4"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
        <Icon size={18} color="#10b981" strokeWidth={2.5} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-zinc-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          {label}
        </Text>
        <Text className={`text-base font-semibold mt-1 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
          {value}
        </Text>
      </View>
    </MotiView>
  )
}

function InfoDivider({ isDark }: { isDark: boolean }) {
  return <View className={`h-px ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`} />
}

export function ProfileInfo({ user }: ProfileInfoProps) {
  const { t, i18n } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const isVI = i18n.language === 'vi'

  // Format ngày sinh
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('profile_screen.fields.not_set')
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(isVI ? 'vi-VN' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Format ngày tham gia
  const formatJoinDate = (dateStr: string | null) => {
    if (!dateStr) return t('profile_screen.fields.not_set')
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(isVI ? 'vi-VN' : 'en-US', {
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Format giới tính
  const formatGender = (gender: string | null) => {
    if (!gender) return t('profile_screen.fields.not_set')
    const genderMap: Record<string, string> = {
      'male': t('profile_screen.fields.gender_male'),
      'female': t('profile_screen.fields.gender_female'),
      'other': t('profile_screen.fields.gender_other')
    }
    return genderMap[gender.toLowerCase()] || gender
  }

  // Format địa chỉ
  const formatAddress = () => {
    const parts: string[] = []
    if (user?.district) parts.push(user.district)
    if (user?.conscious) parts.push(user.conscious)
    return parts.length > 0 ? parts.join(', ') : t('profile_screen.fields.not_set')
  }

  // Format mục tiêu hàng ngày
  const formatDailyGoal = (minutes?: number) => {
    if (!minutes) return t('profile_screen.fields.not_set')
    return t('profile_screen.fields.minutes_per_day', { minutes })
  }

  // Format phong cách học
  const formatLearningStyle = (style?: string) => {
    if (!style) return t('profile_screen.fields.not_set')
    const styleMap: Record<string, string> = {
      'video': t('auth.profile.goals.styles.video'),
      'reading': t('auth.profile.goals.styles.reading'),
      'practice': t('auth.profile.goals.styles.practice')
    }
    return styleMap[style.toLowerCase()] || style
  }

  // Danh sách thông tin hiển thị
  const infoItems = [
    {
      Icon: UserIcon,
      label: t('profile_screen.fields.gender'),
      value: formatGender(user?.gender || null)
    },
    {
      Icon: Calendar,
      label: t('profile_screen.fields.birthday'),
      value: formatDate(user?.birthday || null)
    },
    {
      Icon: MapPin,
      label: t('profile_screen.fields.address'),
      value: formatAddress()
    },
    {
      Icon: Target,
      label: t('profile_screen.fields.learning_goals'),
      value: user?.learning_goals || t('profile_screen.fields.not_set')
    },
    {
      Icon: Clock,
      label: t('profile_screen.fields.daily_goal'),
      value: formatDailyGoal(user?.daily_goal_minutes)
    },
    {
      Icon: BookOpen,
      label: t('profile_screen.fields.learning_style'),
      value: formatLearningStyle(user?.preferred_learning_style)
    },
    {
      Icon: Sparkles,
      label: t('profile_screen.fields.joined_date'),
      value: formatJoinDate(user?.created_at || null)
    }
  ]

  return (
    <View className="px-6 mb-8">
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 200, type: 'spring' }}
      >
        <View className="flex-row items-center mb-6 ml-3">
          <View className="w-1 h-3 bg-emerald-500 rounded-full mr-3" />
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('profile_screen.fields.interests')}
          </Text>
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 300, type: 'spring' }}
        className={`p-6 rounded-[48px] border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}
      >
        {infoItems.map((item, index) => (
          <React.Fragment key={item.label}>
            <InfoItem
              Icon={item.Icon}
              label={item.label}
              value={item.value}
              index={index}
              isDark={isDark}
            />
            {index < infoItems.length - 1 && <InfoDivider isDark={isDark} />}
          </React.Fragment>
        ))}
      </MotiView>
    </View>
  )
}
