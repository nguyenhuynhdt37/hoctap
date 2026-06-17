import React, { useState, useMemo } from 'react'
import { View, TextInput, Text, type TextInputProps, StyleSheet } from 'react-native'
import { useColorScheme } from 'nativewind'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
}

export function Input({ label, error, className, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)
  const { colorScheme } = useColorScheme()
  
  const isDark = useMemo(() => colorScheme === 'dark', [colorScheme])

  return (
    <View style={styles.container}>
      {label && (
        <Text 
          className={`font-bold text-[10px] ml-5 mb-1 uppercase tracking-[2px] ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          {label}
        </Text>
      )}
      
      <View 
        style={[
          styles.inputWrapper,
          { 
            backgroundColor: isDark ? 'rgba(24, 24, 27, 0.6)' : 'rgba(244, 244, 245, 0.8)',
            borderColor: focused ? '#10B981' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
            borderWidth: 1.5,
          },
          props.multiline && { height: 'auto', minHeight: 120, borderRadius: 24, alignItems: 'flex-start', paddingTop: 16 },
          error && { borderColor: '#F43F5E', backgroundColor: isDark ? 'rgba(244, 63, 94, 0.05)' : 'rgba(244, 63, 94, 0.02)' },
        ]}
      >
        {props.leftSlot && (
          <View style={[styles.slot, props.multiline && { marginTop: 4 }]}>
            {props.leftSlot}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input, 
            { 
              color: isDark ? '#FAFAFA' : '#09090B', 
              fontFamily: 'BeVietnamPro-Medium',
              fontSize: 16
            },
            props.multiline && { height: 'auto', minHeight: 100 },
            style
          ]}
          placeholderTextColor={isDark ? '#52525B' : '#A1A1AA'}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          selectionColor="#10B981"
          {...props}
        />

        {props.rightSlot && (
          <View style={[styles.slot, props.multiline && { marginTop: 4 }]}>
            {props.rightSlot}
          </View>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    width: '100%',
  },
  inputWrapper: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  slot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
  },
  errorText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 20,
    marginTop: 2,
  }
})
