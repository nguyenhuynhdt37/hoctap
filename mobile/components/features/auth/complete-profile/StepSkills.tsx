import React from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Text } from '../../../ui/Text';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { metaService } from '../../../../src/services/meta.service';

interface UserSpecialization {
  name: string
  level: string
  skills: string[]
}

export function StepTopics({
  selectedFields, selectedTopics, setSelectedTopics
}: {
  selectedFields: any[]
  selectedTopics: any[]
  setSelectedTopics: (v: any[]) => void
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'vi' ? 'vi' : 'en';

  const toggleTopic = (topic: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTopics(prev => {
      const exists = prev.find(i => i.id === topic.id);
      if (exists) {
        return prev.filter(i => i.id !== topic.id);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Lấy tất cả topics từ các selectedFields
  const allAvailableTopics = selectedFields.flatMap(f => f.topics || []);

  return (
    <MotiView
      from={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'timing', duration: 400 }}
    >
      <View className="mt-4">
        <Text className="text-zinc-900 dark:text-zinc-50 font-bold mb-4 ml-1 uppercase tracking-widest text-xs color-zinc-500">
          {t('auth.profile.skills.interests_label')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {allAvailableTopics?.map(topic => {
            const topicName = topic.name;
            const isSelected = selectedTopics.some(i => i.id === topic.id);
            return (
              <Pressable 
                key={topic.id}
                onPress={() => toggleTopic(topic)}
                className={`px-5 py-3 rounded-full border ${
                  isSelected 
                    ? 'bg-emerald-600 border-emerald-600' 
                    : 'bg-white/10 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <Text className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {isSelected ? '+ ' : ''}{topicName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </MotiView>
  )
}
