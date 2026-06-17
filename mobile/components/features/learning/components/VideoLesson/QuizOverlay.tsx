import React, { useState } from 'react'
import { View, ScrollView, Pressable, Text as RNText, StyleSheet, Dimensions, Platform } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Quiz } from '../../types'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

interface QuizOverlayProps {
  quizzes: Quiz[]
  onFinish: (score: number, passed: boolean) => void
  onClose: () => void
  isDark: boolean
}

export function QuizOverlay({ quizzes, onFinish, onClose, isDark }: QuizOverlayProps) {
  const insets = useSafeAreaInsets()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const quiz = quizzes[currentIdx]
  const correctIdx = quiz.options.findIndex(o => o.is_correct)
  const isCorrect = selectedIdx === correctIdx
  const isAnswered = showResult

  const handleSelect = (idx: number) => {
    if (isAnswered) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedIdx(idx)
  }

  const handleSubmit = () => {
    if (selectedIdx === null) return
    setShowResult(true)

    if (isCorrect) {
      setCorrectCount(prev => prev + 1)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const handleNext = () => {
    if (currentIdx < quizzes.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setSelectedIdx(null)
      setShowResult(false)
    } else {
      const finalScore = (correctCount / quizzes.length) * 100
      const passed = finalScore >= 10
      
      setIsFinished(true)
      
      if (passed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      
      setTimeout(() => {
        onFinish(finalScore, passed)
      }, 2500)
    }
  }

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onClose()
  }

  if (isFinished) {
    const finalScore = Math.round((correctCount / quizzes.length) * 100)
    const passed = finalScore >= 10

    return (
      <View style={styles.overlay}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)' }]} />
        <View style={styles.centerContainer}>
          <View style={[styles.resultCard, { backgroundColor: isDark ? '#18181B' : '#FFFFFF' }]}>
            <View style={[styles.resultIcon, { backgroundColor: passed ? '#10B981' : '#EF4444' }]}>
              <Ionicons name={passed ? 'trophy' : 'close-circle'} size={40} color="white" />
            </View>
            
            <RNText style={[styles.resultTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {passed ? 'Chúc mừng!' : 'Chưa đạt rồi!'}
            </RNText>
            
            <RNText style={[styles.resultSubtitle, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
              Bạn đã hoàn thành bài kiểm tra với số điểm:
            </RNText>
            
            <View style={styles.scoreContainer}>
              <RNText style={[styles.scoreText, { color: passed ? '#10B981' : '#EF4444' }]}>
                {finalScore}
              </RNText>
              <RNText style={[styles.scoreUnit, { color: isDark ? '#71717A' : '#9CA3AF' }]}>
                %
              </RNText>
            </View>

            <RNText style={[styles.resultDesc, { color: isDark ? '#71717A' : '#9CA3AF' }]}>
              {passed 
                ? 'Bạn đã xuất sắc vượt qua bài kiểm tra và đủ điều kiện để tiếp tục bài học!' 
                : 'Bạn cần đạt tối thiểu 80% để hoàn thành. Hãy xem lại bài học và thử lại nhé!'}
            </RNText>

            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: passed ? '#10B981' : '#EF4444' }]}
            >
              <RNText style={styles.closeButtonText}>Đóng</RNText>
            </Pressable>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.overlay}>
      <Pressable 
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} 
        onPress={onClose}
      />
      <View style={styles.bottomContainer}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#18181B' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#27272A' : '#F3F4F6' }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.quizIcon}>
                  <Ionicons name="help-circle" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <RNText style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                    Kiểm tra nhanh ({currentIdx + 1}/{quizzes.length})
                  </RNText>
                  <RNText style={[styles.headerSubtitle, { color: isDark ? '#71717A' : '#6B7280' }]}>
                    Câu hỏi số {currentIdx + 1}
                  </RNText>
                </View>
              </View>
              <Pressable
                onPress={handleSkip}
                style={[styles.skipButton, { backgroundColor: isDark ? '#27272A' : '#F3F4F6' }]}
              >
                <Feather name="x" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Question */}
            <View style={[styles.questionBox, { backgroundColor: isDark ? '#27272A' : '#F9FAFB' }]}>
              <RNText style={[styles.questionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                {quiz.question}
              </RNText>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {quiz.options.map((option, idx) => {
                const isSelected = selectedIdx === idx
                const isCorrectOption = idx === correctIdx
                const showCorrect = showResult && isCorrectOption
                const showWrong = showResult && isSelected && !isCorrectOption

                let bg = isDark ? '#27272A' : '#F9FAFB'
                let border = isDark ? '#3F3F46' : '#E5E7EB'
                let text = isDark ? '#FFFFFF' : '#111827'

                if (isSelected && !showResult) {
                  bg = 'rgba(59, 130, 246, 0.1)'
                  border = '#3B82F6'
                  text = '#2563EB'
                }
                if (showCorrect) {
                  bg = 'rgba(16, 185, 129, 0.1)'
                  border = '#10B981'
                  text = '#059669'
                }
                if (showWrong) {
                  bg = 'rgba(239, 68, 68, 0.1)'
                  border = '#EF4444'
                  text = '#DC2626'
                }

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(idx)}
                    disabled={isAnswered}
                    style={[styles.optionItem, { backgroundColor: bg, borderColor: border }]}
                  >
                    <View style={[styles.optionLetter, { backgroundColor: isSelected ? '#3B82F6' : isDark ? '#3F3F46' : '#E5E7EB' }]}>
                      <RNText style={[styles.optionLetterText, { color: isSelected ? '#FFFFFF' : isDark ? '#A1A1AA' : '#6B7280' }]}>
                        {String.fromCharCode(65 + idx)}
                      </RNText>
                    </View>
                    <RNText style={[styles.optionText, { color: text }]} numberOfLines={2}>
                      {option.text}
                    </RNText>
                    {showResult && (
                      showCorrect ? (
                        <View style={styles.statusBadgeCorrect}>
                          <Feather name="check" size={14} color="#FFFFFF" />
                        </View>
                      ) : showWrong ? (
                        <View style={styles.statusBadgeWrong}>
                          <Feather name="x" size={14} color="#FFFFFF" />
                        </View>
                      ) : null
                    )}
                  </Pressable>
                )
              })}
            </View>

            {/* Explanation */}
            {showResult && quiz.explanation && (
              <View style={[styles.explanationBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB' }]}>
                <View style={styles.explanationHeader}>
                  <Feather name="message-circle" size={16} color="#F59E0B" />
                  <RNText style={styles.explanationTitle}>Giải thích</RNText>
                </View>
                <RNText style={[styles.explanationText, { color: isDark ? '#D4D4D8' : '#374151' }]}>
                  {quiz.explanation}
                </RNText>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[
            styles.footer, 
            { 
              borderTopColor: isDark ? '#27272A' : '#F3F4F6',
              paddingBottom: Math.max(insets.bottom, 24) 
            }
          ]}>
            {!showResult ? (
              <Pressable
                onPress={handleSubmit}
                disabled={selectedIdx === null}
                style={[
                  styles.submitButton,
                  selectedIdx !== null 
                    ? { backgroundColor: '#3B82F6', elevation: 4, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 } 
                    : { backgroundColor: isDark ? '#27272A' : '#E5E7EB' }
                ]}
              >
                <RNText style={[styles.submitButtonText, { color: selectedIdx !== null ? '#FFFFFF' : isDark ? '#71717A' : '#9CA3AF' }]}>
                  Trả lời
                </RNText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleNext}
                style={[styles.submitButton, { backgroundColor: '#10B981', elevation: 4, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }]}
              >
                <RNText style={styles.submitButtonText}>
                  {currentIdx < quizzes.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
                </RNText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 1000,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resultCard: {
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 32,
  },
  scoreText: {
    fontSize: 60,
    fontWeight: '900',
  },
  scoreUnit: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resultDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 100,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '88%',
    width: '100%',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  skipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  questionBox: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  statusBadgeCorrect: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeWrong: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationBox: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D97706',
    marginLeft: 8,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})
