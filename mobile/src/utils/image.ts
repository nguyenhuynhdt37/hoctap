import { BASE_URL } from '../services/api'

/**
 * Chuyển đổi đường dẫn tương đối (ví dụ: /uploads/...) thành URL đầy đủ.
 */
export function getFullImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('/api/storage/files/public/')) {
    return `${BASE_URL.replace(/\/$/, '')}/storage/files/public/${path.split('/api/storage/files/public/')[1]}`
  }
  if (path.startsWith('http')) return path

  // Lấy domain từ BASE_URL (bỏ đoạn /api/v1)
  const domain = BASE_URL.replace('/api/v1', '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  return `${domain}${cleanPath}`
}

