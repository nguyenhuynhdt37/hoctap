import React from 'react'
import {
  View,
  Modal,
  Pressable,
  Linking,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  previewUrl: string
  isDark?: boolean
}

export function PreviewModal({ isOpen, onClose, title, previewUrl, isDark = false }: Props) {
  const { t } = useTranslation()

  const openVideo = async () => {
    if (previewUrl) {
      const embedUrl = previewUrl.includes('youtube.com/embed/')
        ? previewUrl
        : previewUrl.includes('youtu.be/')
          ? previewUrl.replace('youtu.be/', 'www.youtube.com/watch?v=')
          : previewUrl

      try {
        await Linking.openURL(embedUrl)
      } catch {
        await Linking.openURL(previewUrl)
      }
    }
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-zinc-950/90 p-6">
        <View className={`w-full max-w-lg rounded-[40px] overflow-hidden ${isDark ? 'bg-zinc-900 border border-white/5' : 'bg-white shadow-2xl shadow-black/20'}`}>
          <View className={`flex-row items-center justify-between px-6 py-5 border-b ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
            <View className="flex-row items-center gap-3">
               <View className={`w-8 h-8 rounded-xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                 <Ionicons name="play" size={16} color="#10B981" />
               </View>
               <Text className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`} numberOfLines={1}>
                 {title || t('course_detail.preview.title')}
               </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <Ionicons name="close" size={20} color={isDark ? '#52525b' : '#71717a'} />
            </Pressable>
          </View>

          <View className="p-8 items-center">
            {previewUrl ? (
              <>
                <View className={`w-16 h-16 rounded-[24px] mb-6 items-center justify-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                  <Ionicons name="logo-youtube" size={32} color="#EF4444" />
                </View>
                <Text className={`text-sm font-medium text-center leading-relaxed mb-8 px-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t('course_detail.preview.youtube_notice')}
                </Text>
                <Pressable
                  onPress={openVideo}
                  className="bg-red-600 w-full py-4 rounded-2xl shadow-xl shadow-red-500/20 flex-row items-center justify-center gap-3 active:opacity-80"
                >
                  <Ionicons name="play-circle" size={20} color="white" />
                  <Text className="text-white font-black uppercase tracking-widest text-xs">{t('course_detail.preview.watch_on_youtube')}</Text>
                </Pressable>
              </>
            ) : (
              <View className="items-center py-10">
                <View className={`w-20 h-20 rounded-[32px] mb-6 items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <Ionicons name="videocam-off" size={40} color={isDark ? '#3f3f46' : '#d1d5db'} />
                </View>
                <Text className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {t('course_detail.preview.no_preview')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}
