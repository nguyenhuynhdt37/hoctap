import { api } from './api'

/** Resolve an app file URL while we still have the mobile Bearer token. */
export async function resolveDownloadUrl(url: string): Promise<string> {
  const match = url.match(/^(?:https?:\/\/[^/]+)?\/api\/(?:v1\/)?storage\/files\/(.+)$/)
  if (!match) return url
  const response = await api.get<{ url: string }>(`/storage/urls/${match[1]}`)
  return response.data.url
}
