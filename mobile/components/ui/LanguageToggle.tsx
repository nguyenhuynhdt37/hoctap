import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = async () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await i18n.changeLanguage(nextLang);
  };

  return (
    <Pressable onPress={toggleLanguage} className="active:scale-95 transition-all">
      <View className="flex-row items-center bg-white/20 dark:bg-black/20 backdrop-blur-xl px-4 py-2 rounded-full border border-white/30 dark:border-white/10 shadow-lg shadow-black/5">
        <View className="w-5 h-5 items-center justify-center mr-2 bg-emerald-500 rounded-full shadow-sm">
          <Text className="text-[10px] font-bold text-white uppercase">
            {currentLang === 'vi' ? 'VN' : 'EN'}
          </Text>
        </View>
        
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={currentLang}
            from={{ opacity: 0, translateY: 5 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -5 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {currentLang === 'vi' ? 'Tiếng Việt' : 'English'}
            </Text>
          </MotiView>
        </AnimatePresence>
      </View>
    </Pressable>
  );
}
