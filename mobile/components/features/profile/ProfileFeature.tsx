import React, { useState, useEffect } from 'react'
import { ScrollView, Alert, View } from 'react-native'
import { useColorScheme } from 'nativewind'
import { useAuthStore } from '@/src/stores/auth.store'
import { useRouter } from 'expo-router'
import { LogOut } from 'lucide-react-native'
import { Text } from '@/components/ui/Text'
import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as ImagePicker from 'expo-image-picker'
import { authService } from '@/src/services/auth.service'
import * as Haptics from 'expo-haptics'
import { AnimatePresence } from 'moti'

// Sub-components
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileStats } from './components/ProfileStats'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileInfo } from './components/ProfileInfo'
import { ProfileExpertise } from './components/ProfileExpertise'
import { ProfileActions } from './components/ProfileActions'
import { EditProfileForm } from './components/EditProfileForm'

import { Screen } from '@/components/layout/Screen'

export function ProfileFeature() {
  const { user, logout, setUser } = useAuthStore()
  const router = useRouter()
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editData, setEditData] = useState({
    fullname: user?.fullname || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    birthday: user?.birthday || null,
    facebook_url: user?.facebook_url || null,
    conscious: user?.conscious || null,
    district: user?.district || null,
    citizenship_identity: user?.citizenship_identity || null,
    specializations: [] as any[],
    interest_ids: [] as string[],
    daily_goal_minutes: 30,
    preferred_learning_style: 'video',
    learning_goals: '',
  })

  useEffect(() => {
    if (user) {
      const normalizedSpecs = (user.specializations || []).map(s => ({
        specialization_id: s.specialization_id,
        level: s.level,
        skill_ids: s.skill_ids || s.skills?.map((sk: any) => sk.id) || []
      }))

      setEditData({
        fullname: user.fullname || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        birthday: user.birthday || null,
        facebook_url: user.facebook_url || null,
        conscious: user.conscious || null,
        district: user.district || null,
        citizenship_identity: user.citizenship_identity || null,
        specializations: normalizedSpecs,
        interest_ids: user.interest_ids || [],
        daily_goal_minutes: user.daily_goal_minutes || 30,
        preferred_learning_style: user.preferred_learning_style || 'video',
        learning_goals: user.learning_goals || '',
      } as any)
    }
  }, [user])

  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(t('auth.profile.logout_confirm.title'), t('auth.profile.logout_confirm.description'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.profile.logout_confirm.confirm'), style: 'destructive', onPress: async () => {
          await logout();
        }
      }
    ])
  }

  const handlePickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (res.canceled) return

    try {
      setUploading(true)
      const { data } = await authService.uploadAvatar(res.assets[0].uri)
      const newAvatar = data.avatar || data.avatar_url
      setEditData(p => ({ ...p, avatar: newAvatar }))
      if (user) {
        setUser({ ...user, avatar: newAvatar })
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      Alert.alert(t('common.error'), 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handlePickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })

    if (res.canceled) return

    try {
      setUploading(true)
      const { data } = await authService.uploadCover(res.assets[0].uri)
      setEditData(p => ({ ...p, cover: data.cover || data.cover_url }))
      if (user) {
        setUser({ ...user, cover: data.cover || data.cover_url } as any)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      Alert.alert(t('common.error'), 'Cover upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const { data } = await authService.updateProfile({
        fullname: editData.fullname,
        bio: editData.bio,
        facebook_url: editData.facebook_url,
        birthday: editData.birthday,
        conscious: editData.conscious,
        district: editData.district,
        citizenship_identity: editData.citizenship_identity,
        learning_goals: editData.learning_goals,
        daily_goal_minutes: editData.daily_goal_minutes,
        preferred_learning_style: editData.preferred_learning_style,
      })
      if (data && user) {
        setUser({ ...user, ...data })
      } else if (data) {
        setUser(data)
      }
      setIsEditing(false)
      await useAuthStore.getState().refreshUser()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      Alert.alert(t('common.error'), 'Update failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen safeArea={false} withTabBar={!isEditing}>
      {isEditing ? (
        <EditProfileForm
          data={editData}
          onChange={(k, v) => setEditData(p => ({ ...p, [k]: v }))}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          loading={loading}
          hasChanges={JSON.stringify(editData) !== JSON.stringify({
            fullname: user?.fullname || '',
            bio: user?.bio || '',
            avatar: user?.avatar || '',
            birthday: user?.birthday || null,
            facebook_url: user?.facebook_url || null,
            conscious: user?.conscious || null,
            district: user?.district || null,
            citizenship_identity: user?.citizenship_identity || null,
            specializations: user?.specializations?.map((s: any) => ({
              specialization_id: s.specialization_id,
              level: s.level,
              skill_ids: s.skill_ids || s.skills?.map((sk: any) => sk.id) || []
            })) || [],
            interest_ids: user?.interest_ids || [],
            daily_goal_minutes: user?.daily_goal_minutes || 30,
            preferred_learning_style: user?.preferred_learning_style || 'video',
            learning_goals: user?.learning_goals || '',
          })}
        />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <ProfileHeader
            user={user}
            onPickImage={handlePickImage}
            onPickCover={handlePickCover}
            uploading={uploading}
          />
          <ProfileStats />
          {/* <ProfileAbout user={user} /> */}
          {/* <ProfileInfo user={user} /> */}
          <ProfileExpertise user={user} />
          <ProfileActions onEdit={() => setIsEditing(true)} />

          <View className="px-6 mb-10">
            <Pressable
              onPress={handleLogout}
              className={`flex-row items-center justify-center p-6 rounded-full border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'} active:opacity-70`}
            >
              <LogOut size={18} color="#ef4444" strokeWidth={2.5} />
              <Text className="ml-3 text-[14px] font-black uppercase tracking-widest text-red-500">Đăng xuất</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </Screen>
  )
}
