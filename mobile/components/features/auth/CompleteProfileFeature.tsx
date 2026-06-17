import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/stores/auth.store';
import { authService } from '../../../src/services/auth.service';
import * as Haptics from 'expo-haptics';
import { AnimatePresence } from 'moti';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, ArrowLeft } from 'lucide-react-native';

// Sub-components
import { ProfileStepIndicator } from './complete-profile/ProfileStepIndicator'
import { ProfileNavigation } from './complete-profile/ProfileNavigation'
import { StepFields } from './complete-profile/StepEducation'
import { StepTopics } from './complete-profile/StepSkills'
import { useQuery } from '@tanstack/react-query';
import { metaService } from '../../../src/services/meta.service';
import { Modal } from '../../ui/Modal';

const { height } = Dimensions.get('window')

export function CompleteProfileFeature() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const router = useRouter()
  const { user, refreshUser, logout } = useAuthStore()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Form State - theo chuẩn web
  const [selectedFields, setSelectedFields] = useState<any[]>([])
  const [selectedTopics, setSelectedTopics] = useState<any[]>([])

  const { data: remoteCategories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories-with-topics'],
    queryFn: metaService.getCategoriesWithTopics
  });

  const handleFieldToggle = (field: any) => {
    setSelectedFields(currentFields => {
      const exists = currentFields.some(item => item.id === field.id)
      if (exists) {
        return currentFields.filter(item => item.id !== field.id)
      }

      return [...currentFields, field]
    })
    setSelectedTopics([])
  }

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (step === 1) {
      if (selectedFields.length === 0) {
        Alert.alert(t('common.error'), t('auth.profile.education.missing_specialization'))
        return
      }

      // Check if any selected fields have topics
      const allAvailableTopics = selectedFields.flatMap(f => f.topics || [])
      if (allAvailableTopics.length > 0) {
        setStep(2)
      } else {
        // Skip step 2 if no topics, go to submit
        handleSubmit()
      }
      return
    }

    setStep(s => s + 1)
  }


  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      if (selectedFields.length === 0) {
        return Alert.alert(t('common.error'), t('auth.profile.education.missing_specialization'))
      }

      // Build preferences string theo chuẩn web
      const fieldNames = selectedFields.map(f => f.name).join(", ")
      const allTopics = selectedFields.flatMap(f => f.topics || [])

      let preferences = `Lĩnh vực: ${fieldNames}.`
      if (allTopics.length > 0 && selectedTopics.length > 0) {
        const topicNames = selectedTopics.map(t => t.name).join(", ")
        preferences += ` Kỹ năng: ${topicNames}.`
      }

      await authService.savePreferences(preferences)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await refreshUser()
      router.replace('/(app)')
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail?.message || e.message || t('common.error')
      Alert.alert(t('common.error'), errorMsg)
    } finally { setIsLoading(false) }
  }

  return (
    <View className="flex-1 bg-black">
      {/* Immersive World Background */}
      <Image
        source={require('@/assets/images/onboarding_world.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        blurRadius={Platform.OS === 'ios' ? 10 : 5}
      />
      <LinearGradient
        colors={[
          'transparent',
          isDark ? 'rgba(9,9,11,0.9)' : 'rgba(255,255,255,0.85)',
          isDark ? '#09090b' : '#f8fafc'
        ]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.85 }}
      />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView
            className="flex-1 px-8"
            contentContainerStyle={{
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom, 50)
            }}
            showsVerticalScrollIndicator={false}
          >

            <ProfileStepIndicator
              step={step}
              leftSlot={
                step === 1 ? (
                  <Pressable
                    onPress={() => setShowLogoutModal(true)}
                    className="w-10 h-10 rounded-full bg-rose-500/10 items-center justify-center border border-rose-500/20"
                  >
                    <LogOut size={20} color="#F43F5E" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setStep(s => s - 1)}
                    className="w-10 h-10 rounded-full bg-white/20 dark:bg-zinc-800/50 items-center justify-center border border-white/30 dark:border-zinc-700/50"
                  >
                    <ArrowLeft size={24} color={isDark ? '#fff' : '#27272a'} />
                  </Pressable>
                )
              }
            />

            <View className="min-h-[400px]">
              {step === 1 && (
                <StepFields
                  selectedFields={selectedFields}
                  onToggleField={handleFieldToggle}
                  remoteCategories={remoteCategories}
                  isLoading={isCategoriesLoading}
                />
              )}
              {step === 2 && (
                <StepTopics
                  selectedFields={selectedFields}
                  selectedTopics={selectedTopics}
                  setSelectedTopics={setSelectedTopics}
                />
              )}
            </View>

            <ProfileNavigation
              step={step}
              handleBack={() => setStep(s => s - 1)}
              handleNext={handleNext}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={logout}
          title={t('auth.profile.logout_confirm.title')}
          description={t('auth.profile.logout_confirm.description')}
          confirmText={t('auth.profile.logout_confirm.confirm')}
          variant="danger"
        />
      </View>
    </View>
  )
}
