import type { PreviewLesson } from '@/src/types/course'

export { type PreviewLesson }

export interface VideoControlsState {
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  showControls: boolean
}

export const ASPECT_RATIO = 16 / 9
