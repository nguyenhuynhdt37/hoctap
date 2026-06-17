import React, { useRef } from 'react'
import { View, Pressable, useColorScheme, Dimensions } from 'react-native'
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av'
import { Feather } from '@expo/vector-icons'
import { useVideoControls } from '../hooks/useVideoControls'
import { VideoControls } from './VideoControls'
import { ASPECT_RATIO } from '../types'

const { width: SCREEN_W } = Dimensions.get('window')
const PLAYER_HEIGHT = SCREEN_W / ASPECT_RATIO

export function VideoPlayer({ lesson }: { lesson: { video_url: string | null; duration: number | null } }) {
  const videoRef = useRef<Video>(null)
  const isDark = useColorScheme() === 'dark'

  const ctrls = useVideoControls(
    {
      playAsync: () => videoRef.current?.playAsync(),
      pauseAsync: () => videoRef.current?.pauseAsync(),
      setPositionAsync: (ms) => videoRef.current?.setPositionAsync(ms),
    },
    { defaultDuration: lesson.duration ?? 0 }
  )

  return (
    <View className="w-full relative bg-black" style={{ height: PLAYER_HEIGHT }}>
      <Video
        ref={videoRef}
        source={{ uri: lesson.video_url ?? '' }}
        className="w-full h-full"
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping
        onPlaybackStatusUpdate={ctrls.onPlaybackStatusUpdate}
        useNativeControls={false}
      />

      <VideoControls
        isPlaying={ctrls.isPlaying}
        currentTime={ctrls.currentTime}
        duration={ctrls.duration}
        progress={ctrls.progress}
        showControls={ctrls.showControls}
        onTogglePlay={ctrls.onTogglePlay}
        onSeekBackward={ctrls.onSeekBackward}
        onSeekForward={ctrls.onSeekForward}
      />

      {/* Play overlay when paused & no controls */}
      {!ctrls.isPlaying && !ctrls.showControls && (
        <Pressable
          className="absolute inset-0 items-center justify-center bg-black/20"
          onPress={ctrls.onShowControls}
        >
          <View className="w-16 h-16 rounded-full bg-black/60 items-center justify-center">
            <Feather name="play" size={32} color="white" />
          </View>
        </Pressable>
      )}
    </View>
  )
}
