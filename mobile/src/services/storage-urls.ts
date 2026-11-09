/** Public assets use the mobile backend origin, not the web app's origin. */
export function normalizeStorageUrls<T>(data: T, apiBaseUrl: string): T {
  const prefix = '/api/storage/files/public/'
  if (typeof data === 'string' && data.startsWith(prefix)) {
    return `${apiBaseUrl.replace(/\/$/, '')}/storage/files/public/${data.slice(prefix.length)}` as T
  }
  if (Array.isArray(data)) {
    return data.map(value => normalizeStorageUrls(value, apiBaseUrl)) as T
  }
  if (data && typeof data === 'object') {
    return Object.fromEntries(Object.entries(data).map(([key, value]) =>
      [key, normalizeStorageUrls(value, apiBaseUrl)])) as T
  }
  return data
}
