import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
// Removed Rive import for Expo Go compatibility
import { MotiView } from 'moti';
import { Flame, X, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Rive requires a Dev Build, using Moti Emoji instead for Expo Go PoC
const SUCCESS_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
const ERROR_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3';

export default function GamificationDemoScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0.2); // 20% progress
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  // Ref to trigger animations manually
  const [characterState, setCharacterState] = useState<'idle' | 'success' | 'fail'>('idle');

  const options = [
    { id: 1, text: "Tôi ăn táo" },
    { id: 2, text: "Bạn ăn táo" }, // Correct answer
    { id: 3, text: "Cô ấy ăn táo" },
    { id: 4, text: "Họ ăn táo" }
  ];

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playSound = async (isCorrectAnswer: boolean) => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: isCorrectAnswer ? SUCCESS_SOUND : ERROR_SOUND }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (e) {
      console.log("Could not play sound", e);
    }
  };

  const handleCheck = async () => {
    if (selectedOption === null) return;
    
    setIsChecking(true);
    
    // Simulate checking (e.g. You eat an apple -> Bạn ăn táo = id 2)
    const correct = selectedOption === 2;
    setIsCorrect(correct);
    
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound(true);
      setProgress(Math.min(progress + 0.2, 1)); // Increase progress
      // Play success animation
      setCharacterState('success');
      setTimeout(() => setCharacterState('idle'), 2000);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound(false);
      setCharacterState('fail');
      setTimeout(() => setCharacterState('idle'), 2000);
    }
  };

  const handleContinue = () => {
    // Reset for next question or finish
    setSelectedOption(null);
    setIsChecking(false);
    setIsCorrect(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header: Close, Progress Bar, Hearts, Streak */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={24} color="#9CA3AF" />
        </TouchableOpacity>
        
        {/* Animated Progress Bar */}
        <View style={styles.progressTrack}>
          <MotiView
            style={styles.progressFill}
            animate={{ width: progress * (width - 140) }}
            transition={{ type: 'spring', damping: 15 }}
          />
        </View>
        
        <View style={styles.stats}>
          <Flame size={20} color="#F97316" fill="#F97316" />
          <Text style={styles.statText}>5</Text>
          <Heart size={20} color="#EF4444" fill="#EF4444" style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>3</Text>
        </View>
      </View>

      <Text style={styles.instruction}>Dịch câu này</Text>

      {/* Rive Character & Question */}
      <View style={styles.questionSection}>
        <MotiView 
          style={styles.riveContainer}
          animate={{
            translateY: characterState === 'idle' ? [0, -5, 0] : characterState === 'success' ? [0, -20, 0] : 0,
            rotate: characterState === 'fail' ? ['0deg', '-10deg', '10deg', '-10deg', '0deg'] : '0deg',
          }}
          transition={{
            type: 'timing',
            duration: characterState === 'idle' ? 2000 : 300,
            loop: characterState === 'idle',
          }}
        >
          <Text style={{ fontSize: 80, textAlign: 'center' }}>
            {characterState === 'fail' ? '😿' : characterState === 'success' ? '🥳' : '🦉'}
          </Text>
        </MotiView>
        
        <MotiView 
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
          style={styles.chatBubble}
        >
          <Text style={styles.questionText}>You eat an apple</Text>
          <View style={styles.bubbleTail} />
        </MotiView>
      </View>

      {/* Options Grid */}
      <View style={styles.optionsContainer}>
        {options.map((opt, index) => {
          const isSelected = selectedOption === opt.id;
          return (
            <MotiView
              key={opt.id}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: isSelected ? 0.95 : 1 }}
              transition={{ delay: 300 + index * 100, type: 'spring' }}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedOption(opt.id);
                  if (isChecking) {
                    setIsChecking(false);
                    setIsCorrect(null);
                  }
                }}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </View>

      {/* Bottom Action Area (Bounces up when checking) */}
      <View style={styles.bottomArea}>
        {isChecking && isCorrect !== null && (
          <MotiView
            from={{ translateY: 100, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            style={[
              styles.feedbackBanner,
              isCorrect ? styles.feedbackSuccess : styles.feedbackError
            ]}
          >
            <Text style={styles.feedbackText}>
              {isCorrect ? 'Chính xác! Xuất sắc quá!' : 'Chưa đúng rồi. Nghĩa là: Bạn ăn táo'}
            </Text>
          </MotiView>
        )}

        <TouchableOpacity 
          style={[
            styles.checkButton, 
            selectedOption === null && !isChecking ? styles.checkButtonDisabled : {},
            isChecking && isCorrect ? styles.checkButtonSuccess : {},
            isChecking && !isCorrect ? styles.checkButtonError : {},
          ]}
          disabled={selectedOption === null && !isChecking}
          onPress={isChecking ? handleContinue : handleCheck}
        >
          <Text style={[
            styles.checkButtonText,
            selectedOption === null && !isChecking ? styles.checkButtonTextDisabled : {}
          ]}>
            {isChecking ? 'TIẾP TỤC' : 'KIỂM TRA'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 24,
  },
  closeBtn: {
    padding: 4,
  },
  progressTrack: {
    flex: 1,
    height: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E', // Duolingo Green
    borderRadius: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 16,
    marginLeft: 4,
    color: '#374151',
  },
  instruction: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 24,
    color: '#1F2937',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  questionSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  riveContainer: {
    width: 120,
    height: 120,
  },
  chatBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginLeft: -10,
    marginTop: -20,
    zIndex: -1,
  },
  bubbleTail: {
    position: 'absolute',
    left: -10,
    top: '50%',
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#E5E7EB',
    transform: [{ rotate: '45deg' }],
  },
  questionText: {
    fontFamily: 'BeVietnamPro-Medium',
    fontSize: 18,
    color: '#1F2937',
  },
  optionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 4, // 3D effect
  },
  optionCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 2,
    transform: [{ translateY: 2 }],
  },
  optionText: {
    fontFamily: 'BeVietnamPro-Medium',
    fontSize: 18,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#3B82F6',
    fontFamily: 'BeVietnamPro-Bold',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32, // safe area
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderColor: '#E5E7EB',
  },
  feedbackBanner: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  feedbackSuccess: {
    backgroundColor: '#DCFCE7', // Light green
  },
  feedbackError: {
    backgroundColor: '#FEE2E2', // Light red
  },
  feedbackText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 16,
    color: '#1F2937',
  },
  checkButton: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderColor: '#16A34A',
  },
  checkButtonDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  checkButtonSuccess: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  checkButtonError: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  checkButtonText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  checkButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
