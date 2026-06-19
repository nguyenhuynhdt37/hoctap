import React from 'react'
import { View, Pressable, Image, ActivityIndicator } from 'react-native'
import { getFullImageUrl } from '@/src/utils/image'
import { Text } from '@/components/ui/Text'
import { Input } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import * as ImagePicker from 'expo-image-picker'
import { authService } from '@/src/services/auth.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { User, Camera, Info, AtSign, FileText, Link, Calendar, MapPin, ShieldCheck } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { RichMarkdownEditor } from '@/components/editor/RichMarkdownEditor'

interface BasicInfoSectionProps {
  data: {
    fullname: string
    bio: string
    avatar: string | null
    birthday: string | null
    facebook_url: string | null
    conscious: string | null
    district: string | null
    citizenship_identity: string | null
  }
  onChange: (key: string, value: any) => void
}

export function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [uploading, setUploading] = React.useState(false)
  const refreshUser = useAuthStore(s => s.refreshUser)

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploading(true)
        const res = await authService.uploadAvatar(result.assets[0].uri)
        onChange('avatar', res.data.avatar)
        await refreshUser()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch (err) {
        console.error('Upload failed', err)
      } finally {
        setUploading(false)
      }
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN')
  }

  return (
    <View className="gap-10">
      {/* Avatar Section */}
      <View className="items-center">
        <Pressable onPress={handlePickImage} disabled={uploading}>
          <View
            className={`w-[130px] h-[130px] rounded-full border-2 p-1 relative ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-100 bg-white'}`}
          >
            <View className="w-full h-full rounded-full overflow-hidden">
              {data.avatar ? (
                <Image
                  source={{ uri: getFullImageUrl(data.avatar) as string }}
                  className="w-full h-full"
                />
              ) : (
                <View className={`w-full h-full rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <User size={40} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />
                </View>
              )}
            </View>

            {uploading && (
              <View className="absolute inset-0 bg-black/40 rounded-full items-center justify-center">
                <ActivityIndicator color="#fff" />
              </View>
            )}

            <View className={`absolute bottom-1 right-1 w-[38px] h-[38px] rounded-full bg-emerald-500 border-4 ${isDark ? 'border-zinc-950' : 'border-white'} items-center justify-center`}>
              <Camera size={16} color="white" fill="white" />
            </View>
          </View>
        </Pressable>
        <Text className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-4">
          {t('profile_screen.fields.tap_to_change_avatar')}
        </Text>
      </View>

      {/* Fields Section */}
      <View>
        <View className="flex-row items-center mb-6 px-1">
          <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
            <Info size={12} color="#10b981" strokeWidth={3} />
          </View>
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('profile_screen.fields.basic_info_title')}
          </Text>
        </View>

        <View className="gap-6">
          <Input
            label={t('profile_screen.fields.full_name')}
            labelStyle={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: '#10b981', marginBottom: 8 }}
            value={data.fullname}
            onChangeText={v => onChange('fullname', v)}
            placeholder={t('profile_screen.fields.full_name_placeholder')}
            className="rounded-full h-14 px-6 border-zinc-100 dark:border-white/5"
            leftSlot={<User size={18} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />}
          />

          {/* Bio with Rich Markdown Editor */}
          <View>
            <View className="flex-row items-center mb-3">
              <View className="w-5 h-5 mr-2">
                <FileText size={16} color="#10b981" strokeWidth={2.5} />
              </View>
              <Text className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">
                {t('profile_screen.fields.bio')}
              </Text>
            </View>
            <View className={isDark ? 'bg-zinc-900 rounded-2xl border border-white/10' : ''}>
              <RichMarkdownEditor
                value={data.bio}
                onChange={(markdown) => onChange('bio', markdown)}
                placeholder={t('profile_screen.fields.bio_input_placeholder')}
                minHeight={120}
                maxHeight={250}
              />
            </View>
          </View>

          <Input
            label={t('profile_screen.fields.facebook_url')}
            labelStyle={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: '#10b981', marginBottom: 8 }}
            value={data.facebook_url ?? undefined}
            onChangeText={v => onChange('facebook_url', v)}
            placeholder="https://facebook.com/yourusername"
            className="rounded-full h-14 px-6 border-zinc-100 dark:border-white/5"
            leftSlot={<Link size={18} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />}
          />
          <Input
            label={t('profile_screen.fields.birthday')}
            labelStyle={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: '#10b981', marginBottom: 8 }}
            value={formatDate(data.birthday)}
            onChangeText={v => onChange('birthday', v)}
            placeholder="dd/mm/yyyy"
            className="rounded-full h-14 px-6 border-zinc-100 dark:border-white/5"
            leftSlot={<Calendar size={18} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />}
          />
          <Input
            label={t('profile_screen.fields.location')}
            labelStyle={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: '#10b981', marginBottom: 8 }}
            value={[data.conscious, data.district].filter(Boolean).join(', ') || ''}
            onChangeText={v => {
              const parts = v.split(',').map(s => s.trim())
              onChange('conscious', parts[0] || '')
              onChange('district', parts[1] || '')
            }}
            placeholder="Tỉnh/Thành phố, Quận/Huyện"
            className="rounded-full h-14 px-6 border-zinc-100 dark:border-white/5"
            leftSlot={<MapPin size={18} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />}
          />
          <Input
            label={t('profile_screen.fields.citizenship_identity')}
            labelStyle={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: '#10b981', marginBottom: 8 }}
            value={data.citizenship_identity ?? undefined}
            onChangeText={v => onChange('citizenship_identity', v)}
            placeholder="Số CCCD/CMND"
            className="rounded-full h-14 px-6 border-zinc-100 dark:border-white/5"
            leftSlot={<ShieldCheck size={18} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />}
          />
        </View>
      </View>
    </View>
  )
}

