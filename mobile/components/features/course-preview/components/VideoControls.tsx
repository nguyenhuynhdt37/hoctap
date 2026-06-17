import React from 'react'
import { View, Pressable } from 'react-native'
import { Text as RNText } from 'react-native'
import { Feather } from '@expo/vector-icons'

interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  showControls: boolean
  onTogglePlay: () => void
  onSeekBackward: () => void
  onSeekForward: () => void
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60).toString()
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  progress,
  showControls,
  onTogglePlay,
  onSeekBackward,
  onSeekForward,
}: VideoControlsProps) {
  if (!showControls) return null

  return (
    <View className="absolute inset-0 bg-black/30 justify-end">
      {/* Center */}
      <Pressable
        className="absolute inset-0 items-center justify-center"
        onPress={onTogglePlay}
      >
        <View className="w-16 h-16 rounded-full bg-black/60 items-center justify-center">
          <Feather
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="white"
          />
        </View>
      </Pressable>

      {/* Bottom bar */}
      <View className="px-5 pb-5">
        {/* Progress */}
        <View className="h-1 bg-white/30 rounded-full mb-2">
          <View
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        {/* Actions */}
        <View className="flex-row items-center justify-between">
          <RNText className="text-white text-xs font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </RNText>

          <View className="flex-row items-center gap-3">
            <Pressable onPress={onSeekBackward}>
              <Feather name="rotate-ccw" size={18} color="white" />
            </Pressable>
            <Pressable onPress={onTogglePlay}>
              <Feather
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={24}
                color="white"
              />
            </Pressable>
            <Pressable onPress={onSeekForward}>
              <Feather name="rotate-cw" size={18} color="white" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}
