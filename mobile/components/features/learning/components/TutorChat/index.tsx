/**
 * TutorChat Component
 * AI Tutor chat panel với message bubbles
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Dimensions, Modal } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Text } from '@/components/ui'
import type { ChatMessage } from '../../types/chat'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { ChatChips } from './ChatChips'
import { api } from '@/src/services/api'

const { height: SCREEN_H } = Dimensions.get('window')

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface TutorChatProps {
  isOpen: boolean
  onClose: () => void
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  isDark: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SUGGESTIONS = [
  'Giải thích đoạn code này',
  'Tại sao lại ra kết quả này?',
  'Cho ví dụ khác',
  'Có cách nào tối ưu hơn không?',
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function TutorChat({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  isDark,
}: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [threadId, setThreadId] = useState<string>()
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)

  // Fetch active thread and history when chat opens
  useEffect(() => {
    if (!isOpen || !lessonId) return

    const fetchActiveThreadAndHistory = async () => {
      try {
        setIsTyping(true)
        const { data } = await api.get<{ thread: { id: string } | null }>(
          `/tutor-chat/lessons/${lessonId}/threads/active`
        )
        if (data.thread?.id) {
          setThreadId(data.thread.id)
          
          const msgRes = await api.get<{ messages: any[] }>(
            `/tutor-chat/threads/${data.thread.id}/messages?limit=20`
          )
          
          const mapped: ChatMessage[] = msgRes.data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
            status: 'sent',
          }))
          setMessages(mapped)
        } else {
          setThreadId(undefined)
          setMessages([])
        }
      } catch (e) {
        console.warn('Failed to load active tutor thread history:', e)
      } finally {
        setIsTyping(false)
      }
    }

    fetchActiveThreadAndHistory()
  }, [isOpen, lessonId])

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    }
  }, [isOpen])

  const handleSend = useCallback(async (textOverride?: string) => {
    const text = (textOverride || inputText).trim()
    if (!text || isTyping) return

    const userMessage: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
      status: 'sent',
    }

    setMessages(prev => [...prev, userMessage])
    if (!textOverride) {
      setInputText('')
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setIsTyping(true)

    try {
      const res = await api.post<{ id: string; content: string; thread_id: string; created_at: string }>(
        `/tutor-chat/lessons/${lessonId}/chat`,
        {
          message: text,
          thread_id: threadId,
        }
      )

      const aiMessage: ChatMessage = {
        id: res.data.id || `ai-msg-${Date.now()}`,
        role: 'assistant',
        content: res.data.content,
        created_at: res.data.created_at || new Date().toISOString(),
        status: 'sent',
      }

      setMessages(prev => [...prev, aiMessage])
      if (!threadId && res.data.thread_id) {
        setThreadId(res.data.thread_id)
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (err: any) {
      console.error('Send failed in tutor chat:', err)
      const errorMsg: ChatMessage = {
        id: `err-msg-${Date.now()}`,
        role: 'assistant',
        content: 'Có lỗi xảy ra khi kết nối với gia sư. Vui lòng thử lại.',
        created_at: new Date().toISOString(),
        status: 'error',
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }, [inputText, isTyping, lessonId, threadId])

  const handleChipPress = useCallback((chip: string) => {
    handleSend(chip)
  }, [handleSend])

  const handleSuggestionPress = useCallback((suggestion: string) => {
    handleSend(suggestion)
  }, [handleSend])

  if (!isOpen) return null

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/45"
          onPress={onClose}
        />
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className={`w-full rounded-t-3xl shadow-2xl z-50 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
          style={{ height: SCREEN_H * 0.7, maxHeight: 600 }}
        >
          {/* Header */}
          <View className={`px-5 py-4 flex-row items-center justify-between border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 items-center justify-center">
                <Ionicons name="school" size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Gia sư AI
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs text-emerald-600 font-medium">Đang trực tuyến</Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full items-center justify-center bg-gray-100 dark:bg-zinc-800"
            >
              <Feather name="x" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
            </Pressable>
          </View>

          {/* Messages */}
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-4 py-4"
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Welcome message */}
              <View className={`mb-4 p-4 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-emerald-50'}`}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="sparkles" size={18} color="#10B981" />
                  <Text className="text-sm font-bold text-emerald-600">Chào bạn!</Text>
                </View>
                <Text className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  Tôi là gia sư AI của bạn. Bạn có thể hỏi tôi bất cứ điều gì về bài học "{lessonTitle}" nhé!
                </Text>
              </View>

              {/* Chat messages */}
              {messages.map(message => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isDark={isDark}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <View className="flex-row items-end gap-2 mb-3">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                    <Ionicons name="school" size={16} color={isDark ? '#A1A1AA' : '#71717A'} />
                  </View>
                  <View className={`px-4 py-3 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                    <View className="flex-row items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <View
                          key={i}
                          className="w-2 h-2 rounded-full bg-zinc-400"
                          style={{
                            opacity: 0.7,
                            transform: [{ translateY: -i * 2 }],
                          }}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Suggestions (only show when no messages) */}
              {messages.length === 0 && !isTyping && (
                <View className="mt-4">
                  <Text className={`text-xs font-medium mb-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    Gợi ý câu hỏi
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => handleSuggestionPress(suggestion)}
                        className={`px-3 py-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-xs ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                          {suggestion}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick chips */}
            <View className={`px-4 py-2 border-t ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ChatChips
                  onChipPress={handleChipPress}
                  isDark={isDark}
                />
              </ScrollView>
            </View>

            {/* Input */}
            <ChatInput
              value={inputText}
              onChangeText={setInputText}
              onSend={handleSend}
              isDark={isDark}
              inputRef={inputRef as any}
            />
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  )
}
