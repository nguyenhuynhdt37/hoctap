import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Bot, Send, Trash2, Sparkles, MessageSquare } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '@/src/services/api'
import { Text } from '@/components/ui'
import { Screen } from '@/components/layout/Screen'
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'
import { ChatSqlMessage } from './types'

const HISTORY_KEY = 'chat_sql_history'

const SAMPLE_QUESTIONS = [
  'Tôi đã đăng ký bao nhiêu khóa học?',
  'Tiến độ học của tôi như thế nào?',
  'Khóa học nào tôi chưa hoàn thành?',
  'Tổng số bài học tôi đã học?',
]

interface ChatSqlResponse {
  response: string
}

export function AiChatFeature() {
  const [messages, setMessages] = useState<ChatSqlMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  // Load history from AsyncStorage
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedMessages = await AsyncStorage.getItem(HISTORY_KEY)
        if (savedMessages) {
          const parsed = JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          setMessages(parsed)
        }
      } catch (e) {
        console.error('Failed to parse chat history', e)
      }
    }
    loadHistory()
  }, [])

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 150)
    }
  }, [messages.length, loading])

  // Track keyboard visibility to adjust spacing dynamic
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    )
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    )
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  // Gửi tin nhắn
  const sendMessage = useCallback(
    async (question?: string) => {
      const text = question || input.trim()
      if (!text || loading) return

      // Haptic light feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      const userMsg: ChatSqlMessage = {
        id: `user-msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      // Lưu lại danh sách tin nhắn cũ trước khi thêm tin nhắn mới để truyền cho history
      const prevMessages = messages

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)

      try {
        // Lấy tối đa 10 tin nhắn trước đó làm history
        const history = prevMessages.map((m) => m.content).slice(-10)

        const res = await api.post<ChatSqlResponse>('/chat-sql/complete', {
          question: text,
          history,
        })

        const assistantMsg: ChatSqlMessage = {
          id: `ai-msg-${Date.now()}`,
          role: 'assistant',
          content: res.data.response,
          timestamp: new Date(),
        }

        setMessages((prev) => {
          const next = [...prev, assistantMsg]
          AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch((e) =>
            console.error('Failed to save chat history', e)
          )
          return next
        })

        // Haptic medium feedback on success
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      } catch (error: any) {
        const errorContent =
          error.response?.status === 401
            ? 'Vui lòng đăng nhập để sử dụng tính năng này.'
            : 'Đã xảy ra lỗi. Vui lòng thử lại.'

        const errorMsg: ChatSqlMessage = {
          id: `err-msg-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        }

        setMessages((prev) => {
          const next = [...prev, errorMsg]
          AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch((e) =>
            console.error('Failed to save chat history', e)
          )
          return next
        })
      } finally {
        setLoading(false)
      }
    },
    [input, loading, messages]
  )

  // Xóa lịch sử chat
  const clearChat = useCallback(async () => {
    setMessages([])
    setInput('')
    try {
      await AsyncStorage.removeItem(HISTORY_KEY)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (e) {
      console.error('Failed to clear chat history', e)
    }
  }, [])

  return (
    <Screen safeArea className="flex-1 bg-white dark:bg-zinc-950">
      {/* Header */}
      <View
        className={`px-5 pt-3 pb-4 flex-row items-center justify-between border-b ${
          isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-emerald-50/30 border-gray-100'
        }`}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center shadow-md shadow-emerald-500/20">
            <Bot size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Trợ lý dữ liệu AI
            </Text>
            <Text className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
              Hỏi đáp về khóa học, tiến độ, dữ liệu của bạn
            </Text>
          </View>
        </View>

        {messages.length > 0 && (
          <Pressable
            onPress={clearChat}
            className="w-9 h-9 rounded-lg items-center justify-center bg-red-50 dark:bg-red-950/20 active:bg-red-100 dark:active:bg-red-950/40"
          >
            <Trash2 size={16} color="#EF4444" />
          </Pressable>
        )}
      </View>

      {/* Main Content & Input */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <EmptyState onSelectQuestion={sendMessage} isDark={isDark} />
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user'
              if (isUser) {
                return (
                  <View key={message.id} className="flex-row justify-end mb-4 pr-1">
                    <View className="max-w-[80%] bg-emerald-500 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm shadow-emerald-500/10">
                      <Text className="text-white text-[15px] leading-relaxed" selectable={true}>
                        {message.content}
                      </Text>
                    </View>
                  </View>
                )
              } else {
                return (
                  <View key={message.id} className="flex-row items-start gap-2.5 mb-4 pl-1">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                      <Bot size={16} color="#10B981" />
                    </View>
                    <View className="flex-1 max-w-[82%]">
                      <View className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl rounded-tl-sm p-3 shadow-sm">
                        <MarkdownRenderer content={message.content} compact autoHeight />
                      </View>
                    </View>
                  </View>
                )
              }
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <View className="flex-row items-start gap-2.5 mb-4 pl-1">
              <View className="w-8 h-8 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                <Bot size={16} color="#10B981" />
              </View>
              <View className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View
          style={{
            paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 74,
          }}
          className={`px-4 pt-3 ${
            isDark ? 'bg-zinc-900 border-t border-zinc-800' : 'bg-white border-t border-gray-100'
          }`}
        >
          <View
            className={`flex-row items-end gap-3 px-4 py-2.5 rounded-2xl ${
              isDark ? 'bg-zinc-800' : 'bg-gray-100'
            }`}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Hỏi về dữ liệu của bạn..."
              placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
              editable={!loading}
              multiline
              maxLength={500}
              className={`flex-1 text-[15px] max-h-24 py-1.5 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
              style={{
                minHeight: 24,
              }}
            />
            <Pressable
              onPress={() => sendMessage()}
              disabled={loading || !input.trim()}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                input.trim() && !loading
                  ? 'bg-emerald-500'
                  : isDark
                  ? 'bg-zinc-700'
                  : 'bg-gray-200'
              }`}
            >
              <Send
                size={18}
                color={input.trim() && !loading ? '#FFFFFF' : isDark ? '#52525B' : '#9CA3AF'}
              />
            </Pressable>
          </View>
          <Text
            className={`text-[10px] text-center mt-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}
          >
            AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const EmptyState = memo(function EmptyState({
  onSelectQuestion,
  isDark,
}: {
  onSelectQuestion: (q: string) => void
  isDark: boolean
}) {
  return (
    <View className="flex-1 items-center justify-center px-4 py-12">
      <View className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900/20">
        <MessageSquare size={32} color="#10B981" />
      </View>
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Xin chào! Tôi có thể giúp gì?
      </Text>
      <Text className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-xs text-center leading-relaxed">
        Hỏi tôi về khóa học, tiến độ học tập, hoặc bất kỳ dữ liệu nào của bạn trên hệ thống.
      </Text>
      <View className="w-full space-y-2.5">
        {SAMPLE_QUESTIONS.map((q) => (
          <Pressable
            key={q}
            onPress={() => onSelectQuestion(q)}
            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl active:bg-gray-50 dark:active:bg-zinc-800 transition-colors flex-row items-center justify-between"
          >
            <Text className="text-sm text-gray-700 dark:text-zinc-300 font-semibold pr-2 flex-1">
              {q}
            </Text>
            <Sparkles size={14} color="#10B981" className="shrink-0" />
          </Pressable>
        ))}
      </View>
    </View>
  )
})
