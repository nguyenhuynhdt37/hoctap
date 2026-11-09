import { fetch } from 'expo/fetch'
import * as SecureStore from 'expo-secure-store'
import { api, BASE_URL } from './api'
import { consumeChatEvents } from './chat-events'

export async function postChatStream<T>(
  path: string, body: unknown, onDelta: (delta: string) => void, signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 180000)
  async function send() {
    const token = await SecureStore.getItemAsync('access_token')
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...(body as object), stream: true }),
    })
  }
  try {
    let response = await send()
    if (response.status === 401) {
      await response.body?.cancel()
      const refreshToken = await SecureStore.getItemAsync('refresh_token')
      if (!refreshToken) throw Object.assign(new Error('Vui lòng đăng nhập lại.'), { response: { status: 401 } })
      const refreshed = await api.post('/auth/refresh', { refresh_token: refreshToken })
      await SecureStore.setItemAsync('access_token', refreshed.data.access_token)
      if (refreshed.data.refresh_token) await SecureStore.setItemAsync('refresh_token', refreshed.data.refresh_token)
      response = await send()
    }
    if (!response.ok) throw Object.assign(new Error('Không gửi được tin nhắn.'), { response: { status: response.status } })
    return await consumeChatEvents<T>(response, onDelta)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
