import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../../../ui/Text';
import { Input } from '../../../ui/Input';
import { User, Camera, AtSign, Sparkles } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { authService } from '../../../../src/services/auth.service';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { getFullImageUrl } from '../../../../src/utils/image';

interface StepBasicInfoProps {
  fullName: string
  setFullName: (v: string) => void
  bio: string
  setBio: (v: string) => void
  avatarUrl?: string
  onPickImage: () => void
  isUploading: boolean
  errors: Record<string, string>
  validateField: (name: string, value: string) => void
}

export function StepBasicInfo({ 
  fullName, setFullName, bio, setBio,
  avatarUrl, onPickImage, isUploading,
  errors, validateField
}: StepBasicInfoProps) {
  const { t } = useTranslation()
  const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '')

  const fullAvatarUrl = avatarUrl
    ? getFullImageUrl(avatarUrl)
    : null

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [prompt, setPrompt] = React.useState('viết thật hay vào');

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    try {
      const res = await authService.generateBio(prompt);
      let bioText = res.data;
      if (typeof bioText === 'string') {
        bioText = bioText.replace(/^["']|["']$/g, '');
        setBio(bioText);
      }
      setShowPrompt(false);
    } catch (e) {
      console.error('Bio generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 400 }}
    >

      <View className="items-center mb-8">
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={onPickImage}
          disabled={isUploading}
          className="relative"
        >
          <View className="w-32 h-32 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 items-center justify-center backdrop-blur-3xl overflow-hidden">
            {isUploading ? (
              <ActivityIndicator color="#10B981" />
            ) : fullAvatarUrl ? (
              <Image 
                source={{ uri: fullAvatarUrl }} 
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <User size={48} color="#10B981" />
            )}
          </View>
          <View className="absolute bottom-1 right-1 bg-emerald-500 p-3 rounded-full border-4 border-zinc-50 dark:border-zinc-950 shadow-lg shadow-emerald-500/50">
            <Camera size={16} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      <View className="space-y-6">
        <Input 
          label={t('auth.profile.basic_info.full_name')} 
          placeholder={t('auth.profile.basic_info.full_name_placeholder')} 
          value={fullName} 
          onChangeText={setFullName}
          onBlur={() => validateField('fullName', fullName)}
          error={errors.fullName ? t(`errors.${errors.fullName}`) : ''}
          leftSlot={<User size={20} color="#10B981" />}
          className="rounded-full"
        />
        <Input 
          label={t('auth.profile.basic_info.bio')} 
          placeholder={t('auth.profile.basic_info.bio_placeholder')} 
          value={bio} 
          onChangeText={setBio}
          multiline
          numberOfLines={2}
          className="rounded-3xl"
          rightSlot={
            <TouchableOpacity 
              onPress={() => setShowPrompt(true)}
              disabled={isGenerating}
              className="bg-emerald-500/10 p-2 rounded-full"
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Sparkles size={18} color="#10B981" />
              )}
            </TouchableOpacity>
          }
        />

        {showPrompt && (
          <MotiView 
            from={{ opacity: 0, scale: 0.9, translateY: -10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            className="absolute top-[210] right-0 left-0 z-50 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-emerald-500/20 shadow-2xl"
          >
            <Text className="font-bold text-zinc-900 dark:text-zinc-50 mb-4">{t('auth.profile.basic_info.ai_prompt_title') || 'AI Prompt'}</Text>
            <Input 
              value={prompt}
              onChangeText={setPrompt}
              placeholder={t('auth.profile.basic_info.ai_prompt_placeholder') || 'Nhập yêu cầu cho AI...'}
              className="rounded-2xl bg-zinc-50 dark:bg-zinc-800"
              autoFocus
            />
            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity onPress={() => setShowPrompt(false)} className="px-5 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Text className="font-bold text-zinc-600 dark:text-zinc-400">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleGenerateBio} 
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
              >
                <Text className="font-bold text-white">{isGenerating ? '...' : t('common.generate') || 'Tạo'}</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )}
      </View>
    </MotiView>
  )
}
