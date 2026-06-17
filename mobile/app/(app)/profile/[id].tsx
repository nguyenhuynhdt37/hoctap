import React, { useEffect, useState } from 'react'
import { View, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image, Linking, Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/layout/Screen'
import { BackButton } from '@/components/ui/BackButton'
import { authService } from '@/src/services/auth.service'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import type { User } from '@/src/types/auth'

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await authService.getPublicProfile(id)
        setUserProfile(response.data)
      } catch (err: any) {
        console.error('[PublicProfile] Fetch error:', err)
        setError('Không thể tải thông tin thành viên. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [id])

  const handleOpenFacebook = () => {
    if (userProfile?.facebook_url) {
      Linking.openURL(userProfile.facebook_url).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở liên kết Facebook')
      })
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }

  const renderContent = () => {
    if (loading) {
      return (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-zinc-500 text-sm">Đang tải thông tin...</Text>
        </View>
      )
    }

    if (error || !userProfile) {
      return (
        <View className="flex-1 justify-center items-center py-20 px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-lg font-bold text-center mt-4 mb-2" style={{ color: isDark ? '#fff' : '#09090b' }}>
            Đã có lỗi xảy ra
          </Text>
          <Text className="text-zinc-500 text-center text-sm mb-6">
            {error || 'Không tìm thấy thông tin thành viên.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-6 py-3 bg-emerald-500 rounded-full active:opacity-80"
          >
            <Text className="text-white font-bold text-sm">Quay lại</Text>
          </Pressable>
        </View>
      )
    }

    const initials = getInitials(userProfile.fullname || '')
    const isLecturer = !!userProfile.instructor_description

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 400 }}
          className="px-6 pt-6"
        >
          {/* Avatar and Main Info Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                borderColor: isDark ? '#27272a' : '#f4f4f5'
              }
            ]}
            className="items-center py-8 px-6 rounded-[24px] border"
          >
            {userProfile.avatar ? (
              <Image
                source={{ uri: userProfile.avatar }}
                className="w-24 h-24 rounded-full mb-4 border-2 border-emerald-500"
              />
            ) : (
              <View
                className="w-24 h-24 rounded-full bg-emerald-500/10 justify-center items-center mb-4 border border-emerald-500/20"
              >
                <Text className="text-emerald-500 text-3xl font-bold">{initials}</Text>
              </View>
            )}

            <Text
              className="text-xl font-bold text-center mb-1"
              style={{ color: isDark ? '#fff' : '#09090b' }}
            >
              {userProfile.fullname}
            </Text>

            {/* Badge for role */}
            <View
              className={`px-3 py-1 rounded-full mb-3 ${
                isLecturer ? 'bg-emerald-500/10' : 'bg-blue-500/10'
              }`}
            >
              <Text className={`text-xs font-bold ${isLecturer ? 'text-emerald-500' : 'text-blue-500'}`}>
                {isLecturer ? 'Giảng viên' : 'Học viên'}
              </Text>
            </View>

            <Text className="text-zinc-500 text-sm mb-4 text-center">
              {userProfile.email}
            </Text>

            {userProfile.bio ? (
              <Text
                className="text-sm text-center leading-5 px-2"
                style={{ color: isDark ? '#d4d4d8' : '#4b5563' }}
              >
                "{userProfile.bio}"
              </Text>
            ) : (
              <Text className="text-sm text-zinc-400 italic">Chưa cập nhật giới thiệu.</Text>
            )}
          </View>

          {/* Details Section */}
          <Text className="text-emerald-500 text-[11px] font-bold uppercase tracking-[0.2em] mt-8 mb-4 ml-2">
            Thông tin chi tiết
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                borderColor: isDark ? '#27272a' : '#f4f4f5'
              }
            ]}
            className="rounded-[24px] border px-6 py-4"
          >
            {/* Joined Date */}
            <View className="flex-row items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={18} color="#10b981" />
                <Text className="ml-3 text-sm" style={{ color: isDark ? '#a1a1aa' : '#4b5563' }}>
                  Ngày tham gia
                </Text>
              </View>
              <Text className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#1f2937' }}>
                {formatDate(userProfile.created_at)}
              </Text>
            </View>

            {/* Location */}
            <View className="flex-row items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={18} color="#10b981" />
                <Text className="ml-3 text-sm" style={{ color: isDark ? '#a1a1aa' : '#4b5563' }}>
                  Khu vực
                </Text>
              </View>
              <Text className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#1f2937' }}>
                {userProfile.conscious || 'Chưa cập nhật'}
              </Text>
            </View>

            {/* Facebook Link */}
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <Ionicons name="logo-facebook" size={18} color="#10b981" />
                <Text className="ml-3 text-sm" style={{ color: isDark ? '#a1a1aa' : '#4b5563' }}>
                  Mạng xã hội
                </Text>
              </View>
              {userProfile.facebook_url ? (
                <Pressable onPress={handleOpenFacebook} className="active:opacity-75">
                  <Text className="text-emerald-500 text-sm font-bold underline">
                    Facebook
                  </Text>
                </Pressable>
              ) : (
                <Text className="text-sm text-zinc-400 italic">Chưa liên kết</Text>
              )}
            </View>
          </View>

          {/* Instructor Description (only if lecturer) */}
          {isLecturer && userProfile.instructor_description && (
            <>
              <Text className="text-emerald-500 text-[11px] font-bold uppercase tracking-[0.2em] mt-8 mb-4 ml-2">
                Thông tin giảng dạy
              </Text>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#f4f4f5'
                  }
                ]}
                className="rounded-[24px] border p-6"
              >
                <Text
                  className="text-sm leading-6"
                  style={{ color: isDark ? '#d4d4d8' : '#4b5563' }}
                >
                  {userProfile.instructor_description}
                </Text>
              </View>
            </>
          )}
        </MotiView>
      </ScrollView>
    )
  }

  return (
    <Screen safeArea={false} withTabBar={false}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#09090b' : '#ffffff',
            borderBottomColor: isDark ? '#18181b' : '#f4f4f5'
          }
        ]}
      >
        <BackButton />
        <Text style={{ color: isDark ? '#fff' : '#09090b' }} className="text-lg font-bold">
          Thành viên
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {renderContent()}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
})
