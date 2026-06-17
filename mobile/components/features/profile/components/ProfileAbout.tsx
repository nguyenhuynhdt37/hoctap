import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { User } from '@/src/types/auth'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import { MessageSquare } from 'lucide-react-native'
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'

export function ProfileAbout({ user }: { user: User | null }) {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const bio = user?.bio || t('profile_screen.fields.bio_placeholder') || 'Chưa có tiểu sử.'

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
            {t('profile_screen.sections.about')}
          </Text>
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 400, type: 'spring' }}
        className={`p-8 rounded-[48px] border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}
      >
        <View className="relative mb-2">
          <MessageSquare size={24} color="#10b981" className="opacity-10 absolute -top-4 -left-2" />
          <MarkdownRenderer
            content={bio}
            className="px-4"
          />
        </View>
      </MotiView>
    </View>
  )
}




