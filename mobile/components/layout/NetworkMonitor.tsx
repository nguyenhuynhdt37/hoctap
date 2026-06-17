import React, { useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { useAuthStore } from '@/src/stores/auth.store'
import axios from 'axios'
import { BASE_URL } from '@/src/services/api'

export function NetworkMonitor({ children }: { children: React.ReactNode }) {
  const setConnectionError = useAuthStore(s => s.setConnectionError)
  const connectionError = useAuthStore(s => s.connectionError)
  const initialize = useAuthStore(s => s.initialize)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const checkHealth = async () => {
    try {
      // Use a clean axios instance to avoid interceptors and long timeouts for health check
      await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, { timeout: 3000 })
      if (connectionError) {
        // If we were in error state, try to re-initialize the app properly
        await initialize()
      }
    } catch (error) {
      // If health check fails, we are definitely having issues
      setConnectionError(true)
    }
  }

  useEffect(() => {
    // 1. Listen to basic internet connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected === false) {
        setConnectionError(true)
      } else if (state.isConnected === true && connectionError) {
        // Internet is back, check if backend is also back
        checkHealth()
      }
    })

    // 2. Periodic backend health check (every 10 seconds)
    timerRef.current = setInterval(() => {
      checkHealth()
    }, 10000)

    return () => {
      unsubscribe()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [connectionError])

  return <>{children}</>
}
