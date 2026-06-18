import React, { useCallback, useState } from 'react'
import { View, StyleSheet, Pressable, Dimensions } from 'react-native'
import YoutubePlayer from 'react-native-youtube-iframe'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'

const { width: SCREEN_W } = Dimensions.get('window')
const PLAYER_HEIGHT = SCREEN_W * (9 / 16)

function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return url
}

interface YouTubePlayerProps {
  url: string
  isDark: boolean
}

export function YouTubePlayer({ url, isDark }: YouTubePlayerProps) {
  const videoId = extractYouTubeId(url)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const onChangeState = useCallback((state: string) => {
    if (state === 'playing') {
      setIsPlaying(true)
      setIsReady(true)
    } else if (state === 'paused' || state === 'ended') {
      setIsPlaying(false)
    }
  }, [])

  const onReady = useCallback(() => {
    setIsReady(true)
  }, [])

  return (
    <View style={styles.container}>
      <YoutubePlayer
        height={PLAYER_HEIGHT}
        videoId={videoId}
        play={isPlaying}
        onReady={onReady}
        onChangeState={onChangeState}
        webViewStyle={{ opacity: 0.99 }}
        playerVars={{
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1,
        }}
      />

      {/* Loading overlay */}
      {!isReady && (
        <View style={[styles.overlay, { backgroundColor: isDark ? '#09090b' : '#f4f4f5' }]}>
          <View style={styles.loadingInner}>
            <Ionicons name="logo-youtube" size={48} color="#EF4444" />
            <Text className={`mt-3 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Đang tải video...
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingInner: {
    alignItems: 'center',
  },
})
