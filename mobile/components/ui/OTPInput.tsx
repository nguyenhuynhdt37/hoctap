import React, { useState, useRef } from 'react'
import { View, TextInput, Pressable, Text } from 'react-native'
import { cn } from '@/src/lib/utils'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (val: string) => void
  error?: boolean | string
  className?: string
}

export function OTPInput({ length = 6, value, onChange, error, className }: OTPInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const handlePress = () => {
    inputRef.current?.focus()
    setFocused(true)
  }

  return (
    <View className="items-center">
      <Pressable onPress={handlePress} className={cn("flex-row gap-2", className)}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] || ''
          const isCurrent = i === value.length
          const isActive = focused && isCurrent

          return (
            <View
              key={i}
              className={cn(
                "w-12 h-14 rounded-xl border items-center justify-center bg-muted",
                isActive ? "border-primary bg-background" : "border-border",
                error && "border-danger bg-danger/5"
              )}
            >
              {isActive ? (
                <View className="w-0.5 h-6 bg-primary" />
              ) : (
                <Text className="text-xl font-bold text-foreground">{char}</Text>
              )}
            </View>
          )
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        className="absolute w-full h-full opacity-0"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
      />
    </View>
  )
}
